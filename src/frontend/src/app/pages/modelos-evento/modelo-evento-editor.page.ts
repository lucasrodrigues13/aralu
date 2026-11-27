import { ExpandirTodosComponent } from '../../shared/expandir-todos.component';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MAT_DIALOG_DATA, MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatMenuModule } from '@angular/material/menu';
import { MatSelectModule } from '@angular/material/select';
import { MatTabsModule } from '@angular/material/tabs';
import { MatTooltipModule } from '@angular/material/tooltip';
import { map } from 'rxjs';
import { mensagemDeErro } from '../../core/mensagem-erro';
import {
  Briefing,
  Inspiracao,
  MensagemModelo,
  Modelo,
  NegocioClient,
  PAPEIS_RESPONSAVEL_MODELO,
  Roteiro,
  ServicoConta,
  TIPOS,
} from '../../core/negocio.client';
import { ToastService } from '../../core/toast.service';
import { CampoDinheiroComponent } from '../../shared/campo-dinheiro';
import { ConfirmaDialog } from '../../shared/confirma-dialog';
import { DIALOG, DIALOG_EM_MASSA, DIALOG_PEQUENO } from '../../shared/dialog';
import { GdDinheiroPipe } from '../../shared/gd-dinheiro.pipe';
import { exibirPrazoRelativo, ordemPrazoRelativo } from '../../shared/prazo-modelo';
import { NovoServicoDialog } from '../fornecedores/novo-servico.dialog';
import { OpcaoSelecao, SeletorMultiploDados, SeletorMultiploDialog } from '../eventos/seletor-multiplo.dialog';
import { AdicionarTarefasEmMassaDialog, ResultadoTarefasEmMassaModelo } from '../tarefas/adicionar-tarefas-em-massa.dialog';
import { TarefaFormDialog, TarefaModeloEdicao } from '../tarefas/tarefa-form.dialog';
import { SelecionarBibliotecaDialog, ItemBiblioteca } from './selecionar-biblioteca.dialog';
import { NgTemplateOutlet } from '@angular/common';
import { FecharModal } from '../../shared/fechar-modal';
import { Estado } from '../../shared/estado';

/** Serviço do modelo na tela: a `chave` liga as tarefas a ele até o Salvar. */
interface ServicoEdicao {
  chave: string;
  servicoContaId: string | null;
  nome: string;
  valorEstimado: number | null;
  noCadastro: boolean;
}

interface TarefaEdicao extends Omit<TarefaModeloEdicao, 'servicoContaId'> {
  chave: string;
  servicoChave: string | null;
}

interface BlocoServico {
  chave: string;
  servico: ServicoEdicao | null;
  tarefas: TarefaEdicao[];
  /** Título do grupo na visão por tempo faltante ("3 meses antes"). */
  rotulo?: string;
}

type ModoAgrupamento = 'servico' | 'prazo';

/** Faixa de tempo faltante para o evento, como "N meses antes" na Assessoria VIP. */
function faixaDoPrazo(dias: number | null | undefined): { ordem: number; rotulo: string } {
  if (dias == null) return { ordem: Number.MAX_SAFE_INTEGER, rotulo: 'Sem prazo' };
  if (dias === 0) return { ordem: 0, rotulo: 'No dia do evento' };
  if (dias > 0) return { ordem: 1, rotulo: 'Depois do evento' };
  const meses = Math.floor(-dias / 30);
  if (meses === 0) return { ordem: -1, rotulo: 'Menos de 1 mês antes' };
  return { ordem: -1 - meses, rotulo: meses === 1 ? '1 mês antes' : `${meses} meses antes` };
}

const SEM_SERVICO = '__sem-servico__';

/** Valor estimado do serviço do modelo (o nome vem do cadastro). */
@Component({
  selector: 'app-valor-servico-modelo-dialog',
  imports: [FecharModal, ReactiveFormsModule, MatDialogModule, MatButtonModule, CampoDinheiroComponent],
  template: `
    <h2 mat-dialog-title>Valor estimado · {{ dados.nome }} <app-fechar-modal /></h2>
    <mat-dialog-content>
      <form id="valor-servico-modelo" [formGroup]="form" (submit)="ref.close({ valor: form.controls.valor.value }); $event.preventDefault()">
        <app-campo-dinheiro rotulo="Valor estimado" formControlName="valor" />
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-stroked-button type="button" (click)="ref.close()">Cancelar</button>
      <button mat-flat-button type="submit" form="valor-servico-modelo">Aplicar</button>
    </mat-dialog-actions>
  `,
})
export class ValorServicoModeloDialog {
  protected readonly dados = inject<{ nome: string; valor: number | null }>(MAT_DIALOG_DATA);
  protected readonly ref = inject(MatDialogRef<ValorServicoModeloDialog, { valor: number | null }>);
  protected readonly form = inject(FormBuilder).group({ valor: [this.dados.valor] });
}

/** Remover serviço com tarefas: mover as tarefas para "Sem serviço" (padrão) ou excluir junto (SPEC-012 v3 §6.3). */
@Component({
  selector: 'app-remover-servico-modelo-dialog',
  imports: [FecharModal, MatDialogModule, MatButtonModule],
  template: `
    <h2 mat-dialog-title>Remover serviço <app-fechar-modal /></h2>
    <mat-dialog-content>
      <p class="mb-0">"{{ dados.nome }}" tem {{ dados.tarefas }} {{ dados.tarefas === 1 ? 'tarefa' : 'tarefas' }}. O que fazer com {{ dados.tarefas === 1 ? 'ela' : 'elas' }}?</p>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-stroked-button type="button" (click)="ref.close()">Cancelar</button>
      <button mat-stroked-button type="button" (click)="ref.close('excluir')">Excluir as tarefas também</button>
      <button mat-flat-button type="button" (click)="ref.close('mover')">Mover para Sem serviço</button>
    </mat-dialog-actions>
  `,
})
export class RemoverServicoModeloDialog {
  protected readonly dados = inject<{ nome: string; tarefas: number }>(MAT_DIALOG_DATA);
  protected readonly ref = inject(MatDialogRef<RemoverServicoModeloDialog, 'mover' | 'excluir'>);
}

/** Editor do modelo de evento (SPEC-012 v3 §6.2 e §6.3). */
@Component({
  selector: 'app-modelo-evento-editor',
  imports: [ExpandirTodosComponent, MatCardModule, ReactiveFormsModule, RouterLink, MatButtonModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatTabsModule, MatIconModule, MatMenuModule, MatTooltipModule, NgTemplateOutlet, GdDinheiroPipe, Estado],
  template: `
    <mat-card class="cardWithShadow">
      <div class="p-6 flex flex-wrap items-center justify-between gap-4">
        <div class="flex items-center gap-2">
          <a mat-icon-button routerLink="/modelos-evento" (click)="voltar($event)" aria-label="Voltar para modelos de evento" matTooltip="Voltar para modelos de evento"><mat-icon>arrow_back</mat-icon></a>
          <div>
            <mat-card-title class="mb-0">Editar modelo</mat-card-title>
            <mat-card-subtitle>Serviços, tarefas e vínculos do modelo.@if (alterado()) { <strong> · Alterações não salvas</strong> }</mat-card-subtitle>
          </div>
        </div>
        <div class="flex flex-wrap gap-2">
          <button mat-stroked-button type="button" (click)="clonar()"><mat-icon>content_copy</mat-icon> Clonar</button>
          <button mat-stroked-button type="button" (click)="excluir()"><mat-icon>delete</mat-icon> Excluir</button>
          <button mat-flat-button type="button" (click)="salvar()">Salvar</button>
        </div>
      </div>
      <mat-card-content class="border-t border-border">
        <form [formGroup]="form">
          <div class="grid grid-cols-12 gap-x-6 gap-y-4 mb-2">
            <div class="campo col-span-12 md:col-span-8">
              <mat-label class="font-semibold mb-2 block">Nome</mat-label>
              <mat-form-field appearance="outline" class="w-full"><input aria-label="Nome" matInput formControlName="nome" /></mat-form-field>
            </div>
            <div class="campo col-span-12 md:col-span-4">
              <mat-label class="font-semibold mb-2 block">Tipo</mat-label>
              <mat-form-field appearance="outline" class="w-full">
                <mat-select aria-label="Tipo" formControlName="tipo">
                  @for (tipo of tipos; track tipo.valor) { <mat-option [value]="tipo.valor">{{ tipo.rotulo }}</mat-option> }
                </mat-select>
              </mat-form-field>
            </div>
          </div>
        </form>

        <ng-template #vinculosTpl let-tipo="tipo" let-titulo="titulo" let-singular="singular" let-itens="itens" let-cabecalho="cabecalho" let-icone="icone">
          @let vinculadosTipo = vinculados(tipo, itens);
          @let listaTipo = vinculadosFiltrados(tipo, itens);
          <div class="pt-6 pb-4">
            <h4 class="text-base font-semibold mb-0">{{ cabecalho }}</h4>
            <p class="text-sm text-muted mt-1 mb-0">Modelos de {{ singular }} que entram em cada evento criado com este modelo.</p>
            <p class="text-sm text-muted mt-1 mb-0">{{ vinculadosTipo.length }} {{ vinculadosTipo.length === 1 ? 'vinculado' : 'vinculados' }}</p>
          </div>
          <div class="border-t border-border pt-6">
            <div class="barra-lista">
              <div class="barra-lista-filtros">
                <div class="campo w-full sm:w-64">
                  <mat-label class="font-semibold mb-2 block">Buscar</mat-label>
                  <mat-form-field appearance="outline" class="w-full">
                    <mat-icon matIconPrefix>search</mat-icon>
                    <input matInput aria-label="Buscar" [placeholder]="'Nome do ' + singular" [value]="buscaVinculo(tipo)" (input)="buscarVinculo(tipo, $event)" />
                  </mat-form-field>
                </div>
              </div>
              <div class="barra-lista-acoes">
                <button mat-flat-button type="button" (click)="adicionarVinculos(tipo, titulo, itens)"><mat-icon>add</mat-icon> Adicionar {{ titulo }}</button>
              </div>
            </div>
            @if (vinculadosTipo.length === 0) {
              <app-estado [titulo]="'Nenhum modelo de ' + singular + ' vinculado'">
                <button mat-flat-button type="button" (click)="adicionarVinculos(tipo, titulo, itens)"><mat-icon>add</mat-icon> Adicionar {{ titulo }}</button>
              </app-estado>
            } @else if (listaTipo.length === 0) {
              <app-estado titulo="Nada encontrado" texto="Mude a busca ou os filtros." />
            } @else {
              <ul class="grupos-lista" [attr.aria-label]="cabecalho">
                @for (item of listaTipo; track item.id) {
                  <li class="grupo">
                    <div class="grupo-cabecalho com-acoes vinculo">
                      <mat-icon class="seta text-muted">{{ icone }}</mat-icon>
                      <span class="grupo-texto"><span class="nome">{{ item.nome }}</span></span>
                      <div class="grupo-acoes">
                        <button mat-icon-button type="button" [attr.aria-label]="'Remover ' + singular" [matTooltip]="'Remover ' + singular" (click)="removerVinculo(tipo, item.id)"><mat-icon>link_off</mat-icon></button>
                      </div>
                    </div>
                  </li>
                }
              </ul>
            }
          </div>
        </ng-template>

        <mat-tab-group class="abas-barra-lista">
          <mat-tab label="Serviços e tarefas">
            <div class="pt-6 pb-4">
              <h4 class="text-base font-semibold mb-0">Serviços e tarefas do modelo</h4>
              <p class="text-sm text-muted mt-1 mb-0">Cada serviço traz as tarefas que ele exige; o prazo conta a partir da data de cada evento.</p>
              <p class="text-sm text-muted mt-1 mb-0" data-teste="resumo-servicos-tarefas">
                {{ servicos().length }} {{ servicos().length === 1 ? 'serviço' : 'serviços' }} ·
                {{ tarefas().length }} {{ tarefas().length === 1 ? 'tarefa' : 'tarefas' }} ·
                Estimado {{ totalEstimado() | gdDinheiro }}
              </p>
            </div>
            <div class="border-t border-border pt-6">
              <div class="barra-lista">
                <div class="barra-lista-filtros">
                  <div class="campo w-full sm:w-64">
                    <mat-label class="font-semibold mb-2 block">Buscar</mat-label>
                    <mat-form-field appearance="outline" class="w-full">
                      <mat-icon matIconPrefix>search</mat-icon>
                      <input matInput aria-label="Buscar" placeholder="Serviço ou tarefa" [value]="busca()" (input)="busca.set($any($event.target).value)" />
                    </mat-form-field>
                  </div>
                  <div class="campo w-full sm:w-48">
                    <mat-label class="font-semibold mb-2 block">Responsável</mat-label>
                    <mat-form-field appearance="outline" class="w-full">
                      <mat-select aria-label="Responsável" [value]="responsavel()" (valueChange)="responsavel.set($event)">
                        <mat-option value="">Todos</mat-option>
                        @for (papel of papeis; track papel.valor) { <mat-option [value]="papel.valor">{{ papel.rotulo }}</mat-option> }
                      </mat-select>
                    </mat-form-field>
                  </div>
                </div>
                <div class="barra-lista-acoes">
                  <button mat-stroked-button type="button" (click)="emMassa()"><mat-icon>library_add</mat-icon> Adicionar em massa</button>
                  <button mat-stroked-button type="button" (click)="adicionarServicos()"><mat-icon>playlist_add</mat-icon> Adicionar serviços</button>
                  <button mat-flat-button type="button" (click)="novaTarefa(null)"><mat-icon>add</mat-icon> Nova tarefa</button>
                </div>
              </div>

              <div class="modo-agrupamento" role="radiogroup" aria-label="Agrupar tarefas por" [class.prazo]="modo() === 'prazo'">
                <span class="marcador" aria-hidden="true"></span>
                <button type="button" role="radio" [attr.aria-checked]="modo() === 'servico'" (click)="trocarModo('servico')"><mat-icon>category</mat-icon> Por serviço</button>
                <button type="button" role="radio" [attr.aria-checked]="modo() === 'prazo'" (click)="trocarModo('prazo')"><mat-icon>schedule</mat-icon> Por tempo faltante</button>
              </div>

              @if (servicos().length === 0 && tarefas().length === 0) {
                <app-estado titulo="Nenhum serviço nem tarefa ainda">
                  <div class="flex flex-wrap justify-center gap-2">
                    <button mat-stroked-button type="button" (click)="emMassa()"><mat-icon>library_add</mat-icon> Adicionar em massa</button>
                    <button mat-flat-button type="button" (click)="adicionarServicos()"><mat-icon>playlist_add</mat-icon> Adicionar serviços</button>
                  </div>
                </app-estado>
              } @else if (blocosVisiveis().length === 0) {
                <app-estado titulo="Nada encontrado" texto="Mude a busca ou os filtros." />
              } @else {
                <app-expandir-todos [abertos]="todosAbertos()" (alternar)="alternarTodos()">
                  {{ blocosVisiveis().length }} {{ modo() === 'prazo' ? (blocosVisiveis().length === 1 ? 'faixa' : 'faixas') : (blocosVisiveis().length === 1 ? 'serviço' : 'serviços') }} ·
                  {{ tarefasVisiveis() }} {{ tarefasVisiveis() === 1 ? 'tarefa' : 'tarefas' }}
                </app-expandir-todos>
                <ul class="grupos-lista com-cabecalho" aria-label="Serviços e tarefas do modelo">
                  @for (bloco of blocosVisiveis(); track bloco.chave) {
                    <li class="grupo" [class.aberto]="estaAberto(bloco.chave)">
                      <div class="grupo-cabecalho com-acoes">
                        <button type="button" class="grupo-alternar" [attr.aria-expanded]="estaAberto(bloco.chave)"
                          [attr.aria-controls]="'tarefas-' + bloco.chave" (click)="alternar(bloco.chave)">
                          <mat-icon class="seta">expand_more</mat-icon>
                          <span class="grupo-texto">
                            @if (bloco.rotulo) {
                              <span class="nome">{{ bloco.rotulo }}</span>
                            } @else if (bloco.servico; as servico) {
                              <span class="nome">{{ servico.nome }}@if (!servico.noCadastro) { <span class="text-xs text-muted"> (removido do cadastro)</span> }</span>
                              <span class="block text-xs text-muted">Estimado {{ servico.valorEstimado | gdDinheiro }}</span>
                            } @else {
                              <span class="nome">Sem serviço</span>
                              <span class="block text-xs text-muted">Tarefas gerais do evento</span>
                            }
                          </span>
                          @if (bloco.tarefas.length === 0) {
                            <span class="inline-block rounded font-semibold px-2 py-1 text-xs whitespace-nowrap bg-light-error text-error">Sem tarefas</span>
                          } @else {
                            <span class="inline-block rounded font-semibold px-2 py-1 text-xs whitespace-nowrap neutro">
                              {{ bloco.tarefas.length }} {{ bloco.tarefas.length === 1 ? 'tarefa' : 'tarefas' }}
                            </span>
                          }
                        </button>
                        @if (!bloco.rotulo) {
                          <div class="grupo-acoes">
                            <button mat-stroked-button type="button" (click)="novaTarefa(bloco.servico)"><mat-icon>add</mat-icon> Tarefa</button>
                            @if (bloco.servico; as servico) {
                              <button mat-icon-button type="button" aria-label="Ações do serviço" matTooltip="Ações do serviço" [matMenuTriggerFor]="menuServico"><mat-icon>more_vert</mat-icon></button>
                              <mat-menu #menuServico="matMenu" xPosition="before">
                                <button mat-menu-item type="button" (click)="editarValor(servico)"><mat-icon>calculate</mat-icon> Valor estimado</button>
                                <button mat-menu-item type="button" (click)="removerServico(servico)"><mat-icon>delete</mat-icon> Remover serviço</button>
                              </mat-menu>
                            }
                          </div>
                        }
                      </div>
                      @if (estaAberto(bloco.chave)) {
                        <div class="itens" [id]="'tarefas-' + bloco.chave">
                          @for (tarefa of bloco.tarefas; track tarefa.chave) {
                            <div class="tarefa" role="button" tabindex="0" (click)="editarTarefa(tarefa)" (keydown.enter)="editarTarefa(tarefa)">
                              <div class="min-w-0">
                                <span class="nome">{{ tarefa.titulo }}</span>
                                @if (bloco.rotulo) { <span class="block text-xs text-muted">{{ nomeServico(tarefa) }}</span> }
                                @if (tarefa.checklist.length > 0 || tarefa.descricao) {
                                  <span class="block text-xs text-muted truncate">
                                    @if (tarefa.checklist.length > 0) { {{ tarefa.checklist.length }} {{ tarefa.checklist.length === 1 ? 'item' : 'itens' }} }
                                    @if (tarefa.checklist.length > 0 && tarefa.descricao) { · }
                                    {{ tarefa.descricao }}
                                  </span>
                                }
                              </div>
                              <span class="text-sm whitespace-nowrap">{{ prazoTexto(tarefa.prazoRelativo) }}</span>
                              <span class="text-sm text-muted">{{ responsaveisTexto(tarefa.responsaveis) }}</span>
                              <span>
                                @if (tarefa.prioridade === 'Alta') { <span class="inline-block rounded font-semibold px-2 py-1 text-xs whitespace-nowrap alerta">Alta</span> }
                              </span>
                              <div class="item-acoes">
                                <button mat-icon-button type="button" aria-label="Editar" matTooltip="Editar" (click)="editarTarefa(tarefa); $event.stopPropagation()"><mat-icon>edit</mat-icon></button>
                                <button mat-icon-button type="button" aria-label="Excluir tarefa" matTooltip="Excluir" (click)="removerTarefa(tarefa); $event.stopPropagation()"><mat-icon>delete</mat-icon></button>
                              </div>
                            </div>
                          } @empty {
                            <div class="tarefa vazio">
                              <span class="text-sm text-muted">Nenhuma tarefa neste serviço.</span>
                              <button mat-button type="button" (click)="novaTarefa(bloco.servico)"><mat-icon>add</mat-icon> Adicionar tarefa</button>
                            </div>
                          }
                        </div>
                      }
                    </li>
                  }
                </ul>
              }
            </div>
          </mat-tab>
          <mat-tab label="Briefings">
            <ng-container [ngTemplateOutlet]="vinculosTpl" [ngTemplateOutletContext]="{ tipo: 'Briefing', cabecalho: 'Briefings do modelo', icone: 'assignment', titulo: 'briefings', singular: 'briefing', itens: briefings() }" />
          </mat-tab>
          <mat-tab label="Roteiros">
            <ng-container [ngTemplateOutlet]="vinculosTpl" [ngTemplateOutletContext]="{ tipo: 'Roteiro', cabecalho: 'Roteiros do modelo', icone: 'format_list_numbered', titulo: 'roteiros', singular: 'roteiro', itens: roteiros() }" />
          </mat-tab>
          <mat-tab label="Inspirações">
            <ng-container [ngTemplateOutlet]="vinculosTpl" [ngTemplateOutletContext]="{ tipo: 'Inspiracao', cabecalho: 'Inspirações do modelo', icone: 'photo_library', titulo: 'inspirações', singular: 'inspiração', itens: inspiracoes() }" />
          </mat-tab>
          <mat-tab label="RSVP e Mensagens">
            <ng-container [ngTemplateOutlet]="vinculosTpl" [ngTemplateOutletContext]="{ tipo: 'Mensagem', cabecalho: 'RSVP e mensagens do modelo', icone: 'forum', titulo: 'mensagens', singular: 'mensagem', itens: mensagens() }" />
          </mat-tab>
        </mat-tab-group>
      </mat-card-content>
    </mat-card>
  `,
  styles: `
    .nome { display: block; font-weight: 500; }
    .tarefa:hover { background: rgba(128,128,128,.08); }
    .tarefa:focus-visible { outline: 2px solid var(--mat-sys-primary); }
    .modo-agrupamento { position: relative; display: inline-grid; grid-template-columns: 1fr 1fr; margin-bottom: 12px; padding: 3px; border: 1px solid rgba(128,128,128,.3); border-radius: 999px; }
    .modo-agrupamento .marcador { position: absolute; top: 3px; bottom: 3px; left: 3px; width: calc(50% - 3px); border-radius: 999px; background: var(--mat-sys-primary); transition: transform .2s ease; }
    .modo-agrupamento.prazo .marcador { transform: translateX(100%); }
    .modo-agrupamento button { position: relative; z-index: 1; display: flex; align-items: center; justify-content: center; gap: 6px; padding: 6px 14px; border: 0; background: none; color: inherit; font: inherit; font-size: .875rem; cursor: pointer; border-radius: 999px; white-space: nowrap; transition: color .2s; }
    .modo-agrupamento button mat-icon { font-size: 18px; width: 18px; height: 18px; }
    .modo-agrupamento button[aria-checked="true"] { color: var(--mat-sys-on-primary); }
    .modo-agrupamento button:focus-visible { outline: 2px solid var(--mat-sys-primary); outline-offset: 2px; }
    .grupo-cabecalho.vinculo { padding-left: 16px; gap: 12px; flex-wrap: nowrap; }
    .grupo-cabecalho.vinculo .seta { transform: none; }
    .itens { background: rgba(128,128,128,.1); border-top: 1px solid rgba(128,128,128,.3); }
    .tarefa { display: grid; grid-template-columns: minmax(0, 2fr) minmax(120px, 1fr) minmax(120px, 1fr) 56px auto; align-items: center; gap: 12px; padding: 8px 16px 8px 52px; cursor: pointer; }
    .tarefa + .tarefa { border-top: 1px dashed rgba(128,128,128,.2); }
    .tarefa.vazio { display: flex; justify-content: space-between; cursor: default; }
    .item-acoes { display: flex; align-items: center; justify-content: flex-end; gap: 4px; }
    @media (max-width: 900px) {
      .tarefa { grid-template-columns: 1fr auto; padding-left: 16px; }
      .tarefa > :first-child { grid-column: 1 / -1; }
    }
  `,
})
export class ModeloEventoEditorPage implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly negocio = inject(NegocioClient);
  private readonly rota = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly dialog = inject(MatDialog);
  private readonly toast = inject(ToastService);
  protected readonly tipos = TIPOS;
  protected readonly papeis = PAPEIS_RESPONSAVEL_MODELO;
  protected readonly briefings = signal<Briefing[]>([]);
  protected readonly roteiros = signal<Roteiro[]>([]);
  protected readonly inspiracoes = signal<Inspiracao[]>([]);
  protected readonly mensagens = signal<MensagemModelo[]>([]);
  private readonly vinculosMap = signal<Record<string, string[]>>({});
  private readonly buscasVinculo = signal<Record<string, string>>({});
  private readonly catalogo = signal<ServicoConta[]>([]);
  private permissoes: Modelo['permissoes'] | null = null;
  private id = '';
  private sequencia = 0;

  protected readonly servicos = signal<ServicoEdicao[]>([]);
  protected readonly tarefas = signal<TarefaEdicao[]>([]);
  protected readonly busca = signal('');
  protected readonly responsavel = signal('');
  protected readonly alterado = signal(false);
  private readonly abertos = signal<Set<string>>(new Set());

  protected readonly form = this.fb.group({
    nome: ['', Validators.required],
    tipo: ['Casamento', Validators.required],
  });

  protected readonly totalEstimado = computed(() => {
    const valores = this.servicos().map((servico) => servico.valorEstimado).filter((valor): valor is number => valor != null);
    return valores.length > 0 ? valores.reduce((soma, valor) => soma + valor, 0) : null;
  });

  /** Um bloco por serviço, e "Sem serviço" no fim quando há tarefas sem serviço. */
  protected readonly blocos = computed<BlocoServico[]>(() => {
    const tarefas = [...this.tarefas()].sort((a, b) => ordemPrazoRelativo(a.prazoRelativo) - ordemPrazoRelativo(b.prazoRelativo) || a.titulo.localeCompare(b.titulo, 'pt'));
    const blocos: BlocoServico[] = this.servicos().map((servico) => ({
      chave: servico.chave,
      servico,
      tarefas: tarefas.filter((tarefa) => tarefa.servicoChave === servico.chave),
    }));
    const chaves = new Set(this.servicos().map((servico) => servico.chave));
    const soltas = tarefas.filter((tarefa) => !tarefa.servicoChave || !chaves.has(tarefa.servicoChave));
    if (soltas.length > 0) blocos.push({ chave: SEM_SERVICO, servico: null, tarefas: soltas });
    return blocos;
  });

  protected readonly modo = signal<ModoAgrupamento>('servico');

  protected readonly blocosVisiveis = computed<BlocoServico[]>(() =>
    this.modo() === 'prazo' ? this.blocosPrazoVisiveis() : this.blocosServicoVisiveis());

  /** Visão por tempo faltante: um bloco por faixa ("N meses antes"), da mais distante até depois do evento. */
  private readonly blocosPrazoVisiveis = computed<BlocoServico[]>(() => {
    const termo = normalizar(this.busca());
    const papel = this.responsavel();
    const nomes = new Map(this.servicos().map((servico) => [servico.chave, servico.nome]));
    const faixas = new Map<number, BlocoServico>();
    const tarefas = [...this.tarefas()]
      .filter((tarefa) => (!papel || tarefa.responsaveis.includes(papel))
        && (!termo || normalizar(tarefa.titulo).includes(termo) || normalizar(nomes.get(tarefa.servicoChave ?? '') ?? 'Sem serviço').includes(termo)))
      .sort((a, b) => ordemPrazoRelativo(a.prazoRelativo) - ordemPrazoRelativo(b.prazoRelativo) || a.titulo.localeCompare(b.titulo, 'pt'));
    for (const tarefa of tarefas) {
      const faixa = faixaDoPrazo(tarefa.prazoRelativo);
      let bloco = faixas.get(faixa.ordem);
      if (!bloco) faixas.set(faixa.ordem, (bloco = { chave: `prazo:${faixa.ordem}`, servico: null, tarefas: [], rotulo: faixa.rotulo }));
      bloco.tarefas.push(tarefa);
    }
    return [...faixas.entries()].sort(([a], [b]) => a - b).map(([, bloco]) => bloco);
  });

  protected nomeServico(tarefa: TarefaEdicao): string {
    return this.servicos().find((servico) => servico.chave === tarefa.servicoChave)?.nome ?? 'Sem serviço';
  }

  private readonly blocosServicoVisiveis = computed<BlocoServico[]>(() => {
    const termo = normalizar(this.busca());
    const papel = this.responsavel();
    return this.blocos()
      .map((bloco) => {
        const nomeBate = !termo || normalizar(bloco.servico?.nome ?? 'Sem serviço').includes(termo);
        const tarefas = bloco.tarefas.filter((tarefa) =>
          (!papel || tarefa.responsaveis.includes(papel)) && (nomeBate || normalizar(tarefa.titulo).includes(termo)));
        return { ...bloco, tarefas };
      })
      .filter((bloco) => bloco.tarefas.length > 0 || (!papel && (!termo || normalizar(bloco.servico?.nome ?? '').includes(termo))));
  });

  ngOnInit(): void {
    this.id = this.rota.snapshot.paramMap.get('id') ?? '';
    this.negocio.briefings().subscribe({ next: (lista) => this.briefings.set(lista) });
    this.negocio.roteiros().subscribe({ next: (lista) => this.roteiros.set(lista) });
    this.negocio.inspiracoes().subscribe({ next: (lista) => this.inspiracoes.set(lista) });
    this.negocio.mensagens().subscribe({ next: (lista) => this.mensagens.set(lista) });
    this.negocio.servicosConta().subscribe({ next: (lista) => this.catalogo.set(lista) });
    this.form.valueChanges.subscribe(() => {
      if (this.form.dirty) this.alterado.set(true);
    });
    this.carregar();
  }

  // ---------------------------------------------------------------- Serviços e tarefas

  protected prazoTexto(dias: number | null): string {
    return exibirPrazoRelativo(dias);
  }

  protected responsaveisTexto(papeis: string[]): string {
    return papeis.map((papel) => this.papeis.find((item) => item.valor === papel)?.rotulo ?? papel).join(', ');
  }

  protected estaAberto(chave: string): boolean {
    // Buscando ou filtrando, os blocos abrem para mostrar o que bateu.
    return !!normalizar(this.busca()) || !!this.responsavel() || this.abertos().has(chave);
  }

  protected alternar(chave: string): void {
    const novos = new Set(this.abertos());
    if (!novos.delete(chave)) novos.add(chave);
    this.abertos.set(novos);
  }

  protected todosAbertos(): boolean {
    const blocos = this.blocosVisiveis();
    return blocos.length > 0 && blocos.every((bloco) => this.estaAberto(bloco.chave));
  }

  protected readonly tarefasVisiveis = computed(() => this.blocosVisiveis().reduce((soma, bloco) => soma + bloco.tarefas.length, 0));

  /** Cada visão começa com todos os blocos recolhidos. */
  protected trocarModo(modo: ModoAgrupamento): void {
    if (this.modo() === modo) return;
    this.modo.set(modo);
    this.abertos.set(new Set());
  }

  protected alternarTodos(): void {
    this.abertos.set(this.todosAbertos() ? new Set() : new Set(this.blocosVisiveis().map((bloco) => bloco.chave)));
  }

  /** Serviços do cadastro (ou um novo), como na aba Fornecedores do evento. Os que já estão no modelo vêm bloqueados. */
  protected adicionarServicos(): void {
    const noModelo = new Set(this.servicos().map((servico) => servico.servicoContaId).filter((id): id is string => !!id));
    const opcao = (servico: ServicoConta): OpcaoSelecao => ({
      id: servico.id,
      nome: servico.nome,
      bloqueada: noModelo.has(servico.id),
      motivo: 'Já está no modelo',
    });
    this.negocio.servicosConta().subscribe({
      next: (catalogo) => {
        this.catalogo.set(catalogo);
        const porId = new Map(catalogo.map((servico) => [servico.id, servico]));
        const dados: SeletorMultiploDados = {
          titulo: 'Adicionar serviços',
          rotulo: 'Serviços',
          descricao: 'Escolha os serviços do modelo. As tarefas entram depois, em cada serviço.',
          placeholder: 'Buscar serviço',
          textoCriar: 'Cadastrar novo serviço',
          confirmar: 'Adicionar',
          opcoes: catalogo.map(opcao),
          criar: (termo) => this.dialog.open(NovoServicoDialog, { ...DIALOG_PEQUENO, data: { nome: termo } }).afterClosed().pipe(
            map((criados?: ServicoConta[]) => (criados ?? []).map((servico) => {
              porId.set(servico.id, servico);
              this.catalogo.update((lista) => [...lista, servico]);
              return opcao(servico);
            })),
          ),
        };
        this.dialog.open(SeletorMultiploDialog, { ...DIALOG, autoFocus: 'dialog', data: dados }).afterClosed().subscribe((ids?: string[]) => {
          for (const id of ids ?? []) {
            const servico = porId.get(id);
            if (servico) this.abrir(this.garantirServico(servico).chave);
          }
        });
      },
      error: (erro: unknown) => this.toast.erro(mensagemDeErro(erro)),
    });
  }

  protected editarValor(servico: ServicoEdicao): void {
    this.dialog.open(ValorServicoModeloDialog, { ...DIALOG_PEQUENO, data: { nome: servico.nome, valor: servico.valorEstimado } })
      .afterClosed().subscribe((resultado?: { valor: number | null }) => {
        if (!resultado) return;
        this.servicos.update((lista) => lista.map((item) => (item.chave === servico.chave ? { ...item, valorEstimado: resultado.valor } : item)));
        this.marcarAlterado();
      });
  }

  protected removerServico(servico: ServicoEdicao): void {
    const quantas = this.tarefas().filter((tarefa) => tarefa.servicoChave === servico.chave).length;
    const remover = (excluirTarefas: boolean) => {
      this.servicos.update((lista) => lista.filter((item) => item.chave !== servico.chave));
      this.tarefas.update((lista) => excluirTarefas
        ? lista.filter((tarefa) => tarefa.servicoChave !== servico.chave)
        : lista.map((tarefa) => (tarefa.servicoChave === servico.chave ? { ...tarefa, servicoChave: null } : tarefa)));
      this.marcarAlterado();
    };
    if (quantas === 0) {
      remover(false);
      return;
    }
    this.dialog.open(RemoverServicoModeloDialog, { ...DIALOG_PEQUENO, data: { nome: servico.nome, tarefas: quantas } })
      .afterClosed().subscribe((escolha?: 'mover' | 'excluir') => {
        if (escolha) remover(escolha === 'excluir');
      });
  }

  protected novaTarefa(servico: ServicoEdicao | null): void {
    this.abrirFormulario(null, servico?.servicoContaId ?? '');
  }

  protected editarTarefa(tarefa: TarefaEdicao): void {
    this.abrirFormulario(tarefa, this.servicos().find((servico) => servico.chave === tarefa.servicoChave)?.servicoContaId ?? '');
  }

  protected removerTarefa(tarefa: TarefaEdicao): void {
    this.tarefas.update((lista) => lista.filter((item) => item.chave !== tarefa.chave));
    this.marcarAlterado();
  }

  protected emMassa(): void {
    this.dialog.open(AdicionarTarefasEmMassaDialog, { ...DIALOG_EM_MASSA, data: { modo: 'modelo', servicosDoModelo: this.idsNoModelo() } })
      .afterClosed().subscribe((resultado?: ResultadoTarefasEmMassaModelo | boolean) => {
        if (!resultado || resultado === true) return;
        this.catalogo.update((lista) => [...lista, ...resultado.servicosCadastrados.filter((novo) => !lista.some((item) => item.id === novo.id))]);
        const novas = resultado.tarefas.map((tarefa) => this.paraEdicao(tarefa));
        this.tarefas.update((lista) => [...lista, ...novas]);
        const quantas = resultado.tarefas.length;
        this.toast.sucesso(`${quantas} ${quantas === 1 ? 'tarefa adicionada' : 'tarefas adicionadas'}. Salve o modelo para gravar.`);
        this.marcarAlterado();
      });
  }

  private abrirFormulario(tarefa: TarefaEdicao | null, servicoContaId: string): void {
    const edicao: TarefaModeloEdicao | null = tarefa ? { ...tarefa, servicoContaId } : null;
    this.dialog.open(TarefaFormDialog, {
      ...DIALOG,
      data: { eventoId: '', modelo: { tarefa: edicao, servicoContaId, servicosDoModelo: this.idsNoModelo() } },
    }).afterClosed().subscribe((resultado?: boolean | TarefaModeloEdicao) => {
      if (!resultado || resultado === true) return;
      // O formulário já recarrega o cadastro; o serviço escolhido pode ter sido cadastrado agora.
      this.negocio.servicosConta().subscribe({
        next: (catalogo) => {
          this.catalogo.set(catalogo);
          const editada = this.paraEdicao(resultado, tarefa?.chave);
          this.tarefas.update((lista) => (tarefa ? lista.map((item) => (item.chave === tarefa.chave ? editada : item)) : [...lista, editada]));
          this.marcarAlterado();
        },
        error: (erro: unknown) => this.toast.erro(mensagemDeErro(erro)),
      });
    });
  }

  /** Tarefa do formulário (serviço pelo cadastro) para a tela (serviço pela chave), incluindo o serviço se faltar. */
  private paraEdicao(tarefa: TarefaModeloEdicao, chave?: string): TarefaEdicao {
    let servicoChave: string | null = null;
    if (tarefa.servicoContaId) {
      const doCadastro = this.catalogo().find((servico) => servico.id === tarefa.servicoContaId);
      const servico = doCadastro
        ? this.garantirServico(doCadastro)
        : this.servicos().find((item) => item.servicoContaId === tarefa.servicoContaId);
      servicoChave = servico?.chave ?? null;
      if (servicoChave) this.abrir(servicoChave);
    } else {
      this.abrir(SEM_SERVICO);
    }
    return {
      chave: chave ?? this.novaChave(),
      servicoChave,
      titulo: tarefa.titulo,
      descricao: tarefa.descricao,
      prazoRelativo: tarefa.prazoRelativo,
      prioridade: tarefa.prioridade,
      visibilidade: tarefa.visibilidade,
      responsaveis: tarefa.responsaveis,
      checklist: tarefa.checklist,
    };
  }

  private garantirServico(doCadastro: ServicoConta): ServicoEdicao {
    const existente = this.servicos().find((servico) => servico.servicoContaId === doCadastro.id);
    if (existente) return existente;
    const novo: ServicoEdicao = { chave: this.novaChave(), servicoContaId: doCadastro.id, nome: doCadastro.nome, valorEstimado: null, noCadastro: true };
    this.servicos.update((lista) => [...lista, novo]);
    this.marcarAlterado();
    return novo;
  }

  private idsNoModelo(): string[] {
    return this.servicos().map((servico) => servico.servicoContaId).filter((id): id is string => !!id);
  }

  private abrir(chave: string): void {
    this.abertos.set(new Set(this.abertos()).add(chave));
  }

  private novaChave(): string {
    return `nova-${++this.sequencia}`;
  }

  private marcarAlterado(): void {
    this.alterado.set(true);
  }

  // ---------------------------------------------------------------- Vínculos

  protected vinculos(tipo: string): string[] {
    return this.vinculosMap()[tipo] ?? [];
  }

  protected vinculados(tipo: string, itens: ItemBiblioteca[]): ItemBiblioteca[] {
    const ids = this.vinculos(tipo);
    return itens.filter((item) => ids.includes(item.id));
  }

  protected buscaVinculo(tipo: string): string {
    return this.buscasVinculo()[tipo] ?? '';
  }

  protected buscarVinculo(tipo: string, evento: Event): void {
    const termo = (evento.target as HTMLInputElement).value;
    this.buscasVinculo.update((buscas) => ({ ...buscas, [tipo]: termo }));
  }

  protected vinculadosFiltrados(tipo: string, itens: ItemBiblioteca[]): ItemBiblioteca[] {
    const termo = normalizar(this.buscaVinculo(tipo));
    const lista = this.vinculados(tipo, itens);
    return termo ? lista.filter((item) => normalizar(item.nome).includes(termo)) : lista;
  }

  protected adicionarVinculos(tipo: string, titulo: string, itens: ItemBiblioteca[]): void {
    const atuais = this.vinculos(tipo);
    this.dialog.open(SelecionarBibliotecaDialog, { ...DIALOG, data: { titulo, itens, jaVinculados: atuais } })
      .afterClosed().subscribe((novos?: string[]) => {
        if (novos?.length) this.definirVinculos(tipo, [...new Set([...atuais, ...novos])]);
      });
  }

  protected removerVinculo(tipo: string, id: string): void {
    this.definirVinculos(tipo, this.vinculos(tipo).filter((atual) => atual !== id));
  }

  private definirVinculos(tipo: string, ids: string[]): void {
    this.vinculosMap.update((mapa) => {
      const novo = { ...mapa };
      if (ids.length > 0) novo[tipo] = ids;
      else delete novo[tipo];
      return novo;
    });
    this.marcarAlterado();
  }

  // ---------------------------------------------------------------- Gravar

  protected salvar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.toast.erro('Informe o nome do modelo.');
      return;
    }
    const valor = this.form.getRawValue();
    const vinculos = Object.entries(this.vinculosMap()).flatMap(([tipo, ids]) => ids.map((bibliotecaId) => ({ tipo, bibliotecaId })));
    this.negocio.atualizarModelo(this.id, {
      nome: valor.nome,
      tipo: valor.tipo,
      permissoes: this.permissoes,
      servicos: this.servicos().map((servico) => ({
        chave: servico.chave,
        servicoContaId: servico.servicoContaId,
        nome: servico.nome,
        valorEstimado: servico.valorEstimado,
      })),
      tarefas: this.tarefas().map((tarefa) => ({
        servicoChave: tarefa.servicoChave,
        titulo: tarefa.titulo,
        descricao: tarefa.descricao,
        prazoRelativo: tarefa.prazoRelativo,
        prioridade: tarefa.prioridade,
        visibilidade: tarefa.visibilidade,
        responsaveis: tarefa.responsaveis,
        checklist: tarefa.checklist,
      })),
      vinculos,
    }).subscribe({
      next: (modelo) => {
        this.aplicar(modelo);
        this.toast.sucesso('Modelo salvo.');
      },
      error: (erro: unknown) => this.toast.erro(mensagemDeErro(erro)),
    });
  }

  protected voltar(evento: Event): void {
    if (!this.alterado()) return;
    evento.preventDefault();
    this.dialog.open(ConfirmaDialog, {
      ...DIALOG_PEQUENO,
      data: { titulo: 'Sair sem salvar', texto: 'Há alterações não salvas no modelo. Sair assim mesmo?', confirmar: 'Sair' },
    }).afterClosed().subscribe((confirmou) => {
      if (confirmou) void this.router.navigate(['/modelos-evento']);
    });
  }

  protected clonar(): void {
    this.negocio.clonarModelo(this.id).subscribe({
      next: (copia) => {
        this.toast.sucesso('Modelo clonado.');
        void this.router.navigate(['/modelos-evento', copia.id]);
      },
      error: (erro: unknown) => this.toast.erro(mensagemDeErro(erro)),
    });
  }

  protected excluir(): void {
    this.dialog.open(ConfirmaDialog, {
      ...DIALOG_PEQUENO,
      data: { titulo: 'Excluir modelo', texto: 'Confirma a exclusão deste modelo?', confirmar: 'Excluir', destrutivo: true },
    }).afterClosed().subscribe((confirmou) => {
      if (!confirmou) return;
      this.negocio.excluirModelo(this.id).subscribe({
        next: () => {
          this.toast.sucesso('Modelo excluído.');
          void this.router.navigate(['/modelos-evento']);
        },
        error: (erro: unknown) => this.toast.erro(mensagemDeErro(erro)),
      });
    });
  }

  private carregar(): void {
    this.negocio.modelo(this.id).subscribe({
      next: (modelo) => this.aplicar(modelo),
      error: (erro: unknown) => this.toast.erro(mensagemDeErro(erro)),
    });
  }

  private aplicar(modelo: Modelo): void {
    this.form.reset({ nome: modelo.nome, tipo: modelo.tipo });
    this.permissoes = modelo.permissoes;
    this.servicos.set(modelo.servicos.map((servico) => ({
      chave: servico.id,
      servicoContaId: servico.servicoContaId,
      nome: servico.nome,
      valorEstimado: servico.valorEstimado,
      noCadastro: servico.noCadastro,
    })));
    this.tarefas.set(modelo.tarefas.map((tarefa) => ({
      chave: tarefa.id,
      servicoChave: tarefa.servicoModeloId,
      titulo: tarefa.titulo,
      descricao: tarefa.descricao,
      prazoRelativo: tarefa.prazoRelativo,
      prioridade: tarefa.prioridade,
      visibilidade: tarefa.visibilidade,
      responsaveis: tarefa.responsaveis,
      checklist: tarefa.checklist.map((item) => ({ texto: item.texto, prazoRelativo: item.prazoRelativo, responsavelPapel: item.responsavelPapel })),
    })));
    const mapa: Record<string, string[]> = {};
    for (const vinculo of modelo.vinculos) (mapa[vinculo.tipo] ??= []).push(vinculo.bibliotecaId);
    this.vinculosMap.set(mapa);
    this.alterado.set(false);
  }
}

function normalizar(texto: string): string {
  return (texto ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}

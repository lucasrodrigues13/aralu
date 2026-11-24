import { NgTemplateOutlet } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { AbstractControl, FormArray, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatMenuModule } from '@angular/material/menu';
import { MatSelectModule } from '@angular/material/select';
import { MatTabsModule } from '@angular/material/tabs';
import { mensagemDeErro } from '../../core/mensagem-erro';
import {
  Briefing,
  Inspiracao,
  MensagemModelo,
  NegocioClient,
  Roteiro,
  TIPOS,
  TIPOS_ITEM_CHECKLIST,
} from '../../core/negocio.client';
import { ToastService } from '../../core/toast.service';
import { CampoDinheiroComponent } from '../../shared/campo-dinheiro';
import { ConfirmaDialog } from '../../shared/confirma-dialog';
import { DIALOG, DIALOG_LARGO, DIALOG_PEQUENO } from '../../shared/dialog';
import { GdDinheiroPipe } from '../../shared/gd-dinheiro.pipe';
import { exibirPrazo, prazoDeDias, prazoParaDias, UNIDADES_PRAZO, UnidadePrazo } from '../../shared/prazo-modelo';
import { ImportarTarefasModeloDialog } from './importar-tarefas-modelo.dialog';
import { SelecionarBibliotecaDialog, ItemBiblioteca } from './selecionar-biblioteca.dialog';
import { SelecionarServicosModeloDialog, ServicoEscolhido } from './selecionar-servicos-modelo.dialog';
import { MatTooltipModule } from '@angular/material/tooltip';

/** Valor do filtro de grupo que mostra todos; não colide com nomes de grupo, que são aparados. */
const TODOS_GRUPOS = ' todos';

interface GrupoTarefas {
  chave: string;
  nome: string;
  indices: number[];
}

interface DadosServicoModelo {
  nome: string;
  valorEstimado: number | null;
}

/** Edita nome e valor estimado de um serviço do checklist do modelo. */
@Component({
  selector: 'app-editar-servico-modelo-dialog',
  imports: [ReactiveFormsModule, MatDialogModule, MatButtonModule, MatFormFieldModule, MatInputModule, CampoDinheiroComponent],
  template: `
    <h2 mat-dialog-title>Editar serviço</h2>
    <mat-dialog-content>
      <form id="editar-servico-modelo" class="grid grid-cols-1 gap-4" [formGroup]="form" (submit)="salvar(); $event.preventDefault()">
        <div class="campo">
          <mat-label class="font-semibold mb-2 block">Serviço</mat-label>
          <mat-form-field appearance="outline" class="w-full"><input aria-label="Serviço" matInput formControlName="nome" /></mat-form-field>
        </div>
        <app-campo-dinheiro rotulo="Valor estimado" formControlName="valorEstimado" />
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-stroked-button type="button" (click)="ref.close()">Cancelar</button>
      <button mat-flat-button type="submit" form="editar-servico-modelo">Salvar</button>
    </mat-dialog-actions>
  `,
})
export class EditarServicoModeloDialog {
  private readonly fb = inject(FormBuilder);
  protected readonly dados = inject<DadosServicoModelo>(MAT_DIALOG_DATA);
  protected readonly ref = inject(MatDialogRef<EditarServicoModeloDialog, DadosServicoModelo>);
  protected readonly form = this.fb.group({
    nome: [this.dados.nome, Validators.required],
    valorEstimado: [this.dados.valorEstimado],
  });

  protected salvar(): void {
    if (this.form.invalid || !this.form.controls.nome.value?.trim()) {
      this.form.markAllAsTouched();
      return;
    }
    this.ref.close({
      nome: this.form.controls.nome.value.trim(),
      valorEstimado: typeof this.form.controls.valorEstimado.value === 'number' ? this.form.controls.valorEstimado.value : null,
    });
  }
}

@Component({
  selector: 'app-modelo-evento-editor',
  imports: [MatCardModule, ReactiveFormsModule, RouterLink, MatButtonModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatTabsModule, MatIconModule, CampoDinheiroComponent, NgTemplateOutlet, MatTooltipModule, MatMenuModule, GdDinheiroPipe],
  template: `
    <mat-card class="cardWithShadow">
      <div class="p-6 flex flex-wrap items-center justify-between gap-4">
        <div class="flex items-center gap-2">
          <a mat-icon-button routerLink="/modelos-evento" aria-label="Voltar para modelos de evento" matTooltip="Voltar para modelos de evento"><mat-icon>arrow_back</mat-icon></a>
          <div>
            <mat-card-title class="mb-0">Editar modelo</mat-card-title>
            <mat-card-subtitle>Configure checklist, tarefas e vínculos.</mat-card-subtitle>
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
                  @for (tipo of tipos; track tipo.valor) {
                    <mat-option [value]="tipo.valor">{{ tipo.rotulo }}</mat-option>
                  }
                </mat-select>
              </mat-form-field>
            </div>
          </div>
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
                  <button mat-flat-button type="button" (click)="adicionarVinculos(tipo, titulo, itens)"><mat-icon>add_link</mat-icon> Adicionar {{ titulo }}</button>
                </div>
              </div>
              @if (vinculadosTipo.length === 0) {
                <div class="flex flex-col items-center gap-3 text-center text-muted py-10">
                  <p>Nenhum modelo de {{ singular }} vinculado.</p>
                  <button mat-flat-button type="button" (click)="adicionarVinculos(tipo, titulo, itens)"><mat-icon>add_link</mat-icon> Adicionar {{ titulo }}</button>
                </div>
              } @else if (listaTipo.length === 0) {
                <p class="text-center text-muted py-10">Nada encontrado com essa busca.</p>
              } @else {
                <ul class="servicos-lista" [attr.aria-label]="cabecalho">
                  @for (item of listaTipo; track item.id) {
                    <li class="servico">
                      <div class="servico-cabecalho vinculo">
                        <mat-icon class="seta text-muted">{{ icone }}</mat-icon>
                        <span class="servico-texto"><span class="nome">{{ item.nome }}</span></span>
                        <div class="servico-acoes">
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
            <mat-tab label="Checklist">
              <div class="pt-6 pb-4">
                <h4 class="text-base font-semibold mb-0">Checklist do modelo</h4>
                <p class="text-sm text-muted mt-1 mb-0">Serviços e itens que entram em cada evento criado com este modelo.</p>
                <p class="text-sm text-muted mt-1 mb-0" data-teste="resumo-checklist">
                  {{ servicos.length }} {{ servicos.length === 1 ? 'serviço' : 'serviços' }} ·
                  {{ totalItens() }} {{ totalItens() === 1 ? 'item' : 'itens' }} ·
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
                        <input matInput aria-label="Buscar" placeholder="Serviço ou item" [value]="busca()" (input)="buscar($event)" />
                      </mat-form-field>
                    </div>
                    <div class="campo w-full sm:w-44">
                      <mat-label class="font-semibold mb-2 block">Situação</mat-label>
                      <mat-form-field appearance="outline" class="w-full">
                        <mat-select aria-label="Situação" [value]="situacao()" (valueChange)="situacao.set($event)">
                          <mat-option value="">Todos</mat-option>
                          <mat-option value="comItens">Com itens</mat-option>
                          <mat-option value="semItens">Sem itens</mat-option>
                        </mat-select>
                      </mat-form-field>
                    </div>
                  </div>
                  <div class="barra-lista-acoes">
                    @if (servicos.length > 0) {
                      <button mat-stroked-button type="button" (click)="alternarTodos()">
                        <mat-icon>{{ todosAbertos() ? 'unfold_less' : 'unfold_more' }}</mat-icon> {{ todosAbertos() ? 'Recolher todos' : 'Expandir todos' }}
                      </button>
                    }
                    <button mat-flat-button type="button" (click)="adicionarServicos()"><mat-icon>playlist_add</mat-icon> Adicionar serviços</button>
                  </div>
                </div>

                @if (servicos.length === 0) {
                  <div class="flex flex-col items-center gap-3 text-center text-muted py-10">
                    <p>Nenhum serviço neste modelo ainda.</p>
                    <button mat-flat-button type="button" (click)="adicionarServicos()"><mat-icon>playlist_add</mat-icon> Adicionar serviços</button>
                  </div>
                } @else if (!algumVisivel()) {
                  <p class="text-center text-muted py-10">Nada encontrado com esses filtros.</p>
                } @else {
                  <ul class="servicos-lista" aria-label="Serviços do checklist" formArrayName="servicos">
                    @for (servico of servicos.controls; track servico; let i = $index) {
                      @if (servicoVisivel(i)) {
                        <li class="servico" [class.aberto]="estaAberto(servico)" [formGroupName]="i">
                          <div class="servico-cabecalho">
                            <button type="button" class="servico-alternar" [attr.aria-expanded]="estaAberto(servico)"
                              [attr.aria-controls]="'itens-servico-' + i" (click)="alternar(servico)">
                              <mat-icon class="seta">expand_more</mat-icon>
                              <span class="servico-texto">
                                <span class="nome">{{ servico.get('nome')?.value || 'Serviço sem nome' }}</span>
                                <span class="block text-xs text-muted">Estimado {{ valorEstimado(i) | gdDinheiro }}</span>
                              </span>
                              @if (itensDe(i).length === 0) {
                                <span class="inline-block rounded font-semibold px-2 py-1 text-xs whitespace-nowrap bg-light-error text-error">Sem itens</span>
                              } @else {
                                <span class="inline-block rounded font-semibold px-2 py-1 text-xs whitespace-nowrap neutro">
                                  {{ itensDe(i).length }} {{ itensDe(i).length === 1 ? 'item' : 'itens' }}
                                </span>
                              }
                            </button>
                            <div class="servico-acoes">
                              <button mat-stroked-button type="button" (click)="adicionarItem(i)"><mat-icon>add</mat-icon> Item</button>
                              <button mat-icon-button type="button" aria-label="Ações do serviço" matTooltip="Ações do serviço" [matMenuTriggerFor]="menuServico"><mat-icon>more_vert</mat-icon></button>
                              <mat-menu #menuServico="matMenu" xPosition="before">
                                <button mat-menu-item type="button" (click)="editarServico(i)"><mat-icon>edit</mat-icon> Nome e valor estimado</button>
                                <button mat-menu-item type="button" (click)="removerServico(i)"><mat-icon>delete</mat-icon> Remover serviço</button>
                              </mat-menu>
                            </div>
                          </div>
                          @if (estaAberto(servico)) {
                            <div class="itens" [id]="'itens-servico-' + i" formArrayName="itens">
                              @for (item of itensDe(i).controls; track item; let j = $index) {
                                <div class="item" [formGroupName]="j">
                                  <mat-form-field appearance="outline" class="w-full" subscriptSizing="dynamic">
                                    <mat-select aria-label="Tipo" formControlName="tipo">
                                      @for (t of tiposItem; track t.valor) {
                                        <mat-option [value]="t.valor">{{ t.rotulo }}</mat-option>
                                      }
                                    </mat-select>
                                  </mat-form-field>
                                  <mat-form-field appearance="outline" class="w-full" subscriptSizing="dynamic">
                                    <input aria-label="Texto" matInput formControlName="texto" placeholder="Descreva o item" />
                                  </mat-form-field>
                                  <div class="item-acoes">
                                    <button mat-icon-button type="button" aria-label="Remover item" matTooltip="Remover item" (click)="removerItem(i, j)"><mat-icon>delete</mat-icon></button>
                                  </div>
                                </div>
                              } @empty {
                                <div class="item vazio">
                                  <span class="text-sm text-muted">Nenhum item neste serviço.</span>
                                  <button mat-button type="button" (click)="adicionarItem(i)"><mat-icon>add</mat-icon> Adicionar item</button>
                                </div>
                              }
                            </div>
                          }
                        </li>
                      }
                    }
                  </ul>
                }
              </div>
            </mat-tab>
            <mat-tab label="Tarefas">
              @let grupos = gruposVisiveis();
              <div class="pt-6 pb-4">
                <h4 class="text-base font-semibold mb-0">Tarefas do modelo</h4>
                <p class="text-sm text-muted mt-1 mb-0">Tarefas criadas em cada evento, com o prazo contado a partir da data do evento.</p>
                <p class="text-sm text-muted mt-1 mb-0" data-teste="resumo-tarefas">
                  {{ tarefas.length }} {{ tarefas.length === 1 ? 'tarefa' : 'tarefas' }} ·
                  {{ gruposTarefas().length }} {{ gruposTarefas().length === 1 ? 'grupo' : 'grupos' }}
                </p>
              </div>
              <div class="border-t border-border pt-6" formArrayName="tarefas">
                <div class="barra-lista">
                  <div class="barra-lista-filtros">
                    <div class="campo w-full sm:w-64">
                      <mat-label class="font-semibold mb-2 block">Buscar</mat-label>
                      <mat-form-field appearance="outline" class="w-full">
                        <mat-icon matIconPrefix>search</mat-icon>
                        <input matInput aria-label="Buscar tarefa" placeholder="Tarefa ou grupo" [value]="buscaTarefa()" (input)="buscaTarefa.set($any($event.target).value)" />
                      </mat-form-field>
                    </div>
                    <div class="campo w-full sm:w-44">
                      <mat-label class="font-semibold mb-2 block">Grupo</mat-label>
                      <mat-form-field appearance="outline" class="w-full">
                        <mat-select aria-label="Grupo" [value]="grupoFiltro()" (valueChange)="grupoFiltro.set($event)">
                          <mat-option [value]="todosGrupos">Todos</mat-option>
                          @for (grupo of gruposTarefas(); track grupo.chave) {
                            <mat-option [value]="grupo.chave">{{ grupo.nome }}</mat-option>
                          }
                        </mat-select>
                      </mat-form-field>
                    </div>
                  </div>
                  <div class="barra-lista-acoes">
                    @if (tarefas.length > 0) {
                      <button mat-stroked-button type="button" (click)="alternarTodosGrupos()">
                        <mat-icon>{{ todosGruposAbertos() ? 'unfold_less' : 'unfold_more' }}</mat-icon> {{ todosGruposAbertos() ? 'Recolher todos' : 'Expandir todos' }}
                      </button>
                    }
                    <button mat-stroked-button type="button" (click)="colarTarefas()"><mat-icon>content_paste</mat-icon> Colar tarefas</button>
                    <button mat-flat-button type="button" (click)="adicionarTarefa(grupoFiltro() === todosGrupos ? null : grupoFiltro())"><mat-icon>add_task</mat-icon> Adicionar tarefa</button>
                  </div>
                </div>

                @if (tarefas.length === 0) {
                  <div class="flex flex-col items-center gap-3 text-center text-muted py-10">
                    <p>Nenhuma tarefa neste modelo ainda.</p>
                    <button mat-flat-button type="button" (click)="adicionarTarefa(null)"><mat-icon>add_task</mat-icon> Adicionar tarefa</button>
                  </div>
                } @else if (grupos.length === 0) {
                  <p class="text-center text-muted py-10">Nada encontrado com esses filtros.</p>
                } @else {
                  <ul class="servicos-lista" aria-label="Tarefas do modelo">
                    @for (grupo of grupos; track grupo.chave) {
                      <li class="servico" [class.aberto]="grupoAberto(grupo.chave)">
                        <div class="servico-cabecalho">
                          <button type="button" class="servico-alternar" [attr.aria-expanded]="grupoAberto(grupo.chave)"
                            [attr.aria-controls]="'tarefas-grupo-' + $index" (click)="alternarGrupo(grupo.chave)">
                            <mat-icon class="seta">expand_more</mat-icon>
                            <span class="servico-texto">
                              <span class="nome">{{ grupo.nome }}</span>
                              <span class="block text-xs text-muted">{{ grupo.chave ? 'Grupo de tarefas' : 'Tarefas sem grupo informado' }}</span>
                            </span>
                            <span class="inline-block rounded font-semibold px-2 py-1 text-xs whitespace-nowrap neutro">
                              {{ grupo.indices.length }} {{ grupo.indices.length === 1 ? 'tarefa' : 'tarefas' }}
                            </span>
                          </button>
                          <div class="servico-acoes">
                            <button mat-stroked-button type="button" (click)="adicionarTarefa(grupo.chave)"><mat-icon>add</mat-icon> Tarefa</button>
                          </div>
                        </div>
                        @if (grupoAberto(grupo.chave)) {
                          <div class="itens" [id]="'tarefas-grupo-' + $index">
                            @for (i of grupo.indices; track tarefas.at(i)) {
                              <div class="tarefa" [formGroupName]="i">
                                <div class="min-w-0">
                                  <mat-form-field appearance="outline" class="w-full" subscriptSizing="dynamic">
                                    <input aria-label="Título" matInput formControlName="titulo" placeholder="Título da tarefa" />
                                  </mat-form-field>
                                  <span class="block text-xs text-muted mt-1">{{ textoPrazo(i) }}</span>
                                </div>
                                <mat-form-field appearance="outline" class="w-full" subscriptSizing="dynamic">
                                  <input aria-label="Grupo" matInput formControlName="grupo" maxlength="80" placeholder="Grupo" />
                                </mat-form-field>
                                @if (mostraQuantidade(i)) {
                                  <mat-form-field appearance="outline" class="w-full" subscriptSizing="dynamic">
                                    <input aria-label="Prazo" matInput type="number" min="0" max="999" formControlName="quantidade" />
                                  </mat-form-field>
                                } @else {
                                  <span></span>
                                }
                                <mat-form-field appearance="outline" class="w-full" subscriptSizing="dynamic">
                                  <mat-select [attr.aria-label]="mostraQuantidade(i) ? 'Unidade' : 'Prazo'" formControlName="unidade">
                                    @for (u of unidadesPrazo; track u.valor) {
                                      <mat-option [value]="u.valor">{{ u.rotulo }}</mat-option>
                                    }
                                  </mat-select>
                                </mat-form-field>
                                <div class="item-acoes">
                                  <button mat-icon-button type="button" aria-label="Remover tarefa" matTooltip="Remover tarefa" (click)="removerTarefa(i)"><mat-icon>delete</mat-icon></button>
                                </div>
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
        </form>
      </mat-card-content>
    </mat-card>
  `,
  styles: `
    .nome { display: block; font-weight: 500; }
    .servicos-lista { list-style: none; padding: 0; margin: 0; border: 1px solid rgba(128,128,128,.25); border-radius: 8px; overflow: hidden; }
    .servico + .servico { border-top: 1px solid rgba(128,128,128,.25); }
    .servico-cabecalho { display: flex; align-items: center; gap: 8px; padding: 8px 12px 8px 4px; }
    .servico-cabecalho:hover, .item:hover { background: rgba(128,128,128,.08); }
    .servico-alternar { flex: 1; min-width: 0; display: flex; align-items: center; gap: 12px; padding: 8px; border: 0; background: none; color: inherit; font: inherit; text-align: left; cursor: pointer; border-radius: 6px; }
    .servico-alternar:focus-visible { outline: 2px solid var(--mat-sys-primary); }
    .servico-texto { flex: 1; min-width: 0; }
    .seta { transition: transform .15s; flex-shrink: 0; }
    .servico.aberto .seta { transform: rotate(180deg); }
    .servico-acoes { display: flex; align-items: center; gap: 4px; flex-shrink: 0; }
    .itens { background: rgba(128,128,128,.1); border-top: 1px solid rgba(128,128,128,.3); }
    .item { display: grid; grid-template-columns: 200px minmax(0, 1fr) auto; align-items: center; gap: 12px; padding: 10px 16px 10px 52px; }
    .item + .item { border-top: 1px dashed rgba(128,128,128,.2); }
    .tarefa { display: grid; grid-template-columns: minmax(0, 1.6fr) minmax(120px, 1fr) 80px minmax(130px, 170px) auto; align-items: start; gap: 12px; padding: 10px 16px 10px 52px; }
    .tarefa + .tarefa { border-top: 1px dashed rgba(128,128,128,.2); }
    .tarefa:hover { background: rgba(128,128,128,.08); }
    .tarefa .item-acoes { padding-top: 4px; }
    .servico-cabecalho.vinculo { padding: 8px 12px 8px 16px; gap: 12px; }
    .item.vazio { display: flex; justify-content: space-between; align-items: center; }
    .item-acoes { display: flex; align-items: center; justify-content: flex-end; gap: 4px; }
    @media (max-width: 900px) {
      .item { grid-template-columns: 1fr auto; padding-left: 16px; }
      .item > mat-form-field:first-child { grid-column: 1 / -1; }
      .tarefa { grid-template-columns: 1fr 1fr; padding-left: 16px; }
      .tarefa > :first-child { grid-column: 1 / -1; }
      .tarefa .item-acoes { grid-column: 1 / -1; justify-content: flex-start; padding-top: 0; }
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
  protected readonly tiposItem = TIPOS_ITEM_CHECKLIST;
  protected readonly unidadesPrazo = UNIDADES_PRAZO;
  protected readonly briefings = signal<Briefing[]>([]);
  protected readonly roteiros = signal<Roteiro[]>([]);
  protected readonly inspiracoes = signal<Inspiracao[]>([]);
  protected readonly mensagens = signal<MensagemModelo[]>([]);
  private readonly vinculosMap = signal<Record<string, string[]>>({});
  protected readonly busca = signal('');
  protected readonly situacao = signal<'' | 'comItens' | 'semItens'>('');
  protected readonly buscaTarefa = signal('');
  protected readonly grupoFiltro = signal<string>(TODOS_GRUPOS);
  protected readonly todosGrupos = TODOS_GRUPOS;
  private readonly gruposAbertos = signal<Set<string>>(new Set());
  private readonly buscasVinculo = signal<Record<string, string>>({});
  protected readonly abertos = signal<Set<AbstractControl>>(new Set());
  private id = '';

  protected readonly form = this.fb.group({
    nome: ['', Validators.required],
    tipo: ['Casamento', Validators.required],
    permissoes: this.fb.nonNullable.group({
      gerais: true,
      planejamento: true,
      tarefas: true,
      servicosFornecedores: true,
      convites: true,
    }),
    servicos: this.fb.array([]),
    tarefas: this.fb.array([]),
  });

  protected get servicos(): FormArray {
    return this.form.get('servicos') as FormArray;
  }

  protected get tarefas(): FormArray {
    return this.form.get('tarefas') as FormArray;
  }

  protected itensDe(indice: number): FormArray {
    return this.servicos.at(indice).get('itens') as FormArray;
  }

  ngOnInit(): void {
    this.id = this.rota.snapshot.paramMap.get('id') ?? '';
    this.negocio.briefings().subscribe({ next: (lista) => this.briefings.set(lista) });
    this.negocio.roteiros().subscribe({ next: (lista) => this.roteiros.set(lista) });
    this.negocio.inspiracoes().subscribe({ next: (lista) => this.inspiracoes.set(lista) });
    this.negocio.mensagens().subscribe({ next: (lista) => this.mensagens.set(lista) });
    this.negocio.modelo(this.id).subscribe({
      next: (modelo) => {
        this.form.patchValue({
          nome: modelo.nome,
          tipo: modelo.tipo,
          permissoes: modelo.permissoes,
        });
        this.servicos.clear();
        this.abertos.set(new Set());
        for (const servico of modelo.servicos) {
          const grupo = this.novoServico(servico.nome, servico.valorEstimado);
          const itens = grupo.get('itens') as FormArray;
          for (const item of servico.itens) {
            itens.push(this.fb.nonNullable.group({ tipo: item.tipo, texto: item.texto }));
          }
          this.servicos.push(grupo);
        }
        this.tarefas.clear();
        for (const tarefa of modelo.tarefas) {
          this.tarefas.push(this.novaTarefa(tarefa.titulo, tarefa.grupo, tarefa.diasAntes));
        }
        const mapa: Record<string, string[]> = {};
        for (const vinculo of modelo.vinculos) {
          (mapa[vinculo.tipo] ??= []).push(vinculo.bibliotecaId);
        }
        this.vinculosMap.set(mapa);
      },
      error: (erro: unknown) => this.toast.erro(mensagemDeErro(erro)),
    });
  }

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
    this.dialog.open(SelecionarBibliotecaDialog, {
      ...DIALOG,
      data: { titulo, itens, jaVinculados: atuais },
    }).afterClosed().subscribe((novos?: string[]) => {
      if (novos?.length) {
        this.definirVinculos(tipo, [...new Set([...atuais, ...novos])]);
      }
    });
  }

  protected removerVinculo(tipo: string, id: string): void {
    this.definirVinculos(tipo, this.vinculos(tipo).filter((atual) => atual !== id));
  }

  protected definirVinculos(tipo: string, ids: string[]): void {
    this.vinculosMap.update((mapa) => {
      const novo = { ...mapa };
      if (ids.length > 0) {
        novo[tipo] = ids;
      } else {
        delete novo[tipo];
      }
      return novo;
    });
  }

  protected buscar(evento: Event): void {
    this.busca.set((evento.target as HTMLInputElement).value);
    // Buscando por item, o serviço abre para mostrar o que bateu.
    const termo = normalizar(this.busca());
    if (!termo) {
      return;
    }
    const novos = new Set(this.abertos());
    this.servicos.controls.forEach((servico, i) => {
      if (this.textosItens(i).some((texto) => texto.includes(termo))) {
        novos.add(servico);
      }
    });
    this.abertos.set(novos);
  }

  protected servicoVisivel(indice: number): boolean {
    const situacao = this.situacao();
    const qtdItens = this.itensDe(indice).length;
    if ((situacao === 'comItens' && qtdItens === 0) || (situacao === 'semItens' && qtdItens > 0)) {
      return false;
    }
    const termo = normalizar(this.busca());
    if (!termo) {
      return true;
    }
    const nome = normalizar(String(this.servicos.at(indice).get('nome')?.value ?? ''));
    return nome.includes(termo) || this.textosItens(indice).some((texto) => texto.includes(termo));
  }

  protected algumVisivel(): boolean {
    return this.servicos.controls.some((_, i) => this.servicoVisivel(i));
  }

  protected totalItens(): number {
    return this.servicos.controls.reduce((soma, _, i) => soma + this.itensDe(i).length, 0);
  }

  protected totalEstimado(): number | null {
    const valores = this.servicos.controls.map((_, i) => this.valorEstimado(i)).filter((valor): valor is number => valor !== null);
    return valores.length > 0 ? valores.reduce((soma, valor) => soma + valor, 0) : null;
  }

  protected todosAbertos(): boolean {
    const visiveis = this.servicos.controls.filter((_, i) => this.servicoVisivel(i));
    return visiveis.length > 0 && visiveis.every((servico) => this.abertos().has(servico));
  }

  protected alternarTodos(): void {
    if (this.todosAbertos()) {
      this.abertos.set(new Set());
      return;
    }
    this.abertos.set(new Set(this.servicos.controls.filter((_, i) => this.servicoVisivel(i))));
  }

  protected estaAberto(servico: AbstractControl): boolean {
    return this.abertos().has(servico);
  }

  protected alternar(servico: AbstractControl): void {
    const novos = new Set(this.abertos());
    if (!novos.delete(servico)) novos.add(servico);
    this.abertos.set(novos);
  }

  private abrir(servico: AbstractControl): void {
    this.abertos.set(new Set(this.abertos()).add(servico));
  }

  protected valorEstimado(indice: number): number | null {
    const valor = this.servicos.at(indice).get('valorEstimado')?.value;
    return typeof valor === 'number' ? valor : null;
  }

  protected editarServico(indice: number): void {
    const servico = this.servicos.at(indice);
    this.dialog.open(EditarServicoModeloDialog, {
      ...DIALOG_PEQUENO,
      data: { nome: servico.get('nome')?.value ?? '', valorEstimado: this.valorEstimado(indice) },
    }).afterClosed().subscribe((dados?: DadosServicoModelo) => {
      if (dados) {
        servico.patchValue(dados);
      }
    });
  }

  private textosItens(indice: number): string[] {
    return (this.itensDe(indice).getRawValue() as { texto: string }[]).map((item) => normalizar(item.texto ?? ''));
  }

  protected adicionarServicos(): void {
    const jaAdicionados = (this.servicos.getRawValue() as { nome: string }[]).map((servico) => servico.nome);
    this.dialog.open(SelecionarServicosModeloDialog, {
      ...DIALOG,
      data: { jaAdicionados },
    }).afterClosed().subscribe((escolhidos?: ServicoEscolhido[]) => {
      for (const servico of escolhidos ?? []) {
        const grupo = this.novoServico(servico.nome, servico.valorEstimado);
        this.servicos.push(grupo);
        this.abrir(grupo);
      }
    });
  }

  protected removerServico(indice: number): void {
    const novos = new Set(this.abertos());
    novos.delete(this.servicos.at(indice));
    this.abertos.set(novos);
    this.servicos.removeAt(indice);
  }

  protected adicionarItem(indice: number): void {
    this.itensDe(indice).push(this.fb.nonNullable.group({ tipo: 'Tarefa', texto: '' }));
    this.abrir(this.servicos.at(indice));
  }

  protected removerItem(servico: number, item: number): void {
    this.itensDe(servico).removeAt(item);
  }

  /** Grupos das tarefas na ordem em que aparecem; a chave vazia junta as tarefas sem grupo. */
  protected gruposTarefas(): GrupoTarefas[] {
    const grupos = new Map<string, GrupoTarefas>();
    this.tarefas.controls.forEach((tarefa, i) => {
      const chave = chaveGrupo(tarefa.get('grupo')?.value);
      const grupo = grupos.get(chave) ?? { chave, nome: chave || 'Sem grupo', indices: [] };
      grupo.indices.push(i);
      grupos.set(chave, grupo);
    });
    return [...grupos.values()];
  }

  protected gruposVisiveis(): GrupoTarefas[] {
    const termo = normalizar(this.buscaTarefa());
    const filtro = this.grupoFiltro();
    return this.gruposTarefas()
      .filter((grupo) => filtro === TODOS_GRUPOS || grupo.chave === filtro)
      .map((grupo) => {
        if (!termo || normalizar(grupo.nome).includes(termo)) {
          return grupo;
        }
        const indices = grupo.indices.filter((i) => normalizar(String(this.tarefas.at(i).get('titulo')?.value ?? '')).includes(termo));
        return { ...grupo, indices };
      })
      .filter((grupo) => grupo.indices.length > 0);
  }

  protected grupoAberto(chave: string): boolean {
    // Buscando, os grupos abrem para mostrar as tarefas encontradas.
    return !!normalizar(this.buscaTarefa()) || this.gruposAbertos().has(chave);
  }

  protected alternarGrupo(chave: string): void {
    const novos = new Set(this.gruposAbertos());
    if (!novos.delete(chave)) novos.add(chave);
    this.gruposAbertos.set(novos);
  }

  private abrirGrupo(chave: string): void {
    this.gruposAbertos.set(new Set(this.gruposAbertos()).add(chave));
  }

  protected todosGruposAbertos(): boolean {
    const grupos = this.gruposVisiveis();
    return grupos.length > 0 && grupos.every((grupo) => this.grupoAberto(grupo.chave));
  }

  protected alternarTodosGrupos(): void {
    this.gruposAbertos.set(this.todosGruposAbertos() ? new Set() : new Set(this.gruposVisiveis().map((grupo) => grupo.chave)));
  }

  protected adicionarTarefa(grupo: string | null): void {
    this.tarefas.push(this.novaTarefa('', grupo || null, null));
    this.abrirGrupo(chaveGrupo(grupo));
  }

  protected colarTarefas(): void {
    this.dialog.open(ImportarTarefasModeloDialog, {
      ...DIALOG_LARGO,
      data: { modeloId: this.id, tipoPadrao: this.form.controls.tipo.value },
    }).afterClosed().subscribe((ok) => {
      if (ok) {
        this.ngOnInit();
      }
    });
  }

  protected removerTarefa(indice: number): void {
    this.tarefas.removeAt(indice);
  }

  protected mostraQuantidade(indice: number): boolean {
    const unidade = this.tarefas.at(indice).get('unidade')?.value as UnidadePrazo;
    return unidade === 'dias' || unidade === 'semanas' || unidade === 'meses';
  }

  protected textoPrazo(indice: number): string {
    const raw = this.tarefas.at(indice).getRawValue() as {
      quantidade: number | string | null;
      unidade: UnidadePrazo;
    };
    const qtd = raw.quantidade === '' || raw.quantidade == null ? null : Number(raw.quantidade);
    return exibirPrazo(prazoParaDias(qtd, raw.unidade));
  }

  protected salvar(): void {
    const valor = this.form.getRawValue() as {
      nome: string | null;
      tipo: string | null;
      permissoes: Record<string, boolean>;
      servicos: { nome: string; valorEstimado: number | string | null; itens: { tipo: string; texto: string }[] }[];
      tarefas: { titulo: string; grupo: string | null; quantidade: number | string | null; unidade: UnidadePrazo }[];
    };
    const vinculos = Object.entries(this.vinculosMap()).flatMap(([tipo, ids]) => ids.map((bibliotecaId) => ({ tipo, bibliotecaId })));
    this.negocio.atualizarModelo(this.id, {
      nome: valor.nome,
      tipo: valor.tipo,
      permissoes: valor.permissoes,
      servicos: (valor.servicos ?? []).map((servico) => ({
        nome: servico.nome,
        valorEstimado: typeof servico.valorEstimado === 'number' ? servico.valorEstimado : null,
        itens: (servico.itens ?? []).filter((item) => item.texto?.trim()),
      })),
      tarefas: (valor.tarefas ?? []).map((tarefa) => {
        const qtd = tarefa.quantidade === '' || tarefa.quantidade == null ? null : Number(tarefa.quantidade);
        return {
          titulo: tarefa.titulo,
          grupo: tarefa.grupo?.trim() || null,
          diasAntes: prazoParaDias(qtd, tarefa.unidade),
        };
      }),
      vinculos,
    }).subscribe({
      next: () => this.toast.sucesso('Modelo salvo.'),
      error: (erro: unknown) => this.toast.erro(mensagemDeErro(erro)),
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
      data: { titulo: 'Excluir modelo', texto: 'Confirma a exclusão deste modelo?', confirmar: 'Excluir' },
    }).afterClosed().subscribe((confirmou) => {
      if (!confirmou) {
        return;
      }
      this.negocio.excluirModelo(this.id).subscribe({
        next: () => {
          this.toast.sucesso('Modelo excluído.');
          void this.router.navigate(['/modelos-evento']);
        },
        error: (erro: unknown) => this.toast.erro(mensagemDeErro(erro)),
      });
    });
  }

  private novoServico(nome: string, valorEstimado: number | null) {
    return this.fb.group({
      nome: [nome, Validators.required],
      valorEstimado: [valorEstimado as number | null],
      itens: this.fb.array([]),
    });
  }

  private novaTarefa(titulo: string, grupo: string | null, diasAntes: number | null) {
    const decomposto = prazoDeDias(diasAntes);
    const campoGrupo = this.fb.control(grupo, { updateOn: 'blur' });
    campoGrupo.valueChanges.subscribe((valor) => this.abrirGrupo(chaveGrupo(valor)));
    return this.fb.group({
      titulo: [titulo, Validators.required],
      grupo: campoGrupo,
      quantidade: [decomposto.quantidade as number | null],
      unidade: [decomposto.unidade as UnidadePrazo],
    });
  }

}

function normalizar(texto: string): string {
  return texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
}

function chaveGrupo(valor: unknown): string {
  return typeof valor === 'string' ? valor.trim() : '';
}

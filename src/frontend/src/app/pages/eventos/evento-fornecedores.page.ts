import { ExpandirTodosComponent } from '../../shared/expandir-todos.component';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { firstValueFrom, map, Observable } from 'rxjs';
import { DecimalPipe } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule, MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { validarComprovante } from '../../core/dinheiro.client';
import { mensagemDeErro } from '../../core/mensagem-erro';
import {
  BudgetEvento,
  ETAPAS_NEGOCIACAO,
  EventoDetalhe,
  EventoServico,
  FornecedorResumo,
  NegocioClient,
  ServicoConta,
} from '../../core/negocio.client';
import { ToastService } from '../../core/toast.service';
import { CampoDinheiroComponent } from '../../shared/campo-dinheiro';
import { ConfirmaDialog } from '../../shared/confirma-dialog';
import { DIALOG, DIALOG_PEQUENO } from '../../shared/dialog';
import { ComprovanteDialog } from '../dinheiro/comprovante.dialog';
import { GdDinheiroPipe } from '../../shared/gd-dinheiro.pipe';
import { DIALOG_FORNECEDOR, FornecedorFormDialog } from '../fornecedores/fornecedor-form.dialog';
import { NovoServicoDialog } from '../fornecedores/novo-servico.dialog';
import { EventoAbasComponent } from './evento-abas.component';
import { GraficoOrcamento, RoscaServicos, montarGraficoOrcamento, montarRoscaPorServico } from './orcamento-graficos';
import { OpcaoSelecao, SeletorMultiploDados, SeletorMultiploDialog } from './seletor-multiplo.dialog';

interface ContratarResultado {
  valor: number;
  arquivo: File | null;
}

@Component({
  selector: 'app-contratar-dialog',
  imports: [ReactiveFormsModule, MatDialogModule, MatButtonModule, CampoDinheiroComponent],
  template: `
    <h2 mat-dialog-title>Contratar fornecedor</h2>
    <p class="text-muted text-sm px-6 -mt-2 mb-4">{{ dados.fornecedor }} · {{ dados.servico }}. O parcelamento é feito depois, na aba Financeiro.</p>
    <mat-dialog-content>
      <form id="contratar" class="grid grid-cols-1 gap-4" [formGroup]="form" (submit)="confirmar(); $event.preventDefault()">
        <app-campo-dinheiro rotulo="Valor" formControlName="valor" />
        <div class="campo">
          <span class="font-semibold mb-2 block">Contrato assinado (opcional)</span>
          <input aria-label="Contrato assinado" type="file" accept=".jpg,.jpeg,.png,.pdf,image/jpeg,image/png,application/pdf" (change)="escolher($event)" />
          <p class="text-xs text-muted mt-1">Arquivo assinado pelo fornecedor e pelo cliente. JPG, JPEG, PNG ou PDF de até 5 MB. Também dá para anexar depois.</p>
          @if (erro()) { <p class="text-error text-xs">{{ erro() }}</p> }
        </div>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-stroked-button type="button" (click)="ref.close()">Cancelar</button>
      <button mat-flat-button type="submit" form="contratar">Contratar</button>
    </mat-dialog-actions>
  `,
})
export class ContratarDialog {
  private readonly fb = inject(FormBuilder);
  private readonly toast = inject(ToastService);
  protected readonly dados = inject<{ fornecedor: string; servico: string; valor: number | null }>(MAT_DIALOG_DATA);
  protected readonly ref = inject(MatDialogRef<ContratarDialog, ContratarResultado>);
  protected readonly erro = signal('');
  private arquivo: File | null = null;
  protected readonly form = this.fb.group({
    valor: this.fb.control<number | null>(this.dados.valor, Validators.required),
  });

  protected escolher(evento: Event): void {
    const escolhido = (evento.target as HTMLInputElement).files?.[0] ?? null;
    const problema = escolhido ? validarComprovante(escolhido) : null;
    this.erro.set(problema ?? '');
    this.arquivo = problema ? null : escolhido;
  }

  protected confirmar(): void {
    if (this.form.invalid || this.form.controls.valor.value === null) {
      this.form.markAllAsTouched();
      this.toast.erro('Informe o valor do contrato.');
      return;
    }
    if (this.erro()) {
      return;
    }
    this.ref.close({ valor: this.form.controls.valor.value, arquivo: this.arquivo });
  }
}
@Component({
  selector: 'app-subitens-dialog',
  imports: [ReactiveFormsModule, MatDialogModule, MatButtonModule, MatFormFieldModule, MatInputModule, MatIconModule, CampoDinheiroComponent, MatTooltipModule],
  template: `
    <h2 mat-dialog-title>Subitens — {{ dados.nome }}</h2>
    <mat-dialog-content>
      <form class="grid grid-cols-1 gap-4" [formGroup]="form">
        <app-campo-dinheiro rotulo="Valor estimado (sem subitens)" formControlName="valorEstimado" />
        <div formArrayName="subitens">
          @for (ctrl of subitens.controls; track $index; let i = $index) {
            <div class="grid grid-cols-1 sm:grid-cols-[1fr_88px_160px_auto] gap-3 items-end mb-3" [formGroupName]="i">
              <div class="campo">
                <mat-label class="font-semibold mb-2 block">Descrição</mat-label>
                <mat-form-field appearance="outline" class="w-full"><input [attr.aria-label]="'Descrição'" matInput formControlName="descricao" /></mat-form-field>
              </div>
              <div class="campo">
                <mat-label class="font-semibold mb-2 block">Qtd</mat-label>
                <mat-form-field appearance="outline" class="w-full"><input [attr.aria-label]="'Qtd'" matInput type="number" min="1" formControlName="quantidade" /></mat-form-field>
              </div>
              <app-campo-dinheiro rotulo="Unitário" formControlName="valorUnitario" />
              <button mat-icon-button type="button" aria-label="Remover" matTooltip="Remover" (click)="remover(i)"><mat-icon>delete</mat-icon></button>
            </div>
          }
        </div>
        <button mat-stroked-button type="button" (click)="adicionar()"><mat-icon>add</mat-icon> Subitem</button>
        <p class="block text-xs text-muted">Com subitens, o estimado do serviço vira a soma (quantidade × unitário).</p>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-stroked-button type="button" (click)="ref.close()">Cancelar</button>
      <button mat-flat-button type="button" (click)="salvar()">Salvar</button>
    </mat-dialog-actions>
  `,
})
export class SubitensDialog {
  private readonly fb = inject(FormBuilder);
  protected readonly dados = inject<{ nome: string; valorEstimado: number | null; subitens: { descricao: string; quantidade: number; valorUnitario: number }[] }>(MAT_DIALOG_DATA);
  protected readonly ref = inject(MatDialogRef<SubitensDialog, { valorEstimado: number | null; subitens: { descricao: string; quantidade: number; valorUnitario: number }[] }>);
  protected readonly form = this.fb.group({
    valorEstimado: [this.dados.valorEstimado],
    subitens: this.fb.array(
      this.dados.subitens.map((item) => this.fb.group({
        descricao: [item.descricao, Validators.required],
        quantidade: [item.quantidade, Validators.required],
        valorUnitario: [item.valorUnitario, Validators.required],
      })),
    ),
  });

  protected get subitens() {
    return this.form.controls.subitens;
  }

  protected adicionar(): void {
    this.subitens.push(this.fb.group({
      descricao: ['', Validators.required],
      quantidade: [1, Validators.required],
      valorUnitario: [0, Validators.required],
    }));
  }

  protected remover(indice: number): void {
    this.subitens.removeAt(indice);
  }

  protected salvar(): void {
    const valor = this.form.getRawValue();
    this.ref.close({
      valorEstimado: valor.valorEstimado ?? null,
      subitens: (valor.subitens ?? [])
        .filter((item) => !!item.descricao?.trim())
        .map((item) => ({
          descricao: item.descricao!.trim(),
          quantidade: Number(item.quantidade) || 1,
          valorUnitario: item.valorUnitario ?? 0,
        })),
    });
  }
}


type Vinculo = EventoServico['fornecedores'][number];

interface ServicoVisivel {
  servico: EventoServico;
  vinculos: Vinculo[];
  contratados: number;
}

const SEM_FORNECEDOR = 'SemFornecedor';

const CLASSE_ETAPA: Record<string, string> = {
  Orcamento: 'bg-light-warning text-warning',
  Contratado: 'bg-light-success text-success',
};

/** Aba Fornecedores do evento: lista de serviços, cada um com N fornecedores (SPEC-018; SPEC-008 v2, 8.2). */
@Component({
  selector: 'app-evento-fornecedores',
  imports: [ExpandirTodosComponent, MatCardModule, MatButtonModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatIconModule, MatMenuModule, GdDinheiroPipe, DecimalPipe, EventoAbasComponent, MatTooltipModule, RouterLink],
  template: `
    <app-evento-abas [eventoId]="id" />
    <mat-card class="cardWithShadow">
    <div class="p-6">
      <mat-card-title class="mb-0">Fornecedores</mat-card-title>
      <mat-card-subtitle>{{ evento()?.nome }} · serviços, fornecedores e contratos.</mat-card-subtitle>
    </div>
    @if (graficos(); as g) {
      <section class="px-6 pb-6" aria-label="Orçamento do evento">
        <div class="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4 mb-4">
          <div class="indicador"><span class="rotulo">Orçamento</span><strong>{{ g.dados.budget | gdDinheiro }}</strong></div>
          <div class="indicador"><span class="rotulo">Estimado</span><strong>{{ g.dados.estimado | gdDinheiro }}</strong></div>
          <div class="indicador"><span class="rotulo">Contratado</span><strong>{{ g.dados.contratado | gdDinheiro }}</strong></div>
          <div class="indicador"><span class="rotulo">Prova real</span><strong>{{ g.dados.provaReal | gdDinheiro }}</strong></div>
          @if (g.dados.custoPorConvidado !== null) {
            <div class="indicador"><span class="rotulo">Por convidado</span><strong>{{ g.dados.custoPorConvidado | gdDinheiro }}</strong></div>
          }
        </div>
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div class="grafico">
            <h4 class="titulo">Contratado e estimado frente ao orçamento</h4>
            @if (g.orcamento.vazio) {
              <p class="text-sm text-muted">Informe o estimado dos serviços para ver os gráficos.</p>
            } @else {
              <div class="barra" [class.alerta]="g.orcamento.excesso > 0" role="img" [attr.aria-label]="descricaoBarra(g.orcamento)">
                @for (fatia of g.orcamento.fatias; track fatia.chave) {
                  @if (fatia.largura > 0) { <span class="fatia" [class]="'fatia ' + fatia.chave" [style.width.%]="fatia.largura"></span> }
                }
              </div>
              <ul class="legenda">
                @for (fatia of g.orcamento.fatias; track fatia.chave) {
                  <li><span [class]="'ponto ' + fatia.chave"></span>{{ fatia.rotulo }}: <strong>{{ fatia.valor | gdDinheiro }}</strong>
                    @if (fatia.percentualDoOrcamento !== null) { <span class="text-muted">({{ fatia.percentualDoOrcamento | number: '1.0-0' }}%)</span> }
                  </li>
                }
              </ul>
              @if (g.orcamento.excesso > 0) {
                <p class="text-sm text-error font-semibold mt-2">Acima do orçamento em {{ g.orcamento.excesso | gdDinheiro }}.</p>
              }
              @if (g.orcamento.semOrcamento) {
                <p class="text-xs text-muted mt-2">Orçamento do evento não informado.</p>
              }
            }
          </div>
          <div class="grafico">
            <h4 class="titulo">Por serviço</h4>
            @if (g.servicos.total === 0) {
              <p class="text-sm text-muted">Informe o estimado dos serviços para ver os gráficos.</p>
            } @else {
              <div class="rosca-area">
                <div class="rosca" role="img" [attr.aria-label]="descricaoRosca(g.servicos)" [style.background]="g.servicos.fundo">
                  <div class="rosca-centro"><span class="text-xs text-muted">Total</span><strong>{{ g.servicos.total | gdDinheiro }}</strong></div>
                </div>
                <ul class="legenda-rosca">
                  @for (fatia of g.servicos.fatias; track fatia.id) {
                    <li>
                      <span class="ponto" [style.background]="fatia.cor"></span>
                      <span class="nome-fatia" [title]="fatia.nome">{{ fatia.nome }}</span>
                      <strong class="num">{{ fatia.valor | gdDinheiro }}</strong>
                      <span class="text-muted pct">{{ fatia.percentual | number: '1.0-0' }}%</span>
                    </li>
                  }
                </ul>
              </div>
              <p class="text-xs text-muted mt-2">Contratado quando houver; senão, o estimado.</p>
            }
          </div>
        </div>
      </section>
    }
    <mat-card-content class="border-t border-border">
    @if (evento(); as atual) {
          <div class="barra-lista">
           <div class="barra-lista-filtros">
            <div class="campo w-full sm:w-64">
              <mat-label class="font-semibold mb-2 block">Buscar</mat-label>
              <mat-form-field appearance="outline" class="w-full">
              <mat-icon matIconPrefix>search</mat-icon>
              <input matInput aria-label="Buscar" placeholder="Serviço ou fornecedor" [value]="busca()" (input)="buscar($event)" />
            </mat-form-field>
            </div>
            <div class="campo w-full sm:w-48">
              <mat-label class="font-semibold mb-2 block">Etapa</mat-label>
              <mat-form-field appearance="outline" class="w-full">
                <mat-select [value]="etapa()" (valueChange)="etapa.set($event)" aria-label="Etapa">
                  <mat-option value="">Todas</mat-option>
                  @for (item of etapas; track item.valor) { <mat-option [value]="item.valor">{{ item.rotulo }}</mat-option> }
                  <mat-option [value]="semFornecedor">Sem fornecedor</mat-option>
                </mat-select>
              </mat-form-field>
            </div>
           </div>
           <div class="barra-lista-acoes">
             <button mat-flat-button type="button" (click)="adicionarServicos()"><mat-icon>playlist_add</mat-icon> Adicionar serviço</button>
           </div>
          </div>

        @if (atual.servicos.length === 0) {
          <div class="flex flex-col items-center gap-3 text-center text-muted py-10">
            <p>Nenhum serviço neste evento ainda.</p>
            <button mat-flat-button type="button" (click)="adicionarServicos()"><mat-icon>playlist_add</mat-icon> Adicionar serviço</button>
          </div>
        } @else if (visiveis().length === 0) {
          <p class="text-center text-muted py-10">Nada encontrado com esses filtros.</p>
        } @else {
          <app-expandir-todos [abertos]="todosAbertos()" (alternar)="alternarTodos()">
            {{ visiveis().length }} {{ visiveis().length === 1 ? 'serviço' : 'serviços' }} ·
            {{ fornecedoresVisiveis() }} {{ fornecedoresVisiveis() === 1 ? 'fornecedor' : 'fornecedores' }}
          </app-expandir-todos>
          <ul class="servicos-lista com-cabecalho" aria-label="Serviços do evento">
            @for (item of visiveis(); track item.servico.id) {
              <li class="servico" [class.aberto]="estaAberto(item.servico.id)">
                <div class="servico-cabecalho">
                  <button type="button" class="servico-alternar" [attr.aria-expanded]="estaAberto(item.servico.id)"
                    [attr.aria-controls]="'fornecedores-' + item.servico.id" (click)="alternar(item.servico.id)">
                    <mat-icon class="seta">expand_more</mat-icon>
                    <span class="servico-texto">
                      <span class="nome">{{ item.servico.nome }}</span>
                      <span class="block text-xs text-muted">
                        Estimado {{ estimado(item.servico) | gdDinheiro }}
                        @if (item.contratados > 0) { · Contratado {{ item.servico.valorContratado | gdDinheiro }} }
                      </span>
                    </span>
                    @if (item.servico.fornecedores.length === 0) {
                      <span class="inline-block rounded font-semibold px-2 py-1 text-xs whitespace-nowrap bg-light-error text-error">Sem fornecedor</span>
                    } @else {
                      <span [class]="classeEtapa(item.contratados > 0 ? 'Contratado' : 'Orcamento')">
                        {{ item.contratados }} de {{ item.servico.fornecedores.length }} {{ item.servico.fornecedores.length === 1 ? 'contratado' : 'contratados' }}
                      </span>
                    }
                  </button>
                  <div class="servico-acoes">
                    <button mat-stroked-button type="button" (click)="adicionarFornecedores(item.servico)"><mat-icon>add</mat-icon> Fornecedor</button>
                    <button mat-icon-button type="button" aria-label="Ações do serviço" matTooltip="Ações do serviço" [matMenuTriggerFor]="menuServico"><mat-icon>more_vert</mat-icon></button>
                    <mat-menu #menuServico="matMenu" xPosition="before">
                      <button mat-menu-item type="button" (click)="editarSubitens(item.servico)"><mat-icon>calculate</mat-icon> Valor estimado e subitens</button>
                      <button mat-menu-item type="button" (click)="excluirServico(item.servico)"><mat-icon>delete</mat-icon> Excluir serviço</button>
                    </mat-menu>
                  </div>
                </div>
                @if (estaAberto(item.servico.id)) {
                  <div class="fornecedores" [id]="'fornecedores-' + item.servico.id">
                    @for (vinculo of item.vinculos; track vinculo.id) {
                      <div class="fornecedor">
                        <div class="fornecedor-nome">
                          <span class="nome">{{ vinculo.fornecedor }}</span>
                          @if (vinculo.observacoes) { <span class="block text-xs text-muted">{{ vinculo.observacoes }}</span> }
                        </div>
                        <div class="fornecedor-etapa"><span [class]="classeEtapa(vinculo.etapa)">{{ rotuloEtapa(vinculo.etapa) }}</span></div>
                        <div class="fornecedor-valor">
                          <span class="block text-xs text-muted">{{ vinculo.etapa === 'Contratado' ? 'Contratado' : 'Estimado' }}</span>
                          @if (vinculo.valorOrcamento !== null) { <span class="valor">{{ vinculo.valorOrcamento | gdDinheiro }}</span> }
                          @else { <span class="text-muted">—</span> }
                        </div>
                        <div class="fornecedor-contrato">
                          @if (vinculo.contratoAssinado; as contrato) {
                            <button mat-button type="button" class="contrato" [matMenuTriggerFor]="menuContrato" aria-label="Contrato anexado">
                              <mat-icon>description</mat-icon> Contrato
                            </button>
                            <mat-menu #menuContrato="matMenu" xPosition="before">
                              <button mat-menu-item type="button" (click)="abrirContrato(contrato.arquivoId)"><mat-icon>open_in_new</mat-icon> Abrir contrato</button>
                              <button mat-menu-item type="button" (click)="anexarContrato(item.servico, vinculo)"><mat-icon>upload_file</mat-icon> Substituir contrato</button>
                              <button mat-menu-item type="button" (click)="excluirContrato(item.servico, vinculo)"><mat-icon>delete</mat-icon> Excluir contrato</button>
                            </mat-menu>
                          } @else {
                            <button mat-button type="button" (click)="anexarContrato(item.servico, vinculo)"><mat-icon>upload_file</mat-icon> Contrato</button>
                          }
                        </div>
                        <div class="fornecedor-acoes">
                          @if (vinculo.etapa === 'Contratado') {
                            <a mat-button [routerLink]="['/eventos', id, 'dinheiro']" matTooltip="Configurar o pagamento na aba Financeiro"><mat-icon>payments</mat-icon> Pagamento</a>
                            <button mat-icon-button type="button" aria-label="Voltar para orçamento" matTooltip="Voltar para orçamento"
                              [disabled]="vinculo.temPagamento" (click)="voltar(item.servico, vinculo)"><mat-icon>undo</mat-icon></button>
                          } @else {
                            <button mat-stroked-button class="contratar" type="button" (click)="contratar(item.servico, vinculo)"><mat-icon>check</mat-icon> Contratado</button>
                          }
                          <button mat-icon-button type="button" aria-label="Excluir fornecedor do serviço"
                            [matTooltip]="vinculo.temPagamento ? 'Tem pagamento registrado no Dinheiro' : 'Excluir fornecedor do serviço'"
                            [disabled]="vinculo.temPagamento" (click)="excluirFornecedor(item.servico, vinculo)"><mat-icon>delete</mat-icon></button>
                        </div>
                      </div>
                    } @empty {
                      <div class="fornecedor vazio">
                        <span class="text-sm text-muted">Nenhum fornecedor neste serviço.</span>
                        <button mat-button type="button" (click)="adicionarFornecedores(item.servico)"><mat-icon>add</mat-icon> Adicionar fornecedor</button>
                      </div>
                    }
                  </div>
                }
              </li>
            }
          </ul>
        }
    }
    </mat-card-content>
    </mat-card>
  `,
  styles: `
    .nome { display: block; font-weight: 500; }
    .indicador { border-radius: 8px; padding: 12px 16px; text-align: center; background: rgba(128,128,128,.12); }
    .indicador .rotulo { display: block; font-size: 12px; opacity: .75; }
    .indicador strong { display: block; font-size: 18px; margin-top: 4px; }
    .grafico { border: 1px solid rgba(128,128,128,.25); border-radius: 8px; padding: 16px; }
    .titulo { font-weight: 600; margin: 0 0 12px; }
    .barra { display: flex; height: 22px; border-radius: 6px; overflow: hidden; background: rgba(128,128,128,.18); }
    .fatia.contratado, .ponto.contratado { background: #2e7d32; }
    .fatia.estimado, .ponto.estimado { background: #f9a825; }
    .fatia.restante, .ponto.restante { background: rgba(128,128,128,.45); }
    .fatia.excesso, .ponto.excesso { background: #c62828; }
    .barra.alerta { box-shadow: 0 0 0 2px #c62828; }
    .ponto { display: inline-block; width: 10px; height: 10px; border-radius: 50%; margin-right: 6px; }
    .legenda { list-style: none; padding: 0; margin: 12px 0 0; display: flex; flex-direction: column; gap: 4px; font-size: 13px; }
    .rosca-area { display: flex; align-items: center; gap: 20px; }
    .rosca { position: relative; flex-shrink: 0; width: 160px; height: 160px; border-radius: 50%; }
    .rosca-centro { position: absolute; inset: 28px; border-radius: 50%; background: var(--mat-sys-surface, #fff); display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; }
    .rosca-centro strong { font-size: 14px; }
    .legenda-rosca { list-style: none; padding: 0; margin: 0; flex: 1; min-width: 0; max-height: 170px; overflow-y: auto; display: flex; flex-direction: column; gap: 6px; font-size: 13px; }
    .legenda-rosca li { display: flex; align-items: center; gap: 6px; }
    .legenda-rosca .ponto { margin-right: 0; flex-shrink: 0; }
    .nome-fatia { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .num { text-align: right; font-size: 12px; white-space: nowrap; }
    .pct { width: 36px; text-align: right; font-size: 12px; }
    @media (max-width: 480px) { .rosca-area { flex-direction: column; align-items: stretch; } .rosca { align-self: center; } }
    .valor { font-weight: 600; white-space: nowrap; }

    .servicos-lista { list-style: none; padding: 0; margin: 0; border: 1px solid rgba(128,128,128,.25); border-radius: 8px; overflow: hidden; }
    .servicos-lista.com-cabecalho { border-radius: 0 0 8px 8px; }
    .servico + .servico { border-top: 1px solid rgba(128,128,128,.25); }
    .servico-cabecalho { display: flex; align-items: center; gap: 8px; padding: 8px 12px 8px 4px; }
    .servico-cabecalho:hover, .fornecedor:hover { background: rgba(128,128,128,.08); }
    .servico-alternar { flex: 1; min-width: 0; display: flex; align-items: center; gap: 12px; padding: 8px; border: 0; background: none; color: inherit; font: inherit; text-align: left; cursor: pointer; border-radius: 6px; }
    .servico-alternar:focus-visible { outline: 2px solid var(--mat-sys-primary); }
    .servico-texto { flex: 1; min-width: 0; }
    .seta { transition: transform .15s; flex-shrink: 0; }
    .servico.aberto .seta { transform: rotate(180deg); }
    .servico-acoes { display: flex; align-items: center; gap: 4px; flex-shrink: 0; }
    .fornecedores { background: rgba(128,128,128,.1); border-top: 1px solid rgba(128,128,128,.3); }
    .fornecedor { display: grid; grid-template-columns: minmax(160px, 2fr) 110px minmax(110px, 1fr) minmax(140px, 1.4fr) auto; align-items: center; gap: 12px; padding: 10px 16px 10px 52px; }
    .fornecedor + .fornecedor { border-top: 1px dashed rgba(128,128,128,.2); }
    .fornecedor.vazio { display: flex; justify-content: space-between; }
    .fornecedor-acoes { display: flex; align-items: center; justify-content: flex-end; gap: 4px; white-space: nowrap; }
    .contrato { max-width: 100%; }
    @media (max-width: 900px) {
      .fornecedor { grid-template-columns: 1fr auto; padding-left: 16px; }
      .fornecedor-acoes { grid-column: 1 / -1; justify-content: flex-start; flex-wrap: wrap; }
    }
  `,
})
export class EventoFornecedoresPage implements OnInit {
  private readonly negocio = inject(NegocioClient);
  private readonly rota = inject(ActivatedRoute);
  private readonly dialog = inject(MatDialog);
  private readonly toast = inject(ToastService);
  protected readonly evento = signal<EventoDetalhe | null>(null);
  protected readonly fornecedores = signal<FornecedorResumo[]>([]);
  protected readonly etapas = ETAPAS_NEGOCIACAO;
  protected readonly semFornecedor = SEM_FORNECEDOR;
  protected readonly busca = signal('');
  protected readonly etapa = signal('');
  protected readonly abertos = signal<Set<string>>(new Set());
  protected readonly budget = signal<BudgetEvento | null>(null);
  protected readonly graficos = computed<{ dados: BudgetEvento; orcamento: GraficoOrcamento; servicos: RoscaServicos } | null>(() => {
    const dados = this.budget();
    return dados && dados.servicos.length > 0
      ? { dados, orcamento: montarGraficoOrcamento(dados), servicos: montarRoscaPorServico(dados) }
      : null;
  });
  protected id = '';

  /** Serviços que passam na busca e no filtro; os fornecedores mostrados são os que batem. */
  protected readonly visiveis = computed<ServicoVisivel[]>(() => {
    const termo = normalizar(this.busca());
    const etapa = this.etapa();
    const resultado: ServicoVisivel[] = [];
    for (const servico of this.evento()?.servicos ?? []) {
      const contratados = servico.fornecedores.filter((vinculo) => vinculo.etapa === 'Contratado').length;
      if (etapa === SEM_FORNECEDOR) {
        if (servico.fornecedores.length === 0 && (!termo || normalizar(servico.nome).includes(termo))) {
          resultado.push({ servico, vinculos: [], contratados });
        }
        continue;
      }
      const servicoBate = !termo || normalizar(servico.nome).includes(termo);
      const vinculos = servico.fornecedores.filter((vinculo) =>
        (!etapa || vinculo.etapa === etapa) && (servicoBate || normalizar(vinculo.fornecedor).includes(termo)));
      if (vinculos.length > 0 || (!etapa && servicoBate)) {
        resultado.push({ servico, vinculos, contratados });
      }
    }
    return resultado;
  });

  ngOnInit(): void {
    this.id = this.rota.snapshot.paramMap.get('id') ?? '';
    this.recarregar();
    this.carregarFornecedores();
  }

  protected buscar(evento: Event): void {
    const termo = (evento.target as HTMLInputElement).value;
    this.busca.set(termo);
    // Buscando por fornecedor, o serviço abre para mostrar quem bateu.
    if (normalizar(termo)) {
      const novos = new Set(this.abertos());
      this.visiveis().forEach((item) => {
        if (item.vinculos.length > 0) novos.add(item.servico.id);
      });
      this.abertos.set(novos);
    }
  }

  protected estaAberto(servicoId: string): boolean {
    return this.abertos().has(servicoId);
  }

  protected todosAbertos(): boolean {
    const itens = this.visiveis();
    return itens.length > 0 && itens.every((item) => this.estaAberto(item.servico.id));
  }

  protected alternarTodos(): void {
    this.abertos.set(this.todosAbertos() ? new Set() : new Set(this.visiveis().map((item) => item.servico.id)));
  }

  protected readonly fornecedoresVisiveis = computed(() => this.visiveis().reduce((soma, item) => soma + item.vinculos.length, 0));

  protected alternar(servicoId: string): void {
    const novos = new Set(this.abertos());
    if (!novos.delete(servicoId)) novos.add(servicoId);
    this.abertos.set(novos);
  }

  private abrir(servicoId: string): void {
    this.abertos.set(new Set(this.abertos()).add(servicoId));
  }

  protected estimado(servico: EventoServico): number | null {
    return servico.subitens.length > 0 ? servico.subitens.reduce((soma, item) => soma + item.total, 0) : servico.valorEstimado;
  }

  protected rotuloEtapa(etapa: string): string {
    return this.etapas.find((item) => item.valor === etapa)?.rotulo ?? etapa;
  }

  protected classeEtapa(etapa: string): string {
    return `inline-block rounded font-semibold px-2 py-1 text-xs whitespace-nowrap ${CLASSE_ETAPA[etapa] ?? 'bg-light-primary text-primary'}`;
  }

  /** Serviços do catálogo da conta (ou um novo); os que já estão no evento vêm bloqueados. */
  protected adicionarServicos(): void {
    const atual = this.evento();
    if (!atual) {
      return;
    }
    const noEvento = new Set(atual.servicos.map((servico) => normalizar(servico.nome)));
    const opcao = (servico: ServicoConta): OpcaoSelecao => ({
      id: servico.id,
      nome: servico.nome,
      bloqueada: noEvento.has(normalizar(servico.nome)),
      motivo: 'Já está no evento',
    });
    this.negocio.servicosConta().subscribe({
      next: (catalogo) => {
        const nomes = new Map(catalogo.map((servico) => [servico.id, servico.nome]));
        const dados: SeletorMultiploDados = {
          titulo: 'Adicionar serviços',
          rotulo: 'Serviços',
          descricao: 'Escolha os serviços do evento. Os fornecedores entram depois, em cada serviço.',
          placeholder: 'Buscar serviço',
          textoCriar: 'Cadastrar novo serviço',
          confirmar: 'Adicionar',
          opcoes: catalogo.map(opcao),
          criar: (termo) => this.dialog.open(NovoServicoDialog, { ...DIALOG_PEQUENO, data: { nome: termo } }).afterClosed().pipe(
            map((criados?: ServicoConta[]) => (criados ?? []).map((servico) => {
              nomes.set(servico.id, servico.nome);
              return opcao(servico);
            })),
          ),
        };
        this.dialog.open(SeletorMultiploDialog, { ...DIALOG, autoFocus: 'dialog', data: dados }).afterClosed().subscribe((ids?: string[]) => {
          if (ids?.length) {
            void this.gravarServicos(ids.map((id) => nomes.get(id) ?? '').filter((nome) => !!nome));
          }
        });
      },
      error: (erro: unknown) => this.toast.erro(mensagemDeErro(erro)),
    });
  }

  /** Fornecedores do cadastro (ou um novo) para o serviço; os que já estão nele vêm bloqueados. */
  protected adicionarFornecedores(servico: EventoServico): void {
    const noServico = new Set(servico.fornecedores.map((vinculo) => vinculo.fornecedorId));
    const opcao = (fornecedor: FornecedorResumo): OpcaoSelecao => ({
      id: fornecedor.id,
      nome: fornecedor.nome,
      detalhe: fornecedor.servicos.join(', ') || 'Sem serviço informado',
      bloqueada: noServico.has(fornecedor.id),
      motivo: 'Já está neste serviço',
    });
    const dados: SeletorMultiploDados = {
      titulo: `Adicionar fornecedor · ${servico.nome}`,
      rotulo: 'Fornecedores',
      descricao: 'Os fornecedores entram em Orçamento. Marque como contratado na lista.',
      placeholder: 'Buscar no cadastro',
      textoCriar: 'Criar novo fornecedor',
      confirmar: 'Adicionar',
      opcoes: this.fornecedores().map(opcao),
      criar: () => this.cadastrarFornecedor().pipe(map((criado) => (criado ? [opcao(criado)] : []))),
    };
    this.dialog.open(SeletorMultiploDialog, { ...DIALOG, autoFocus: 'dialog', data: dados }).afterClosed().subscribe((ids?: string[]) => {
      if (ids?.length) {
        void this.gravarFornecedores(servico, ids);
      }
    });
  }

  protected excluirServico(servico: EventoServico): void {
    const contratados = servico.fornecedores.filter((vinculo) => vinculo.etapa === 'Contratado').length;
    const texto = contratados > 0
      ? `Excluir "${servico.nome}" do evento? Os fornecedores, contratos anexados e pagamentos sem registro deste serviço saem da aba Financeiro.`
      : `Excluir "${servico.nome}" do evento? Os fornecedores vinculados saem junto.`;
    this.confirmar('Excluir serviço', texto, () => this.negocio.removerServicoEvento(this.id, servico.id), 'Serviço excluído.');
  }

  protected excluirFornecedor(servico: EventoServico, vinculo: Vinculo): void {
    const texto = vinculo.etapa === 'Contratado'
      ? `Excluir "${vinculo.fornecedor}" de ${servico.nome}? O pagamento dele sai da aba Financeiro.`
      : `Excluir "${vinculo.fornecedor}" de ${servico.nome}?`;
    this.confirmar('Excluir fornecedor', texto, () => this.negocio.removerFornecedorServico(this.id, servico.id, vinculo.id), 'Fornecedor excluído do serviço.');
  }

  protected voltar(servico: EventoServico, vinculo: Vinculo): void {
    this.negocio.voltarEtapa(this.id, servico.id, vinculo.id).subscribe({
      next: () => {
        this.toast.sucesso('Fornecedor voltou para orçamento.');
        this.recarregar();
      },
      error: (erro: unknown) => this.toast.erro(mensagemDeErro(erro)),
    });
  }

  protected contratar(servico: EventoServico, vinculo: Vinculo): void {
    this.dialog.open(ContratarDialog, {
      ...DIALOG,
      data: { fornecedor: vinculo.fornecedor, servico: servico.nome, valor: vinculo.valorOrcamento, temContrato: !!vinculo.contratoAssinado },
    }).afterClosed().subscribe((pedido?: ContratarResultado) => {
      if (!pedido) {
        return;
      }
      this.negocio.contratarFornecedor(this.id, servico.id, vinculo.id, { valor: pedido.valor }).subscribe({
        next: () => {
          if (!pedido.arquivo) {
            this.toast.sucesso('Fornecedor contratado. Configure o pagamento na aba Financeiro.');
            this.recarregar();
            return;
          }
          this.negocio.enviarContratoAssinado(this.id, servico.id, vinculo.id, pedido.arquivo).subscribe({
            next: () => {
              this.toast.sucesso('Fornecedor contratado e contrato anexado. Configure o pagamento na aba Financeiro.');
              this.recarregar();
            },
            error: (erro: unknown) => {
              this.toast.erro(`Fornecedor contratado, mas o contrato não foi anexado: ${mensagemDeErro(erro)} Anexe pela linha do fornecedor.`);
              this.recarregar();
            },
          });
        },
        error: (erro: unknown) => this.toast.erro(mensagemDeErro(erro)),
      });
    });
  }

  protected anexarContrato(servico: EventoServico, vinculo: Vinculo): void {
    this.dialog.open(ComprovanteDialog, { ...DIALOG_PEQUENO, data: { titulo: `Contrato · ${vinculo.fornecedor}` } }).afterClosed().subscribe((arquivo?: File) => {
      if (!arquivo) {
        return;
      }
      this.negocio.enviarContratoAssinado(this.id, servico.id, vinculo.id, arquivo).subscribe({
        next: (evento) => {
          this.toast.sucesso('Contrato anexado.');
          this.evento.set(evento);
        },
        error: (erro: unknown) => this.toast.erro(mensagemDeErro(erro)),
      });
    });
  }

  protected excluirContrato(servico: EventoServico, vinculo: Vinculo): void {
    this.dialog.open(ConfirmaDialog, {
      ...DIALOG_PEQUENO,
      data: { titulo: 'Excluir contrato', texto: `Excluir o contrato de ${vinculo.fornecedor}? O arquivo é apagado.`, confirmar: 'Excluir' },
    }).afterClosed().subscribe((confirmou) => {
      if (!confirmou) {
        return;
      }
      this.negocio.excluirContratoAssinado(this.id, servico.id, vinculo.id).subscribe({
        next: (evento) => {
          this.toast.sucesso('Contrato excluído.');
          this.evento.set(evento);
        },
        error: (erro: unknown) => this.toast.erro(mensagemDeErro(erro)),
      });
    });
  }

  protected abrirContrato(arquivoId: string): void {
    const janela = window.open('', '_blank');
    this.negocio.baixarArquivo(arquivoId).subscribe({
      next: (arquivo) => {
        const url = URL.createObjectURL(arquivo);
        if (janela) janela.location.href = url; else window.open(url, '_blank');
        setTimeout(() => URL.revokeObjectURL(url), 60_000);
      },
      error: (erro: unknown) => {
        janela?.close();
        this.toast.erro(mensagemDeErro(erro));
      },
    });
  }

  protected editarSubitens(servico: EventoServico): void {
    this.dialog.open(SubitensDialog, {
      ...DIALOG,
      data: {
        nome: servico.nome,
        valorEstimado: servico.valorEstimado,
        subitens: servico.subitens.map((item) => ({
          descricao: item.descricao,
          quantidade: item.quantidade,
          valorUnitario: item.valorUnitario,
        })),
      },
    }).afterClosed().subscribe((pedido) => {
      if (!pedido) {
        return;
      }
      this.negocio.atualizarEstimado(this.id, servico.id, pedido).subscribe({
        next: () => {
          this.toast.sucesso('Estimado atualizado.');
          this.recarregar();
        },
        error: (erro: unknown) => this.toast.erro(mensagemDeErro(erro)),
      });
    });
  }

  protected descricaoBarra(grafico: GraficoOrcamento): string {
    return grafico.fatias.map((fatia) => `${fatia.rotulo}: ${formatarReais(fatia.valor)}`).join('; ');
  }

  protected descricaoRosca(rosca: RoscaServicos): string {
    return rosca.fatias.map((f) => `${f.nome}: ${formatarReais(f.valor)} (${Math.round(f.percentual)}%)`).join('; ');
  }

  private confirmar(titulo: string, texto: string, acao: () => Observable<EventoDetalhe>, sucesso: string): void {
    this.dialog.open(ConfirmaDialog, { ...DIALOG_PEQUENO, data: { titulo, texto, confirmar: 'Excluir' } }).afterClosed().subscribe((confirmou) => {
      if (!confirmou) {
        return;
      }
      acao().subscribe({
        next: () => {
          this.toast.sucesso(sucesso);
          this.recarregar();
        },
        error: (erro: unknown) => this.toast.erro(mensagemDeErro(erro)),
      });
    });
  }

  private cadastrarFornecedor(): Observable<FornecedorResumo | null> {
    const antes = new Set(this.fornecedores().map((item) => item.id));
    return new Observable<FornecedorResumo | null>((assinante) => {
      this.dialog.open(FornecedorFormDialog, { ...DIALOG_FORNECEDOR, data: null }).afterClosed().subscribe((ok) => {
        if (!ok) {
          assinante.next(null);
          assinante.complete();
          return;
        }
        this.negocio.fornecedores().subscribe({
          next: (lista) => {
            this.fornecedores.set(lista);
            assinante.next(lista.find((item) => !antes.has(item.id)) ?? null);
            assinante.complete();
          },
          error: () => {
            assinante.next(null);
            assinante.complete();
          },
        });
      });
    });
  }

  /** Cria os serviços em sequência; o backend reaproveita o do catálogo com o mesmo nome. */
  private async gravarServicos(nomes: string[]): Promise<void> {
    let feitos = 0;
    try {
      for (const nome of nomes) {
        this.evento.set(await firstValueFrom(this.negocio.adicionarServicoEvento(this.id, nome)));
        feitos++;
      }
      this.toast.sucesso(feitos === 1 ? 'Serviço adicionado.' : `${feitos} serviços adicionados.`);
    } catch (erro) {
      this.toast.erro(mensagemDeErro(erro));
    }
    this.recarregar();
  }

  private async gravarFornecedores(servico: EventoServico, fornecedorIds: string[]): Promise<void> {
    let feitos = 0;
    try {
      for (const fornecedorId of fornecedorIds) {
        await firstValueFrom(this.negocio.adicionarFornecedorServico(this.id, servico.id, fornecedorId, 'Orcamento'));
        feitos++;
      }
      this.toast.sucesso(feitos === 1 ? 'Fornecedor adicionado.' : `${feitos} fornecedores adicionados.`);
    } catch (erro) {
      this.toast.erro(mensagemDeErro(erro));
    }
    this.abrir(servico.id);
    this.recarregar();
  }

  private carregarFornecedores(): void {
    this.negocio.fornecedores().subscribe({
      next: (lista) => this.fornecedores.set(lista),
      error: () => this.fornecedores.set([]),
    });
  }

  private recarregar(): void {
    this.negocio.evento(this.id).subscribe({
      next: (evento) => this.evento.set(evento),
      error: (erro: unknown) => this.toast.erro(mensagemDeErro(erro)),
    });
    this.negocio.budget(this.id).subscribe({
      next: (dados) => this.budget.set(dados),
      // Complementar: sem permissão do financeiro (403) ou em falha, o bloco só não aparece (SPEC-047 §7).
      error: () => this.budget.set(null),
    });
  }
}

function formatarReais(valor: number): string {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function normalizar(texto: string): string {
  return texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}

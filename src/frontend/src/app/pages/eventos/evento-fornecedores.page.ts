import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule, MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { validarComprovante } from '../../core/dinheiro.client';
import { mensagemDeErro } from '../../core/mensagem-erro';
import {
  BudgetEvento,
  ETAPAS_NEGOCIACAO,
  EventoDetalhe,
  EventoServico,
  FornecedorResumo,
  NegocioClient,
} from '../../core/negocio.client';
import { ToastService } from '../../core/toast.service';
import { CampoDinheiroComponent } from '../../shared/campo-dinheiro';
import { ConfirmaDialog } from '../../shared/confirma-dialog';
import { DIALOG, DIALOG_PEQUENO } from '../../shared/dialog';
import { ComprovanteDialog } from '../dinheiro/comprovante.dialog';
import { GdDinheiroPipe } from '../../shared/gd-dinheiro.pipe';
import { EventoAbasComponent } from './evento-abas.component';
import { VincularFornecedorDados, VincularFornecedorDialog, VincularFornecedorPedido } from './vincular-fornecedor.dialog';

interface ContratarResultado {
  valor: number;
  arquivo: File | null;
}

@Component({
  selector: 'app-contratar-dialog',
  imports: [ReactiveFormsModule, MatDialogModule, MatButtonModule, CampoDinheiroComponent],
  template: `
    <h2 mat-dialog-title>Contratar fornecedor</h2>
    <p class="text-muted text-sm px-6 -mt-2 mb-4">{{ dados.fornecedor }} · {{ dados.servico }}. O parcelamento é feito depois, na aba Dinheiro.</p>
    <mat-dialog-content>
      <form id="contratar" class="grid grid-cols-1 gap-4" [formGroup]="form" (submit)="confirmar(); $event.preventDefault()">
        <app-campo-dinheiro rotulo="Valor" formControlName="valor" />
        <div class="campo">
          <span class="font-semibold mb-2 block">Contrato assinado (opcional)</span>
          <input aria-label="Contrato assinado" type="file" accept=".jpg,.jpeg,.png,.pdf,image/jpeg,image/png,application/pdf" (change)="escolher($event)" />
          <p class="text-xs text-muted mt-1">Arquivo assinado pelo fornecedor e pelo casal. JPG, JPEG, PNG ou PDF de até 5 MB. Também dá para anexar depois.</p>
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
  selector: 'app-nome-servico-dialog',
  imports: [ReactiveFormsModule, MatDialogModule, MatButtonModule, MatFormFieldModule, MatInputModule],
  template: `
    <h2 mat-dialog-title>Adicionar serviço</h2>
    <mat-dialog-content>
      <div class="campo cheia">
        <mat-label class="font-semibold mb-2 block">Nome do serviço</mat-label>
        <mat-form-field appearance="outline" class="w-full">
        <input [attr.aria-label]="'Nome do serviço'" matInput [formControl]="nome" />
      </mat-form-field>
      </div>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-stroked-button type="button" (click)="ref.close()">Cancelar</button>
      <button mat-flat-button type="button" (click)="ok()">Adicionar</button>
    </mat-dialog-actions>
  `,
  styles: `.cheia { width: 100%; }`,
})
export class NomeServicoDialog {
  private readonly fb = inject(FormBuilder);
  protected readonly ref = inject(MatDialogRef<NomeServicoDialog, string>);
  protected readonly nome = this.fb.nonNullable.control('', Validators.required);

  protected ok(): void {
    const valor = this.nome.value.trim();
    if (!valor) {
      this.nome.markAsTouched();
      return;
    }
    this.ref.close(valor);
  }
}

@Component({
  selector: 'app-subitens-dialog',
  imports: [ReactiveFormsModule, MatDialogModule, MatButtonModule, MatFormFieldModule, MatInputModule, MatIconModule, CampoDinheiroComponent],
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
              <button mat-icon-button type="button" aria-label="Remover" (click)="remover(i)"><mat-icon>delete</mat-icon></button>
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

@Component({
  selector: 'app-budget-dialog',
  imports: [MatCardModule, MatDialogModule, MatButtonModule, GdDinheiroPipe],
  template: `
    <h2 mat-dialog-title>Planejamento de orçamento</h2>
    <mat-dialog-content>
      @if (budget) {
        <div class="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6 mb-6">
          <div><mat-card class="shadow-none text-center mb-0! h-full bg-light-primary"><mat-card-content><h4 class="text-sm font-semibold text-primary">Orçamento</h4><h6 class="text-xl font-semibold text-primary mt-2!">{{ budget.budget | gdDinheiro }}</h6></mat-card-content></mat-card></div>
          <div><mat-card class="shadow-none text-center mb-0! h-full bg-light-primary"><mat-card-content><h4 class="text-sm font-semibold text-primary">Estimado</h4><h6 class="text-xl font-semibold text-primary mt-2!">{{ budget.estimado | gdDinheiro }}</h6></mat-card-content></mat-card></div>
          <div><mat-card class="shadow-none text-center mb-0! h-full bg-light-primary"><mat-card-content><h4 class="text-sm font-semibold text-primary">Contratado</h4><h6 class="text-xl font-semibold text-primary mt-2!">{{ budget.contratado | gdDinheiro }}</h6></mat-card-content></mat-card></div>
          <div><mat-card class="shadow-none text-center mb-0! h-full bg-light-primary"><mat-card-content><h4 class="text-sm font-semibold text-primary">Prova real</h4><h6 class="text-xl font-semibold text-primary mt-2!">{{ budget.provaReal | gdDinheiro }}</h6></mat-card-content></mat-card></div>
          @if (budget.custoPorConvidado !== null) {
            <div><mat-card class="shadow-none text-center mb-0! h-full bg-light-primary"><mat-card-content><h4 class="text-sm font-semibold text-primary">Por convidado</h4><h6 class="text-xl font-semibold text-primary mt-2!">{{ budget.custoPorConvidado | gdDinheiro }}</h6></mat-card-content></mat-card></div>
          }
        </div>
        <table class="tabela">
          <thead><tr><th>Serviço</th><th>Estimado</th><th>Contratado</th></tr></thead>
          <tbody>
            @for (s of budget.servicos; track s.id) {
              <tr>
                <td>{{ s.nome }}</td>
                <td>{{ s.estimado | gdDinheiro }}</td>
                <td>{{ s.contratado | gdDinheiro }}</td>
              </tr>
            }
          </tbody>
        </table>
      }
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-stroked-button type="button" mat-dialog-close>Fechar</button>
    </mat-dialog-actions>
  `,
})
export class BudgetDialog {
  protected readonly budget = inject<BudgetEvento>(MAT_DIALOG_DATA);
}

type Vinculo = EventoServico['fornecedores'][number];

interface LinhaFornecedor {
  servico: EventoServico;
  vinculo: Vinculo | null;
  /** Primeira linha do serviço: leva o nome e ocupa as linhas dos demais vínculos. */
  primeira: boolean;
  linhasDoServico: number;
}

const SEM_FORNECEDOR = 'SemFornecedor';

const CLASSE_ETAPA: Record<string, string> = {
  Orcamento: 'alerta',
  Contratado: 'ok',
};

/** Aba Fornecedores do evento: serviços, negociação, parcelas e orçamento (SPEC-018; SPEC-008 v2, 8.2). */
@Component({
  selector: 'app-evento-fornecedores',
  imports: [MatCardModule, MatButtonModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatIconModule, MatMenuModule, GdDinheiroPipe, EventoAbasComponent],
  template: `
    <app-evento-abas [eventoId]="id" />
    <mat-card class="cardWithShadow">
    <div class="p-6 flex flex-wrap items-center justify-between gap-4">
      <div>
        <mat-card-title class="mb-0">Fornecedores</mat-card-title>
        <mat-card-subtitle>{{ evento()?.nome }} · serviços, negociação e pagamentos.</mat-card-subtitle>
      </div>
      <div class="flex flex-wrap gap-2">
        <button mat-stroked-button type="button" (click)="abrirBudget()"><mat-icon>request_quote</mat-icon> Orçamento</button>
        <button mat-stroked-button type="button" (click)="adicionarServico()"><mat-icon>playlist_add</mat-icon> Adicionar serviço</button>
        <button mat-flat-button type="button" (click)="vincular()"><mat-icon>add</mat-icon> Adicionar fornecedor</button>
      </div>
    </div>
    <mat-card-content class="border-t border-border">
    @if (evento(); as atual) {
          <div class="flex flex-wrap items-end gap-4 mb-6">
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

        @if (atual.servicos.length === 0) {
          <div class="flex flex-col items-center gap-3 text-center text-muted py-10">
            <p>Nenhum fornecedor neste evento ainda.</p>
            <button mat-flat-button type="button" (click)="vincular()"><mat-icon>add</mat-icon> Adicionar fornecedor</button>
          </div>
        } @else if (linhas().length === 0) {
          <p class="text-center text-muted py-10">Nada encontrado com esses filtros.</p>
        } @else {
          <div class="relative overflow-auto">
            <table class="tabela">
              <thead>
                <tr>
                  <th>Serviço</th>
                  <th>Fornecedor</th>
                  <th>Etapa</th>
                  <th class="text-end!">Valor</th>
                  <th class="text-end! whitespace-nowrap">Ações</th>
                </tr>
              </thead>
              <tbody>
                @for (linha of linhas(); track linha.chave) {
                  <tr>
                    @if (linha.primeira) {
                      <td class="servico" [attr.rowspan]="linha.linhasDoServico">
                        <span class="nome">{{ linha.servico.nome }}</span>
                        <span class="block text-xs text-muted">
                          Estimado {{ linha.servico.valorEstimado | gdDinheiro }}
                          @if (linha.servico.contratado) { · Contratado {{ linha.servico.valorContratado | gdDinheiro }} }
                        </span>
                        <div class="servico-acoes">
                          <button mat-button type="button" (click)="vincular(linha.servico)"><mat-icon>add</mat-icon> Fornecedor</button>
                          <button mat-button type="button" (click)="editarSubitens(linha.servico)"><mat-icon>calculate</mat-icon> Estimado</button>
                        </div>
                      </td>
                    }
                    @if (linha.vinculo; as vinculo) {
                      <td>
                        <span class="nome">{{ vinculo.fornecedor }}</span>
                        @if (vinculo.observacoes) { <span class="block text-xs text-muted">{{ vinculo.observacoes }}</span> }
                      </td>
                      <td>
                        <span [class]="classeEtapa(vinculo.etapa)">{{ rotuloEtapa(vinculo.etapa) }}</span>
                        @if (vinculo.etapa === 'Contratado' && linha.servico.contratoAssinado; as contrato) {
                          <span class="block text-xs text-muted mt-1"><mat-icon class="mini">verified</mat-icon> {{ contrato.nome }}</span>
                        }
                      </td>
                      <td class="text-end! valor">
                        @if (vinculo.etapa === 'Contratado') {
                          {{ linha.servico.valorContratado | gdDinheiro }}
                        } @else if (vinculo.valorOrcamento !== null) {
                          {{ vinculo.valorOrcamento | gdDinheiro }}
                        } @else {
                          <span class="block text-xs text-muted">—</span>
                        }
                      </td>
                      <td class="text-end! whitespace-nowrap">
                        @if (vinculo.etapa === 'Contratado') {
                          <button mat-icon-button type="button" aria-label="Mais ações" [matMenuTriggerFor]="menu"><mat-icon>more_vert</mat-icon></button>
                          <mat-menu #menu="matMenu" xPosition="before">
                            @if (linha.servico.contratoAssinado; as contrato) {
                              <button mat-menu-item type="button" (click)="abrirContrato(contrato.arquivoId)">
                                <mat-icon>description</mat-icon> Abrir contrato assinado
                              </button>
                              <button mat-menu-item type="button" (click)="anexarContrato(linha.servico)">
                                <mat-icon>upload_file</mat-icon> Substituir contrato assinado
                              </button>
                              <button mat-menu-item type="button" (click)="excluirContrato(linha.servico)">
                                <mat-icon>delete</mat-icon> Excluir contrato assinado
                              </button>
                            } @else {
                              <button mat-menu-item type="button" (click)="anexarContrato(linha.servico)">
                                <mat-icon>upload_file</mat-icon> Anexar contrato assinado
                              </button>
                            }
                            <button mat-menu-item type="button" (click)="voltar(linha.servico, vinculo.id)">
                              <mat-icon>undo</mat-icon> Voltar para orçamento
                            </button>
                          </mat-menu>
                        } @else {
                          <button mat-stroked-button class="contratar" type="button" (click)="contratar(linha.servico, vinculo.id)">Contratar</button>
                        }
                      </td>
                    } @else {
                      <td><span class="block text-xs text-muted">Nenhum fornecedor</span></td>
                      <td><span class="inline-block rounded font-semibold px-2 py-1 text-xs whitespace-nowrap bg-light-error text-error">Sem fornecedor</span></td>
                      <td class="text-end!"><span class="block text-xs text-muted">—</span></td>
                      <td class="text-end! whitespace-nowrap">
                        <button mat-stroked-button class="contratar" type="button" (click)="vincular(linha.servico)">Vincular</button>
                      </td>
                    }
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }
    }
    </mat-card-content>
    </mat-card>
  `,
  styles: `
    .nome { display: block; font-weight: 500; }
    td.servico { vertical-align: top; min-width: 200px; }
    .servico-acoes { display: flex; flex-wrap: wrap; gap: 4px; margin: 6px 0 0 -12px; }
    .servico-acoes button { height: 28px; font-size: 12px; color: var(--mat-sys-surface-container-lowest); }
    .servico-acoes mat-icon { font-size: 16px; width: 16px; height: 16px; }
    .valor { font-weight: 600; white-space: nowrap; }
    .mini { font-size: 14px; width: 14px; height: 14px; vertical-align: middle; }
    /* A célula do serviço ocupa várias linhas: o hover pinta só a linha do fornecedor. */
    tbody tr:hover td.servico { background: transparent !important; }
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
  protected id = '';

  protected readonly linhas = computed(() => {
    const termo = normalizar(this.busca());
    const etapa = this.etapa();
    const resultado: (LinhaFornecedor & { chave: string })[] = [];
    for (const servico of this.evento()?.servicos ?? []) {
      const servicoBate = !termo || normalizar(servico.nome).includes(termo);
      const vinculos: (Vinculo | null)[] = servico.fornecedores.length ? servico.fornecedores : [null];
      const visiveis = vinculos.filter((vinculo) => {
        const etapaBate = !etapa || (vinculo ? vinculo.etapa === etapa : etapa === SEM_FORNECEDOR);
        const textoBate = servicoBate || (!!vinculo && normalizar(vinculo.fornecedor).includes(termo));
        return etapaBate && textoBate;
      });
      visiveis.forEach((vinculo, indice) => resultado.push({
        chave: `${servico.id}:${vinculo?.id ?? ''}`,
        servico,
        vinculo,
        primeira: indice === 0,
        linhasDoServico: visiveis.length,
      }));
    }
    return resultado;
  });

  ngOnInit(): void {
    this.id = this.rota.snapshot.paramMap.get('id') ?? '';
    this.recarregar();
    this.carregarFornecedores();
  }

  protected buscar(evento: Event): void {
    this.busca.set((evento.target as HTMLInputElement).value);
  }

  protected rotuloEtapa(etapa: string): string {
    return this.etapas.find((item) => item.valor === etapa)?.rotulo ?? etapa;
  }

  protected classeEtapa(etapa: string): string {
    return `inline-block rounded font-semibold px-2 py-1 text-xs whitespace-nowrap ${CLASSE_ETAPA[etapa] ?? 'neutro'}`;
  }

  protected vincular(servico?: EventoServico): void {
    const atual = this.evento();
    if (!atual) {
      return;
    }
    const dados: VincularFornecedorDados = { servicos: atual.servicos, fornecedores: this.fornecedores(), servicoId: servico?.id };
    this.dialog.open(VincularFornecedorDialog, { ...DIALOG, data: dados }).afterClosed().subscribe((pedido?: VincularFornecedorPedido) => {
      if (pedido) {
        void this.gravarVinculos(pedido, atual);
      }
    });
  }

  protected adicionarServico(): void {
    this.dialog.open(NomeServicoDialog, DIALOG_PEQUENO).afterClosed().subscribe((nome) => {
      if (!nome) {
        return;
      }
      this.negocio.adicionarServicoEvento(this.id, nome).subscribe({
        next: (evento) => {
          this.toast.sucesso('Serviço adicionado.');
          this.evento.set(evento);
        },
        error: (erro: unknown) => this.toast.erro(mensagemDeErro(erro)),
      });
    });
  }

  protected voltar(servico: EventoServico, vinculoId: string): void {
    this.negocio.voltarEtapa(this.id, servico.id, vinculoId).subscribe({
      next: () => {
        this.toast.sucesso('Fornecedor voltou para orçamento.');
        this.recarregar();
      },
      error: (erro: unknown) => this.toast.erro(mensagemDeErro(erro)),
    });
  }

  protected contratar(servico: EventoServico, vinculoId: string): void {
    const vinculo = servico.fornecedores.find((item) => item.id === vinculoId);
    this.dialog.open(ContratarDialog, {
      ...DIALOG,
      data: { fornecedor: vinculo?.fornecedor ?? '', servico: servico.nome, valor: vinculo?.valorOrcamento ?? null },
    }).afterClosed().subscribe((pedido?: ContratarResultado) => {
      if (!pedido) {
        return;
      }
      this.negocio.contratarFornecedor(this.id, servico.id, vinculoId, { valor: pedido.valor }).subscribe({
        next: () => {
          if (!pedido.arquivo) {
            this.toast.sucesso('Fornecedor contratado.');
            this.recarregar();
            return;
          }
          this.negocio.enviarContratoAssinado(this.id, servico.id, pedido.arquivo).subscribe({
            next: () => {
              this.toast.sucesso('Fornecedor contratado e contrato assinado anexado.');
              this.recarregar();
            },
            error: (erro: unknown) => {
              this.toast.erro(`Fornecedor contratado, mas o contrato não foi anexado: ${mensagemDeErro(erro)} Anexe pelo menu da linha.`);
              this.recarregar();
            },
          });
        },
        error: (erro: unknown) => this.toast.erro(mensagemDeErro(erro)),
      });
    });
  }

  protected anexarContrato(servico: EventoServico): void {
    this.dialog.open(ComprovanteDialog, { ...DIALOG_PEQUENO, data: { titulo: 'Contrato assinado' } }).afterClosed().subscribe((arquivo?: File) => {
      if (!arquivo) {
        return;
      }
      this.negocio.enviarContratoAssinado(this.id, servico.id, arquivo).subscribe({
        next: (evento) => {
          this.toast.sucesso('Contrato assinado anexado.');
          this.evento.set(evento);
        },
        error: (erro: unknown) => this.toast.erro(mensagemDeErro(erro)),
      });
    });
  }

  protected excluirContrato(servico: EventoServico): void {
    this.dialog.open(ConfirmaDialog, {
      ...DIALOG_PEQUENO,
      data: { titulo: 'Excluir contrato assinado', texto: `Excluir "${servico.contratoAssinado?.nome ?? 'contrato'}"? O arquivo é apagado.`, confirmar: 'Excluir' },
    }).afterClosed().subscribe((confirmou) => {
      if (!confirmou) {
        return;
      }
      this.negocio.excluirContratoAssinado(this.id, servico.id).subscribe({
        next: (evento) => {
          this.toast.sucesso('Contrato assinado excluído.');
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

  protected abrirBudget(): void {
    this.negocio.budget(this.id).subscribe({
      next: (budget) => this.dialog.open(BudgetDialog, { ...DIALOG, data: budget }),
      error: (erro: unknown) => this.toast.erro(mensagemDeErro(erro)),
    });
  }

  /** Um vínculo em Orçamento por serviço marcado; serviços novos são criados antes (SPEC-045 §6.1). */
  private async gravarVinculos(pedido: VincularFornecedorPedido, atual: EventoDetalhe): Promise<void> {
    const existentes = new Set(atual.servicos.map((item) => item.id));
    let feitos = 0;
    try {
      for (const escolha of pedido.servicos) {
        let servicoId = escolha.servicoId;
        if (!servicoId) {
          const evento = await firstValueFrom(this.negocio.adicionarServicoEvento(this.id, escolha.novoServico ?? ''));
          const criado = evento.servicos.find((item) => !existentes.has(item.id));
          if (!criado) {
            throw new Error('Não foi possível criar o serviço.');
          }
          existentes.add(criado.id);
          servicoId = criado.id;
        }
        await firstValueFrom(this.negocio.adicionarFornecedorServico(this.id, servicoId, pedido.fornecedorId, pedido.etapa));
        feitos++;
      }
      this.toast.sucesso(feitos === 1 ? 'Fornecedor adicionado.' : `Fornecedor adicionado em ${feitos} serviços.`);
    } catch (erro) {
      this.toast.erro(erro instanceof Error ? erro.message : mensagemDeErro(erro));
    }
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
  }
}

function normalizar(texto: string): string {
  return texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}

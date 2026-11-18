import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDialog, MatDialogModule, MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
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
import { CampoDataComponent } from '../../shared/campo-data';
import { CampoDinheiroComponent } from '../../shared/campo-dinheiro';
import { deDataParaIso } from '../../shared/data';
import { DIALOG, DIALOG_PEQUENO } from '../../shared/dialog';
import { GdDinheiroPipe } from '../../shared/gd-dinheiro.pipe';
import { EventoAbasComponent } from './evento-abas.component';
import { VincularFornecedorDados, VincularFornecedorDialog, VincularFornecedorPedido } from './vincular-fornecedor.dialog';

@Component({
  selector: 'app-contratar-dialog',
  imports: [ReactiveFormsModule, MatDialogModule, MatButtonModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatCheckboxModule, CampoDataComponent, CampoDinheiroComponent],
  template: `
    <h2 mat-dialog-title>Contratar fornecedor</h2>
    <p class="gd-dialog-descricao">{{ dados.fornecedor }} · {{ dados.servico }}. Valor e parcelas do contrato.</p>
    <mat-dialog-content>
      <form class="gd-campos duas" [formGroup]="form">
        <app-campo-dinheiro rotulo="Valor" formControlName="valor" />
        <mat-form-field appearance="outline"><mat-label>Parcelas</mat-label><input matInput type="number" min="1" formControlName="quantidadeParcelas" /></mat-form-field>
        <app-campo-data rotulo="Primeira parcela" formControlName="primeiraParcela" />
        <span></span>
        <mat-checkbox class="inteiro" formControlName="comEntrada">Incluir entrada</mat-checkbox>
        @if (form.controls.comEntrada.value) {
          <mat-form-field appearance="outline">
            <mat-label>Base</mat-label>
            <mat-select formControlName="baseEntrada">
              <mat-option value="Valor">Valor</mat-option>
              <mat-option value="Porcentagem">Porcentagem</mat-option>
            </mat-select>
          </mat-form-field>
          @if (form.controls.baseEntrada.value === 'Porcentagem') {
            <mat-form-field appearance="outline">
              <mat-label>Valor de entrada</mat-label>
              <input matInput type="number" min="0" formControlName="valorEntrada" />
              <span matTextSuffix>%</span>
            </mat-form-field>
          } @else {
            <app-campo-dinheiro rotulo="Valor de entrada" formControlName="valorEntrada" />
          }
          <app-campo-data rotulo="Data de entrada" formControlName="dataEntrada" />
        }
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button type="button" (click)="ref.close()">Cancelar</button>
      <button mat-flat-button type="button" (click)="confirmar()">Contratar</button>
    </mat-dialog-actions>
  `,
})
export class ContratarDialog {
  private readonly fb = inject(FormBuilder);
  private readonly toast = inject(ToastService);
  protected readonly dados = inject<{ fornecedor: string; servico: string; valor: number | null }>(MAT_DIALOG_DATA);
  protected readonly ref = inject(MatDialogRef<ContratarDialog, unknown>);
  protected readonly form = this.fb.group({
    valor: this.fb.control<number | null>(this.dados.valor, Validators.required),
    quantidadeParcelas: ['1', Validators.required],
    primeiraParcela: this.fb.control<Date | null>(null, Validators.required),
    comEntrada: false,
    baseEntrada: 'Valor',
    valorEntrada: this.fb.control<number | null>(null),
    dataEntrada: this.fb.control<Date | null>(null),
  });

  protected confirmar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.toast.erro('Informe o valor, as parcelas e a data da primeira parcela.');
      return;
    }
    const valor = this.form.getRawValue();
    this.ref.close({
      valor: valor.valor,
      quantidadeParcelas: Number(valor.quantidadeParcelas),
      primeiraParcela: deDataParaIso(valor.primeiraParcela),
      comEntrada: !!valor.comEntrada,
      baseEntrada: valor.comEntrada ? valor.baseEntrada : null,
      valorEntrada: valor.comEntrada ? valor.valorEntrada : null,
      dataEntrada: valor.comEntrada ? deDataParaIso(valor.dataEntrada) : null,
    });
  }
}

@Component({
  selector: 'app-nome-servico-dialog',
  imports: [ReactiveFormsModule, MatDialogModule, MatButtonModule, MatFormFieldModule, MatInputModule],
  template: `
    <h2 mat-dialog-title>Adicionar serviço</h2>
    <mat-dialog-content>
      <mat-form-field appearance="outline" class="cheia">
        <mat-label>Nome do serviço</mat-label>
        <input matInput [formControl]="nome" />
      </mat-form-field>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button type="button" (click)="ref.close()">Cancelar</button>
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
      <form class="gd-campos" [formGroup]="form">
        <app-campo-dinheiro rotulo="Valor estimado (sem subitens)" formControlName="valorEstimado" />
        <div formArrayName="subitens">
          @for (ctrl of subitens.controls; track $index; let i = $index) {
            <div class="linha" [formGroupName]="i">
              <mat-form-field appearance="outline"><mat-label>Descrição</mat-label><input matInput formControlName="descricao" /></mat-form-field>
              <mat-form-field appearance="outline"><mat-label>Qtd</mat-label><input matInput type="number" min="1" formControlName="quantidade" /></mat-form-field>
              <app-campo-dinheiro rotulo="Unitário" formControlName="valorUnitario" />
              <button mat-icon-button type="button" aria-label="Remover" (click)="remover(i)"><mat-icon>delete</mat-icon></button>
            </div>
          }
        </div>
        <button mat-stroked-button type="button" (click)="adicionar()"><mat-icon>add</mat-icon> Subitem</button>
        <p class="gd-sub">Com subitens, o estimado do serviço vira a soma (quantidade × unitário).</p>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button type="button" (click)="ref.close()">Cancelar</button>
      <button mat-flat-button type="button" (click)="salvar()">Salvar</button>
    </mat-dialog-actions>
  `,
  styles: `
    .linha { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; margin-bottom: 8px; }
    .linha mat-form-field { flex: 1; min-width: 120px; }
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
  imports: [MatDialogModule, MatButtonModule, GdDinheiroPipe],
  template: `
    <h2 mat-dialog-title>Planejamento de orçamento</h2>
    <mat-dialog-content>
      @if (budget) {
        <div class="gd-numeros">
          <div class="gd-numero"><span>Orçamento</span><strong>{{ budget.budget | gdDinheiro }}</strong></div>
          <div class="gd-numero"><span>Estimado</span><strong>{{ budget.estimado | gdDinheiro }}</strong></div>
          <div class="gd-numero"><span>Contratado</span><strong>{{ budget.contratado | gdDinheiro }}</strong></div>
          <div class="gd-numero"><span>Prova real</span><strong>{{ budget.provaReal | gdDinheiro }}</strong></div>
          @if (budget.custoPorConvidado !== null) {
            <div class="gd-numero"><span>Por convidado</span><strong>{{ budget.custoPorConvidado | gdDinheiro }}</strong></div>
          }
        </div>
        <table class="gd-grade">
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
      <button mat-button type="button" mat-dialog-close>Fechar</button>
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
  imports: [
    RouterLink, MatButtonModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatIconModule, MatMenuModule,
    GdDinheiroPipe, EventoAbasComponent,
  ],
  template: `
    <a mat-button routerLink="/eventos"><mat-icon>arrow_back</mat-icon> Eventos</a>
    <app-evento-abas [eventoId]="id" />
    <header class="gd-cabecalho">
      <div>
        <h1>Fornecedores</h1>
        <p>{{ evento()?.nome }} · serviços, negociação e pagamentos.</p>
      </div>
      <div class="gd-cabecalho-acoes">
        <button mat-button class="gd-secundario" type="button" (click)="abrirBudget()"><mat-icon>request_quote</mat-icon> Orçamento</button>
        <button mat-button class="gd-secundario" type="button" (click)="adicionarServico()"><mat-icon>playlist_add</mat-icon> Adicionar serviço</button>
        <button mat-flat-button type="button" (click)="vincular()"><mat-icon>add</mat-icon> Adicionar fornecedor</button>
      </div>
    </header>
    @if (evento(); as atual) {
      <section class="gd-painel">
        <div class="gd-barra">
          <div class="gd-filtros">
            <mat-form-field appearance="outline" subscriptSizing="dynamic">
              <mat-select [value]="etapa()" (valueChange)="etapa.set($event)" aria-label="Etapa">
                <mat-option value="">Todas as etapas</mat-option>
                @for (item of etapas; track item.valor) { <mat-option [value]="item.valor">{{ item.rotulo }}</mat-option> }
                <mat-option [value]="semFornecedor">Sem fornecedor</mat-option>
              </mat-select>
            </mat-form-field>
            <mat-form-field class="gd-busca" appearance="outline" subscriptSizing="dynamic">
              <mat-icon matIconPrefix>search</mat-icon>
              <input matInput placeholder="Buscar serviço ou fornecedor" [value]="busca()" (input)="buscar($event)" />
            </mat-form-field>
          </div>
        </div>

        @if (atual.servicos.length === 0) {
          <div class="gd-vazio vazio-acao">
            <p>Nenhum fornecedor neste evento ainda.</p>
            <button mat-flat-button type="button" (click)="vincular()"><mat-icon>add</mat-icon> Adicionar fornecedor</button>
          </div>
        } @else if (linhas().length === 0) {
          <p class="gd-vazio">Nada encontrado com esses filtros.</p>
        } @else {
          <div class="gd-tabela-rolagem">
            <table class="gd-grade">
              <thead>
                <tr>
                  <th>Serviço</th>
                  <th>Fornecedor</th>
                  <th>Etapa</th>
                  <th class="gd-direita">Valor</th>
                  <th class="gd-acoes">Ações</th>
                </tr>
              </thead>
              <tbody>
                @for (linha of linhas(); track linha.chave) {
                  <tr>
                    @if (linha.primeira) {
                      <td class="servico" [attr.rowspan]="linha.linhasDoServico">
                        <span class="nome">{{ linha.servico.nome }}</span>
                        <span class="gd-sub">
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
                        @if (vinculo.observacoes) { <span class="gd-sub">{{ vinculo.observacoes }}</span> }
                      </td>
                      <td><span [class]="classeEtapa(vinculo.etapa)">{{ rotuloEtapa(vinculo.etapa) }}</span></td>
                      <td class="gd-direita valor">
                        @if (vinculo.etapa === 'Contratado') {
                          {{ linha.servico.valorContratado | gdDinheiro }}
                        } @else if (vinculo.valorOrcamento !== null) {
                          {{ vinculo.valorOrcamento | gdDinheiro }}
                        } @else {
                          <span class="gd-sub">—</span>
                        }
                      </td>
                      <td class="gd-acoes">
                        @if (vinculo.etapa === 'Contratado') {
                          <button mat-icon-button type="button" aria-label="Mais ações" [matMenuTriggerFor]="menu"><mat-icon>more_vert</mat-icon></button>
                          <mat-menu #menu="matMenu" xPosition="before">
                            <button mat-menu-item type="button" (click)="voltar(linha.servico, vinculo.id)">
                              <mat-icon>undo</mat-icon> Voltar para orçamento
                            </button>
                          </mat-menu>
                        } @else {
                          <button mat-stroked-button class="contratar" type="button" (click)="contratar(linha.servico, vinculo.id)">Contratar</button>
                        }
                      </td>
                    } @else {
                      <td><span class="gd-sub">Nenhum fornecedor</span></td>
                      <td><span class="gd-status neutro">Sem fornecedor</span></td>
                      <td class="gd-direita"><span class="gd-sub">—</span></td>
                      <td class="gd-acoes">
                        <button mat-stroked-button class="contratar" type="button" (click)="vincular(linha.servico)">Vincular</button>
                      </td>
                    }
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }
      </section>
    }
  `,
  styles: `
    .vazio-acao { display: flex; flex-direction: column; align-items: center; gap: 12px; }
    .vazio-acao p { margin: 0; }
    .nome { display: block; font-weight: 500; }
    td.servico { vertical-align: top; min-width: 200px; }
    .servico-acoes { display: flex; flex-wrap: wrap; gap: 4px; margin: 6px 0 0 -12px; }
    .servico-acoes button { height: 28px; font-size: 12px; color: var(--gd-muted-foreground); }
    .servico-acoes mat-icon { font-size: 16px; width: 16px; height: 16px; }
    .valor { font-weight: 600; white-space: nowrap; }
    .contratar { height: 32px; margin-right: 4px; }
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
    return `gd-status ${CLASSE_ETAPA[etapa] ?? 'neutro'}`;
  }

  protected vincular(servico?: EventoServico): void {
    const atual = this.evento();
    if (!atual) {
      return;
    }
    const dados: VincularFornecedorDados = { servicos: atual.servicos, fornecedores: this.fornecedores(), servicoId: servico?.id };
    this.dialog.open(VincularFornecedorDialog, { ...DIALOG, data: dados }).afterClosed().subscribe((pedido?: VincularFornecedorPedido) => {
      if (!pedido) {
        return;
      }
      if (pedido.servicoId) {
        this.gravarVinculo(pedido.servicoId, pedido);
        return;
      }
      const antes = new Set(atual.servicos.map((item) => item.id));
      this.negocio.adicionarServicoEvento(this.id, pedido.novoServico ?? '').subscribe({
        next: (evento) => {
          const criado = evento.servicos.find((item) => !antes.has(item.id));
          if (!criado) {
            this.toast.erro('Não foi possível criar o serviço.');
            this.recarregar();
            return;
          }
          this.gravarVinculo(criado.id, pedido);
        },
        error: (erro: unknown) => this.toast.erro(mensagemDeErro(erro)),
      });
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
    }).afterClosed().subscribe((pedido) => {
      if (!pedido) {
        return;
      }
      this.negocio.contratarFornecedor(this.id, servico.id, vinculoId, pedido).subscribe({
        next: () => {
          this.toast.sucesso('Fornecedor contratado.');
          this.recarregar();
        },
        error: (erro: unknown) => this.toast.erro(mensagemDeErro(erro)),
      });
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

  private gravarVinculo(servicoId: string, pedido: VincularFornecedorPedido): void {
    this.negocio.adicionarFornecedorServico(this.id, servicoId, pedido.fornecedorId, pedido.etapa).subscribe({
      next: () => {
        this.toast.sucesso('Fornecedor adicionado.');
        this.recarregar();
      },
      error: (erro: unknown) => {
        this.toast.erro(mensagemDeErro(erro));
        this.recarregar();
      },
    });
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

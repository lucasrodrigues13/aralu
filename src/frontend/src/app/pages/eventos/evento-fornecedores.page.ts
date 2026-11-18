import { Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDialog, MatDialogModule, MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
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
import { DIALOG } from '../../shared/dialog';
import { GdDinheiroPipe } from '../../shared/gd-dinheiro.pipe';
import { EventoAbasComponent } from './evento-abas.component';

@Component({
  selector: 'app-contratar-dialog',
  imports: [ReactiveFormsModule, MatDialogModule, MatButtonModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatCheckboxModule, CampoDataComponent, CampoDinheiroComponent],
  template: `
    <h2 mat-dialog-title>Contratar fornecedor</h2>
    <mat-dialog-content>
      <form class="gd-campos" [formGroup]="form">
        <app-campo-dinheiro rotulo="Valor" formControlName="valor" />
        <mat-form-field appearance="outline"><mat-label>Parcelas</mat-label><input matInput type="number" min="1" formControlName="quantidadeParcelas" /></mat-form-field>
        <app-campo-data rotulo="Primeira parcela" formControlName="primeiraParcela" />
        <mat-checkbox formControlName="comEntrada">Incluir entrada</mat-checkbox>
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
  protected readonly ref = inject(MatDialogRef<ContratarDialog, unknown>);
  protected readonly form = this.fb.group({
    valor: this.fb.control<number | null>(null, Validators.required),
    quantidadeParcelas: ['1', Validators.required],
    primeiraParcela: this.fb.control<Date | null>(null),
    comEntrada: false,
    baseEntrada: 'Valor',
    valorEntrada: this.fb.control<number | null>(null),
    dataEntrada: this.fb.control<Date | null>(null),
  });

  protected confirmar(): void {
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

/** Aba Fornecedores do evento: serviços, negociação, parcelas e orçamento (SPEC-018; SPEC-008 v2, 8.2). */
@Component({
  selector: 'app-evento-fornecedores',
  imports: [
    RouterLink, MatButtonModule, MatFormFieldModule, MatSelectModule, MatIconModule, GdDinheiroPipe, EventoAbasComponent,
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
        <button mat-flat-button type="button" (click)="adicionarServico()"><mat-icon>add</mat-icon> Adicionar serviço</button>
      </div>
    </header>
    @if (evento(); as atual) {
      <section class="gd-painel">
        @if (atual.servicos.length === 0) {
          <p class="gd-vazio">Nenhum serviço neste evento. Adicione um serviço para começar a negociar.</p>
        }
        @for (servico of atual.servicos; track servico.id) {
          <article class="servico">
            <header>
              <strong>{{ servico.nome }}</strong>
              <span class="gd-sub">Estimado: {{ servico.valorEstimado | gdDinheiro }} · Contratado: {{ servico.valorContratado | gdDinheiro }}</span>
            </header>
            <div class="trilha">
              @for (etapa of etapas; track etapa.valor) {
                <span class="etapa" [class.ativa]="temEtapa(servico, etapa.valor)">{{ etapa.rotulo }}</span>
                @if (!$last) { <span class="seta">→</span> }
              }
            </div>
            @for (forn of servico.fornecedores; track forn.id) {
              <div class="forn">
                <span>{{ forn.fornecedor }} — {{ rotuloEtapa(forn.etapa) }}</span>
                @if (forn.valorOrcamento !== null) { <span class="gd-sub">{{ forn.valorOrcamento | gdDinheiro }}</span> }
                <button mat-button type="button" (click)="voltar(servico, forn.id)">Voltar</button>
                <button mat-button type="button" (click)="avancar(servico, forn.id)">Avançar</button>
                <button mat-flat-button type="button" (click)="contratar(servico, forn.id)">Contratar</button>
              </div>
            }
            <div class="linha">
              <mat-form-field>
                <mat-label>Adicionar fornecedor</mat-label>
                <mat-select (valueChange)="adicionarFornecedor(servico, $event)">
                  @for (f of fornecedores(); track f.id) {
                    <mat-option [value]="f.id">{{ f.nome }}</mat-option>
                  }
                </mat-select>
              </mat-form-field>
              <button mat-button class="gd-secundario" type="button" (click)="editarSubitens(servico)">Estimado / subitens</button>
            </div>
          </article>
        }
      </section>
    }
  `,
  styles: `
    .servico { border-top: 1px solid var(--gd-border); padding: 16px 0; }
    .servico:first-of-type { border-top: 0; padding-top: 0; }
    .servico header { display: flex; flex-direction: column; gap: 4px; margin-bottom: 8px; }
    .trilha { display: flex; flex-wrap: wrap; align-items: center; gap: 4px; margin-bottom: 8px; font-size: 13px; }
    .etapa { color: var(--gd-muted-foreground); }
    .etapa.ativa { font-weight: 600; color: var(--gd-primary); }
    .forn { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; margin: 4px 0; }
    .linha { display: flex; gap: 8px; flex-wrap: wrap; align-items: flex-end; margin-top: 8px; }
    .linha mat-form-field { width: min(280px, 100%); }
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
  protected id = '';

  ngOnInit(): void {
    this.id = this.rota.snapshot.paramMap.get('id') ?? '';
    this.recarregar();
    this.negocio.fornecedores().subscribe({
      next: (lista) => this.fornecedores.set(lista),
      error: () => this.fornecedores.set([]),
    });
  }

  protected rotuloEtapa(etapa: string): string {
    return this.etapas.find((item) => item.valor === etapa)?.rotulo ?? etapa;
  }

  protected temEtapa(servico: EventoServico, etapa: string): boolean {
    return servico.fornecedores.some((item) => item.etapa === etapa);
  }

  protected adicionarServico(): void {
    this.dialog.open(NomeServicoDialog, { ...DIALOG, width: 'min(420px, calc(100vw - 32px))' }).afterClosed().subscribe((nome) => {
      if (!nome) {
        return;
      }
      this.negocio.adicionarServicoEvento(this.id, nome).subscribe({
        next: () => {
          this.toast.sucesso('Serviço adicionado.');
          this.recarregar();
        },
        error: (erro: unknown) => this.toast.erro(mensagemDeErro(erro)),
      });
    });
  }

  protected adicionarFornecedor(servico: EventoServico, fornecedorId: string): void {
    if (!fornecedorId) {
      return;
    }
    this.negocio.adicionarFornecedorServico(this.id, servico.id, fornecedorId, 'Recomendado').subscribe({
      next: () => {
        this.toast.sucesso('Fornecedor adicionado.');
        this.recarregar();
      },
      error: (erro: unknown) => this.toast.erro(mensagemDeErro(erro)),
    });
  }

  protected avancar(servico: EventoServico, vinculoId: string): void {
    this.negocio.avancarEtapa(this.id, servico.id, vinculoId).subscribe({
      next: () => {
        this.toast.sucesso('Etapa avançada.');
        this.recarregar();
      },
      error: (erro: unknown) => this.toast.erro(mensagemDeErro(erro)),
    });
  }

  protected voltar(servico: EventoServico, vinculoId: string): void {
    this.negocio.voltarEtapa(this.id, servico.id, vinculoId).subscribe({
      next: () => {
        this.toast.sucesso('Etapa retornada.');
        this.recarregar();
      },
      error: (erro: unknown) => this.toast.erro(mensagemDeErro(erro)),
    });
  }

  protected contratar(servico: EventoServico, vinculoId: string): void {
    this.dialog.open(ContratarDialog, { ...DIALOG, width: 'min(480px, calc(100vw - 32px))' }).afterClosed().subscribe((pedido) => {
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

  private recarregar(): void {
    this.negocio.evento(this.id).subscribe({
      next: (evento) => this.evento.set(evento),
      error: (erro: unknown) => this.toast.erro(mensagemDeErro(erro)),
    });
  }
}

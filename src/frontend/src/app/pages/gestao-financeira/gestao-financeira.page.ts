import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { mensagemDeErro } from '../../core/mensagem-erro';
import { ContratoFunil, NegocioClient } from '../../core/negocio.client';
import { ToastService } from '../../core/toast.service';
import { DIALOG, DIALOG_LARGO } from '../../shared/dialog';
import { GdDataPipe } from '../../shared/gd-data.pipe';
import { GdDinheiroPipe } from '../../shared/gd-dinheiro.pipe';
import { STATUS } from '../../shared/status';
import { DefinirParcelasContratoDialog } from './definir-parcelas-contrato.dialog';
import { ParcelasContratoDialog } from './parcelas-contrato.dialog';

export type SituacaoFinanceira = 'EmAberto' | 'Atrasados' | 'Quitados' | 'SemParcelas';

/** Situação financeira do contrato, para o filtro e o selo da linha. */
export function situacaoFinanceira(contrato: ContratoFunil): SituacaoFinanceira {
  if (contrato.parcelas.length === 0) return 'SemParcelas';
  if (contrato.parcelas.some((parcela) => parcela.situacao === 'Atrasada')) return 'Atrasados';
  return contrato.saldo > 0 ? 'EmAberto' : 'Quitados';
}

/**
 * Gestão Financeira (SPEC-041, card #32): o faturamento da organizadora pelo serviço prestado.
 * Lista os contratos fechados com cada cliente (não cancelados), com valor, recebido e saldo, e leva
 * ao parcelamento e às parcelas (Cobrar, Recebi) de cada um. Nada aqui é específico de evento.
 */
@Component({
  selector: 'app-gestao-financeira',
  imports: [MatButtonModule, MatCardModule, MatFormFieldModule, MatIconModule, MatInputModule, MatSelectModule, GdDataPipe, GdDinheiroPipe],
  template: `
    <div class="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-6">
      <mat-card class="shadow-none text-center mb-0! h-full bg-light-primary">
        <mat-card-content>
          <mat-icon class="text-primary">receipt_long</mat-icon>
          <h4 class="text-sm font-semibold text-primary mt-2!">Contratado</h4>
          <h6 class="text-xl font-semibold text-primary mt-2!">{{ totalContratado() | gdDinheiro }}</h6>
        </mat-card-content>
      </mat-card>
      <mat-card class="shadow-none text-center mb-0! h-full bg-light-success">
        <mat-card-content>
          <mat-icon class="text-success">check_circle</mat-icon>
          <h4 class="text-sm font-semibold text-success mt-2!">Recebido</h4>
          <h6 class="text-xl font-semibold text-success mt-2!">{{ totalRecebido() | gdDinheiro }}</h6>
        </mat-card-content>
      </mat-card>
      <mat-card class="shadow-none text-center mb-0! h-full bg-light-warning">
        <mat-card-content>
          <mat-icon class="text-warning">schedule</mat-icon>
          <h4 class="text-sm font-semibold text-warning mt-2!">A receber</h4>
          <h6 class="text-xl font-semibold text-warning mt-2!">{{ totalSaldo() | gdDinheiro }}</h6>
        </mat-card-content>
      </mat-card>
    </div>
    <mat-card class="cardWithShadow">
      <div class="p-6">
        <mat-card-title class="mb-0">Gestão Financeira</mat-card-title>
        <mat-card-subtitle>Contratos fechados com seus clientes e o que falta receber de cada um.</mat-card-subtitle>
      </div>
      <mat-card-content class="border-t border-border">
        <div class="flex flex-wrap items-end gap-4 mb-6">
          <div class="campo w-full sm:w-56">
            <mat-label class="font-semibold mb-2 block">Situação</mat-label>
            <mat-form-field appearance="outline" class="w-full">
              <mat-select [value]="filtro()" (valueChange)="filtro.set($event)" aria-label="Situação">
                <mat-option value="">Todos</mat-option>
                <mat-option value="EmAberto">Em aberto</mat-option>
                <mat-option value="Atrasados">Com parcela atrasada</mat-option>
                <mat-option value="Quitados">Quitados</mat-option>
                <mat-option value="SemParcelas">Sem parcelas</mat-option>
              </mat-select>
            </mat-form-field>
          </div>
          <div class="campo w-full sm:w-64">
            <mat-label class="font-semibold mb-2 block">Buscar</mat-label>
            <mat-form-field appearance="outline" class="w-full">
              <mat-icon matIconPrefix>search</mat-icon>
              <input matInput aria-label="Buscar" placeholder="Buscar cliente" [value]="busca()" (input)="busca.set($any($event.target).value)" />
            </mat-form-field>
          </div>
        </div>
        @if (visiveis().length === 0) {
          <p class="text-center text-muted py-10">Nenhum contrato para mostrar.</p>
        } @else {
          <div class="relative overflow-auto">
            <table class="tabela">
              <thead>
                <tr>
                  <th>Cliente</th>
                  <th>Contrato</th>
                  <th class="text-end!">Valor</th>
                  <th class="text-end!">Recebido</th>
                  <th class="text-end!">Saldo</th>
                  <th>Parcelas</th>
                  <th class="text-end! whitespace-nowrap">Ações</th>
                </tr>
              </thead>
              <tbody>
                @for (item of visiveis(); track item.id) {
                  <tr>
                    <td>{{ item.oportunidadeNome }}</td>
                    <td>
                      <span class="block text-sm">{{ item.assinadoEm ? 'Assinado' : 'Em andamento' }}</span>
                      <span class="block text-xs text-muted">{{ item.criadoEm | gdData }}</span>
                    </td>
                    <td class="text-end! valor">{{ item.valorTotal | gdDinheiro }}</td>
                    <td class="text-end! whitespace-nowrap">{{ item.recebido | gdDinheiro }}</td>
                    <td class="text-end! whitespace-nowrap">{{ item.saldo | gdDinheiro }}</td>
                    <td>
                      <span [class]="selo(item).classe">{{ selo(item).rotulo }}</span>
                      @if (proximoVencimento(item); as vencimento) {
                        <span class="block text-xs text-muted">próxima em {{ vencimento | gdData }}</span>
                      }
                    </td>
                    <td class="text-end! whitespace-nowrap">
                      <button mat-icon-button type="button" aria-label="Parcelas do contrato" title="Parcelas do contrato" (click)="abrirParcelas(item)" [disabled]="item.parcelas.length === 0"><mat-icon>payments</mat-icon></button>
                      <button mat-icon-button type="button" [attr.aria-label]="item.parcelas.length ? 'Refazer parcelamento' : 'Parcelar contrato'" [title]="item.parcelas.length ? 'Refazer parcelamento' : 'Parcelar contrato'" (click)="parcelar(item)"><mat-icon>edit_calendar</mat-icon></button>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }
      </mat-card-content>
    </mat-card>
  `,
  styles: `.valor { font-weight: 600; white-space: nowrap; }`,
})
export class GestaoFinanceiraPage implements OnInit {
  private readonly negocio = inject(NegocioClient);
  private readonly dialog = inject(MatDialog);
  private readonly toast = inject(ToastService);
  private readonly lista = signal<ContratoFunil[]>([]);
  protected readonly filtro = signal<SituacaoFinanceira | ''>('');
  protected readonly busca = signal('');

  protected readonly visiveis = computed(() => {
    const termo = this.busca().trim().toLowerCase();
    return this.lista()
      .filter((item) => (!this.filtro() || situacaoFinanceira(item) === this.filtro()) && (!termo || item.oportunidadeNome.toLowerCase().includes(termo)))
      .sort((a, b) => a.oportunidadeNome.localeCompare(b.oportunidadeNome, 'pt-BR') || a.criadoEm.localeCompare(b.criadoEm));
  });
  protected readonly totalContratado = computed(() => this.visiveis().reduce((soma, item) => soma + item.valorTotal, 0));
  protected readonly totalRecebido = computed(() => this.visiveis().reduce((soma, item) => soma + item.recebido, 0));
  protected readonly totalSaldo = computed(() => this.visiveis().reduce((soma, item) => soma + item.saldo, 0));

  ngOnInit(): void {
    this.carregar();
  }

  protected selo(item: ContratoFunil): { rotulo: string; classe: string } {
    switch (situacaoFinanceira(item)) {
      case 'SemParcelas': return { rotulo: 'Sem parcelas', classe: STATUS.neutro };
      case 'Atrasados': return { rotulo: 'Parcela atrasada', classe: STATUS.erro };
      case 'Quitados': return { rotulo: 'Quitado', classe: STATUS.sucesso };
      default: return { rotulo: item.parcelas.length === 1 ? 'À vista, a receber' : `${item.parcelas.length} parcelas`, classe: STATUS.alerta };
    }
  }

  protected proximoVencimento(item: ContratoFunil): string | null {
    return item.parcelas.filter((parcela) => parcela.saldo > 0).map((parcela) => parcela.vencimento).sort()[0] ?? null;
  }

  protected abrirParcelas(item: ContratoFunil): void {
    this.dialog.open(ParcelasContratoDialog, { ...DIALOG_LARGO, data: item }).afterClosed().subscribe(() => this.carregar());
  }

  protected parcelar(item: ContratoFunil): void {
    this.dialog.open(DefinirParcelasContratoDialog, { ...DIALOG, data: item }).afterClosed().subscribe((ok) => ok && this.carregar());
  }

  private carregar(): void {
    this.negocio.contratosFunil({}).subscribe({
      next: (lista) => this.lista.set(lista.filter((item) => item.situacao !== 'Cancelado')),
      error: (erro: unknown) => this.toast.erro(mensagemDeErro(erro)),
    });
  }
}

import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { DinheiroClient, PagamentoFornecedor } from '../../core/dinheiro.client';
import { mensagemDeErro } from '../../core/mensagem-erro';
import { ToastService } from '../../core/toast.service';
import { GdDataPipe } from '../../shared/gd-data.pipe';
import { GdDinheiroPipe } from '../../shared/gd-dinheiro.pipe';
import { STATUS } from '../../shared/status';

/** Pagamentos a fornecedores de todos os eventos (SPEC-029 §6.5, RF-097). */
@Component({
  selector: 'app-pagamentos',
  imports: [MatCardModule, RouterLink, MatFormFieldModule, MatInputModule, MatSelectModule, MatIconModule, GdDataPipe, GdDinheiroPipe],
  template: `
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6">
      <mat-card class="shadow-none text-center mb-0! h-full bg-light-warning">
        <mat-card-content>
          <mat-icon class="text-warning">schedule</mat-icon>
          <h4 class="text-sm font-semibold text-warning mt-2!">Pendente</h4>
          <h6 class="text-xl font-semibold text-warning mt-2!">{{ totalPendente() | gdDinheiro }}</h6>
        </mat-card-content>
      </mat-card>
      <mat-card class="shadow-none text-center mb-0! h-full bg-light-success">
        <mat-card-content>
          <mat-icon class="text-success">check_circle</mat-icon>
          <h4 class="text-sm font-semibold text-success mt-2!">Pago</h4>
          <h6 class="text-xl font-semibold text-success mt-2!">{{ totalPago() | gdDinheiro }}</h6>
        </mat-card-content>
      </mat-card>
    </div>
    <mat-card class="cardWithShadow">
      <div class="p-6">
        <mat-card-title class="mb-0">Pagamentos</mat-card-title>
        <mat-card-subtitle>Parcelas a fornecedores de todos os eventos.</mat-card-subtitle>
      </div>
      <mat-card-content class="border-t border-border">
        <div class="flex flex-wrap items-end gap-4 mb-6">
          <div class="campo w-full sm:w-48">
            <mat-label class="font-semibold mb-2 block">Situação</mat-label>
            <mat-form-field appearance="outline" class="w-full">
            <mat-select [value]="situacao()" (valueChange)="situacao.set($event)" aria-label="Situação">
              <mat-option value="">Todas</mat-option>
              <mat-option value="Pendente">Pendentes</mat-option>
              <mat-option value="Pago">Pagas</mat-option>
            </mat-select>
          </mat-form-field>
          </div>
          <div class="campo w-full sm:w-48">
            <mat-label class="font-semibold mb-2 block">Evento</mat-label>
            <mat-form-field appearance="outline" class="w-full">
            <mat-select [value]="evento()" (valueChange)="evento.set($event)" aria-label="Evento">
              <mat-option value="">Todos</mat-option>
              @for (item of eventos(); track item.id) { <mat-option [value]="item.id">{{ item.nome }}</mat-option> }
            </mat-select>
          </mat-form-field>
          </div>
          <div class="campo w-full sm:w-64">
            <mat-label class="font-semibold mb-2 block">Buscar</mat-label>
            <mat-form-field appearance="outline" class="w-full">
            <mat-icon matIconPrefix>search</mat-icon>
            <input matInput aria-label="Buscar" placeholder="Buscar serviço ou fornecedor" [value]="busca()" (input)="busca.set($any($event.target).value)" />
          </mat-form-field>
          </div>
        </div>
      @if (visiveis().length === 0) {
        <p class="text-center text-muted py-10">Nenhum pagamento para mostrar.</p>
      } @else {
        <div class="relative overflow-auto">
          <table class="tabela">
            <thead>
              <tr><th>Vencimento</th><th>Evento</th><th>Serviço</th><th>Fornecedor</th><th class="text-end!">Valor</th><th>Situação</th></tr>
            </thead>
            <tbody>
              @for (item of visiveis(); track $index) {
                <tr>
                  <td>{{ item.vencimento | gdData }}</td>
                  <td><a [routerLink]="['/eventos', item.eventoId, 'dinheiro']">{{ item.evento }}</a></td>
                  <td>{{ item.servico }} <span class="block text-xs text-muted">{{ item.entrada ? 'Entrada' : 'Parcela ' + item.numero }}</span></td>
                  <td>{{ item.fornecedor ?? '—' }}</td>
                  <td class="text-end! valor">{{ item.valor | gdDinheiro }}</td>
                  <td><span [class]="item.situacao === 'Pago' ? status.sucesso : status.alerta">{{ item.situacao === 'Pago' ? 'Pago' : 'Pendente' }}</span></td>
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
export class PagamentosPage implements OnInit {
  protected readonly status = STATUS;
  private readonly dinheiro = inject(DinheiroClient);
  private readonly toast = inject(ToastService);
  private readonly lista = signal<PagamentoFornecedor[]>([]);
  protected readonly situacao = signal('');
  protected readonly evento = signal('');
  protected readonly busca = signal('');

  protected readonly eventos = computed(() => {
    const vistos = new Map<string, string>();
    for (const item of this.lista()) vistos.set(item.eventoId, item.evento);
    return [...vistos.entries()].map(([id, nome]) => ({ id, nome })).sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
  });

  protected readonly visiveis = computed(() => {
    const termo = this.busca().trim().toLowerCase();
    return this.lista().filter((item) =>
      (!this.situacao() || (this.situacao() === 'Pago') === (item.situacao === 'Pago'))
      && (!this.evento() || item.eventoId === this.evento())
      && (!termo || item.servico.toLowerCase().includes(termo) || (item.fornecedor ?? '').toLowerCase().includes(termo)));
  });

  protected readonly totalPendente = computed(() =>
    this.visiveis().filter((item) => item.situacao !== 'Pago').reduce((soma, item) => soma + item.valor, 0));
  protected readonly totalPago = computed(() =>
    this.visiveis().filter((item) => item.situacao === 'Pago').reduce((soma, item) => soma + item.valor, 0));

  ngOnInit(): void {
    this.dinheiro.pagamentos().subscribe({
      next: (lista) => this.lista.set(lista),
      error: (erro: unknown) => this.toast.erro(mensagemDeErro(erro)),
    });
  }
}

import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { DinheiroClient, PagamentoFornecedor } from '../../core/dinheiro.client';
import { mensagemDeErro } from '../../core/mensagem-erro';
import { ToastService } from '../../core/toast.service';
import { GdDataPipe } from '../../shared/gd-data.pipe';
import { GdDinheiroPipe } from '../../shared/gd-dinheiro.pipe';

/** Pagamentos a fornecedores de todos os eventos (SPEC-029 §6.5, RF-097). */
@Component({
  selector: 'app-pagamentos',
  imports: [RouterLink, MatFormFieldModule, MatInputModule, MatSelectModule, MatIconModule, GdDataPipe, GdDinheiroPipe],
  template: `
    <header class="gd-cabecalho">
      <div>
        <h1>Pagamentos</h1>
        <p>Parcelas a fornecedores de todos os eventos.</p>
      </div>
    </header>
    <section class="gd-numeros">
      <div class="gd-numero"><span>Pendente</span><strong>{{ totalPendente() | gdDinheiro }}</strong></div>
      <div class="gd-numero"><span>Pago</span><strong>{{ totalPago() | gdDinheiro }}</strong></div>
    </section>
    <section class="gd-painel">
      <div class="gd-barra">
        <div class="gd-filtros">
          <mat-form-field appearance="outline" subscriptSizing="dynamic">
            <mat-select [value]="situacao()" (valueChange)="situacao.set($event)" aria-label="Situação">
              <mat-option value="">Todas as situações</mat-option>
              <mat-option value="Pendente">Pendentes</mat-option>
              <mat-option value="Pago">Pagas</mat-option>
            </mat-select>
          </mat-form-field>
          <mat-form-field appearance="outline" subscriptSizing="dynamic">
            <mat-select [value]="evento()" (valueChange)="evento.set($event)" aria-label="Evento">
              <mat-option value="">Todos os eventos</mat-option>
              @for (item of eventos(); track item.id) { <mat-option [value]="item.id">{{ item.nome }}</mat-option> }
            </mat-select>
          </mat-form-field>
          <mat-form-field class="gd-busca" appearance="outline" subscriptSizing="dynamic">
            <mat-icon matIconPrefix>search</mat-icon>
            <input matInput placeholder="Buscar serviço ou fornecedor" [value]="busca()" (input)="busca.set($any($event.target).value)" />
          </mat-form-field>
        </div>
      </div>
      @if (visiveis().length === 0) {
        <p class="gd-vazio">Nenhum pagamento para mostrar.</p>
      } @else {
        <div class="gd-tabela-rolagem">
          <table class="gd-grade">
            <thead>
              <tr><th>Vencimento</th><th>Evento</th><th>Serviço</th><th>Fornecedor</th><th class="gd-direita">Valor</th><th>Situação</th></tr>
            </thead>
            <tbody>
              @for (item of visiveis(); track $index) {
                <tr>
                  <td>{{ item.vencimento | gdData }}</td>
                  <td><a [routerLink]="['/eventos', item.eventoId, 'dinheiro']">{{ item.evento }}</a></td>
                  <td>{{ item.servico }} <span class="gd-sub">{{ item.entrada ? 'Entrada' : 'Parcela ' + item.numero }}</span></td>
                  <td>{{ item.fornecedor ?? '—' }}</td>
                  <td class="gd-direita valor">{{ item.valor | gdDinheiro }}</td>
                  <td><span [class]="item.situacao === 'Pago' ? 'gd-status ok' : 'gd-status alerta'">{{ item.situacao === 'Pago' ? 'Pago' : 'Pendente' }}</span></td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }
    </section>
  `,
  styles: `.valor { font-weight: 600; white-space: nowrap; }`,
})
export class PagamentosPage implements OnInit {
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

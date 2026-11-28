import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { mensagemDeErro } from '../../core/mensagem-erro';
import { ContaAssinatura, Plano, PlanosClient } from '../../core/planos.client';
import { ToastService } from '../../core/toast.service';

/** Admin → Contas → conta (SPEC-062 §13): plano, valor, desconto, trial e histórico. Toda ação pede motivo. */
@Component({
  selector: 'app-conta-admin',
  imports: [FormsModule, RouterLink, MatCardModule, MatButtonModule, MatFormFieldModule, MatInputModule, MatSelectModule, CurrencyPipe, DatePipe],
  template: `
    <mat-card class="cardWithShadow">
      <div class="p-6">
        <a routerLink="/admin" class="text-sm">← Início Admin</a>
        <mat-card-title class="mb-0 mt-2">Assinatura da conta</mat-card-title>
      </div>
      <mat-card-content class="border-t border-border pt-6">
        @if (conta(); as c) {
          <div class="grid gap-1 mb-6">
            <p><span class="font-semibold">Situação:</span> {{ c.situacao }}</p>
            <p><span class="font-semibold">Plano:</span> {{ c.plano }} ({{ c.valorDoPlano | currency: 'BRL' }})</p>
            <p><span class="font-semibold">Valor cobrado:</span> {{ c.valorCobrado | currency: 'BRL' }}</p>
            @if (c.valorPersonalizado !== null) { <p><span class="font-semibold">Valor personalizado:</span> {{ c.valorPersonalizado | currency: 'BRL' }}</p> }
            @if (c.descontoPercentual !== null) { <p><span class="font-semibold">Desconto:</span> {{ c.descontoPercentual }}% {{ c.descontoAte ? 'até ' + (c.descontoAte | date: 'dd/MM/yyyy') : 'sem data de fim' }}</p> }
            <p><span class="font-semibold">Fim do trial:</span> {{ c.trialTerminaEm | date: 'dd/MM/yyyy' }}</p>
          </div>

          <div class="grid gap-4 max-w-xl">
            <mat-form-field appearance="outline">
              <mat-label>Motivo (obrigatório)</mat-label>
              <input matInput name="motivo" [(ngModel)]="motivo" />
            </mat-form-field>

            <div class="flex gap-3 items-center flex-wrap">
              <mat-form-field appearance="outline" class="flex-1">
                <mat-label>Trocar plano</mat-label>
                <mat-select name="plano" [(ngModel)]="planoId">
                  @for (p of planos(); track p.id) {
                    <mat-option [value]="p.id">{{ p.nome }} · {{ p.valorMensal | currency: 'BRL' }}{{ p.publico ? '' : ' (não público)' }}</mat-option>
                  }
                </mat-select>
              </mat-form-field>
              <button mat-stroked-button type="button" (click)="ajustar('plano', { planoId })">Aplicar</button>
            </div>

            <div class="flex gap-3 items-center flex-wrap">
              <mat-form-field appearance="outline" class="flex-1">
                <mat-label>Valor personalizado (R$)</mat-label>
                <input matInput type="number" min="0" step="0.01" name="valor" [(ngModel)]="valor" />
              </mat-form-field>
              <button mat-stroked-button type="button" (click)="ajustar('valor', { valor })">Aplicar</button>
              <button mat-button type="button" (click)="ajustar('valor', { remover: true })">Remover</button>
            </div>

            <div class="flex gap-3 items-center flex-wrap">
              <mat-form-field appearance="outline" class="w-32">
                <mat-label>Desconto (%)</mat-label>
                <input matInput type="number" min="1" max="100" name="percentual" [(ngModel)]="percentual" />
              </mat-form-field>
              <mat-form-field appearance="outline" class="flex-1">
                <mat-label>Até (opcional)</mat-label>
                <input matInput type="date" name="ate" [(ngModel)]="ate" />
              </mat-form-field>
              <button mat-stroked-button type="button" (click)="ajustar('desconto', { percentual, ate: ate || null })">Aplicar</button>
              <button mat-button type="button" (click)="ajustar('desconto', { remover: true })">Remover</button>
            </div>

            <div class="flex gap-3 items-center flex-wrap">
              <mat-form-field appearance="outline" class="flex-1">
                <mat-label>Estender trial até</mat-label>
                <input matInput type="date" name="trial" [(ngModel)]="trialAte" />
              </mat-form-field>
              <button mat-stroked-button type="button" (click)="ajustar('trial', { trialAte })">Aplicar</button>
            </div>
          </div>

          <h3 class="font-semibold mt-8 mb-2">Histórico</h3>
          @if (c.historico.length === 0) {
            <p class="text-muted">Nenhuma alteração.</p>
          }
          <ul class="grid gap-2">
            @for (h of c.historico; track h.feitoEm) {
              <li class="border-t border-border pt-2">
                <strong>{{ h.tipo }}</strong> · {{ h.feitoEm | date: 'dd/MM/yyyy HH:mm' }} · {{ h.feitoPor }}<br />
                @if (h.planoAnterior !== h.planoNovo) { {{ h.planoAnterior }} → {{ h.planoNovo }} · }
                {{ h.valorAnterior | currency: 'BRL' }} → {{ h.valorNovo | currency: 'BRL' }}
                @if (h.detalhe) { · {{ h.detalhe }} }
                <br /><span class="text-muted">Motivo: {{ h.motivo }}</span>
              </li>
            }
          </ul>
        } @else {
          <p class="text-muted">{{ aviso() }}</p>
        }
      </mat-card-content>
    </mat-card>
  `,
})
export class ContaAdminPage implements OnInit {
  private readonly cliente = inject(PlanosClient);
  private readonly toast = inject(ToastService);
  private readonly rota = inject(ActivatedRoute);
  protected readonly conta = signal<ContaAssinatura | null>(null);
  protected readonly planos = signal<Plano[]>([]);
  protected readonly aviso = signal('Carregando…');
  protected motivo = '';
  protected planoId: string | null = null;
  protected valor: number | null = null;
  protected percentual: number | null = null;
  protected ate = '';
  protected trialAte = '';
  private contaId = '';

  ngOnInit(): void {
    this.contaId = this.rota.snapshot.paramMap.get('contaId') ?? '';
    this.cliente.listar().subscribe({ next: (lista) => this.planos.set(lista.filter((p) => p.ativo)), error: () => undefined });
    this.carregar();
  }

  protected ajustar(tipo: 'plano' | 'valor' | 'desconto' | 'trial', pedido: Record<string, unknown>): void {
    this.cliente.ajustar(this.contaId, tipo, { ...pedido, motivo: this.motivo }).subscribe({
      next: (conta) => {
        this.conta.set(conta);
        this.motivo = '';
        this.toast.sucesso('Alteração gravada. Se a conta já assina, vale na próxima cobrança.');
      },
      error: (erro: unknown) => this.toast.erro(mensagemDeErro(erro)),
    });
  }

  private carregar(): void {
    this.cliente.conta(this.contaId).subscribe({
      next: (conta) => {
        this.conta.set(conta);
        this.planoId = conta.planoId;
      },
      error: () => this.aviso.set('Esta conta ainda não tem assinatura.'),
    });
  }
}

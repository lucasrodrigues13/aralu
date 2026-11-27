import { Component, inject, OnInit, signal } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatTableModule } from '@angular/material/table';
import { mensagemDeErro } from '../../core/mensagem-erro';
import { LeadRsvp, NegocioClient } from '../../core/negocio.client';
import { ToastService } from '../../core/toast.service';
import { GdDataPipe } from '../../shared/gd-data.pipe';
import { Estado } from '../../shared/estado';
import { MatTooltipModule } from '@angular/material/tooltip';

@Component({
  selector: 'app-leads-rsvp',
  imports: [MatCardModule, MatButtonModule, MatFormFieldModule, MatInputModule, MatIconModule, MatTableModule, GdDataPipe, MatTooltipModule, Estado],
  template: `
    <mat-card class="cardWithShadow">
      <div class="p-6 flex flex-wrap items-center justify-between gap-4">
      <div>
        <mat-card-title class="mb-0">Oportunidades de RSVP</mat-card-title>
        <mat-card-subtitle>Leads com intenção de realizar evento nos próximos dois anos.</mat-card-subtitle>
      </div>
    </div>
      <mat-card-content class="border-t border-border">
      <div class="flex flex-wrap items-end justify-between gap-4 mb-6">
        <div class="campo w-full sm:w-64">
          <mat-label class="font-semibold mb-2 block">Buscar</mat-label>
          <mat-form-field appearance="outline" class="w-full">
          <mat-icon matIconPrefix>search</mat-icon>
          <input matInput aria-label="Buscar" placeholder="Buscar por convite ou evento" [value]="busca()" (input)="buscar($event)" />
        </mat-form-field>
        </div>
      </div>
      @if (!carregado()) {
        <app-estado titulo="Carregando…" />
      } @else if (lista().length === 0) {
        <app-estado [titulo]="busca() ? 'Nada encontrado' : 'Nenhum lead ainda'" [texto]="busca() ? 'Mude a busca ou os filtros.' : undefined" />
      } @else {
        <table mat-table class="min-w-full" [dataSource]="lista()">
          <ng-container matColumnDef="convite">
            <th mat-header-cell *matHeaderCellDef>Convite</th>
            <td mat-cell *matCellDef="let item">{{ item.convite }}</td>
          </ng-container>
          <ng-container matColumnDef="evento">
            <th mat-header-cell *matHeaderCellDef>Evento</th>
            <td mat-cell *matCellDef="let item">{{ item.evento }}</td>
          </ng-container>
          <ng-container matColumnDef="criadoEm">
            <th mat-header-cell *matHeaderCellDef>Criado em</th>
            <td mat-cell *matCellDef="let item">{{ item.criadoEm | gdData }}</td>
          </ng-container>
          <ng-container matColumnDef="acoes">
            <th mat-header-cell *matHeaderCellDef class="text-end! whitespace-nowrap">Ações</th>
            <td mat-cell *matCellDef="let item" class="text-end! whitespace-nowrap">
              <button mat-icon-button type="button" aria-label="Gerar oportunidade" matTooltip="Gerar oportunidade" (click)="gerar(item)"><mat-icon>trending_up</mat-icon></button>
              <button mat-icon-button type="button" aria-label="Contatar" matTooltip="Contatar" (click)="contatar(item)"><mat-icon>phone</mat-icon></button>
              <button mat-icon-button type="button" aria-label="Descartar" matTooltip="Descartar" (click)="descartar(item)"><mat-icon>delete</mat-icon></button>
            </td>
          </ng-container>
          <tr mat-header-row *matHeaderRowDef="colunas"></tr>
          <tr mat-row *matRowDef="let row; columns: colunas"></tr>
        </table>
      }
    </mat-card-content>
    </mat-card>
  `,
})
export class LeadsRsvpPage implements OnInit {
  private readonly negocio = inject(NegocioClient);
  private readonly toast = inject(ToastService);
  protected readonly lista = signal<LeadRsvp[]>([]);
  protected readonly carregado = signal(false);
  protected readonly busca = signal('');
  protected readonly colunas = ['convite', 'evento', 'criadoEm', 'acoes'];

  ngOnInit(): void {
    this.carregar();
  }

  protected buscar(evento: Event): void {
    this.busca.set((evento.target as HTMLInputElement).value);
    this.carregar();
  }

  protected gerar(item: LeadRsvp): void {
    this.negocio.gerarOportunidadeLead(item.id).subscribe({
      next: () => {
        this.toast.sucesso('Oportunidade gerada.');
        this.carregar();
      },
      error: (erro: unknown) => this.toast.erro(mensagemDeErro(erro)),
    });
  }

  protected descartar(item: LeadRsvp): void {
    this.negocio.descartarLead(item.id).subscribe({
      next: () => {
        this.toast.sucesso('Lead descartado.');
        this.carregar();
      },
      error: (erro: unknown) => this.toast.erro(mensagemDeErro(erro)),
    });
  }

  protected contatar(item: LeadRsvp): void {
    this.negocio.contatarLead(item.id).subscribe({
      next: () => {
        if (item.telefone) {
          window.open(`https://wa.me/${item.telefone.replace(/\D/g, '')}`, '_blank');
        }
        this.toast.sucesso('Contato registrado.');
      },
      error: (erro: unknown) => this.toast.erro(mensagemDeErro(erro)),
    });
  }

  private carregar(): void {
    this.negocio.leadsRsvp(this.busca()).subscribe({
      next: (lista) => { this.lista.set(lista); this.carregado.set(true); },
      error: (erro: unknown) => { this.carregado.set(true); this.toast.erro(mensagemDeErro(erro)); },
    });
  }
}

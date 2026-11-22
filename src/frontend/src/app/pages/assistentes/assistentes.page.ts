import { Component, inject, OnInit, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { Assistente, AssistentesClient } from '../../core/assistentes.client';
import { mensagemDeErro } from '../../core/mensagem-erro';
import { ToastService } from '../../core/toast.service';
import { ConfirmaDialog } from '../../shared/confirma-dialog';
import { DIALOG, DIALOG_PEQUENO } from '../../shared/dialog';
import { AssistenteFormDialog } from './assistente-form.dialog';
import { MatTooltipModule } from '@angular/material/tooltip';

/** Tela Assistentes (só para a dona): convidar, editar permissões, reenviar e remover (SPEC-032 §12). */
@Component({
  selector: 'app-assistentes',
  imports: [MatCardModule, MatButtonModule, MatIconModule, MatTooltipModule],
  template: `
    <mat-card class="cardWithShadow">
      <div class="p-6">
        <mat-card-title class="mb-0">Assistentes</mat-card-title>
        <mat-card-subtitle>Quem trabalha com você, com login próprio.</mat-card-subtitle>
      </div>
      <mat-card-content class="border-t border-border">
        <div class="barra-lista">
          <div class="barra-lista-acoes">
            <button mat-flat-button type="button" (click)="convidar()"><mat-icon>person_add</mat-icon> Convidar assistente</button>
          </div>
        </div>
        @if (carregando()) {
          <p class="text-center text-muted py-10">Carregando...</p>
        } @else if (itens().length === 0) {
          <p class="text-center text-muted py-10">Nenhuma assistente ainda. Convide a primeira.</p>
        } @else {
          <div>
            <table class="w-full text-left">
              <thead>
                <tr class="text-muted text-sm">
                  <th class="py-3 pr-4 font-semibold">Nome</th>
                  <th class="py-3 pr-4 font-semibold">E-mail</th>
                  <th class="py-3 pr-4 font-semibold">Situação</th>
                  <th class="py-3 pr-4 font-semibold">Financeiro</th>
                  <th class="py-3 pr-4 font-semibold">Eventos</th>
                  <th class="py-3 font-semibold"><span class="sr-only">Ações</span></th>
                </tr>
              </thead>
              <tbody>
                @for (item of itens(); track item.id) {
                  <tr class="border-t border-border">
                    <td class="py-3 pr-4">{{ item.nome }}</td>
                    <td class="py-3 pr-4">{{ item.email }}</td>
                    <td class="py-3 pr-4">
                      <span [class]="item.situacao === 'Ativa' ? selo('success') : selo('warning')">
                        {{ item.situacao === 'Ativa' ? 'Ativa' : 'Convite enviado' }}
                      </span>
                    </td>
                    <td class="py-3 pr-4">{{ item.podeVerFinanceiro ? 'Sim' : 'Não' }}</td>
                    <td class="py-3 pr-4">{{ item.somenteDela ? 'Só os dela' : 'Todos' }}</td>
                    <td class="py-3 whitespace-nowrap text-right">
                      <button mat-icon-button type="button" [attr.aria-label]="'Editar ' + item.nome" [matTooltip]="'Editar ' + item.nome" (click)="editar(item)"><mat-icon>edit</mat-icon></button>
                      @if (item.situacao === 'Convidada') {
                        <button mat-icon-button type="button" [attr.aria-label]="'Reenviar convite para ' + item.nome" [matTooltip]="'Reenviar convite para ' + item.nome" (click)="reenviar(item)"><mat-icon>forward_to_inbox</mat-icon></button>
                      }
                      <button mat-icon-button type="button" [attr.aria-label]="'Remover acesso de ' + item.nome" [matTooltip]="'Remover acesso de ' + item.nome" (click)="remover(item)"><mat-icon>person_remove</mat-icon></button>
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
})
export class AssistentesPage implements OnInit {
  private readonly cliente = inject(AssistentesClient);
  private readonly dialog = inject(MatDialog);
  private readonly toast = inject(ToastService);
  protected readonly itens = signal<Assistente[]>([]);
  protected readonly carregando = signal(true);

  ngOnInit(): void {
    this.carregar();
  }

  protected selo(cor: 'success' | 'warning'): string {
    return `inline-block rounded font-semibold px-2 py-1 text-xs whitespace-nowrap bg-light-${cor} text-${cor}`;
  }

  protected convidar(): void {
    this.abrir();
  }

  protected editar(item: Assistente): void {
    this.abrir(item);
  }

  protected reenviar(item: Assistente): void {
    this.cliente.reenviar(item.id).subscribe({
      next: (resposta) => {
        if (resposta.conviteEnviado === false) {
          this.toast.erro('Não foi possível enviar o e-mail. Tente reenviar.');
        } else {
          this.toast.sucesso('Convite reenviado. O link anterior deixou de valer.');
        }
      },
      error: (erro: unknown) => this.toast.erro(mensagemDeErro(erro)),
    });
  }

  protected remover(item: Assistente): void {
    this.dialog
      .open(ConfirmaDialog, {
        ...DIALOG_PEQUENO,
        data: {
          titulo: 'Remover acesso',
          texto: `${item.nome} perde o acesso no próximo pedido. O que ela criou continua na conta.`,
          confirmar: 'Remover acesso',
        },
      })
      .afterClosed()
      .subscribe((confirmou) => {
        if (!confirmou) return;
        this.cliente.remover(item.id).subscribe({
          next: () => {
            this.toast.sucesso('Acesso removido.');
            this.carregar();
          },
          error: (erro: unknown) => this.toast.erro(mensagemDeErro(erro)),
        });
      });
  }

  private abrir(assistente?: Assistente): void {
    this.dialog
      .open(AssistenteFormDialog, { ...DIALOG, data: { assistente } })
      .afterClosed()
      .subscribe((salvou) => {
        if (salvou) this.carregar();
      });
  }

  private carregar(): void {
    this.cliente.listar().subscribe({
      next: (lista) => {
        this.itens.set(lista);
        this.carregando.set(false);
      },
      error: (erro: unknown) => {
        this.carregando.set(false);
        this.toast.erro(mensagemDeErro(erro));
      },
    });
  }
}

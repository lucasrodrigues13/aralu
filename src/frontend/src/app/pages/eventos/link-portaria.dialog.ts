import { Component, inject, OnInit, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { Observable } from 'rxjs';
import { mensagemDeErro } from '../../core/mensagem-erro';
import { enderecoDoLinkPortaria, LinkPortaria, PortariaClient } from '../../core/portaria.client';
import { ToastService } from '../../core/toast.service';
import { ConfirmaDialog } from '../../shared/confirma-dialog';
import { DIALOG_PEQUENO } from '../../shared/dialog';

/** Link da portaria do evento (SPEC-058 §6.1): gerar, copiar, trocar e desativar. */
@Component({
  selector: 'app-link-portaria-dialog',
  imports: [MatDialogModule, MatButtonModule, MatIconModule],
  template: `
    <h2 mat-dialog-title>Link da portaria</h2>
    <p class="text-muted text-sm px-6 -mt-2 mb-4">Envie a quem vai autorizar a entrada. Sem senha: quem tem o endereço acessa só a portaria deste evento. Trocar o link desliga o antigo.</p>
    <mat-dialog-content>
      @if (link(); as atual) {
        @if (!atual.ativo) {
          <p>Este evento ainda não tem link para a portaria.</p>
        } @else {
          <div class="flex items-center gap-2 mb-4">
            <input class="endereco grow" readonly aria-label="Endereço do link da portaria" [value]="endereco()" (focus)="$any($event.target).select()" />
            <button mat-stroked-button type="button" (click)="copiar()"><mat-icon>content_copy</mat-icon> Copiar</button>
          </div>
          <p class="text-muted text-xs">
            A equipe escaneia o QR code de cada convite confirmado ou confere a lista completa, e marca quem compareceu. Nada além da portaria fica visível.
          </p>
        }
      } @else {
        <p class="text-muted">Carregando…</p>
      }
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      @if (link()?.ativo) {
        <button mat-button type="button" class="text-error" (click)="desativar()">Desativar link</button>
        <button mat-stroked-button type="button" (click)="trocar()">Trocar link</button>
      } @else if (link()) {
        <button mat-flat-button type="button" (click)="gerar()">Gerar link</button>
      }
      <button mat-stroked-button type="button" mat-dialog-close>Fechar</button>
    </mat-dialog-actions>
  `,
  styles: `.endereco { padding: 8px 12px; border: 1px solid var(--mat-sys-outline-variant); border-radius: 8px; background: transparent; color: inherit; font: inherit; min-width: 0; }`,
})
export class LinkPortariaDialog implements OnInit {
  private readonly portaria = inject(PortariaClient);
  private readonly dialog = inject(MatDialog);
  private readonly toast = inject(ToastService);
  private readonly dados = inject<{ eventoId: string }>(MAT_DIALOG_DATA);
  protected readonly link = signal<LinkPortaria | null>(null);

  ngOnInit(): void {
    this.aplicar(this.portaria.link(this.dados.eventoId));
  }

  protected endereco(): string {
    const token = this.link()?.token;
    return token ? enderecoDoLinkPortaria(location.origin, token) : '';
  }

  protected copiar(): void {
    void navigator.clipboard?.writeText(this.endereco());
    this.toast.sucesso('Link copiado.');
  }

  protected gerar(): void {
    this.aplicar(this.portaria.gerar(this.dados.eventoId), 'Link gerado.');
  }

  protected trocar(): void {
    this.dialog.open(ConfirmaDialog, {
      ...DIALOG_PEQUENO,
      data: { titulo: 'Trocar link', texto: 'O endereço antigo deixa de funcionar. Você precisa enviar o novo à equipe da portaria.', confirmar: 'Trocar' },
    }).afterClosed().subscribe((confirmou) => {
      if (confirmou) this.aplicar(this.portaria.gerar(this.dados.eventoId), 'Link trocado.');
    });
  }

  protected desativar(): void {
    this.dialog.open(ConfirmaDialog, {
      ...DIALOG_PEQUENO,
      data: { titulo: 'Desativar link', texto: 'O endereço deixa de funcionar e a equipe perde o acesso à portaria.', confirmar: 'Desativar' },
    }).afterClosed().subscribe((confirmou) => {
      if (confirmou) this.aplicar(this.portaria.desativar(this.dados.eventoId), 'Link desativado.');
    });
  }

  private aplicar(chamada: Observable<LinkPortaria>, sucesso?: string): void {
    chamada.subscribe({
      next: (link) => {
        this.link.set(link);
        if (sucesso) this.toast.sucesso(sucesso);
      },
      error: (erro: unknown) => this.toast.erro(mensagemDeErro(erro)),
    });
  }
}

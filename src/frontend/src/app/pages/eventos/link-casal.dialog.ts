import { Component, inject, OnInit, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { Observable } from 'rxjs';
import { CasalClient, enderecoDoLinkCasal, LinkCasal } from '../../core/casal.client';
import { mensagemDeErro } from '../../core/mensagem-erro';
import { ToastService } from '../../core/toast.service';
import { ConfirmaDialog } from '../../shared/confirma-dialog';
import { DIALOG_PEQUENO } from '../../shared/dialog';

/** Link do casal do evento (SPEC-046 §6.1): gerar, copiar, liberar o financeiro e os convidados, trocar e desativar. */
@Component({
  selector: 'app-link-casal-dialog',
  imports: [MatDialogModule, MatButtonModule, MatIconModule, MatSlideToggleModule],
  template: `
    <h2 mat-dialog-title>Link do casal</h2>
    <p class="text-muted text-sm px-6 -mt-2 mb-4">Um endereço por evento, sem senha: quem tem o endereço acessa. Trocar o link desliga o antigo.</p>
    <mat-dialog-content>
      @if (link(); as atual) {
        @if (!atual.ativo) {
          <p class="mb-4">Este evento ainda não tem link para o casal.</p>
        } @else {
          <div class="flex items-center gap-2 mb-4">
            <input class="endereco grow" readonly aria-label="Endereço do link do casal" [value]="endereco()" (focus)="$any($event.target).select()" />
            <button mat-stroked-button type="button" (click)="copiar()"><mat-icon>content_copy</mat-icon> Copiar</button>
          </div>
          <mat-slide-toggle [checked]="atual.financeiroLiberado" (change)="liberar($event.checked)">
            O casal acessa o financeiro do evento
          </mat-slide-toggle>
          <p class="text-muted text-xs mt-2">
            Liberado, o casal marca como pago, sobe comprovantes e o contrato assinado do fornecedor e define as parcelas. A Gestão Financeira e os dados internos não vão junto.
          </p>
          <mat-slide-toggle class="mt-4" [checked]="atual.convidadosLiberado" (change)="liberarConvidados($event.checked)">
            O casal cadastra os convidados
          </mat-slide-toggle>
          <p class="text-muted text-xs mt-2">
            Liberado, o casal vê os convites do evento e cadastra nome, telefone, e-mail e o nome de cada convidado. Situação, mesa e demais dados da lista ficam só com você.
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
export class LinkCasalDialog implements OnInit {
  private readonly casal = inject(CasalClient);
  private readonly dialog = inject(MatDialog);
  private readonly toast = inject(ToastService);
  private readonly dados = inject<{ eventoId: string }>(MAT_DIALOG_DATA);
  protected readonly link = signal<LinkCasal | null>(null);

  ngOnInit(): void {
    this.aplicar(this.casal.link(this.dados.eventoId));
  }

  protected endereco(): string {
    const token = this.link()?.token;
    return token ? enderecoDoLinkCasal(location.origin, token) : '';
  }

  protected copiar(): void {
    void navigator.clipboard?.writeText(this.endereco());
    this.toast.sucesso('Link copiado.');
  }

  protected gerar(): void {
    this.aplicar(this.casal.gerar(this.dados.eventoId), 'Link gerado.');
  }

  protected liberar(liberado: boolean): void {
    const atual = this.link();
    this.aplicar(
      this.casal.liberar(this.dados.eventoId, { financeiroLiberado: liberado, convidadosLiberado: atual?.convidadosLiberado ?? false }),
      liberado ? 'Financeiro liberado para o casal.' : 'Financeiro fechado para o casal.');
  }

  protected liberarConvidados(liberado: boolean): void {
    const atual = this.link();
    this.aplicar(
      this.casal.liberar(this.dados.eventoId, { financeiroLiberado: atual?.financeiroLiberado ?? false, convidadosLiberado: liberado }),
      liberado ? 'Cadastro de convidados liberado para o casal.' : 'Cadastro de convidados fechado para o casal.');
  }

  protected trocar(): void {
    this.dialog.open(ConfirmaDialog, {
      ...DIALOG_PEQUENO,
      data: { titulo: 'Trocar link', texto: 'O endereço antigo deixa de funcionar. Você precisa enviar o novo ao casal.', confirmar: 'Trocar' },
    }).afterClosed().subscribe((confirmou) => {
      if (confirmou) this.aplicar(this.casal.gerar(this.dados.eventoId), 'Link trocado.');
    });
  }

  protected desativar(): void {
    this.dialog.open(ConfirmaDialog, {
      ...DIALOG_PEQUENO,
      data: { titulo: 'Desativar link', texto: 'O endereço deixa de funcionar e o casal perde o acesso.', confirmar: 'Desativar' },
    }).afterClosed().subscribe((confirmou) => {
      if (confirmou) this.aplicar(this.casal.desativar(this.dados.eventoId), 'Link desativado.');
    });
  }

  private aplicar(chamada: Observable<LinkCasal>, sucesso?: string): void {
    chamada.subscribe({
      next: (link) => {
        this.link.set(link);
        if (sucesso) this.toast.sucesso(sucesso);
      },
      error: (erro: unknown) => this.toast.erro(mensagemDeErro(erro)),
    });
  }
}

import { Component, inject, OnInit, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { Observable } from 'rxjs';
import { LinkClienteClient, enderecoDoLinkCliente, LinkCliente } from '../../core/link-cliente.client';
import { mensagemDeErro } from '../../core/mensagem-erro';
import { ToastService } from '../../core/toast.service';
import { ConfirmaDialog } from '../../shared/confirma-dialog';
import { copiarTexto } from '../../shared/copiar-texto';
import { DIALOG_PEQUENO } from '../../shared/dialog';

/** Link do cliente do evento (SPEC-046 §6.1): gerar, copiar, liberar o financeiro e os convidados, trocar e desativar. */
@Component({
  selector: 'app-link-cliente-dialog',
  imports: [MatDialogModule, MatButtonModule, MatIconModule, MatSlideToggleModule],
  template: `
    <h2 mat-dialog-title>Link do cliente</h2>
    <p class="text-muted text-sm px-6 -mt-2 mb-4">Um endereço por evento. O cliente recebe um código no e-mail cadastrado para abrir o link. Trocar o link desliga o antigo.</p>
    <mat-dialog-content>
      @if (link(); as atual) {
        @if (!atual.ativo) {
          <p class="mb-4">Este evento ainda não tem link para o cliente.</p>
        } @else {
          <div class="flex items-center gap-2 mb-4">
            <input class="endereco grow" readonly aria-label="Endereço do link do cliente" [value]="endereco()" (focus)="$any($event.target).select()" />
            <button mat-stroked-button type="button" (click)="copiar()"><mat-icon>content_copy</mat-icon> Copiar</button>
          </div>
          @if (!atual.clienteComEmail) {
            <p class="aviso-email text-sm mb-4"><mat-icon>warning</mat-icon> Cadastre o e-mail de um cliente do evento para que ele consiga abrir o link.</p>
          }
          <mat-slide-toggle [checked]="atual.financeiroLiberado" (change)="liberar($event.checked)">
            O cliente acessa o financeiro do evento
          </mat-slide-toggle>
          <p class="text-muted text-xs mt-2">
            Liberado, o cliente marca como pago, sobe comprovantes e o contrato assinado do fornecedor e define as parcelas. A Gestão Financeira e os dados internos não vão junto.
          </p>
          <mat-slide-toggle class="mt-4" [checked]="atual.convidadosLiberado" (change)="liberarConvidados($event.checked)">
            O cliente cadastra os convidados
          </mat-slide-toggle>
          <p class="text-muted text-xs mt-2">
            Liberado, o cliente vê os convites do evento e cadastra nome, telefone, e-mail e o nome de cada convidado. Situação, mesa e demais dados da lista ficam só com você.
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
  styles: `.aviso-email { display: flex; align-items: center; gap: 8px; color: var(--mat-sys-error); }
  .endereco { padding: 8px 12px; border: 1px solid var(--mat-sys-outline-variant); border-radius: 8px; background: transparent; color: inherit; font: inherit; min-width: 0; }`,
})
export class LinkClienteDialog implements OnInit {
  private readonly cliente = inject(LinkClienteClient);
  private readonly dialog = inject(MatDialog);
  private readonly toast = inject(ToastService);
  private readonly dados = inject<{ eventoId: string }>(MAT_DIALOG_DATA);
  protected readonly link = signal<LinkCliente | null>(null);

  ngOnInit(): void {
    this.aplicar(this.cliente.link(this.dados.eventoId));
  }

  protected endereco(): string {
    const token = this.link()?.token;
    return token ? enderecoDoLinkCliente(location.origin, token) : '';
  }

  protected async copiar(): Promise<void> {
    const endereco = this.endereco();
    if (await copiarTexto(endereco)) this.toast.sucesso('Link copiado.');
    else this.toast.erro(`Não foi possível copiar. Link: ${endereco}`);
  }

  protected gerar(): void {
    this.aplicar(this.cliente.gerar(this.dados.eventoId), 'Link gerado.');
  }

  protected liberar(liberado: boolean): void {
    const atual = this.link();
    this.aplicar(
      this.cliente.liberar(this.dados.eventoId, { financeiroLiberado: liberado, convidadosLiberado: atual?.convidadosLiberado ?? false }),
      liberado ? 'Financeiro liberado para o cliente.' : 'Financeiro fechado para o cliente.');
  }

  protected liberarConvidados(liberado: boolean): void {
    const atual = this.link();
    this.aplicar(
      this.cliente.liberar(this.dados.eventoId, { financeiroLiberado: atual?.financeiroLiberado ?? false, convidadosLiberado: liberado }),
      liberado ? 'Cadastro de convidados liberado para o cliente.' : 'Cadastro de convidados fechado para o cliente.');
  }

  protected trocar(): void {
    this.dialog.open(ConfirmaDialog, {
      ...DIALOG_PEQUENO,
      data: { titulo: 'Trocar link', texto: 'O endereço antigo deixa de funcionar. Você precisa enviar o novo ao cliente.', confirmar: 'Trocar' },
    }).afterClosed().subscribe((confirmou) => {
      if (confirmou) this.aplicar(this.cliente.gerar(this.dados.eventoId), 'Link trocado.');
    });
  }

  protected desativar(): void {
    this.dialog.open(ConfirmaDialog, {
      ...DIALOG_PEQUENO,
      data: { titulo: 'Desativar link', texto: 'O endereço deixa de funcionar e o cliente perde o acesso.', confirmar: 'Desativar' },
    }).afterClosed().subscribe((confirmou) => {
      if (confirmou) this.aplicar(this.cliente.desativar(this.dados.eventoId), 'Link desativado.');
    });
  }

  private aplicar(chamada: Observable<LinkCliente>, sucesso?: string): void {
    chamada.subscribe({
      next: (link) => {
        this.link.set(link);
        if (sucesso) this.toast.sucesso(sucesso);
      },
      error: (erro: unknown) => this.toast.erro(mensagemDeErro(erro)),
    });
  }
}

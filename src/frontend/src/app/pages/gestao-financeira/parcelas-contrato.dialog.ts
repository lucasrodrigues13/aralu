import { Component, inject, OnInit, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { FORMAS_PAGAMENTO, ParcelaContrato, SITUACOES_PARCELA_CONTRATO } from '../../core/dinheiro.client';
import { mensagemDeErro } from '../../core/mensagem-erro';
import { ContratoFunil, NegocioClient } from '../../core/negocio.client';
import { ToastService } from '../../core/toast.service';
import { DIALOG_PEQUENO } from '../../shared/dialog';
import { GdDataPipe } from '../../shared/gd-data.pipe';
import { GdDinheiroPipe } from '../../shared/gd-dinheiro.pipe';
import { linkWhatsapp, textoCobranca } from '../dinheiro/cobranca';
import { ChavePixDialog, ReceberDialog } from '../dinheiro/dinheiro.dialogs';
import { MatTooltipModule } from '@angular/material/tooltip';

/**
 * Parcelas do contrato com o cliente (SPEC-040): cobrar pelo WhatsApp, registrar o que o cliente pagou
 * ("Recebi", aceita valor parcial) e desfazer o último recebimento. Aberto da Gestão Financeira (SPEC-041); antes ficava na tela Contratos do funil e, antes, na aba Dinheiro do evento.
 */
@Component({
  selector: 'app-parcelas-contrato-dialog',
  imports: [MatDialogModule, MatButtonModule, MatIconModule, MatMenuModule, GdDataPipe, GdDinheiroPipe, MatTooltipModule],
  template: `
    <h2 mat-dialog-title>Parcelas do contrato</h2>
    @if (contrato(); as c) {
      <p class="text-muted text-sm px-6 -mt-2 mb-4">
        {{ c.oportunidadeNome }} · Contrato {{ c.valorTotal | gdDinheiro }} · Recebido {{ c.recebido | gdDinheiro }} · Saldo {{ c.saldo | gdDinheiro }}
      </p>
      <mat-dialog-content>
        @if (c.parcelas.length === 0) {
          <p class="text-center text-muted py-6">
            Este contrato não tem parcelas. Elas vêm do orçamento aceito: defina as parcelas no orçamento antes de gerar o contrato.
          </p>
        } @else {
          <div class="relative overflow-auto">
            <table class="tabela">
              <thead>
                <tr>
                  <th>Parcela</th>
                  <th>Vencimento</th>
                  <th class="text-end!">Valor</th>
                  <th class="text-end!">Recebido</th>
                  <th>Situação</th>
                  <th class="text-end! whitespace-nowrap">Ações</th>
                </tr>
              </thead>
              <tbody>
                @for (parcela of c.parcelas; track parcela.id) {
                  <tr>
                    <td>
                      {{ parcela.entrada ? 'Entrada' : 'Parcela ' + parcela.numero }}
                      @if (parcela.recebimentos.length > 0) {
                        <span class="block text-xs text-muted">{{ resumoRecebimentos(parcela) }}</span>
                      }
                    </td>
                    <td class="whitespace-nowrap">{{ parcela.vencimento | gdData }}</td>
                    <td class="text-end! valor">{{ parcela.valor | gdDinheiro }}</td>
                    <td class="text-end! whitespace-nowrap">{{ parcela.recebido | gdDinheiro }}</td>
                    <td><span [class]="situacao(parcela).classe">{{ situacao(parcela).rotulo }}</span></td>
                    <td class="text-end! whitespace-nowrap">
                      @if (parcela.situacao !== 'Recebida' && c.situacao !== 'Cancelado') {
                        <button mat-stroked-button class="ml-1" type="button" (click)="cobrar(c, parcela)"><mat-icon>chat</mat-icon> Cobrar</button>
                        <button mat-stroked-button class="ml-1" type="button" (click)="receber(c, parcela)">Recebi</button>
                      }
                      @if (parcela.recebimentos.length > 0) {
                        <button mat-icon-button type="button" aria-label="Mais ações" matTooltip="Mais ações" [matMenuTriggerFor]="menu"><mat-icon>more_vert</mat-icon></button>
                        <mat-menu #menu="matMenu" xPosition="before" class="cardWithShadow">
                          <button mat-menu-item type="button" (click)="desfazer(c, parcela)"><mat-icon>undo</mat-icon> Desfazer último recebimento</button>
                        </mat-menu>
                      }
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }
      </mat-dialog-content>
    }
    <mat-dialog-actions align="end">
      <button mat-stroked-button type="button" (click)="ref.close()">Fechar</button>
    </mat-dialog-actions>
  `,
  styles: `.valor { font-weight: 600; white-space: nowrap; }`,
})
export class ParcelasContratoDialog implements OnInit {
  private readonly negocio = inject(NegocioClient);
  private readonly dialog = inject(MatDialog);
  private readonly toast = inject(ToastService);
  private readonly dados = inject<ContratoFunil>(MAT_DIALOG_DATA);
  protected readonly ref = inject(MatDialogRef<ParcelasContratoDialog>);
  protected readonly contrato = signal<ContratoFunil | null>(null);

  ngOnInit(): void {
    // A leitura de um contrato só traz também o telefone do contato e a chave Pix, que o "Cobrar" usa.
    this.negocio.contratoFunil(this.dados.id).subscribe({
      next: (contrato) => this.contrato.set(contrato),
      error: (erro: unknown) => this.toast.erro(mensagemDeErro(erro)),
    });
  }

  protected situacao(parcela: ParcelaContrato) {
    return SITUACOES_PARCELA_CONTRATO[parcela.situacao];
  }

  protected resumoRecebimentos(parcela: ParcelaContrato): string {
    return parcela.recebimentos
      .map((item) => `${FORMAS_PAGAMENTO.find((forma) => forma.valor === item.forma)?.rotulo ?? item.forma} em ${item.data.slice(8, 10)}/${item.data.slice(5, 7)}`)
      .join(' · ');
  }

  protected cobrar(contrato: ContratoFunil, parcela: ParcelaContrato): void {
    if (contrato.chavePix) {
      this.abrirWhatsapp(contrato, parcela, contrato.chavePix);
      return;
    }
    this.dialog.open(ChavePixDialog, DIALOG_PEQUENO).afterClosed().subscribe((digitada?: string) => {
      if (digitada) this.abrirWhatsapp(contrato, parcela, digitada);
    });
  }

  protected receber(contrato: ContratoFunil, parcela: ParcelaContrato): void {
    this.dialog.open(ReceberDialog, { ...DIALOG_PEQUENO, data: parcela }).afterClosed().subscribe((pedido) => {
      if (!pedido) return;
      this.negocio.receberParcelaContratoFunil(contrato.id, parcela.id, pedido).subscribe({
        next: (atualizado) => {
          this.contrato.set(atualizado);
          this.toast.sucesso('Recebimento registrado.');
        },
        error: (erro: unknown) => this.toast.erro(mensagemDeErro(erro)),
      });
    });
  }

  protected desfazer(contrato: ContratoFunil, parcela: ParcelaContrato): void {
    this.negocio.desfazerRecebimentoContratoFunil(contrato.id, parcela.id).subscribe({
      next: (atualizado) => {
        this.contrato.set(atualizado);
        this.toast.sucesso('Último recebimento desfeito.');
      },
      error: (erro: unknown) => this.toast.erro(mensagemDeErro(erro)),
    });
  }

  private abrirWhatsapp(contrato: ContratoFunil, parcela: ParcelaContrato, chavePix: string): void {
    const texto = textoCobranca(parcela, contrato.oportunidadeNome, chavePix);
    window.open(linkWhatsapp(texto, '55', contrato.oportunidadeTelefone ?? ''), '_blank', 'noopener');
  }
}

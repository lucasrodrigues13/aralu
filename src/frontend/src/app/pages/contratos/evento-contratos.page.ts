import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatSelectModule } from '@angular/material/select';
import { ContratoClient, ContratoEvento, ContratoPreenchido, ContratoResumo, ContratosEvento } from '../../core/contrato.client';
import { mensagemDeErro } from '../../core/mensagem-erro';
import { NegocioClient } from '../../core/negocio.client';
import { ToastService } from '../../core/toast.service';
import { ConfirmaDialog } from '../../shared/confirma-dialog';
import { DIALOG_LARGO, DIALOG_PEQUENO } from '../../shared/dialog';
import { GdDataPipe } from '../../shared/gd-data.pipe';
import { EventoAbasComponent } from '../eventos/evento-abas.component';
import { imprimirContrato } from './imprimir';

/** Escolhe um contrato da conta para entrar no evento. */
@Component({
  selector: 'app-adicionar-contrato-dialog',
  imports: [ReactiveFormsModule, MatDialogModule, MatButtonModule, MatFormFieldModule, MatSelectModule, RouterLink],
  template: `
    <h2 mat-dialog-title>Adicionar contrato</h2>
    <p class="text-muted text-sm px-6 -mt-2 mb-4">Escolha um contrato cadastrado em Contratos.</p>
    <mat-dialog-content>
      @if (dados.length === 0) {
        <p class="text-center text-muted py-10">Todos os contratos já estão no evento, ou não há contrato cadastrado. <a routerLink="/contratos" mat-dialog-close>Ir para Contratos</a></p>
      } @else {
        <form id="adicionar-contrato" class="grid grid-cols-1 gap-4" (ngSubmit)="ok()">
          <div class="campo">
            <mat-label class="font-semibold mb-2 block">Contrato</mat-label>
            <mat-form-field appearance="outline" class="w-full">
            <mat-select [attr.aria-label]="'Contrato'" [formControl]="escolha" required>
              @for (contrato of dados; track contrato.id) { <mat-option [value]="contrato.id">{{ contrato.nome }}</mat-option> }
            </mat-select>
            @if (escolha.invalid && escolha.touched) { <mat-error>Escolha o contrato.</mat-error> }
          </mat-form-field>
          </div>
        </form>
      }
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-stroked-button type="button" (click)="ref.close()">Cancelar</button>
      @if (dados.length > 0) { <button mat-flat-button type="submit" form="adicionar-contrato">Adicionar</button> }
    </mat-dialog-actions>
  `,
})
export class AdicionarContratoDialog {
  protected readonly dados = inject<ContratoResumo[]>(MAT_DIALOG_DATA);
  protected readonly ref = inject(MatDialogRef<AdicionarContratoDialog, string>);
  protected readonly escolha = new FormControl<string | null>(null, Validators.required);

  protected ok(): void {
    if (this.escolha.invalid || !this.escolha.value) {
      this.escolha.markAsTouched();
      return;
    }
    this.ref.close(this.escolha.value);
  }
}

/** Contrato preenchido com os dados atuais do evento. */
@Component({
  selector: 'app-ler-contrato-dialog',
  imports: [MatDialogModule, MatButtonModule, MatIconModule],
  template: `
    <h2 mat-dialog-title>{{ dados.nome }}</h2>
    <p class="text-muted text-sm px-6 -mt-2 mb-4">Preenchido com os dados atuais do cliente, do evento, do Perfil e do Dinheiro.</p>
    <mat-dialog-content><div class="texto">{{ dados.texto }}</div></mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-stroked-button type="button" mat-dialog-close>Fechar</button>
      <button mat-flat-button type="button" (click)="imprimir()"><mat-icon>print</mat-icon> Imprimir</button>
    </mat-dialog-actions>
  `,
  styles: `.texto { white-space: pre-wrap; font-size: 14px; line-height: 1.6; }`,
})
export class LerContratoDialog {
  protected readonly dados = inject<ContratoPreenchido>(MAT_DIALOG_DATA);

  protected imprimir(): void {
    imprimirContrato(this.dados.nome, this.dados.texto, this.dados.empresa);
  }
}

/** Aba Contratos do evento (SPEC-030 §6.4). */
@Component({
  selector: 'app-evento-contratos',
  imports: [MatCardModule, MatButtonModule, MatIconModule, MatMenuModule, GdDataPipe, EventoAbasComponent],
  template: `
    <app-evento-abas [eventoId]="id" />
    <mat-card class="cardWithShadow">
      <div class="p-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <mat-card-title class="mb-0">Contratos</mat-card-title>
          <mat-card-subtitle>{{ nomeEvento() }} · contratos preenchidos com os dados do evento.</mat-card-subtitle>
        </div>
        <button mat-flat-button type="button" (click)="adicionar()"><mat-icon>add</mat-icon> Adicionar contrato</button>
      </div>
      <mat-card-content class="border-t border-border">
        @if (dados(); as d) {
          @if (!d.emailCliente && d.contratos.length > 0) {
            <div class="flex items-center gap-3 rounded p-4 mb-6 bg-light-info text-info">
              <mat-icon>info</mat-icon>
              <span>Para enviar por e-mail, vincule ao evento um cliente com e-mail (aba Resumo).</span>
            </div>
          }
          @if (d.contratos.length === 0) {
            <div class="flex flex-col items-center gap-3 text-center text-muted py-10">
              <p>Nenhum contrato neste evento. Os contratos do modelo entram sozinhos ao criar o evento.</p>
              <button mat-flat-button type="button" (click)="adicionar()"><mat-icon>add</mat-icon> Adicionar contrato</button>
            </div>
          } @else {
            <div class="relative overflow-auto">
              <table class="tabela">
                <thead><tr><th>Contrato</th><th>Último envio</th><th class="text-end! whitespace-nowrap">Ações</th></tr></thead>
                <tbody>
                  @for (contrato of d.contratos; track contrato.id) {
                    <tr>
                      <td class="font-semibold">{{ contrato.nome }}</td>
                      <td>
                        @if (contrato.ultimoEnvio) {
                          {{ contrato.ultimoEnvio | gdData }}
                          <span class="block text-xs text-muted">
                            {{ contrato.enviadoPara }} · {{ expirado(contrato) ? 'link expirado' : 'link vale até ' + dataHora(contrato.expiraEm) }}
                          </span>
                        } @else {
                          <span class="text-muted">Não enviado</span>
                        }
                      </td>
                      <td class="text-end! whitespace-nowrap">
                        <button mat-stroked-button class="ml-1" type="button" (click)="ler(contrato)">Ler</button>
                        <button mat-stroked-button class="ml-1" type="button" [disabled]="!d.emailCliente" (click)="enviar(contrato)">
                          <mat-icon>send</mat-icon> Enviar por e-mail
                        </button>
                        <button mat-icon-button type="button" aria-label="Mais ações" [matMenuTriggerFor]="menu"><mat-icon>more_vert</mat-icon></button>
                        <mat-menu #menu="matMenu" xPosition="before" class="cardWithShadow">
                          <button mat-menu-item type="button" (click)="imprimir(contrato)"><mat-icon>print</mat-icon> Imprimir</button>
                          <button mat-menu-item type="button" (click)="remover(contrato)"><mat-icon>link_off</mat-icon> Remover do evento</button>
                        </mat-menu>
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          }
        }
      </mat-card-content>
    </mat-card>
  `,

})
export class EventoContratosPage implements OnInit {
  private readonly contratoClient = inject(ContratoClient);
  private readonly negocio = inject(NegocioClient);
  private readonly rota = inject(ActivatedRoute);
  private readonly dialog = inject(MatDialog);
  private readonly toast = inject(ToastService);
  protected readonly dados = signal<ContratosEvento | null>(null);
  protected readonly nomeEvento = signal('');
  protected id = '';
  private readonly agora = signal(Date.now());
  protected readonly vinculados = computed(() => new Set((this.dados()?.contratos ?? []).map((item) => item.id)));

  ngOnInit(): void {
    this.id = this.rota.snapshot.paramMap.get('id') ?? '';
    this.negocio.evento(this.id).subscribe({ next: (evento) => this.nomeEvento.set(evento.nome) });
    this.carregar();
  }

  protected expirado(contrato: ContratoEvento): boolean {
    return !!contrato.expiraEm && new Date(contrato.expiraEm).getTime() <= this.agora();
  }

  protected dataHora(iso: string | null): string {
    if (!iso) return '';
    const data = new Date(iso);
    return data.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  protected adicionar(): void {
    this.contratoClient.listar().subscribe({
      next: (lista) => {
        const disponiveis = lista.filter((item) => !this.vinculados().has(item.id));
        this.dialog.open(AdicionarContratoDialog, { ...DIALOG_PEQUENO, data: disponiveis }).afterClosed().subscribe((contratoId?: string) => {
          if (!contratoId) return;
          this.contratoClient.adicionarAoEvento(this.id, contratoId).subscribe({
            next: (dados) => {
              this.dados.set(dados);
              this.toast.sucesso('Contrato adicionado.');
            },
            error: (erro: unknown) => this.toast.erro(mensagemDeErro(erro)),
          });
        });
      },
      error: (erro: unknown) => this.toast.erro(mensagemDeErro(erro)),
    });
  }

  protected ler(contrato: ContratoEvento): void {
    this.contratoClient.preenchido(this.id, contrato.id).subscribe({
      next: (preenchido) => this.dialog.open(LerContratoDialog, { ...DIALOG_LARGO, data: preenchido }),
      error: (erro: unknown) => this.toast.erro(mensagemDeErro(erro)),
    });
  }

  protected imprimir(contrato: ContratoEvento): void {
    this.contratoClient.preenchido(this.id, contrato.id).subscribe({
      next: (preenchido) => imprimirContrato(preenchido.nome, preenchido.texto, preenchido.empresa),
      error: (erro: unknown) => this.toast.erro(mensagemDeErro(erro)),
    });
  }

  protected enviar(contrato: ContratoEvento): void {
    const email = this.dados()?.emailCliente;
    this.dialog.open(ConfirmaDialog, {
      ...DIALOG_PEQUENO,
      data: {
        titulo: 'Enviar por e-mail',
        texto: `Enviar "${contrato.nome}" para ${email}? O link de leitura vale 7 dias.`,
        confirmar: 'Enviar',
      },
    }).afterClosed().subscribe((confirmou) => {
      if (!confirmou) return;
      this.contratoClient.enviar(this.id, contrato.id).subscribe({
        next: (envio) => {
          this.toast.sucesso(`Contrato enviado para ${envio.email}.`);
          this.agora.set(Date.now());
          this.carregar();
        },
        error: (erro: unknown) => this.toast.erro(mensagemDeErro(erro)),
      });
    });
  }

  protected remover(contrato: ContratoEvento): void {
    this.dialog.open(ConfirmaDialog, {
      ...DIALOG_PEQUENO,
      data: { titulo: 'Remover do evento', texto: `Tirar "${contrato.nome}" deste evento? O cadastro do contrato continua.`, confirmar: 'Remover' },
    }).afterClosed().subscribe((confirmou) => {
      if (!confirmou) return;
      this.contratoClient.removerDoEvento(this.id, contrato.id).subscribe({
        next: (dados) => {
          this.dados.set(dados);
          this.toast.sucesso('Contrato removido do evento.');
        },
        error: (erro: unknown) => this.toast.erro(mensagemDeErro(erro)),
      });
    });
  }

  private carregar(): void {
    this.contratoClient.doEvento(this.id).subscribe({
      next: (dados) => this.dados.set(dados),
      error: (erro: unknown) => this.toast.erro(mensagemDeErro(erro)),
    });
  }
}

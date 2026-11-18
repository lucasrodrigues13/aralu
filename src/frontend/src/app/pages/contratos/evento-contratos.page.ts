import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
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
    <p class="gd-dialog-descricao">Escolha um contrato cadastrado em Contratos.</p>
    <mat-dialog-content>
      @if (dados.length === 0) {
        <p class="gd-vazio">Todos os contratos já estão no evento, ou não há contrato cadastrado. <a routerLink="/contratos" mat-dialog-close>Ir para Contratos</a></p>
      } @else {
        <form id="adicionar-contrato" class="gd-campos" (ngSubmit)="ok()">
          <mat-form-field appearance="outline">
            <mat-label>Contrato</mat-label>
            <mat-select [formControl]="escolha" required>
              @for (contrato of dados; track contrato.id) { <mat-option [value]="contrato.id">{{ contrato.nome }}</mat-option> }
            </mat-select>
            @if (escolha.invalid && escolha.touched) { <mat-error>Escolha o contrato.</mat-error> }
          </mat-form-field>
        </form>
      }
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button type="button" (click)="ref.close()">Cancelar</button>
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
    <p class="gd-dialog-descricao">Preenchido com os dados atuais do cliente, do evento, do Perfil e do Dinheiro.</p>
    <mat-dialog-content><div class="texto">{{ dados.texto }}</div></mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button type="button" mat-dialog-close>Fechar</button>
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
  imports: [RouterLink, MatButtonModule, MatIconModule, MatMenuModule, GdDataPipe, EventoAbasComponent],
  template: `
    <a mat-button routerLink="/eventos"><mat-icon>arrow_back</mat-icon> Eventos</a>
    <app-evento-abas [eventoId]="id" />
    <header class="gd-cabecalho">
      <div>
        <h1>Contratos</h1>
        <p>{{ nomeEvento() }} · contratos preenchidos com os dados do evento.</p>
      </div>
      <button mat-flat-button type="button" (click)="adicionar()"><mat-icon>add</mat-icon> Adicionar contrato</button>
    </header>
    @if (dados(); as d) {
      <section class="gd-painel">
        @if (!d.emailCliente && d.contratos.length > 0) {
          <div class="gd-alerta info aviso">
            <mat-icon>info</mat-icon>
            <span>Para enviar por e-mail, vincule ao evento um cliente com e-mail (aba Resumo).</span>
          </div>
        }
        @if (d.contratos.length === 0) {
          <div class="gd-vazio vazio-acao">
            <p>Nenhum contrato neste evento. Os contratos do modelo entram sozinhos ao criar o evento.</p>
            <button mat-flat-button type="button" (click)="adicionar()"><mat-icon>add</mat-icon> Adicionar contrato</button>
          </div>
        } @else {
          <table class="gd-grade">
            <thead><tr><th>Contrato</th><th>Último envio</th><th class="gd-acoes">Ações</th></tr></thead>
            <tbody>
              @for (contrato of d.contratos; track contrato.id) {
                <tr>
                  <td>{{ contrato.nome }}</td>
                  <td>
                    @if (contrato.ultimoEnvio) {
                      {{ contrato.ultimoEnvio | gdData }}
                      <span class="gd-sub">
                        {{ contrato.enviadoPara }} · {{ expirado(contrato) ? 'link expirado' : 'link vale até ' + dataHora(contrato.expiraEm) }}
                      </span>
                    } @else {
                      <span class="gd-sub">Não enviado</span>
                    }
                  </td>
                  <td class="gd-acoes">
                    <button mat-stroked-button class="acao" type="button" (click)="ler(contrato)">Ler</button>
                    <button mat-stroked-button class="acao" type="button" [disabled]="!d.emailCliente" (click)="enviar(contrato)">
                      <mat-icon>send</mat-icon> Enviar por e-mail
                    </button>
                    <button mat-icon-button type="button" aria-label="Mais ações" [matMenuTriggerFor]="menu"><mat-icon>more_vert</mat-icon></button>
                    <mat-menu #menu="matMenu" xPosition="before">
                      <button mat-menu-item type="button" (click)="imprimir(contrato)"><mat-icon>print</mat-icon> Imprimir</button>
                      <button mat-menu-item type="button" (click)="remover(contrato)"><mat-icon>link_off</mat-icon> Remover do evento</button>
                    </mat-menu>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        }
      </section>
    }
  `,
  styles: `
    .vazio-acao { display: flex; flex-direction: column; align-items: center; gap: 12px; text-align: center; }
    .vazio-acao p { margin: 0; }
    .aviso { display: flex; align-items: center; gap: 8px; margin-bottom: 16px; }
    .acao { height: 32px; margin-left: 4px; }
    .acao mat-icon { font-size: 16px; width: 16px; height: 16px; }
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

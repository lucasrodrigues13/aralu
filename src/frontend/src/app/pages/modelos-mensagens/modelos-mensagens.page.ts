import { Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule, MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatTableModule } from '@angular/material/table';
import { MatSelectModule } from '@angular/material/select';
import { mensagemDeErro } from '../../core/mensagem-erro';
import { MensagemModelo, NegocioClient } from '../../core/negocio.client';
import { ToastService } from '../../core/toast.service';
import { ConfirmaDialog } from '../../shared/confirma-dialog';
import { DIALOG, DIALOG_PEQUENO } from '../../shared/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';
import { FecharModal } from '../../shared/fechar-modal';

/** Tags das mensagens, com o que cada uma vira no envio. */
const TAGS_MENSAGEM: { marca: string; rotulo: string }[] = [
  { marca: '{{nome_da_empresa}}', rotulo: 'Nome da sua empresa' },
  { marca: '{{nome_oportunidade}}', rotulo: 'Lead: nome da oportunidade (ex.: Ana e Pedro)' },
  { marca: '{{nome_contratante}}', rotulo: 'Lead/cliente: nome do contratante' },
  { marca: '{{convidados}}', rotulo: 'Lead: quantidade prevista de convidados' },
  { marca: '{{valor}}', rotulo: 'Orçamento: valor da proposta' },
  { marca: '{{validade}}', rotulo: 'Orçamento: validade da proposta' },
  { marca: '{{servicos_contratados}}', rotulo: 'Orçamento: serviços da proposta' },
  { marca: '{{forma_pagamento}}', rotulo: 'Orçamento: forma de pagamento (entrada e parcelas)' },
  { marca: '{{nome_assessoria}}', rotulo: 'Nome da sua assessoria' },
  { marca: '{{telefone_assessoria}}', rotulo: 'Telefone da sua assessoria' },
  { marca: '{{link_whatsapp}}', rotulo: 'Link do WhatsApp da sua assessoria' },
  { marca: '{{link_proposta}}', rotulo: 'Orçamento: link da proposta para o lead responder' },
  { marca: '{{nome_evento}}', rotulo: 'Nome do evento' },
  { marca: '{{tipo_evento}}', rotulo: 'Tipo do evento (casamento, 15 anos…)' },
  { marca: '{{data_evento}}', rotulo: 'Data do evento' },
  { marca: '{{hora_evento}}', rotulo: 'Horário do evento' },
  { marca: '{{local_cerimonia}}', rotulo: 'Nome do local da cerimônia' },
  { marca: '{{local_recepcao}}', rotulo: 'Nome do local da recepção' },
  { marca: '{{endereco_cerimonia}}', rotulo: 'Endereço da cerimônia' },
  { marca: '{{endereco_recepcao}}', rotulo: 'Endereço da recepção' },
  { marca: '{{convite}}', rotulo: 'Nome do convite' },
  { marca: '{{link_convite}}', rotulo: 'Link do convite' },
  { marca: '{{link_unico}}', rotulo: 'Link único de confirmação do convidado' },
  { marca: '{{nome_convidados}}', rotulo: 'Nomes dos convidados do convite' },
  { marca: '{{mesa_dos_convidados}}', rotulo: 'Mesa dos convidados' },
  { marca: '{{site_url}}', rotulo: 'Endereço do site do evento' },
  { marca: '{{prazo_rsvp}}', rotulo: 'Prazo para confirmar presença' },
  { marca: '{{qr_code}}', rotulo: 'QR code de entrada na portaria' },
];

/** Ajuda das tags das mensagens: como usar e a lista completa. */
@Component({
  selector: 'app-ajuda-tags-mensagem-dialog',
  imports: [FecharModal, MatDialogModule, MatButtonModule],
  template: `
    <h2 mat-dialog-title>Como usar as tags <app-fechar-modal /></h2>
    <mat-dialog-content>
      <p class="text-sm mb-3">
        Tags são trechos entre chaves duplas que o sistema troca pelos dados do lead, do orçamento, do cliente, do evento e do convidado quando a mensagem é enviada.
        Clique no texto onde o dado deve entrar, abra "Inserir tags no cursor", marque uma ou mais e feche a lista: elas entram na posição do cursor, na ordem da lista.
      </p>
      <table class="w-full text-sm">
        <thead><tr><th class="text-left">Tag</th><th class="text-left">O que representa</th></tr></thead>
        <tbody>
          @for (tag of tags; track tag.marca) { <tr><td><code>{{ tag.marca }}</code></td><td>{{ tag.rotulo }}</td></tr> }
        </tbody>
      </table>
    </mat-dialog-content>
    <mat-dialog-actions align="end"><button mat-stroked-button type="button" mat-dialog-close>Fechar</button></mat-dialog-actions>
  `,
  styles: `td, th { padding: 6px 8px; border-bottom: 1px solid var(--mat-sys-outline-variant); }`,
})
export class AjudaTagsMensagemDialog {
  protected readonly tags = TAGS_MENSAGEM;
}

@Component({
  selector: 'app-mensagem-editor-dialog',
  imports: [FecharModal, ReactiveFormsModule, MatDialogModule, MatButtonModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatIconModule, MatTooltipModule],
  template: `
    <h2 mat-dialog-title>{{ dados ? 'Editar mensagem' : 'Novo modelo' }} <app-fechar-modal /></h2>
    <mat-dialog-content>
      <form class="grid grid-cols-1 gap-4" [formGroup]="form">
        <div class="campo">
          <mat-label class="font-semibold mb-2 block">Nome</mat-label>
          <mat-form-field appearance="outline" class="w-full"><input [attr.aria-label]="'Nome'" matInput formControlName="nome" /></mat-form-field>
        </div>
        <div class="campo">
          <mat-label class="font-semibold mb-2 block">Texto</mat-label>
          <mat-form-field appearance="outline" class="w-full">
          <textarea [attr.aria-label]="'Texto'" matInput rows="6" formControlName="texto" #textoArea></textarea>
        </mat-form-field>
        </div>
        <div class="seletor-tags">
          <mat-form-field appearance="outline" class="grow" subscriptSizing="dynamic">
            <mat-icon matPrefix>sell</mat-icon>
            <mat-select multiple aria-label="Inserir tags no cursor" placeholder="Inserir tags no cursor" [value]="tagsEscolhidas"
              (valueChange)="tagsEscolhidas = $event" (openedChange)="!$event && inserir(textoArea)">
              @for (tag of tags; track tag.marca) {
                <mat-option [value]="tag.marca"><span class="font-medium">{{ tag.marca }}</span><span class="text-muted text-xs"> · {{ tag.rotulo }}</span></mat-option>
              }
            </mat-select>
          </mat-form-field>
          <button mat-icon-button type="button" aria-label="Ajuda sobre as tags" matTooltip="Ajuda sobre as tags" (click)="abrirAjuda()"><mat-icon>help_outline</mat-icon></button>
        </div>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-stroked-button type="button" (click)="ref.close()">Cancelar</button>
      <button mat-flat-button type="button" (click)="salvar()">Salvar</button>
    </mat-dialog-actions>
  `,
  styles: `
    .seletor-tags { display: flex; align-items: center; gap: 4px; }
    .grow { flex: 1; min-width: 0; }
  `,
})
export class MensagemEditorDialog {
  private readonly fb = inject(FormBuilder);
  private readonly negocio = inject(NegocioClient);
  private readonly toast = inject(ToastService);
  protected readonly dados = inject<MensagemModelo | null>(MAT_DIALOG_DATA);
  protected readonly ref = inject(MatDialogRef<MensagemEditorDialog, boolean>);
  private readonly dialog = inject(MatDialog);
  /** Tags da mensagem salva (quando o servidor mandar) ou a lista padrão. */
  protected readonly tags = this.dados?.parametros?.length
    ? this.dados.parametros.map((marca) => TAGS_MENSAGEM.find((tag) => tag.marca === marca) ?? { marca, rotulo: '' })
    : TAGS_MENSAGEM;
  protected tagsEscolhidas: string[] = [];
  protected readonly form = this.fb.nonNullable.group({
    nome: [this.dados?.nome ?? '', Validators.required],
    texto: [this.dados?.texto ?? '', Validators.required],
  });

  protected abrirAjuda(): void {
    this.dialog.open(AjudaTagsMensagemDialog, DIALOG);
  }

  /** Ao fechar a lista, coloca as tags marcadas no cursor (na ordem da lista) e limpa a seleção. */
  protected inserir(area: HTMLTextAreaElement): void {
    const ordem = this.tags.map((tag) => tag.marca);
    const param = [...this.tagsEscolhidas].sort((a, b) => ordem.indexOf(a) - ordem.indexOf(b)).join(' ');
    this.tagsEscolhidas = [];
    if (!param) {
      return;
    }
    const atual = this.form.controls.texto.value;
    const inicio = area.selectionStart ?? atual.length;
    const fim = area.selectionEnd ?? atual.length;
    const novo = atual.slice(0, inicio) + param + atual.slice(fim);
    this.form.controls.texto.setValue(novo);
    setTimeout(() => {
      area.focus();
      const pos = inicio + param.length;
      area.setSelectionRange(pos, pos);
    });
  }

  protected salvar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const valor = this.form.getRawValue();
    const req = this.dados
      ? this.negocio.atualizarMensagem(this.dados.id, valor)
      : this.negocio.criarMensagem(valor);
    req.subscribe({
      next: () => {
        this.toast.sucesso('Mensagem salva.');
        this.ref.close(true);
      },
      error: (erro: unknown) => this.toast.erro(mensagemDeErro(erro)),
    });
  }
}

@Component({
  selector: 'app-modelos-mensagens',
  imports: [MatCardModule, MatButtonModule, MatFormFieldModule, MatInputModule, MatIconModule, MatTableModule, MatTooltipModule],
  template: `
    <mat-card class="cardWithShadow">
      <div class="p-6">
        <div>
        <mat-card-title class="mb-0">Modelos de mensagens</mat-card-title>
        <mat-card-subtitle>Textos com parâmetros para RSVP e convites.</mat-card-subtitle>
        </div>
      </div>
      <mat-card-content class="border-t border-border">
      <div class="barra-lista">
        <div class="barra-lista-filtros">
          <div class="campo w-full sm:w-64">
            <mat-label class="font-semibold mb-2 block">Buscar</mat-label>
            <mat-form-field appearance="outline" class="w-full">
            <mat-icon matIconPrefix>search</mat-icon>
            <input matInput aria-label="Buscar" placeholder="Buscar por nome" [value]="busca()" (input)="buscar($event)" />
          </mat-form-field>
          </div>
        </div>
        <div class="barra-lista-acoes">
          <button mat-flat-button type="button" (click)="abrir()">
          <mat-icon>add</mat-icon>
          Novo Modelo de Mensagem
          </button>
        </div>
      </div>
      @if (lista().length === 0) {
        <p class="text-center text-muted py-10">Sem modelos de mensagens cadastrados</p>
      } @else {
        <table mat-table class="min-w-full" [dataSource]="lista()">
          <ng-container matColumnDef="nome">
            <th mat-header-cell *matHeaderCellDef>Nome</th>
            <td mat-cell *matCellDef="let item">{{ item.nome }}</td>
          </ng-container>
          <ng-container matColumnDef="texto">
            <th mat-header-cell *matHeaderCellDef>Texto</th>
            <td mat-cell *matCellDef="let item"><span class="block text-xs text-muted">{{ item.texto }}</span></td>
          </ng-container>
          <ng-container matColumnDef="acoes">
            <th mat-header-cell *matHeaderCellDef class="text-end! whitespace-nowrap">Ações</th>
            <td mat-cell *matCellDef="let item" class="text-end! whitespace-nowrap">
              <button mat-icon-button type="button" aria-label="Editar" matTooltip="Editar" (click)="abrir(item)"><mat-icon>edit</mat-icon></button>
              <button mat-icon-button type="button" aria-label="Clonar" matTooltip="Clonar" (click)="clonar(item)"><mat-icon>content_copy</mat-icon></button>
              <button mat-icon-button type="button" aria-label="Excluir" matTooltip="Excluir" (click)="excluir(item)"><mat-icon>delete</mat-icon></button>
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
export class ModelosMensagensPage implements OnInit {
  private readonly negocio = inject(NegocioClient);
  private readonly dialog = inject(MatDialog);
  private readonly toast = inject(ToastService);
  protected readonly lista = signal<MensagemModelo[]>([]);
  protected readonly busca = signal('');
  protected readonly colunas = ['nome', 'texto', 'acoes'];

  ngOnInit(): void {
    this.carregar();
  }

  protected buscar(evento: Event): void {
    this.busca.set((evento.target as HTMLInputElement).value);
    this.carregar();
  }

  protected abrir(item?: MensagemModelo): void {
    if (item) {
      this.negocio.mensagem(item.id).subscribe({
        next: (detalhe) => this.dialog.open(MensagemEditorDialog, { ...DIALOG, data: detalhe }).afterClosed().subscribe((ok) => ok && this.carregar()),
        error: (erro: unknown) => this.toast.erro(mensagemDeErro(erro)),
      });
      return;
    }
    this.dialog.open(MensagemEditorDialog, { ...DIALOG, data: null }).afterClosed().subscribe((ok) => ok && this.carregar());
  }

  protected clonar(item: MensagemModelo): void {
    this.negocio.clonarMensagem(item.id).subscribe({
      next: () => {
        this.toast.sucesso('Mensagem clonada.');
        this.carregar();
      },
      error: (erro: unknown) => this.toast.erro(mensagemDeErro(erro)),
    });
  }

  protected excluir(item: MensagemModelo): void {
    this.dialog.open(ConfirmaDialog, {
      ...DIALOG_PEQUENO,
      data: { titulo: 'Excluir mensagem', texto: `Confirma a exclusão de "${item.nome}"?`, confirmar: 'Excluir', destrutivo: true },
    }).afterClosed().subscribe((confirmou) => {
      if (!confirmou) {
        return;
      }
      this.negocio.excluirMensagem(item.id).subscribe({
        next: () => {
          this.toast.sucesso('Mensagem excluída.');
          this.carregar();
        },
        error: (erro: unknown) => this.toast.erro(mensagemDeErro(erro)),
      });
    });
  }

  private carregar(): void {
    this.negocio.mensagens(this.busca()).subscribe({
      next: (lista) => this.lista.set(lista),
      error: (erro: unknown) => this.toast.erro(mensagemDeErro(erro)),
    });
  }
}

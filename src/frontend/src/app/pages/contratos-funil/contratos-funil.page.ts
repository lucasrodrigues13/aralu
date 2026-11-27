import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule, MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';
import { mensagemDeErro } from '../../core/mensagem-erro';
import { ContratoFunil, ModeloParaContratoFunil, NegocioClient, Oportunidade } from '../../core/negocio.client';
import { AuthService } from '../../core/auth.service';
import { ToastService } from '../../core/toast.service';
import { ConfirmaDialog } from '../../shared/confirma-dialog';
import { DIALOG, DIALOG_LARGO, DIALOG_PEQUENO, DIALOG_PREVIA } from '../../shared/dialog';
import { GdDataPipe } from '../../shared/gd-data.pipe';
import { FolhaContrato, imprimirContrato } from '../contratos/folha-contrato';
import { textoEmHtml } from '../contratos/mesclagem';
import { PreviaWordComponent } from '../contratos/previa-word';
import { EditorRico } from '../../shared/editor-rico';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatMenuModule } from '@angular/material/menu';
import { ActivatedRoute } from '@angular/router';
import { FecharModal } from '../../shared/fechar-modal';

@Component({
  selector: 'app-contrato-funil-dialog',
  imports: [FecharModal, ReactiveFormsModule, MatDialogModule, MatButtonModule, MatFormFieldModule, MatInputModule, MatSelectModule, EditorRico],
  template: `
    <h2 mat-dialog-title>{{ dados ? 'Editar contrato' : 'Novo contrato' }} <app-fechar-modal /></h2>
    <mat-dialog-content>
      <form class="grid grid-cols-1 gap-4" [formGroup]="form">
        @if (!dados) {
          <div class="campo">
            <mat-label class="font-semibold mb-2 block">Oportunidade</mat-label>
            <mat-form-field appearance="outline" class="w-full">
            <mat-select [attr.aria-label]="'Oportunidade'" formControlName="oportunidadeId">
              @for (o of oportunidades(); track o.id) { <mat-option [value]="o.id">{{ o.nome }}</mat-option> }
            </mat-select>
          </mat-form-field>
          </div>
          <div class="campo">
            <mat-label class="font-semibold mb-2 block">Modelo</mat-label>
            <mat-form-field appearance="outline" class="w-full">
            <mat-select [attr.aria-label]="'Modelo'" formControlName="modeloId" (selectionChange)="aplicarModelo($event.value)">
              <mat-option [value]="null">Sem modelo</mat-option>
              @for (m of modelos(); track m.id) { <mat-option [value]="m.id">{{ m.nome }}</mat-option> }
            </mat-select>
          </mat-form-field>
          </div>
        }
        @if (modeloWord()) {
          <p class="text-sm text-muted m-0">Este modelo é um documento Word: o contrato é gerado do arquivo do modelo, com as tags trocadas pelos dados da oportunidade. Depois de gerado, use "Ver" para baixar o .docx.</p>
        } @else {
        <div class="campo">
          <mat-label class="font-semibold mb-2 block">Conteúdo</mat-label>
          <app-editor-rico formControlName="conteudo" rotulo="Conteúdo" altura="320px" />
        </div>
        }
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-stroked-button type="button" (click)="ref.close()">Cancelar</button>
      <button mat-flat-button type="button" (click)="salvar()">Salvar</button>
    </mat-dialog-actions>
  `,
})
export class ContratoFunilDialog implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly negocio = inject(NegocioClient);
  private readonly toast = inject(ToastService);
  protected readonly dados = inject<ContratoFunil | null>(MAT_DIALOG_DATA);
  protected readonly ref = inject(MatDialogRef<ContratoFunilDialog, boolean>);
  protected readonly oportunidades = signal<Oportunidade[]>([]);
  protected readonly modelos = signal<ModeloParaContratoFunil[]>([]);
  /** Modelo Word escolhido: o texto não é editado aqui, o contrato sai do .docx. */
  protected readonly modeloWord = signal(false);
  protected readonly form = this.fb.nonNullable.group({
    oportunidadeId: [this.dados?.oportunidadeId ?? '', Validators.required],
    modeloId: [this.dados?.modeloId ?? null as string | null],
    conteudo: [this.dados?.conteudo ?? '', Validators.required],
  });

  ngOnInit(): void {
    this.negocio.oportunidades().subscribe({ next: (lista) => this.oportunidades.set(lista) });
    this.negocio.modelosParaContratoFunil().subscribe({ next: (lista) => this.modelos.set(lista) });
  }

  protected aplicarModelo(id: string | null): void {
    const modelo = this.modelos().find((m) => m.id === id);
    this.modeloWord.set(modelo?.formato === 'word');
    if (!modelo) return;
    // As tags ficam no texto; o servidor as preenche ao gerar o contrato (SPEC-050).
    this.form.controls.conteudo.setValue(modelo.texto);
  }

  protected salvar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const valor = this.form.getRawValue();
    const req = this.dados
      ? this.negocio.atualizarContratoFunil(this.dados.id, valor)
      : this.negocio.criarContratoFunil(valor);
    req.subscribe({
      next: () => {
        this.toast.sucesso('Contrato salvo.');
        this.ref.close(true);
      },
      error: (erro: unknown) => this.toast.erro(mensagemDeErro(erro)),
    });
  }
}

/** Contrato gerado como chega ao cliente: logo, texto e fundo do modelo, com botão de imprimir (SPEC-056). */
@Component({
  selector: 'app-contrato-funil-ver-dialog',
  imports: [FecharModal, MatDialogModule, MatButtonModule, MatIconModule, FolhaContrato, PreviaWordComponent],
  template: `
    <h2 mat-dialog-title>Contrato de {{ dados.oportunidadeNome }} <app-fechar-modal /></h2>
    <mat-dialog-content>
      @if (dados.documentoArquivoId) {
        <app-previa-word [documento]="word()" />
      } @else {
        <app-folha-contrato titulo="Contrato" [html]="html" [logoUrl]="logoUrl()" [fundoUrl]="fundoUrl()" />
      }
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-stroked-button type="button" mat-dialog-close>Fechar</button>
      @if (dados.documentoArquivoId) {
        <button mat-stroked-button type="button" [disabled]="!wordBlob()" (click)="baixarWord()"><mat-icon>download</mat-icon> Baixar Word</button>
      } @else {
        <button mat-flat-button type="button" (click)="imprimir()"><mat-icon>print</mat-icon> Imprimir</button>
      }
    </mat-dialog-actions>
  `,
})
export class ContratoFunilVerDialog {
  private readonly negocio = inject(NegocioClient);
  protected readonly dados = inject<ContratoFunil>(MAT_DIALOG_DATA);
  protected readonly html = textoEmHtml(this.dados.conteudo);
  protected readonly logoUrl = signal<string | null>(null);
  protected readonly fundoUrl = signal<string | null>(null);
  protected readonly word = signal<ArrayBuffer | null>(null);
  protected readonly wordBlob = signal<Blob | null>(null);

  constructor() {
    if (this.dados.documentoArquivoId) {
      this.negocio.baixarArquivo(this.dados.documentoArquivoId).subscribe({
        next: (blob) => {
          this.wordBlob.set(blob);
          void blob.arrayBuffer().then((bytes) => this.word.set(bytes));
        },
      });
    }
    this.carregar(this.dados.logoArquivoId, this.logoUrl);
    this.carregar(this.dados.fundoArquivoId, this.fundoUrl);
    inject(DestroyRef).onDestroy(() => {
      for (const url of [this.logoUrl(), this.fundoUrl()]) if (url) URL.revokeObjectURL(url);
    });
  }

  protected baixarWord(): void {
    const blob = this.wordBlob();
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Contrato - ${this.dados.oportunidadeNome || 'cliente'}.docx`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  protected imprimir(): void {
    imprimirContrato('Contrato', this.html, this.logoUrl(), this.fundoUrl());
  }

  private carregar(arquivoId: string | null | undefined, destino: { set(valor: string): void }): void {
    if (!arquivoId) return;
    this.negocio.baixarArquivo(arquivoId).subscribe({ next: (blob) => destino.set(URL.createObjectURL(blob)) });
  }
}

@Component({
  selector: 'app-contratos-funil',
  imports: [MatButtonToggleModule, MatCardModule, MatButtonModule, MatFormFieldModule, MatInputModule, MatIconModule, MatTableModule, GdDataPipe, MatTooltipModule, MatMenuModule],
  template: `
    <mat-card class="cardWithShadow">
      <div class="p-6">
        <div><mat-card-title class="mb-0">Contratos</mat-card-title><mat-card-subtitle>Contratos comerciais do funil.</mat-card-subtitle></div>
      </div>
      <mat-card-content class="border-t border-border">
      <div class="barra-lista">
        <div class="barra-lista-filtros">
          <mat-button-toggle-group [value]="situacao()" (change)="situacao.set($event.value); carregar()" aria-label="Situação">
            @for (aba of abas; track aba.valor) {
              <mat-button-toggle [value]="aba.valor">{{ aba.rotulo }}</mat-button-toggle>
            }
          </mat-button-toggle-group>
          <div class="campo w-full sm:w-64">
            <mat-label class="font-semibold mb-2 block">Buscar</mat-label>
            <mat-form-field appearance="outline" class="w-full">
            <mat-icon matIconPrefix>search</mat-icon>
            <input matInput aria-label="Buscar" placeholder="Buscar oportunidade" [value]="busca()" (input)="buscar($event)" />
          </mat-form-field>
          </div>
        </div>
        <div class="barra-lista-acoes">
          <button mat-flat-button type="button" (click)="abrir()"><mat-icon>add</mat-icon> Novo contrato</button>
        </div>
      </div>
      @if (lista().length === 0) {
        <p class="text-center text-muted py-10">Não há contrato nesta aba.</p>
      } @else {
        <table mat-table class="min-w-full" [dataSource]="lista()">
          <ng-container matColumnDef="oportunidade">
            <th mat-header-cell *matHeaderCellDef>Oportunidade</th>
            <td mat-cell *matCellDef="let item"><button type="button" class="link-nome" (click)="ver(item)">{{ item.oportunidadeNome }}</button></td>
          </ng-container>
          <ng-container matColumnDef="criadoEm">
            <th mat-header-cell *matHeaderCellDef>Criado em</th>
            <td mat-cell *matCellDef="let item">{{ item.criadoEm | gdData }}</td>
          </ng-container>
          <ng-container matColumnDef="envio">
            <th mat-header-cell *matHeaderCellDef>Situação</th>
            <td mat-cell *matCellDef="let item">
              @if (item.assinadoEm) {
                <span class="text-sm">Assinado em {{ item.assinadoEm | gdData }}</span>
              } @else if (item.enviadoEm) {
                <span class="text-sm">Enviado em {{ item.enviadoEm | gdData }}</span>
              } @else if (item.situacao === 'EmAndamento') {
                <span class="text-xs text-muted">Não enviado</span>
              }
            </td>
          </ng-container>
          <ng-container matColumnDef="acoes">
            <th mat-header-cell *matHeaderCellDef class="text-end! whitespace-nowrap">Ações</th>
            <td mat-cell *matCellDef="let item" class="text-end! whitespace-nowrap">
              <button mat-icon-button type="button" aria-label="Ver contrato" matTooltip="Ver contrato" (click)="ver(item)"><mat-icon>visibility</mat-icon></button>
              @if (item.situacao === 'EmAndamento' && !item.documentoArquivoId) {
                <button mat-icon-button aria-label="Editar contrato" matTooltip="Editar contrato" type="button" (click)="abrir(item)"><mat-icon>edit</mat-icon></button>
              }
              @if (item.situacao === 'EmAndamento' || item.situacao === 'Assinado') {
                <button mat-icon-button type="button" aria-label="Mais ações" matTooltip="Mais ações" [matMenuTriggerFor]="mais"><mat-icon>more_vert</mat-icon></button>
                <mat-menu #mais="matMenu" class="cardWithShadow">
                  @if (item.situacao === 'EmAndamento') {
                    <button mat-menu-item type="button" (click)="enviar(item)"><mat-icon>send</mat-icon> Enviar contrato</button>
                    <button mat-menu-item type="button" (click)="assinar(item)"><mat-icon>draw</mat-icon> Marcar como assinado</button>
                  }
                  <button mat-menu-item type="button" (click)="cancelar(item)"><mat-icon>cancel</mat-icon> Cancelar contrato</button>
                  @if (item.situacao === 'EmAndamento' && auth.podeExcluirDoFunil(item.criadoPor)) {
                    <button mat-menu-item type="button" class="text-error" (click)="excluir(item)"><mat-icon>delete</mat-icon> Excluir contrato</button>
                  }
                </mat-menu>
              }
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
export class ContratosFunilPage implements OnInit {
  private readonly negocio = inject(NegocioClient);
  protected readonly auth = inject(AuthService);
  private readonly dialog = inject(MatDialog);
  private readonly toast = inject(ToastService);
  protected readonly abas = [
    { valor: 'EmAndamento', rotulo: 'Em andamento' },
    { valor: 'Assinado', rotulo: 'Assinados' },
    { valor: 'Cancelado', rotulo: 'Cancelados' },
  ];
  protected readonly situacao = signal('EmAndamento');
  protected readonly busca = signal('');
  protected readonly lista = signal<ContratoFunil[]>([]);
  protected readonly colunas = ['oportunidade', 'criadoEm', 'envio', 'acoes'];

  private readonly rota = inject(ActivatedRoute);

  ngOnInit(): void {
    this.busca.set(this.rota.snapshot.queryParamMap.get('busca') ?? '');
    this.carregar();
  }

  protected buscar(evento: Event): void {
    this.busca.set((evento.target as HTMLInputElement).value);
    this.carregar();
  }

  protected abrir(item?: ContratoFunil): void {
    this.dialog.open(ContratoFunilDialog, { ...DIALOG, data: item ?? null }).afterClosed().subscribe((ok) => ok && this.carregar());
  }

  protected ver(item: ContratoFunil): void {
    this.dialog.open(ContratoFunilVerDialog, { ...DIALOG_PREVIA, data: item });
  }

  protected enviar(item: ContratoFunil): void {
    this.negocio.enviarContratoFunil(item.id).subscribe({
      next: () => { this.toast.sucesso('Envio registrado. O contrato continua em andamento até ser assinado.'); this.carregar(); },
      error: (erro: unknown) => this.toast.erro(mensagemDeErro(erro)),
    });
  }

  protected assinar(item: ContratoFunil): void {
    this.negocio.assinarContratoFunil(item.id).subscribe({
      next: () => { this.toast.sucesso('Contrato assinado.'); this.carregar(); },
      error: (erro: unknown) => this.toast.erro(mensagemDeErro(erro)),
    });
  }

  protected cancelar(item: ContratoFunil): void {
    this.negocio.cancelarContratoFunil(item.id).subscribe({
      next: () => { this.toast.sucesso('Contrato cancelado.'); this.carregar(); },
      error: (erro: unknown) => this.toast.erro(mensagemDeErro(erro)),
    });
  }

  protected excluir(item: ContratoFunil): void {
    this.dialog.open(ConfirmaDialog, {
      ...DIALOG_PEQUENO,
      data: { titulo: 'Excluir contrato', texto: 'Confirma a exclusão?', confirmar: 'Excluir', destrutivo: true },
    }).afterClosed().subscribe((ok) => {
      if (!ok) return;
      this.negocio.excluirContratoFunil(item.id).subscribe({
        next: () => { this.toast.sucesso('Contrato excluído.'); this.carregar(); },
        error: (erro: unknown) => this.toast.erro(mensagemDeErro(erro)),
      });
    });
  }

  protected carregar(): void {
    this.negocio.contratosFunil({ situacao: this.situacao(), busca: this.busca() || undefined }).subscribe({
      next: (lista) => this.lista.set(lista),
      error: (erro: unknown) => this.toast.erro(mensagemDeErro(erro)),
    });
  }
}

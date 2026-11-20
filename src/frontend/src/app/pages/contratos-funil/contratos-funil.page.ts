import { Component, inject, OnInit, signal } from '@angular/core';
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
import { ContratoFunil, ModeloContratoFunil, NegocioClient, Oportunidade } from '../../core/negocio.client';
import { AuthService } from '../../core/auth.service';
import { ToastService } from '../../core/toast.service';
import { ConfirmaDialog } from '../../shared/confirma-dialog';
import { DIALOG, DIALOG_PEQUENO } from '../../shared/dialog';
import { GdDataPipe } from '../../shared/gd-data.pipe';

@Component({
  selector: 'app-contrato-funil-dialog',
  imports: [ReactiveFormsModule, MatDialogModule, MatButtonModule, MatFormFieldModule, MatInputModule, MatSelectModule],
  template: `
    <h2 mat-dialog-title>{{ dados ? 'Editar contrato' : 'Novo contrato' }}</h2>
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
        <div class="campo">
          <mat-label class="font-semibold mb-2 block">Conteúdo</mat-label>
          <mat-form-field appearance="outline" class="w-full"><textarea [attr.aria-label]="'Conteúdo'" matInput rows="8" formControlName="conteudo"></textarea></mat-form-field>
        </div>
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
  protected readonly modelos = signal<ModeloContratoFunil[]>([]);
  protected readonly form = this.fb.nonNullable.group({
    oportunidadeId: [this.dados?.oportunidadeId ?? '', Validators.required],
    modeloId: [this.dados?.modeloId ?? null as string | null],
    conteudo: [this.dados?.conteudo ?? '', Validators.required],
  });

  ngOnInit(): void {
    this.negocio.oportunidades().subscribe({ next: (lista) => this.oportunidades.set(lista) });
    this.negocio.modelosContratoFunil().subscribe({ next: (lista) => this.modelos.set(lista) });
  }

  protected aplicarModelo(id: string | null): void {
    const modelo = this.modelos().find((m) => m.id === id);
    if (!modelo) return;
    const opp = this.oportunidades().find((o) => o.id === this.form.controls.oportunidadeId.value);
    this.form.controls.conteudo.setValue(modelo.texto.replace(/#nome_oportunidade/gi, opp?.nome ?? ''));
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

@Component({
  selector: 'app-contratos-funil',
  imports: [MatButtonToggleModule, MatCardModule, MatButtonModule, MatFormFieldModule, MatInputModule, MatIconModule, MatTableModule, GdDataPipe],
  template: `
    <mat-card class="cardWithShadow">
      <div class="p-6 flex flex-wrap items-center justify-between gap-4">
      <div><mat-card-title class="mb-0">Contratos</mat-card-title><mat-card-subtitle>Contratos comerciais do funil.</mat-card-subtitle></div>
      <button mat-flat-button type="button" (click)="abrir()"><mat-icon>add</mat-icon> Novo contrato</button>
    </div>
      <mat-card-content class="border-t border-border">
      <div class="flex flex-wrap items-end justify-between gap-4 mb-6">
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
      @if (lista().length === 0) {
        <p class="text-center text-muted py-10">Não há contrato nesta aba.</p>
      } @else {
        <table mat-table class="min-w-full" [dataSource]="lista()">
          <ng-container matColumnDef="oportunidade">
            <th mat-header-cell *matHeaderCellDef>Oportunidade</th>
            <td mat-cell *matCellDef="let item">{{ item.oportunidadeNome }}</td>
          </ng-container>
          <ng-container matColumnDef="criadoEm">
            <th mat-header-cell *matHeaderCellDef>Criado em</th>
            <td mat-cell *matCellDef="let item">{{ item.criadoEm | gdData }}</td>
          </ng-container>
          <ng-container matColumnDef="acoes">
            <th mat-header-cell *matHeaderCellDef class="text-end! whitespace-nowrap">Ações</th>
            <td mat-cell *matCellDef="let item" class="text-end! whitespace-nowrap">
              @if (item.situacao === 'EmAndamento') {
                <button mat-icon-button type="button" (click)="abrir(item)"><mat-icon>edit</mat-icon></button>
                <button mat-icon-button type="button" (click)="enviar(item)"><mat-icon>send</mat-icon></button>
                <button mat-icon-button type="button" (click)="assinar(item)"><mat-icon>draw</mat-icon></button>
                <button mat-icon-button type="button" (click)="cancelar(item)"><mat-icon>cancel</mat-icon></button>
                @if (auth.podeExcluirDoFunil(item.criadoPor)) {
                  <button mat-icon-button type="button" (click)="excluir(item)"><mat-icon>delete</mat-icon></button>
                }
              } @else if (item.situacao === 'Assinado') {
                <button mat-icon-button type="button" (click)="cancelar(item)"><mat-icon>cancel</mat-icon></button>
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
  protected readonly colunas = ['oportunidade', 'criadoEm', 'acoes'];

  ngOnInit(): void {
    this.carregar();
  }

  protected buscar(evento: Event): void {
    this.busca.set((evento.target as HTMLInputElement).value);
    this.carregar();
  }

  protected abrir(item?: ContratoFunil): void {
    this.dialog.open(ContratoFunilDialog, { ...DIALOG, data: item ?? null }).afterClosed().subscribe((ok) => ok && this.carregar());
  }

  protected enviar(item: ContratoFunil): void {
    this.negocio.enviarContratoFunil(item.id).subscribe({
      next: () => { this.toast.sucesso('Contrato enviado.'); this.carregar(); },
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
      data: { titulo: 'Excluir contrato', texto: 'Confirma a exclusão?', confirmar: 'Excluir' },
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

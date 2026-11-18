import { Component, inject, OnInit, signal } from '@angular/core';
import { FormArray, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { mensagemDeErro } from '../../core/mensagem-erro';
import {
  NegocioClient,
  PAPEIS_RESPONSAVEL_TAREFA,
  PRIORIDADES_TAREFA,
  SITUACOES_TAREFA,
  Tarefa,
  VISIBILIDADES_TAREFA,
} from '../../core/negocio.client';
import { ToastService } from '../../core/toast.service';
import { CampoDataComponent } from '../../shared/campo-data';
import { deDataParaIso, deIsoParaData } from '../../shared/data';

export interface TarefaFormDados {
  eventoId: string;
  tarefa?: Tarefa;
}

@Component({
  selector: 'app-tarefa-form',
  imports: [
    ReactiveFormsModule, MatDialogModule, MatButtonModule, MatFormFieldModule, MatInputModule,
    MatSelectModule, MatCheckboxModule, MatIconModule, CampoDataComponent,
  ],
  template: `
    <h2 mat-dialog-title>{{ dados.tarefa ? 'Editar tarefa' : 'Nova tarefa' }}</h2>
    <p class="gd-dialog-descricao">Título, prazo, responsáveis e os detalhes da tarefa.</p>
    <mat-dialog-content>
      <form id="tarefa-form" class="gd-campos" [formGroup]="formulario" (ngSubmit)="salvar()">
        <mat-form-field class="inteiro" appearance="outline"><mat-label>Título</mat-label><input matInput formControlName="titulo" /></mat-form-field>
        <mat-form-field class="inteiro" appearance="outline"><mat-label>Descrição</mat-label><textarea matInput rows="2" formControlName="descricao"></textarea></mat-form-field>
        <div class="gd-campos duas">
          <app-campo-data rotulo="Prazo" formControlName="prazo" />
          @if (dados.tarefa) {
            <mat-form-field appearance="outline">
              <mat-label>Situação</mat-label>
              <mat-select formControlName="situacao">
                @for (item of situacoes; track item.valor) { <mat-option [value]="item.valor">{{ item.rotulo }}</mat-option> }
              </mat-select>
            </mat-form-field>
          }
          <mat-form-field appearance="outline">
            <mat-label>Responsáveis</mat-label>
            <mat-select formControlName="responsaveis" multiple>
              @for (papel of papeis; track papel.valor) { <mat-option [value]="papel.valor">{{ papel.rotulo }}</mat-option> }
            </mat-select>
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Prioridade</mat-label>
            <mat-select formControlName="prioridade">
              @for (item of prioridades; track item.valor) { <mat-option [value]="item.valor">{{ item.rotulo }}</mat-option> }
            </mat-select>
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Visibilidade</mat-label>
            <mat-select formControlName="visibilidade">
              @for (item of visibilidades; track item.valor) { <mat-option [value]="item.valor">{{ item.rotulo }}</mat-option> }
            </mat-select>
          </mat-form-field>
          <mat-form-field appearance="outline"><mat-label>Grupo</mat-label><input matInput formControlName="grupo" maxlength="80" /></mat-form-field>
        </div>
        @if (servicos().length > 0) {
          <mat-form-field class="inteiro" appearance="outline">
            <mat-label>Serviço</mat-label>
            <mat-select formControlName="servicoEventoId">
              <mat-option value="">Nenhum</mat-option>
              @for (servico of servicos(); track servico.id) { <mat-option [value]="servico.id">{{ servico.nome }}</mat-option> }
            </mat-select>
          </mat-form-field>
        }
        <div class="inteiro" formArrayName="checklist">
          <p>Checklist</p>
          @for (item of checklist.controls; track $index) {
            <div class="gd-campos duas" [formGroupName]="$index">
              <mat-form-field appearance="outline"><mat-label>Item</mat-label><input matInput formControlName="texto" /></mat-form-field>
              <mat-checkbox formControlName="feito">Feito</mat-checkbox>
            </div>
          }
          <button mat-stroked-button type="button" (click)="adicionarItem()">
            <mat-icon>add</mat-icon>
            Item
          </button>
        </div>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button type="button" (click)="ref.close(false)">Cancelar</button>
      <button mat-flat-button type="submit" form="tarefa-form">Salvar</button>
    </mat-dialog-actions>
  `,
})
export class TarefaFormDialog implements OnInit {
  protected readonly dados = inject<TarefaFormDados>(MAT_DIALOG_DATA);
  protected readonly ref = inject(MatDialogRef<TarefaFormDialog, boolean>);
  private readonly fb = inject(FormBuilder);
  private readonly negocio = inject(NegocioClient);
  private readonly toast = inject(ToastService);
  protected readonly situacoes = SITUACOES_TAREFA;
  protected readonly prioridades = PRIORIDADES_TAREFA;
  protected readonly visibilidades = VISIBILIDADES_TAREFA;
  protected readonly papeis = PAPEIS_RESPONSAVEL_TAREFA;
  protected readonly servicos = signal<{ id: string; nome: string }[]>([]);
  protected readonly formulario = this.fb.nonNullable.group({
    titulo: [this.dados.tarefa?.titulo ?? '', Validators.required],
    descricao: this.dados.tarefa?.descricao ?? '',
    prazo: this.fb.control<Date | null>(deIsoParaData(this.dados.tarefa?.prazo)),
    situacao: this.dados.tarefa?.situacao ?? 'Pendente',
    responsaveis: [this.dados.tarefa?.responsaveis.map((item) => item.papel) ?? ['Organizer'] as string[]],
    prioridade: this.dados.tarefa?.prioridade ?? 'Media',
    visibilidade: this.dados.tarefa?.visibilidade ?? 'SoEu',
    grupo: this.dados.tarefa?.grupo ?? '',
    servicoEventoId: this.dados.tarefa?.servicoEventoId ?? '',
    checklist: this.fb.array((this.dados.tarefa?.checklist ?? []).map((item) => this.item(item.texto, item.feito))),
  });

  protected get checklist(): FormArray {
    return this.formulario.controls.checklist;
  }

  ngOnInit(): void {
    const eventoId = this.dados.eventoId || this.dados.tarefa?.eventoId;
    if (!eventoId) return;
    this.negocio.evento(eventoId).subscribe({
      next: (evento) => this.servicos.set(evento.servicos.map((servico) => ({ id: servico.id, nome: servico.nome }))),
      error: () => this.servicos.set([]),
    });
  }

  protected adicionarItem(): void {
    this.checklist.push(this.item('', false));
  }

  protected salvar(): void {
    if (this.formulario.invalid || this.checklist.controls.some((item) => !item.getRawValue().texto.trim())) {
      this.formulario.markAllAsTouched();
      this.toast.erro('Confira os campos obrigatórios.');
      return;
    }
    const valor = this.formulario.getRawValue();
    if (valor.responsaveis.length === 0) {
      this.toast.erro('Informe ao menos um responsável.');
      return;
    }
    const pedido = {
      titulo: valor.titulo,
      descricao: valor.descricao,
      grupo: valor.grupo || null,
      prazo: deDataParaIso(valor.prazo),
      situacao: valor.situacao,
      prioridade: valor.prioridade,
      visibilidade: valor.visibilidade,
      servicoEventoId: valor.servicoEventoId || null,
      atualizarServico: true,
      responsaveis: valor.responsaveis.map((papel) => ({ papel })),
      checklist: valor.checklist.map((item) => ({ texto: item.texto, feito: item.feito })),
    };
    const destino = this.dados.tarefa
      ? this.negocio.atualizarTarefa(this.dados.tarefa.id, pedido)
      : this.negocio.criarTarefa(this.dados.eventoId, pedido);
    destino.subscribe({
      next: () => {
        this.toast.sucesso(this.dados.tarefa ? 'Tarefa atualizada.' : 'Tarefa criada.');
        this.ref.close(true);
      },
      error: (erro: unknown) => this.toast.erro(mensagemDeErro(erro)),
    });
  }

  private item(texto: string, feito: boolean) {
    return this.fb.nonNullable.group({ texto, feito });
  }
}

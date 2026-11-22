import { Component, ElementRef, inject, OnInit, signal } from '@angular/core';
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
  PRIORIDADES_TAREFA,
  SITUACOES_TAREFA,
  Tarefa,
  VISIBILIDADES_TAREFA,
} from '../../core/negocio.client';
import { AssistentesClient } from '../../core/assistentes.client';
import { AuthService } from '../../core/auth.service';
import { ToastService } from '../../core/toast.service';
import { chaveResponsavel, opcoesResponsavel, OpcaoResponsavel, pedidoResponsavel } from '../../shared/responsaveis';
import { CampoDataComponent } from '../../shared/campo-data';
import { deDataParaIso, deIsoParaData } from '../../shared/data';
import { MatTooltipModule } from '@angular/material/tooltip';

export interface TarefaFormDados {
  eventoId: string;
  tarefa?: Tarefa;
}

@Component({
  selector: 'app-tarefa-form',
  imports: [ReactiveFormsModule, MatDialogModule, MatButtonModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatCheckboxModule, MatIconModule, CampoDataComponent, MatTooltipModule],
  template: `
    <h2 mat-dialog-title>{{ dados.tarefa ? 'Editar tarefa' : 'Nova tarefa' }}</h2>
    <p class="text-muted text-sm px-6 -mt-2 mb-4">Título, prazo, responsáveis e os detalhes da tarefa.</p>
    <mat-dialog-content>
      <form id="tarefa-form" class="grid grid-cols-1 gap-4" [formGroup]="formulario" (ngSubmit)="salvar()">
        <div class="campo sm:col-span-2">
          <mat-label class="font-semibold mb-2 block">Título</mat-label>
          <mat-form-field appearance="outline" class="w-full">
          <input [attr.aria-label]="'Título'" matInput formControlName="titulo" required />
          @if (formulario.controls.titulo.invalid) { <mat-error>Informe o título.</mat-error> }
        </mat-form-field>
        </div>
        <div class="campo sm:col-span-2">
          <mat-label class="font-semibold mb-2 block">Descrição</mat-label>
          <mat-form-field appearance="outline" class="w-full"><textarea [attr.aria-label]="'Descrição'" matInput rows="2" formControlName="descricao"></textarea></mat-form-field>
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
          <app-campo-data rotulo="Prazo" formControlName="prazo" />
          @if (dados.tarefa) {
            <div class="campo">
              <mat-label class="font-semibold mb-2 block">Situação</mat-label>
              <mat-form-field appearance="outline" class="w-full">
              <mat-select [attr.aria-label]="'Situação'" formControlName="situacao">
                @for (item of situacoes; track item.valor) { <mat-option [value]="item.valor">{{ item.rotulo }}</mat-option> }
              </mat-select>
            </mat-form-field>
            </div>
          }
          <div class="campo">
            <mat-label class="font-semibold mb-2 block">Responsáveis</mat-label>
            <mat-form-field appearance="outline" class="w-full">
            <mat-select [attr.aria-label]="'Responsáveis'" formControlName="responsaveis" multiple required>
              @for (papel of papeis(); track papel.valor) { <mat-option [value]="papel.valor">{{ papel.rotulo }}</mat-option> }
            </mat-select>
            @if (formulario.controls.responsaveis.hasError('required')) { <mat-error>Informe ao menos um responsável.</mat-error> }
          </mat-form-field>
          </div>
          <div class="campo">
            <mat-label class="font-semibold mb-2 block">Prioridade</mat-label>
            <mat-form-field appearance="outline" class="w-full">
            <mat-select [attr.aria-label]="'Prioridade'" formControlName="prioridade">
              @for (item of prioridades; track item.valor) { <mat-option [value]="item.valor">{{ item.rotulo }}</mat-option> }
            </mat-select>
          </mat-form-field>
          </div>
          <div class="campo">
            <mat-label class="font-semibold mb-2 block">Visibilidade</mat-label>
            <mat-form-field appearance="outline" class="w-full">
            <mat-select [attr.aria-label]="'Visibilidade'" formControlName="visibilidade">
              @for (item of visibilidades; track item.valor) { <mat-option [value]="item.valor">{{ item.rotulo }}</mat-option> }
            </mat-select>
          </mat-form-field>
          </div>
          <div class="campo">
            <mat-label class="font-semibold mb-2 block">Grupo</mat-label>
            <mat-form-field appearance="outline" class="w-full"><input [attr.aria-label]="'Grupo'" matInput formControlName="grupo" maxlength="80" /></mat-form-field>
          </div>
        </div>
        @if (servicos().length > 0) {
          <div class="campo sm:col-span-2">
            <mat-label class="font-semibold mb-2 block">Serviço</mat-label>
            <mat-form-field appearance="outline" class="w-full">
            <mat-select [attr.aria-label]="'Serviço'" formControlName="servicoEventoId">
              <mat-option value="">Nenhum</mat-option>
              @for (servico of servicos(); track servico.id) { <mat-option [value]="servico.id">{{ servico.nome }}</mat-option> }
            </mat-select>
          </mat-form-field>
          </div>
        }
        <div class="sm:col-span-2 flex flex-col gap-2" formArrayName="checklist">
          <span class="font-semibold mb-2 block">Checklist</span>
          @for (item of checklist.controls; track item; let i = $index) {
            <div class="item-lista flex flex-col gap-1" [class.line-through]="item.get('cancelado')?.value" [formGroupName]="i">
              <div class="flex items-center gap-2">
                <mat-checkbox formControlName="feito" [attr.aria-label]="'Marcar item ' + (i + 1) + ' como feito'" />
                <mat-form-field appearance="outline" class="flex-1 min-w-0">
                  <input matInput formControlName="texto" placeholder="Descreva o item" required [attr.aria-label]="'Item ' + (i + 1)" />
                  @if (item.get('texto')?.invalid) { <mat-error>Preencha ou remova o item.</mat-error> }
                </mat-form-field>
                <button mat-icon-button type="button" aria-label="Remover item" matTooltip="Remover item" (click)="removerItem(i)"><mat-icon>delete</mat-icon></button>
              </div>
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-x-4 pl-10">
                <app-campo-data rotulo="" [ariaLabel]="'Prazo do item ' + (i + 1)" formControlName="prazo" />
                <mat-form-field appearance="outline" class="w-full">
                  <mat-select formControlName="responsavel" [attr.aria-label]="'Responsável do item ' + (i + 1)">
                    <mat-option value="">Sem responsável</mat-option>
                    @for (papel of papeis(); track papel.valor) { <mat-option [value]="papel.valor">{{ papel.rotulo }}</mat-option> }
                  </mat-select>
                </mat-form-field>
              </div>
            </div>
          }
          <div>
            <button mat-stroked-button type="button" (click)="adicionarItem()">
              <mat-icon>add</mat-icon>
              Adicionar item
            </button>
          </div>
        </div>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-stroked-button type="button" (click)="ref.close(false)">Cancelar</button>
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
  private readonly elemento = inject<ElementRef<HTMLElement>>(ElementRef);
  protected readonly situacoes = SITUACOES_TAREFA;
  protected readonly prioridades = PRIORIDADES_TAREFA;
  protected readonly visibilidades = VISIBILIDADES_TAREFA;
  private readonly assistentes = inject(AssistentesClient);
  private readonly auth = inject(AuthService);
  protected readonly papeis = signal<OpcaoResponsavel[]>(opcoesResponsavel([], this.auth.ehAssistente() ? 'Dona da conta' : 'Eu'));
  protected readonly servicos = signal<{ id: string; nome: string }[]>([]);
  protected readonly formulario = this.fb.nonNullable.group({
    titulo: [this.dados.tarefa?.titulo ?? '', [Validators.required, Validators.pattern(/\S/)]],
    descricao: this.dados.tarefa?.descricao ?? '',
    prazo: this.fb.control<Date | null>(deIsoParaData(this.dados.tarefa?.prazo)),
    situacao: this.dados.tarefa?.situacao ?? 'Pendente',
    responsaveis: [this.dados.tarefa?.responsaveis.map((item) => chaveResponsavel(item)) ?? ['Organizer'] as string[], Validators.required],
    prioridade: this.dados.tarefa?.prioridade ?? 'Media',
    visibilidade: this.dados.tarefa?.visibilidade ?? 'SoEu',
    grupo: this.dados.tarefa?.grupo ?? '',
    servicoEventoId: this.dados.tarefa?.servicoEventoId ?? '',
    checklist: this.fb.array((this.dados.tarefa?.checklist ?? []).map((item) => this.item(item.texto, item.feito, item.cancelado, deIsoParaData(item.prazo), item.responsavel ? chaveResponsavel(item.responsavel) : ''))),
  });

  protected get checklist(): FormArray {
    return this.formulario.controls.checklist;
  }

  ngOnInit(): void {
    const atuais = [
      ...(this.dados.tarefa?.responsaveis ?? []).map((item) => chaveResponsavel(item)),
      ...(this.dados.tarefa?.checklist ?? []).flatMap((item) => (item.responsavel ? [chaveResponsavel(item.responsavel)] : [])),
    ];
    this.assistentes.nomes().subscribe({
      next: (nomes) => this.papeis.set(opcoesResponsavel(nomes, this.auth.ehAssistente() ? 'Dona da conta' : 'Eu', atuais)),
      error: () => undefined,
    });
    const eventoId = this.dados.eventoId || this.dados.tarefa?.eventoId;
    if (!eventoId) return;
    this.negocio.evento(eventoId).subscribe({
      next: (evento) => this.servicos.set(evento.servicos.map((servico) => ({ id: servico.id, nome: servico.nome }))),
      error: () => this.servicos.set([]),
    });
  }

  protected adicionarItem(): void {
    this.checklist.push(this.item('', false, false, null, ''));
    setTimeout(() => {
      const campos = this.elemento.nativeElement.querySelectorAll<HTMLInputElement>('.item-lista input');
      campos[campos.length - 1]?.focus();
    });
  }

  protected removerItem(indice: number): void {
    this.checklist.removeAt(indice);
  }

  protected salvar(): void {
    if (this.formulario.invalid) {
      this.formulario.markAllAsTouched();
      this.toast.erro('Confira os campos obrigatórios destacados.');
      setTimeout(() => this.focarPrimeiroInvalido());
      return;
    }
    const valor = this.formulario.getRawValue();
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
      responsaveis: valor.responsaveis.map((chave) => pedidoResponsavel(chave)),
      checklist: valor.checklist.map((item) => ({
        texto: item.texto.trim(),
        feito: item.feito,
        cancelado: item.cancelado,
        prazo: deDataParaIso(item.prazo),
        responsavel: item.responsavel ? pedidoResponsavel(item.responsavel) : null,
      })),
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

  private focarPrimeiroInvalido(): void {
    const campo = this.elemento.nativeElement.querySelector<HTMLElement>('input.ng-invalid, textarea.ng-invalid, .mat-mdc-select.ng-invalid');
    campo?.focus();
  }

  private item(texto: string, feito: boolean, cancelado: boolean, prazo: Date | null, responsavel: string) {
    return this.fb.nonNullable.group({
      texto: [texto, [Validators.required, Validators.pattern(/\S/)]],
      feito,
      cancelado,
      prazo: this.fb.control<Date | null>(prazo),
      responsavel,
    });
  }
}

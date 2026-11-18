import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { EventoServico, FornecedorResumo, NegocioClient } from '../../core/negocio.client';
import { DIALOG_FORNECEDOR, FornecedorFormDialog } from '../fornecedores/fornecedor-form.dialog';

export interface VincularFornecedorDados {
  servicos: EventoServico[];
  fornecedores: FornecedorResumo[];
  servicoId?: string;
}

export interface VincularFornecedorPedido {
  servicoId: string | null;
  novoServico: string | null;
  fornecedorId: string;
  etapa: string;
}

const NOVO_SERVICO = '__novo__';

/** Vincula um fornecedor do cadastro a um serviço do evento (SPEC-018). */
@Component({
  selector: 'app-vincular-fornecedor',
  imports: [
    ReactiveFormsModule, MatDialogModule, MatButtonModule, MatFormFieldModule, MatInputModule,
    MatSelectModule, MatAutocompleteModule, MatIconModule,
  ],
  template: `
    <h2 mat-dialog-title>Adicionar fornecedor</h2>
    <p class="gd-dialog-descricao">Escolha um fornecedor do seu cadastro e o serviço do evento. Ele entra na etapa Orçamento.</p>
    <mat-dialog-content>
      <form id="vincular-fornecedor" class="gd-campos" [formGroup]="form" (ngSubmit)="confirmar()">
        <mat-form-field appearance="outline">
          <mat-label>Serviço</mat-label>
          <mat-select formControlName="servicoId" required>
            @for (servico of dados.servicos; track servico.id) {
              <mat-option [value]="servico.id">{{ servico.nome }}</mat-option>
            }
            <mat-option [value]="novo"><mat-icon>add</mat-icon> Novo serviço…</mat-option>
          </mat-select>
          @if (form.controls.servicoId.invalid) { <mat-error>Escolha o serviço.</mat-error> }
        </mat-form-field>

        @if (ehNovoServico()) {
          <mat-form-field appearance="outline">
            <mat-label>Nome do novo serviço</mat-label>
            <input matInput formControlName="novoServico" [matAutocomplete]="sugestoes" placeholder="Ex.: Buffet, Fotografia" required />
            <mat-autocomplete #sugestoes="matAutocomplete">
              @for (nome of sugestoesServico(); track nome) { <mat-option [value]="nome">{{ nome }}</mat-option> }
            </mat-autocomplete>
            @if (form.controls.novoServico.invalid) { <mat-error>Informe o nome do serviço.</mat-error> }
          </mat-form-field>
        }

        <mat-form-field appearance="outline">
          <mat-label>Fornecedor</mat-label>
          <mat-icon matIconPrefix>search</mat-icon>
          <input
            matInput
            formControlName="fornecedor"
            [matAutocomplete]="listaFornecedores"
            placeholder="Buscar no cadastro"
            required
          />
          <mat-autocomplete #listaFornecedores="matAutocomplete" [displayWith]="nomeFornecedor" autoActiveFirstOption>
            @for (fornecedor of fornecedoresFiltrados(); track fornecedor.id) {
              <mat-option [value]="fornecedor" [disabled]="jaVinculado(fornecedor.id)">
                <span class="opcao-nome">{{ fornecedor.nome }}</span>
                <span class="gd-sub">
                  {{ jaVinculado(fornecedor.id) ? 'Já está neste serviço' : (fornecedor.servicos.join(', ') || 'Sem serviço informado') }}
                </span>
              </mat-option>
            } @empty {
              <mat-option disabled>Nenhum fornecedor encontrado.</mat-option>
            }
          </mat-autocomplete>
          @if (form.controls.fornecedor.invalid) { <mat-error>Escolha um fornecedor da lista.</mat-error> }
        </mat-form-field>
        <div>
          <button mat-button type="button" class="gd-secundario" (click)="cadastrarFornecedor()">
            <mat-icon>person_add</mat-icon>
            Cadastrar novo fornecedor
          </button>
        </div>

      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button type="button" (click)="ref.close()">Cancelar</button>
      <button mat-flat-button type="submit" form="vincular-fornecedor">Adicionar fornecedor</button>
    </mat-dialog-actions>
  `,
  styles: `
    .opcao-nome { display: block; font-size: 14px; line-height: 20px; }
    mat-option .gd-sub { margin-top: 2px; }
  `,
})
export class VincularFornecedorDialog {
  protected readonly dados = inject<VincularFornecedorDados>(MAT_DIALOG_DATA);
  protected readonly ref = inject(MatDialogRef<VincularFornecedorDialog, VincularFornecedorPedido>);
  private readonly fb = inject(FormBuilder);
  private readonly dialog = inject(MatDialog);
  private readonly negocio = inject(NegocioClient);
  protected readonly novo = NOVO_SERVICO;
  private readonly fornecedores = signal<FornecedorResumo[]>(this.dados.fornecedores);
  private readonly servicosConta = signal<string[]>([]);

  protected readonly form = this.fb.group({
    servicoId: [this.dados.servicoId ?? this.dados.servicos[0]?.id ?? NOVO_SERVICO, Validators.required],
    novoServico: [''],
    fornecedor: this.fb.control<FornecedorResumo | string | null>(null, [Validators.required, (controle) =>
      controle.value && typeof controle.value === 'object' ? null : { escolha: true }]),
  });

  private readonly servicoId = toSignal(this.form.controls.servicoId.valueChanges, { initialValue: this.form.controls.servicoId.value });
  private readonly busca = toSignal(this.form.controls.fornecedor.valueChanges, { initialValue: null });
  private readonly novoServico = toSignal(this.form.controls.novoServico.valueChanges, { initialValue: '' });

  protected readonly ehNovoServico = computed(() => this.servicoId() === NOVO_SERVICO);

  protected readonly fornecedoresFiltrados = computed(() => {
    const valor = this.busca();
    const termo = typeof valor === 'string' ? normalizar(valor) : '';
    const servico = this.dados.servicos.find((item) => item.id === this.servicoId());
    const alvo = normalizar(servico?.nome ?? this.novoServico() ?? '');
    return this.fornecedores()
      .filter((item) => !termo || normalizar(item.nome).includes(termo) || item.servicos.some((s) => normalizar(s).includes(termo)))
      .sort((a, b) => Number(atende(b, alvo)) - Number(atende(a, alvo)) || a.nome.localeCompare(b.nome, 'pt-BR'));
  });

  protected readonly sugestoesServico = computed(() => {
    const termo = normalizar(this.novoServico() ?? '');
    const usados = new Set(this.dados.servicos.map((item) => normalizar(item.nome)));
    return this.servicosConta()
      .filter((nome) => !usados.has(normalizar(nome)) && (!termo || normalizar(nome).includes(termo)))
      .slice(0, 8);
  });

  constructor() {
    this.atualizarValidacaoNovoServico(this.form.controls.servicoId.value);
    this.form.controls.servicoId.valueChanges.subscribe((valor) => this.atualizarValidacaoNovoServico(valor));
    this.negocio.servicosConta().subscribe({
      next: (lista) => this.servicosConta.set(lista.map((item) => item.nome)),
      error: () => this.servicosConta.set([]),
    });
  }

  protected readonly nomeFornecedor = (valor: FornecedorResumo | string | null): string =>
    !valor ? '' : typeof valor === 'string' ? valor : valor.nome;

  protected jaVinculado(fornecedorId: string): boolean {
    const servico = this.dados.servicos.find((item) => item.id === this.servicoId());
    return !!servico?.fornecedores.some((item) => item.fornecedorId === fornecedorId);
  }

  protected cadastrarFornecedor(): void {
    const antes = new Set(this.fornecedores().map((item) => item.id));
    this.dialog.open(FornecedorFormDialog, { ...DIALOG_FORNECEDOR, data: null }).afterClosed().subscribe((ok) => {
      if (!ok) {
        return;
      }
      this.negocio.fornecedores().subscribe((lista) => {
        this.fornecedores.set(lista);
        const criado = lista.find((item) => !antes.has(item.id));
        if (criado) {
          this.form.controls.fornecedor.setValue(criado);
        }
      });
    });
  }

  protected confirmar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const valor = this.form.getRawValue();
    const fornecedor = valor.fornecedor as FornecedorResumo;
    const novo = valor.servicoId === NOVO_SERVICO;
    this.ref.close({
      servicoId: novo ? null : valor.servicoId,
      novoServico: novo ? (valor.novoServico ?? '').trim() : null,
      fornecedorId: fornecedor.id,
      // Entra em Orçamento; Contratar (valor e parcelas) fica na lista.
      etapa: 'Orcamento',
    });
  }

  private atualizarValidacaoNovoServico(servicoId: string | null): void {
    const controle = this.form.controls.novoServico;
    controle.setValidators(servicoId === NOVO_SERVICO ? [Validators.required, Validators.pattern(/\S/)] : null);
    controle.updateValueAndValidity({ emitEvent: false });
  }
}

function normalizar(texto: string): string {
  return texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}

function atende(fornecedor: FornecedorResumo, servico: string): boolean {
  return !!servico && fornecedor.servicos.some((item) => normalizar(item) === servico);
}

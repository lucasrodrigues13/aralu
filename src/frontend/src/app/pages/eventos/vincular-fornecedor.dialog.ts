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

/** Um serviço marcado: um serviço do evento (`servicoId`) ou um serviço novo, que o fornecedor presta (`novoServico`). */
export interface EscolhaDeServico {
  servicoId: string | null;
  novoServico: string | null;
}

export interface VincularFornecedorPedido {
  fornecedorId: string;
  servicos: EscolhaDeServico[];
  etapa: string;
}

interface OpcaoServico {
  chave: string;
  nome: string;
  servicoId: string | null;
  novo: boolean;
  jaVinculado: boolean;
  presta: boolean;
}

/** Vincula um fornecedor do cadastro a serviços do evento: primeiro o fornecedor, depois os serviços (SPEC-045 §6.1). */
@Component({
  selector: 'app-vincular-fornecedor',
  imports: [ReactiveFormsModule, MatDialogModule, MatButtonModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatAutocompleteModule, MatIconModule],
  template: `
    <h2 mat-dialog-title>Adicionar fornecedor</h2>
    <p class="text-muted text-sm px-6 -mt-2 mb-4">Escolha o fornecedor e, na sequência, os serviços dele neste evento. Ele entra na etapa Orçamento.</p>
    <mat-dialog-content>
      <form id="vincular-fornecedor" class="grid grid-cols-1 gap-4" [formGroup]="form" (ngSubmit)="confirmar()">
        <div class="campo">
          <mat-label class="font-semibold mb-2 block">Fornecedor</mat-label>
          <mat-form-field appearance="outline" class="w-full">
          <mat-icon matIconPrefix>search</mat-icon>
          <input [attr.aria-label]="'Fornecedor'"
            matInput
            formControlName="fornecedor"
            [matAutocomplete]="listaFornecedores"
            placeholder="Buscar no cadastro"
            required
          />
          <mat-autocomplete #listaFornecedores="matAutocomplete" class="painel-com-criar" [displayWith]="nomeFornecedor" (optionSelected)="aoEscolherFornecedor($event.option.value)">
            <mat-option class="opcao-criar" [value]="novoFornecedor"><mat-icon>person_add</mat-icon> Criar novo fornecedor</mat-option>
            @for (fornecedor of fornecedoresFiltrados(); track fornecedor.id) {
              <mat-option [value]="fornecedor">
                <span class="opcao-nome">{{ fornecedor.nome }}</span>
                <span class="block text-xs text-muted">{{ fornecedor.servicos.join(', ') || 'Sem serviço informado' }}</span>
              </mat-option>
            } @empty {
              <mat-option disabled>Nenhum fornecedor encontrado.</mat-option>
            }
          </mat-autocomplete>
          @if (form.controls.fornecedor.invalid) { <mat-error>Escolha um fornecedor da lista.</mat-error> }
        </mat-form-field>
        </div>

        <div class="campo">
          <mat-label class="font-semibold mb-2 block">Serviços</mat-label>
          <mat-form-field appearance="outline" class="w-full">
            <mat-select [attr.aria-label]="'Serviços'" formControlName="servicos" multiple [disabled]="!fornecedorEscolhido()">
              @for (opcao of opcoes(); track opcao.chave) {
                <mat-option [value]="opcao.chave" [disabled]="opcao.jaVinculado">
                  {{ opcao.nome }}
                  @if (opcao.jaVinculado) { <span class="text-xs text-muted"> · Já está neste serviço</span> }
                  @else if (opcao.novo) { <span class="text-xs text-muted"> · novo no evento</span> }
                  @else if (opcao.presta) { <span class="text-xs text-muted"> · ele presta</span> }
                </mat-option>
              }
            </mat-select>
            @if (form.controls.servicos.invalid && form.controls.servicos.touched) { <mat-error>Marque ao menos um serviço.</mat-error> }
          </mat-form-field>
          @if (!fornecedorEscolhido()) { <p class="text-xs text-muted">Escolha o fornecedor para ver os serviços.</p> }
        </div>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-stroked-button type="button" (click)="ref.close()">Cancelar</button>
      <button mat-flat-button type="submit" form="vincular-fornecedor">Adicionar fornecedor</button>
    </mat-dialog-actions>
  `,
  styles: `
    .opcao-nome { display: block; font-size: 14px; line-height: 20px; }
  `,
})
export class VincularFornecedorDialog {
  protected readonly dados = inject<VincularFornecedorDados>(MAT_DIALOG_DATA);
  protected readonly ref = inject(MatDialogRef<VincularFornecedorDialog, VincularFornecedorPedido>);
  private readonly fb = inject(FormBuilder);
  private readonly dialog = inject(MatDialog);
  private readonly negocio = inject(NegocioClient);
  private readonly fornecedores = signal<FornecedorResumo[]>(this.dados.fornecedores);

  protected readonly form = this.fb.group({
    fornecedor: this.fb.control<FornecedorResumo | string | null>(null, [Validators.required, (controle) =>
      controle.value && typeof controle.value === 'object' ? null : { escolha: true }]),
    servicos: this.fb.nonNullable.control<string[]>([], [(controle) => (controle.value as string[]).length > 0 ? null : { vazio: true }]),
  });

  private readonly busca = toSignal(this.form.controls.fornecedor.valueChanges, { initialValue: null });

  protected readonly fornecedorEscolhido = computed<FornecedorResumo | null>(() => {
    const valor = this.busca();
    return valor && typeof valor === 'object' ? valor : null;
  });

  protected readonly fornecedoresFiltrados = computed(() => {
    const valor = this.busca();
    const termo = typeof valor === 'string' ? normalizar(valor) : '';
    return this.fornecedores()
      .filter((item) => !termo || normalizar(item.nome).includes(termo) || item.servicos.some((s) => normalizar(s).includes(termo)))
      .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
  });

  /** Serviços do evento mais os que o fornecedor presta e ainda não existem no evento; os dele vêm primeiro. */
  protected readonly opcoes = computed<OpcaoServico[]>(() => {
    const fornecedor = this.fornecedorEscolhido();
    if (!fornecedor) {
      return [];
    }
    const presta = new Set(fornecedor.servicos.map(normalizar));
    const nomesDoEvento = new Set(this.dados.servicos.map((item) => normalizar(item.nome)));
    const doEvento: OpcaoServico[] = this.dados.servicos.map((servico) => ({
      chave: servico.id,
      nome: servico.nome,
      servicoId: servico.id,
      novo: false,
      jaVinculado: servico.fornecedores.some((item) => item.fornecedorId === fornecedor.id),
      presta: presta.has(normalizar(servico.nome)),
    }));
    const novos: OpcaoServico[] = fornecedor.servicos
      .filter((nome) => !nomesDoEvento.has(normalizar(nome)))
      .map((nome) => ({ chave: `novo:${nome}`, nome, servicoId: null, novo: true, jaVinculado: false, presta: true }));
    return [...doEvento, ...novos].sort((a, b) => Number(b.presta) - Number(a.presta));
  });

  constructor() {
    // Ao escolher o fornecedor, os serviços dele (livres) vêm marcados; o serviço de origem também.
    this.form.controls.fornecedor.valueChanges.subscribe(() => {
      const opcoes = this.opcoes();
      const origem = this.dados.servicoId;
      this.form.controls.servicos.setValue(
        opcoes.filter((opcao) => !opcao.jaVinculado && (opcao.presta || opcao.chave === origem)).map((opcao) => opcao.chave),
      );
    });
  }

  protected readonly novoFornecedor = NOVO_FORNECEDOR;

  protected readonly nomeFornecedor = (valor: FornecedorResumo | string | null): string =>
    !valor || valor === NOVO_FORNECEDOR ? '' : typeof valor === 'string' ? valor : valor.nome;

  protected aoEscolherFornecedor(valor: FornecedorResumo | string): void {
    if (valor !== NOVO_FORNECEDOR) {
      return;
    }
    this.form.controls.fornecedor.setValue(null);
    this.cadastrarFornecedor();
  }

  private cadastrarFornecedor(): void {
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
    const marcadas = new Set(valor.servicos);
    this.ref.close({
      fornecedorId: fornecedor.id,
      servicos: this.opcoes()
        .filter((opcao) => marcadas.has(opcao.chave))
        .map((opcao) => ({ servicoId: opcao.servicoId, novoServico: opcao.novo ? opcao.nome : null })),
      // Entra em Orçamento; Contratar (valor e contrato assinado) fica na lista.
      etapa: 'Orcamento',
    });
  }
}

const NOVO_FORNECEDOR = '__novo-fornecedor__';

function normalizar(texto: string): string {
  return texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}

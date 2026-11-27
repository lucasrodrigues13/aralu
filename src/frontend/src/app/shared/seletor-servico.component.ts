import { Component, computed, effect, forwardRef, inject, input, OnInit, output, signal, untracked } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatTooltipModule } from '@angular/material/tooltip';
import { NegocioClient, ServicoConta } from '../core/negocio.client';
import { NOVO_SERVICO, incluirServico, servicoCombina } from '../pages/fornecedores/busca-servico';
import { NovoServicoDialog } from '../pages/fornecedores/novo-servico.dialog';
import { DIALOG_PEQUENO } from './dialog';

const SEM_SERVICO = '__sem-servico__';

/**
 * Seletor de serviço do cadastro da conta (SPEC-012 v3 §8.4): lista com busca e "+ Adicionar serviço", como na tela
 * de fornecedor (SPEC-018, card #27). O valor é o id do serviço do cadastro ('' = sem serviço). Os serviços de
 * `destaque` (os que já estão no modelo ou no evento) aparecem primeiro.
 */
@Component({
  selector: 'app-seletor-servico',
  imports: [MatAutocompleteModule, MatButtonModule, MatFormFieldModule, MatIconModule, MatInputModule, MatTooltipModule],
  providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => SeletorServicoComponent), multi: true }],
  template: `
    <mat-form-field appearance="outline" class="w-full" [subscriptSizing]="compacto() ? 'dynamic' : 'fixed'">
      <mat-icon matIconPrefix>search</mat-icon>
      <input
        #busca
        matInput
        [attr.aria-label]="rotulo()"
        [placeholder]="valor() ? '' : 'Sem serviço'"
        [value]="texto()"
        [disabled]="desligado()"
        (input)="termo.set($any($event.target).value); texto.set($any($event.target).value)"
        (focus)="focado = true; termo.set('')"
        (blur)="aoSair()"
        [matAutocomplete]="lista"
      />
      @if (valor() && !desligado()) {
        <button matIconSuffix mat-icon-button type="button" aria-label="Remover serviço" matTooltip="Remover serviço" (click)="escolher(semServico)"><mat-icon>close</mat-icon></button>
      }
      <mat-autocomplete #lista="matAutocomplete" class="painel-com-criar" (optionSelected)="escolher($event.option.value); busca.blur()">
        <mat-option class="opcao-criar" [value]="novoServico"><mat-icon>add</mat-icon> Adicionar serviço</mat-option>
        <mat-option [value]="semServico"><em>Sem serviço</em></mat-option>
        @for (grupo of grupos(); track grupo.rotulo) {
          @if (grupo.servicos.length > 0) {
            <mat-optgroup [label]="grupo.rotulo">
              @for (servico of grupo.servicos; track servico.id) {
                <mat-option [value]="servico.id">{{ servico.nome }}</mat-option>
              }
            </mat-optgroup>
          }
        }
        @if (vazio()) {
          <mat-option disabled>Nenhum serviço encontrado</mat-option>
        }
      </mat-autocomplete>
    </mat-form-field>
  `,
})
export class SeletorServicoComponent implements ControlValueAccessor, OnInit {
  private readonly negocio = inject(NegocioClient);
  private readonly dialog = inject(MatDialog);

  /** Ids do cadastro que já estão no modelo ou no evento: aparecem primeiro. */
  readonly destaque = input<string[]>([]);
  readonly rotuloDestaque = input('Já incluídos');
  readonly rotulo = input('Serviço');
  /** Sem a reserva de espaço da mensagem embaixo (para linhas de grade). */
  readonly compacto = input(false);
  /** Catálogo já carregado por quem usa (evita uma chamada por linha da grade). Sem ele, o seletor carrega. */
  readonly catalogo = input<ServicoConta[] | null>(null);
  /** Avisa quando um serviço novo foi cadastrado pelo "+ Adicionar serviço". */
  readonly criado = output<ServicoConta>();

  protected readonly novoServico = NOVO_SERVICO;
  protected readonly semServico = SEM_SERVICO;
  private readonly carregados = signal<ServicoConta[]>([]);
  private readonly extras = signal<ServicoConta[]>([]);
  protected readonly valor = signal('');
  protected readonly termo = signal('');
  protected readonly texto = signal('');
  protected readonly desligado = signal(false);

  private readonly todos = computed(() => {
    let lista = this.catalogo() ?? this.carregados();
    for (const extra of this.extras()) lista = incluirServico(lista, extra);
    return lista;
  });

  protected readonly grupos = computed(() => {
    const destaque = new Set(this.destaque());
    const termo = this.termo();
    const visiveis = this.todos().filter((servico) => servicoCombina(servico, termo));
    return [
      { rotulo: this.rotuloDestaque(), servicos: visiveis.filter((servico) => destaque.has(servico.id)) },
      { rotulo: 'Cadastro de serviços', servicos: visiveis.filter((servico) => !destaque.has(servico.id)) },
    ];
  });

  protected readonly vazio = computed(() => this.grupos().every((grupo) => grupo.servicos.length === 0));

  protected focado = false;

  constructor() {
    // Cadastro que chega depois do valor: o nome aparece assim que a lista existir (sem atrapalhar quem está digitando).
    effect(() => {
      this.todos();
      untracked(() => {
        if (!this.focado) this.texto.set(this.nomeDe(this.valor()));
      });
    });
  }

  private aoMudar: (valor: string) => void = () => undefined;
  private aoTocar: () => void = () => undefined;

  ngOnInit(): void {
    if (this.catalogo() === null) {
      this.negocio.servicosConta().subscribe({
        next: (lista) => {
          this.carregados.set(lista);
          this.texto.set(this.nomeDe(this.valor()));
        },
        error: () => this.carregados.set([]),
      });
    }
  }

  writeValue(valor: string | null): void {
    this.valor.set(valor ?? '');
    this.texto.set(this.nomeDe(valor ?? ''));
  }

  registerOnChange(fn: (valor: string) => void): void {
    this.aoMudar = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.aoTocar = fn;
  }

  setDisabledState(desligado: boolean): void {
    this.desligado.set(desligado);
  }

  /** Nome do serviço do cadastro pelo id (para quem usa o seletor mostrar o nome). */
  nomeDe(id: string): string {
    return this.todos().find((servico) => servico.id === id)?.nome ?? '';
  }

  protected escolher(valor: string): void {
    if (valor === NOVO_SERVICO) {
      this.dialog.open(NovoServicoDialog, { ...DIALOG_PEQUENO, data: { nome: this.termo() } }).afterClosed().subscribe((criados?: ServicoConta[]) => {
        const primeiro = criados?.[0];
        for (const servico of criados ?? []) {
          this.extras.update((lista) => incluirServico(lista, servico));
          this.criado.emit(servico);
        }
        if (primeiro) this.definir(primeiro.id);
        else this.texto.set(this.nomeDe(this.valor()));
      });
      return;
    }
    this.definir(valor === SEM_SERVICO ? '' : valor);
  }

  protected aoSair(): void {
    this.focado = false;
    this.aoTocar();
    // Texto digitado sem escolher uma opção volta para o serviço escolhido.
    setTimeout(() => this.texto.set(this.nomeDe(this.valor())), 150);
  }

  private definir(id: string): void {
    this.valor.set(id);
    this.texto.set(this.nomeDe(id));
    this.termo.set('');
    this.aoMudar(id);
  }
}

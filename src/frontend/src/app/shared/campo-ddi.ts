import { Component, Input, forwardRef } from '@angular/core';
import { ControlValueAccessor, FormControl, NG_VALUE_ACCESSOR, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';

export interface PaisDdi {
  /** ISO 3166-1 alfa-2 em minúsculas (nome do SVG do flag-icons). */
  iso: string;
  nome: string;
  /** Só dígitos. */
  codigo: string;
}

/** Países oferecidos; o primeiro de cada código é o escolhido ao ler um valor salvo. */
export const PAISES_DDI: PaisDdi[] = [
  { iso: 'br', nome: 'Brasil', codigo: '55' },
  { iso: 'pt', nome: 'Portugal', codigo: '351' },
  { iso: 'us', nome: 'Estados Unidos', codigo: '1' },
  { iso: 'ca', nome: 'Canadá', codigo: '1' },
  { iso: 'ar', nome: 'Argentina', codigo: '54' },
  { iso: 'uy', nome: 'Uruguai', codigo: '598' },
  { iso: 'py', nome: 'Paraguai', codigo: '595' },
  { iso: 'cl', nome: 'Chile', codigo: '56' },
  { iso: 'bo', nome: 'Bolívia', codigo: '591' },
  { iso: 'pe', nome: 'Peru', codigo: '51' },
  { iso: 'co', nome: 'Colômbia', codigo: '57' },
  { iso: 've', nome: 'Venezuela', codigo: '58' },
  { iso: 'ec', nome: 'Equador', codigo: '593' },
  { iso: 'mx', nome: 'México', codigo: '52' },
  { iso: 'es', nome: 'Espanha', codigo: '34' },
  { iso: 'it', nome: 'Itália', codigo: '39' },
  { iso: 'fr', nome: 'França', codigo: '33' },
  { iso: 'de', nome: 'Alemanha', codigo: '49' },
  { iso: 'gb', nome: 'Reino Unido', codigo: '44' },
  { iso: 'ie', nome: 'Irlanda', codigo: '353' },
  { iso: 'nl', nome: 'Países Baixos', codigo: '31' },
  { iso: 'be', nome: 'Bélgica', codigo: '32' },
  { iso: 'ch', nome: 'Suíça', codigo: '41' },
  { iso: 'at', nome: 'Áustria', codigo: '43' },
  { iso: 'se', nome: 'Suécia', codigo: '46' },
  { iso: 'no', nome: 'Noruega', codigo: '47' },
  { iso: 'dk', nome: 'Dinamarca', codigo: '45' },
  { iso: 'pl', nome: 'Polônia', codigo: '48' },
  { iso: 'ao', nome: 'Angola', codigo: '244' },
  { iso: 'mz', nome: 'Moçambique', codigo: '258' },
  { iso: 'cv', nome: 'Cabo Verde', codigo: '238' },
  { iso: 'za', nome: 'África do Sul', codigo: '27' },
  { iso: 'il', nome: 'Israel', codigo: '972' },
  { iso: 'ae', nome: 'Emirados Árabes', codigo: '971' },
  { iso: 'jp', nome: 'Japão', codigo: '81' },
  { iso: 'cn', nome: 'China', codigo: '86' },
  { iso: 'kr', nome: 'Coreia do Sul', codigo: '82' },
  { iso: 'in', nome: 'Índia', codigo: '91' },
  { iso: 'au', nome: 'Austrália', codigo: '61' },
  { iso: 'nz', nome: 'Nova Zelândia', codigo: '64' },
];

/** Converte o valor salvo ('+55', '55', '') na sigla do país; vazio vira Brasil. Desconhecido devolve nulo. */
export function paisDoDdi(valor: string | null | undefined): string | null {
  const digitos = (valor ?? '').replace(/\D/g, '');
  if (!digitos) return 'br';
  return PAISES_DDI.find((p) => p.codigo === digitos)?.iso ?? null;
}

/**
 * DDI com bandeira (lista fechada), ligado a uma string no formulário.
 * `comMais` define o formato gravado: '+55' (padrão) ou '55'. Sem valor, abre em Brasil +55.
 */
@Component({
  selector: 'app-campo-ddi',
  imports: [ReactiveFormsModule, MatFormFieldModule, MatSelectModule],
  providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => CampoDdiComponent), multi: true }],
  styles: `
    :host { display: block; width: 112px; flex: none; }
    .fi { display: inline-block; width: 20px; height: 15px; background: center / cover no-repeat; border-radius: 2px; margin-right: 6px; vertical-align: -2px; box-shadow: 0 0 0 1px rgb(0 0 0 / 0.08); }
    ::ng-deep .painel-ddi .mat-mdc-option .fi { display: inline-block; width: 20px; height: 15px; background: center / cover no-repeat; border-radius: 2px; margin-right: 8px; vertical-align: -2px; box-shadow: 0 0 0 1px rgb(0 0 0 / 0.08); }
    ::ng-deep .painel-ddi .codigo { color: var(--mat-sys-on-surface-variant); margin-left: 6px; }
  `,
  template: `
    @if (rotulo) { <mat-label class="font-semibold mb-2 block">{{ rotulo }}</mat-label> }
    <mat-form-field appearance="outline" class="w-full">
      <mat-select [formControl]="controle" [aria-label]="ariaLabel || rotulo || 'DDI'" panelWidth="260px" panelClass="painel-ddi">
        <mat-select-trigger>
          @if (selecionado(); as p) { <span class="fi" [style.background-image]="bandeira(p.iso)"></span>+{{ p.codigo }} } @else { +{{ desconhecido }} }
        </mat-select-trigger>
        @if (desconhecido) { <mat-option value="">+{{ desconhecido }}</mat-option> }
        @for (p of paises; track p.iso) {
          <mat-option [value]="p.iso"><span class="fi" [style.background-image]="bandeira(p.iso)"></span>{{ p.nome }}<span class="codigo">+{{ p.codigo }}</span></mat-option>
        }
      </mat-select>
    </mat-form-field>
  `,
})
export class CampoDdiComponent implements ControlValueAccessor {
  @Input() rotulo = '';
  @Input() ariaLabel = '';
  @Input() comMais = true;

  protected readonly paises = PAISES_DDI;
  protected readonly controle = new FormControl<string>('br', { nonNullable: true });
  /** Código salvo que não está na lista (mantido para não perder o dado). */
  protected desconhecido = '';

  private propagar: (valor: string) => void = () => undefined;
  private tocado: () => void = () => undefined;

  constructor() {
    this.controle.valueChanges.subscribe((iso) => {
      const pais = PAISES_DDI.find((p) => p.iso === iso);
      this.propagar(this.formatar(pais?.codigo ?? this.desconhecido));
      this.tocado();
    });
  }

  /** SVGs do flag-icons (4x3) copiados para /bandeiras no build. */
  protected bandeira(iso: string): string {
    return `url(/bandeiras/${iso}.svg)`;
  }

  protected selecionado(): PaisDdi | undefined {
    return PAISES_DDI.find((p) => p.iso === this.controle.value);
  }

  writeValue(valor: string | null): void {
    const iso = paisDoDdi(valor);
    this.desconhecido = iso ? '' : (valor ?? '').replace(/\D/g, '');
    this.controle.setValue(iso ?? '', { emitEvent: false });
    if (!(valor ?? '').replace(/\D/g, '')) {
      // Sem DDI salvo: abre em Brasil e grava +55.
      queueMicrotask(() => this.propagar(this.formatar('55')));
    }
  }

  registerOnChange(fn: (valor: string) => void): void {
    this.propagar = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.tocado = fn;
  }

  setDisabledState(desabilitado: boolean): void {
    if (desabilitado) this.controle.disable({ emitEvent: false });
    else this.controle.enable({ emitEvent: false });
  }

  private formatar(codigo: string): string {
    return this.comMais ? `+${codigo}` : codigo;
  }
}

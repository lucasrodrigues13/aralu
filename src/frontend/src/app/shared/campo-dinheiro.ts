import { Component, Input, forwardRef } from '@angular/core';
import { ControlValueAccessor, FormControl, NG_VALUE_ACCESSOR, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { aplicarDinheiro, dinheiroParaNumero, numeroParaDinheiro } from './mascaras';

/** Campo monetário em reais, com duas casas separadas por vírgula. O formulário guarda `number | null`. */
@Component({
  selector: 'app-campo-dinheiro',
  imports: [ReactiveFormsModule, MatFormFieldModule, MatInputModule],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => CampoDinheiroComponent),
      multi: true,
    },
  ],
  template: `
    <mat-form-field appearance="outline">
      <mat-label>{{ rotulo }}</mat-label>
      <span matTextPrefix>R$&nbsp;</span>
      <input
        matInput
        [formControl]="controle"
        inputmode="decimal"
        autocomplete="off"
        (blur)="tocado()"
      />
    </mat-form-field>
  `,
  styles: `:host { display: block; width: 100%; }`,
})
export class CampoDinheiroComponent implements ControlValueAccessor {
  @Input() rotulo = 'Valor';

  protected readonly controle = new FormControl('', { nonNullable: true });

  private propagar: (valor: number | null) => void = () => undefined;
  private tocadoCallback: () => void = () => undefined;
  private sincronizando = false;

  constructor() {
    this.controle.valueChanges.subscribe((valor) => {
      if (this.sincronizando) {
        return;
      }

      const mascarado = aplicarDinheiro(valor ?? '');
      if (mascarado !== valor) {
        this.sincronizando = true;
        this.controle.setValue(mascarado, { emitEvent: false });
        this.sincronizando = false;
      }

      this.propagar(dinheiroParaNumero(mascarado));
    });
  }

  writeValue(valor: number | string | null): void {
    const texto = typeof valor === 'number' ? numeroParaDinheiro(valor) : aplicarDinheiro(valor ?? '');
    this.sincronizando = true;
    this.controle.setValue(texto, { emitEvent: false });
    this.sincronizando = false;
  }

  registerOnChange(fn: (valor: number | null) => void): void {
    this.propagar = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.tocadoCallback = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    if (isDisabled) {
      this.controle.disable({ emitEvent: false });
    } else {
      this.controle.enable({ emitEvent: false });
    }
  }

  protected tocado(): void {
    this.tocadoCallback();
  }
}

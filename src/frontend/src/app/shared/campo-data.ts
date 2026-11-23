import { Component, Input, forwardRef } from '@angular/core';
import { ControlValueAccessor, FormControl, NG_VALUE_ACCESSOR, ReactiveFormsModule } from '@angular/forms';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { mascararDataBr } from './data';

/** Campo de data pt-BR (`dd/MM/yyyy`) ligado a `Date | null` no formulário. */
@Component({
  selector: 'app-campo-data',
  imports: [ReactiveFormsModule, MatFormFieldModule, MatInputModule, MatDatepickerModule],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => CampoDataComponent),
      multi: true,
    },
  ],
  styles: `:host { display: block; min-width: 0; }`,
  template: `
    <div class="campo">
      @if (rotulo) { <mat-label class="font-semibold mb-2 block">{{ rotulo }}</mat-label> }
      <mat-form-field appearance="outline" class="w-full">
      <input
        matInput
        [matDatepicker]="picker"
        [formControl]="controle"
        placeholder="dd/mm/aaaa"
        inputmode="numeric"
        maxlength="10"
        autocomplete="off"
        (input)="mascarar($event)"
        [attr.aria-label]="ariaLabel || rotulo"
      />
      <mat-datepicker-toggle matIconSuffix [for]="picker" />
      <mat-datepicker #picker />
    </mat-form-field>
    </div>
  `,
})
export class CampoDataComponent implements ControlValueAccessor {
  @Input() rotulo = 'Data';
  @Input() ariaLabel = '';

  protected readonly controle = new FormControl<Date | null>(null);

  private propagar: (valor: Date | null) => void = () => undefined;
  private tocado: () => void = () => undefined;
  private sincronizando = false;

  constructor() {
    this.controle.valueChanges.subscribe((valor) => {
      if (this.sincronizando) {
        return;
      }
      this.propagar(valor);
      this.tocado();
    });
  }

  /**
   * Aplica `dd/mm/aaaa` enquanto a pessoa digita. Se o texto mudou, dispara outro `input`
   * para o datepicker ler o valor já mascarado (a segunda passada não muda nada e para aí).
   */
  protected mascarar(evento: Event): void {
    const campo = evento.target as HTMLInputElement;
    const apagando = (evento as InputEvent).inputType?.startsWith('delete') ?? false;
    const mascarado = apagando ? campo.value : mascararDataBr(campo.value);
    if (mascarado === campo.value) {
      return;
    }
    campo.value = mascarado;
    campo.setSelectionRange(mascarado.length, mascarado.length);
    campo.dispatchEvent(new Event('input', { bubbles: true }));
  }

  writeValue(valor: Date | null): void {
    this.sincronizando = true;
    this.controle.setValue(valor, { emitEvent: false });
    this.sincronizando = false;
  }

  registerOnChange(fn: (valor: Date | null) => void): void {
    this.propagar = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.tocado = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    if (isDisabled) {
      this.controle.disable({ emitEvent: false });
    } else {
      this.controle.enable({ emitEvent: false });
    }
  }
}

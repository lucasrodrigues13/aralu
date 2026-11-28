import { Component, Input, forwardRef } from '@angular/core';
import { ControlValueAccessor, FormControl, NG_VALUE_ACCESSOR, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { aplicarHora } from './mascaras';

/** Campo de hora em 24h (`HH:mm`), independente do relógio do sistema. */
@Component({
  selector: 'app-campo-hora',
  imports: [ReactiveFormsModule, MatFormFieldModule, MatInputModule],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => CampoHoraComponent),
      multi: true,
    },
  ],
  template: `
    <div class="campo">
      <mat-label class="font-semibold mb-2 block">{{ rotulo }}</mat-label>
      <mat-form-field appearance="outline" class="w-full">
      <input
        matInput
        [formControl]="controle"
        placeholder="hh:mm"
        inputmode="numeric"
        maxlength="5"
        autocomplete="off"
        (blur)="tocado()"
      />
    </mat-form-field>
    </div>
  `,
  styles: `:host { display: block; min-width: 0; }`,
})
export class CampoHoraComponent implements ControlValueAccessor {
  @Input() rotulo = 'Hora';

  protected readonly controle = new FormControl('', { nonNullable: true });

  private propagar: (valor: string) => void = () => undefined;
  private tocadoCallback: () => void = () => undefined;
  private sincronizando = false;

  constructor() {
    this.controle.valueChanges.subscribe((valor) => {
      if (this.sincronizando) {
        return;
      }

      const mascarado = aplicarHora(valor ?? '');
      if (mascarado !== valor) {
        this.sincronizando = true;
        this.controle.setValue(mascarado, { emitEvent: false });
        this.sincronizando = false;
      }

      this.propagar(mascarado);
    });
  }

  writeValue(valor: string | null): void {
    this.sincronizando = true;
    this.controle.setValue(aplicarHora(valor ?? ''), { emitEvent: false });
    this.sincronizando = false;
  }

  registerOnChange(fn: (valor: string) => void): void {
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

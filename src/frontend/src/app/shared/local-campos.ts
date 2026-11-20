import { Component, Input, inject } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { NegocioClient } from '../core/negocio.client';
import { MascaraDirective } from './mascara.directive';
import { aplicarMascara } from './mascaras';

export interface LocalFormValor {
  nome: string | null;
  pais: string | null;
  cep: string | null;
  endereco: string | null;
  numero: string | null;
  estado: string | null;
  cidade: string | null;
  bairro: string | null;
}

export function grupoLocal(fb: FormBuilder, inicial?: Partial<LocalFormValor> | null) {
  return fb.group({
    nome: inicial?.nome ?? '',
    pais: inicial?.pais ?? '',
    cep: aplicarMascara(inicial?.cep ?? '', 'cep'),
    endereco: inicial?.endereco ?? '',
    numero: inicial?.numero ?? '',
    estado: inicial?.estado ?? '',
    cidade: inicial?.cidade ?? '',
    bairro: inicial?.bairro ?? '',
  });
}

export function localPedido(valor: LocalFormValor): LocalFormValor {
  const limpo = (item: string | null) => {
    const texto = (item ?? '').trim();
    return texto ? texto : null;
  };

  return {
    nome: limpo(valor.nome),
    pais: limpo(valor.pais),
    cep: limpo(valor.cep),
    endereco: limpo(valor.endereco),
    numero: limpo(valor.numero),
    estado: limpo(valor.estado),
    cidade: limpo(valor.cidade),
    bairro: limpo(valor.bairro),
  };
}

/** Nome do local e endereço completo. O CEP consulta a API e preenche o restante. */
@Component({
  selector: 'app-local-campos',
  imports: [ReactiveFormsModule, MatFormFieldModule, MatInputModule, MascaraDirective],
  template: `
    @if (titulo) {
      <h2>{{ titulo }}</h2>
    }
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4" [formGroup]="grupo">
      <div class="campo">
        <mat-label class="font-semibold mb-2 block">Nome</mat-label>
        <mat-form-field appearance="outline" class="w-full"><input [attr.aria-label]="'Nome'" matInput formControlName="nome" /></mat-form-field>
      </div>
      <div class="campo">
        <mat-label class="font-semibold mb-2 block">CEP</mat-label>
        <mat-form-field appearance="outline" class="w-full">
        <input [attr.aria-label]="'CEP'" matInput formControlName="cep" gdMascara="cep" (blur)="buscar()" />
      </mat-form-field>
      </div>
      <div class="campo">
        <mat-label class="font-semibold mb-2 block">País</mat-label>
        <mat-form-field appearance="outline" class="w-full"><input [attr.aria-label]="'País'" matInput formControlName="pais" /></mat-form-field>
      </div>
      <div class="campo">
        <mat-label class="font-semibold mb-2 block">Endereço</mat-label>
        <mat-form-field appearance="outline" class="w-full"><input [attr.aria-label]="'Endereço'" matInput formControlName="endereco" /></mat-form-field>
      </div>
      <div class="campo">
        <mat-label class="font-semibold mb-2 block">Número</mat-label>
        <mat-form-field appearance="outline" class="w-full"><input [attr.aria-label]="'Número'" matInput formControlName="numero" /></mat-form-field>
      </div>
      <div class="campo">
        <mat-label class="font-semibold mb-2 block">Estado</mat-label>
        <mat-form-field appearance="outline" class="w-full"><input [attr.aria-label]="'Estado'" matInput formControlName="estado" /></mat-form-field>
      </div>
      <div class="campo">
        <mat-label class="font-semibold mb-2 block">Cidade</mat-label>
        <mat-form-field appearance="outline" class="w-full"><input [attr.aria-label]="'Cidade'" matInput formControlName="cidade" /></mat-form-field>
      </div>
      <div class="campo">
        <mat-label class="font-semibold mb-2 block">Bairro</mat-label>
        <mat-form-field appearance="outline" class="w-full"><input [attr.aria-label]="'Bairro'" matInput formControlName="bairro" /></mat-form-field>
      </div>
    </div>
  `,
  styles: `
    :host { display: block; }
    h2 { margin: 0 0 12px; font-size: 14px; font-weight: 600; }
  `,
})
export class LocalCamposComponent {
  private readonly negocio = inject(NegocioClient);

  @Input() titulo = '';
  @Input({ required: true }) grupo!: FormGroup;

  protected buscar(): void {
    const digitos = String(this.grupo.get('cep')?.value ?? '').replace(/\D/g, '');
    if (digitos.length !== 8) {
      return;
    }

    this.negocio.cep(digitos).subscribe({
      next: (endereco) => {
        this.grupo.patchValue({
          pais: endereco.pais || 'Brasil',
          endereco: endereco.endereco,
          estado: endereco.estado,
          cidade: endereco.cidade,
          bairro: endereco.bairro,
        });
      },
      error: () => undefined,
    });
  }
}

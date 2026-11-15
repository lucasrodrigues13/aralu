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
    <div [formGroup]="grupo">
      <mat-form-field appearance="outline"><mat-label>Nome</mat-label><input matInput formControlName="nome" /></mat-form-field>
      <mat-form-field appearance="outline">
        <mat-label>CEP</mat-label>
        <input matInput formControlName="cep" gdMascara="cep" (blur)="buscar()" />
      </mat-form-field>
      <mat-form-field appearance="outline"><mat-label>País</mat-label><input matInput formControlName="pais" /></mat-form-field>
      <mat-form-field appearance="outline"><mat-label>Endereço</mat-label><input matInput formControlName="endereco" /></mat-form-field>
      <mat-form-field appearance="outline"><mat-label>Número</mat-label><input matInput formControlName="numero" /></mat-form-field>
      <mat-form-field appearance="outline"><mat-label>Estado</mat-label><input matInput formControlName="estado" /></mat-form-field>
      <mat-form-field appearance="outline"><mat-label>Cidade</mat-label><input matInput formControlName="cidade" /></mat-form-field>
      <mat-form-field appearance="outline"><mat-label>Bairro</mat-label><input matInput formControlName="bairro" /></mat-form-field>
    </div>
  `,
  styles: `
    :host { display: block; }
    h2 { margin: 8px 0 0; font-size: 1rem; }
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

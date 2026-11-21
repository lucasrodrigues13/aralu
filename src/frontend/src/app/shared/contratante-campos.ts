import { Component, Input, inject } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { DadosContratante, ESTADOS_CIVIS, NegocioClient } from '../core/negocio.client';
import { CampoDataComponent } from './campo-data';
import { deDataParaIso, deIsoParaData } from './data';
import { MascaraDirective } from './mascara.directive';
import { aplicarMascara } from './mascaras';

/** Formulário dos dados do contratante (quem assina o contrato), SPEC-049. */
export function grupoContratante(fb: FormBuilder, inicial?: Partial<DadosContratante> | null) {
  return fb.nonNullable.group({
    nome: inicial?.nome ?? '',
    documento: aplicarMascara(inicial?.documento ?? '', 'documento'),
    nascimento: fb.control<Date | null>(deIsoParaData(inicial?.nascimento)),
    profissao: inicial?.profissao ?? '',
    estadoCivil: inicial?.estadoCivil ?? '',
    nacionalidade: inicial?.nacionalidade ?? '',
    email: inicial?.email ?? '',
    celular: aplicarMascara(inicial?.celular ?? '', 'celular'),
    cep: aplicarMascara(inicial?.cep ?? '', 'cep'),
    endereco: inicial?.endereco ?? '',
    numero: inicial?.numero ?? '',
    bairro: inicial?.bairro ?? '',
    cidade: inicial?.cidade ?? '',
    estado: inicial?.estado ?? '',
    complemento: inicial?.complemento ?? '',
    pais: inicial?.pais ?? '',
  });
}

export type ContratanteForm = ReturnType<typeof grupoContratante>;

/** Pedido da API: texto vazio vira nulo e a data vira yyyy-MM-dd. */
export function contratantePedido(grupo: ContratanteForm): DadosContratante {
  const v = grupo.getRawValue();
  const texto = (valor: string) => valor.trim() || null;
  return {
    nome: texto(v.nome),
    documento: texto(v.documento),
    nascimento: deDataParaIso(v.nascimento),
    profissao: texto(v.profissao),
    estadoCivil: texto(v.estadoCivil),
    nacionalidade: texto(v.nacionalidade),
    email: texto(v.email),
    celular: texto(v.celular),
    cep: texto(v.cep),
    endereco: texto(v.endereco),
    numero: texto(v.numero),
    bairro: texto(v.bairro),
    cidade: texto(v.cidade),
    estado: texto(v.estado),
    complemento: texto(v.complemento),
    pais: texto(v.pais),
  };
}

/** Campos do contratante. Com `consultarCep`, o CEP preenche o endereço (só na área logada). */
@Component({
  selector: 'app-contratante-campos',
  imports: [ReactiveFormsModule, MatFormFieldModule, MatInputModule, MatSelectModule, MascaraDirective, CampoDataComponent],
  styles: `:host { display: block; }`,
  template: `
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4" [formGroup]="grupo">
      <div class="campo sm:col-span-2">
        <mat-label class="font-semibold mb-2 block">Nome completo{{ marca }}</mat-label>
        <mat-form-field appearance="outline" class="w-full"><input aria-label="Nome completo do contratante" matInput formControlName="nome" autocomplete="name" /></mat-form-field>
      </div>
      <div class="campo">
        <mat-label class="font-semibold mb-2 block">CPF/CNPJ{{ marca }}</mat-label>
        <mat-form-field appearance="outline" class="w-full"><input aria-label="CPF/CNPJ" matInput formControlName="documento" gdMascara="documento" /></mat-form-field>
      </div>
      <app-campo-data rotulo="Nascimento" formControlName="nascimento" />
      <div class="campo">
        <mat-label class="font-semibold mb-2 block">Estado civil{{ marca }}</mat-label>
        <mat-form-field appearance="outline" class="w-full">
          <mat-select aria-label="Estado civil" formControlName="estadoCivil">
            <mat-option [value]="''">—</mat-option>
            @for (e of estadosCivis; track e) { <mat-option [value]="e">{{ e }}</mat-option> }
          </mat-select>
        </mat-form-field>
      </div>
      <div class="campo">
        <mat-label class="font-semibold mb-2 block">Nacionalidade{{ marca }}</mat-label>
        <mat-form-field appearance="outline" class="w-full"><input aria-label="Nacionalidade" matInput formControlName="nacionalidade" placeholder="Ex.: brasileira" /></mat-form-field>
      </div>
      <div class="campo">
        <mat-label class="font-semibold mb-2 block">Profissão</mat-label>
        <mat-form-field appearance="outline" class="w-full"><input aria-label="Profissão" matInput formControlName="profissao" /></mat-form-field>
      </div>
      <div class="campo">
        <mat-label class="font-semibold mb-2 block">E-mail{{ marca }}</mat-label>
        <mat-form-field appearance="outline" class="w-full"><input aria-label="E-mail do contratante" matInput type="email" formControlName="email" autocomplete="email" /></mat-form-field>
      </div>
      <div class="campo">
        <mat-label class="font-semibold mb-2 block">Celular{{ marca }}</mat-label>
        <mat-form-field appearance="outline" class="w-full"><input aria-label="Celular do contratante" matInput formControlName="celular" gdMascara="celular" autocomplete="tel" /></mat-form-field>
      </div>
      <div class="campo">
        <mat-label class="font-semibold mb-2 block">CEP{{ marca }}</mat-label>
        <mat-form-field appearance="outline" class="w-full"><input aria-label="CEP do contratante" matInput formControlName="cep" gdMascara="cep" (blur)="buscarCep()" /></mat-form-field>
      </div>
      <div class="campo">
        <mat-label class="font-semibold mb-2 block">País</mat-label>
        <mat-form-field appearance="outline" class="w-full"><input aria-label="País do contratante" matInput formControlName="pais" /></mat-form-field>
      </div>
      <div class="campo">
        <mat-label class="font-semibold mb-2 block">Endereço{{ marca }}</mat-label>
        <mat-form-field appearance="outline" class="w-full"><input aria-label="Endereço do contratante" matInput formControlName="endereco" /></mat-form-field>
      </div>
      <div class="campo">
        <mat-label class="font-semibold mb-2 block">Número{{ marca }}</mat-label>
        <mat-form-field appearance="outline" class="w-full"><input aria-label="Número do endereço do contratante" matInput formControlName="numero" /></mat-form-field>
      </div>
      <div class="campo">
        <mat-label class="font-semibold mb-2 block">Complemento</mat-label>
        <mat-form-field appearance="outline" class="w-full"><input aria-label="Complemento do contratante" matInput formControlName="complemento" /></mat-form-field>
      </div>
      <div class="campo">
        <mat-label class="font-semibold mb-2 block">Bairro{{ marca }}</mat-label>
        <mat-form-field appearance="outline" class="w-full"><input aria-label="Bairro do contratante" matInput formControlName="bairro" /></mat-form-field>
      </div>
      <div class="campo">
        <mat-label class="font-semibold mb-2 block">Cidade{{ marca }}</mat-label>
        <mat-form-field appearance="outline" class="w-full"><input aria-label="Cidade do contratante" matInput formControlName="cidade" /></mat-form-field>
      </div>
      <div class="campo">
        <mat-label class="font-semibold mb-2 block">Estado{{ marca }}</mat-label>
        <mat-form-field appearance="outline" class="w-full"><input aria-label="Estado do contratante" matInput formControlName="estado" /></mat-form-field>
      </div>
    </div>
  `,
})
export class ContratanteCamposComponent {
  private readonly negocio = inject(NegocioClient);
  @Input({ required: true }) grupo!: FormGroup;
  /** Mostra o asterisco nos campos que o contrato exige. */
  @Input() obrigatorios = false;
  /** O CEP consulta a API (exige login: fica desligado na tela pública). */
  @Input() consultarCep = true;
  protected readonly estadosCivis = ESTADOS_CIVIS;

  protected get marca(): string {
    return this.obrigatorios ? ' *' : '';
  }

  protected buscarCep(): void {
    if (!this.consultarCep) return;
    const digitos = String(this.grupo.controls['cep'].value ?? '').replace(/\D/g, '');
    if (digitos.length !== 8) return;
    this.negocio.cep(digitos).subscribe({
      next: (e) =>
        this.grupo.patchValue({
          pais: e.pais || 'Brasil',
          endereco: e.endereco,
          estado: e.estado,
          cidade: e.cidade,
          bairro: e.bairro,
        }),
      error: () => undefined,
    });
  }
}

/** Preenche o formulário com o que a API já tem (aplica as máscaras e a data). */
export function preencherContratante(grupo: ContratanteForm, dados: Partial<DadosContratante> | null | undefined): void {
  if (!dados) return;
  grupo.patchValue({
    nome: dados.nome ?? '',
    documento: aplicarMascara(dados.documento ?? '', 'documento'),
    nascimento: deIsoParaData(dados.nascimento),
    profissao: dados.profissao ?? '',
    estadoCivil: dados.estadoCivil ?? '',
    nacionalidade: dados.nacionalidade ?? '',
    email: dados.email ?? '',
    celular: aplicarMascara(dados.celular ?? '', 'celular'),
    cep: aplicarMascara(dados.cep ?? '', 'cep'),
    endereco: dados.endereco ?? '',
    numero: dados.numero ?? '',
    bairro: dados.bairro ?? '',
    cidade: dados.cidade ?? '',
    estado: dados.estado ?? '',
    complemento: dados.complemento ?? '',
    pais: dados.pais ?? '',
  });
}

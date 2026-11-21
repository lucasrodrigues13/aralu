import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatTabsModule } from '@angular/material/tabs';
import { mensagemDeErro } from '../../core/mensagem-erro';
import { Cliente, ESTADOS_CIVIS, NegocioClient, PAPEIS, ROTULO_PAPEL } from '../../core/negocio.client';
import { ToastService } from '../../core/toast.service';
import { CampoDataComponent } from '../../shared/campo-data';
import { deDataParaIso, deIsoParaData } from '../../shared/data';
import { MascaraDirective } from '../../shared/mascara.directive';
import { aplicarMascara } from '../../shared/mascaras';

@Component({
  selector: 'app-cliente-form',
  imports: [ReactiveFormsModule, MatDialogModule, MatButtonModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatTabsModule, MatSlideToggleModule, MatCheckboxModule, MascaraDirective, CampoDataComponent],
  template: `
    <h2 mat-dialog-title>{{ edicao ? 'Editar cliente' : 'Novo cliente' }}</h2>
    <mat-dialog-content>
      <form id="cliente-form" class="grid grid-cols-1 gap-4" [formGroup]="formulario" (ngSubmit)="salvar()">
        <mat-tab-group>
          <mat-tab label="Dados pessoais">
            <div class="campo">
              <mat-label class="font-semibold mb-2 block">Nome completo</mat-label>
              <mat-form-field appearance="outline" class="w-full"><input [attr.aria-label]="'Nome completo'" matInput formControlName="nome" /></mat-form-field>
            </div>
            <div class="campo">
              <mat-label class="font-semibold mb-2 block">Papel</mat-label>
              <mat-form-field appearance="outline" class="w-full">
              <mat-select [attr.aria-label]="'Papel'" formControlName="papel">
                @for (papel of papeis; track papel) { <mat-option [value]="papel">{{ rotulo(papel) }}</mat-option> }
              </mat-select>
            </mat-form-field>
            </div>
            <app-campo-data rotulo="Nascimento" formControlName="nascimento" />
            <div class="campo">
              <mat-label class="font-semibold mb-2 block">E-mail</mat-label>
              <mat-form-field appearance="outline" class="w-full"><input [attr.aria-label]="'E-mail'" matInput type="email" formControlName="email" /></mat-form-field>
            </div>
            <div class="campo">
              <mat-label class="font-semibold mb-2 block">DDI</mat-label>
              <mat-form-field appearance="outline" class="w-full"><input [attr.aria-label]="'DDI'" matInput formControlName="ddi" /></mat-form-field>
            </div>
            <div class="campo">
              <mat-label class="font-semibold mb-2 block">Celular</mat-label>
              <mat-form-field appearance="outline" class="w-full"><input [attr.aria-label]="'Celular'" matInput formControlName="celular" gdMascara="celular" /></mat-form-field>
            </div>
            <div class="campo">
              <mat-label class="font-semibold mb-2 block">Telefone fixo</mat-label>
              <mat-form-field appearance="outline" class="w-full"><input [attr.aria-label]="'Telefone fixo'" matInput formControlName="telefoneFixo" gdMascara="telefone" /></mat-form-field>
            </div>
            <div class="campo">
              <mat-label class="font-semibold mb-2 block">CPF/CNPJ</mat-label>
              <mat-form-field appearance="outline" class="w-full"><input [attr.aria-label]="'CPF/CNPJ'" matInput formControlName="documento" gdMascara="documento" /></mat-form-field>
            </div>
            <div class="campo">
              <mat-label class="font-semibold mb-2 block">Profissão</mat-label>
              <mat-form-field appearance="outline" class="w-full"><input [attr.aria-label]="'Profissão'" matInput formControlName="profissao" /></mat-form-field>
            </div>
            <div class="campo">
              <mat-label class="font-semibold mb-2 block">Estado civil</mat-label>
              <mat-form-field appearance="outline" class="w-full">
                <mat-select [attr.aria-label]="'Estado civil'" formControlName="estadoCivil">
                  <mat-option [value]="''">—</mat-option>
                  @for (e of estadosCivis; track e) { <mat-option [value]="e">{{ e }}</mat-option> }
                </mat-select>
              </mat-form-field>
            </div>
            <div class="campo">
              <mat-label class="font-semibold mb-2 block">Nacionalidade</mat-label>
              <mat-form-field appearance="outline" class="w-full"><input [attr.aria-label]="'Nacionalidade'" matInput formControlName="nacionalidade" /></mat-form-field>
            </div>
            <div class="campo">
              <mat-label class="font-semibold mb-2 block">Inscrição municipal</mat-label>
              <mat-form-field appearance="outline" class="w-full"><input [attr.aria-label]="'Inscrição municipal'" matInput formControlName="inscricaoMunicipal" /></mat-form-field>
            </div>
            <div class="campo">
              <mat-label class="font-semibold mb-2 block">Religião</mat-label>
              <mat-form-field appearance="outline" class="w-full"><input [attr.aria-label]="'Religião'" matInput formControlName="religiao" /></mat-form-field>
            </div>
            <div class="campo">
              <mat-label class="font-semibold mb-2 block">Observação</mat-label>
              <mat-form-field appearance="outline" class="w-full"><textarea [attr.aria-label]="'Observação'" matInput rows="2" formControlName="observacao"></textarea></mat-form-field>
            </div>
          </mat-tab>
          <mat-tab label="Redes">
            <div class="campo">
              <mat-label class="font-semibold mb-2 block">Facebook</mat-label>
              <mat-form-field appearance="outline" class="w-full"><input [attr.aria-label]="'Facebook'" matInput formControlName="facebook" /></mat-form-field>
            </div>
            <div class="campo">
              <mat-label class="font-semibold mb-2 block">Instagram</mat-label>
              <mat-form-field appearance="outline" class="w-full"><input [attr.aria-label]="'Instagram'" matInput formControlName="instagram" /></mat-form-field>
            </div>
          </mat-tab>
          <mat-tab label="Endereço">
            <div class="campo">
              <mat-label class="font-semibold mb-2 block">CEP</mat-label>
              <mat-form-field appearance="outline" class="w-full"><input [attr.aria-label]="'CEP'" matInput formControlName="cep" gdMascara="cep" (blur)="completarCep()" /></mat-form-field>
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
            <div class="campo">
              <mat-label class="font-semibold mb-2 block">Complemento</mat-label>
              <mat-form-field appearance="outline" class="w-full"><input [attr.aria-label]="'Complemento'" matInput formControlName="complemento" /></mat-form-field>
            </div>
          </mat-tab>
          <mat-tab label="Acesso">
            <mat-slide-toggle formControlName="acessoPlataforma">Acesso à plataforma</mat-slide-toggle>
            <p class="text-muted">O cliente recebe link para definir a senha e entra com a role Client vinculada à sua conta.</p>
            <div formGroupName="permissoes" class="grid gap-1 mt-4">
              <mat-checkbox formControlName="convidados">Convidados</mat-checkbox>
              <mat-checkbox formControlName="tarefas">Tarefas</mat-checkbox>
              <mat-checkbox formControlName="anexos">Anexos</mat-checkbox>
              <mat-checkbox formControlName="parcelas">Parcelas</mat-checkbox>
              <mat-checkbox formControlName="rsvp">RSVP</mat-checkbox>
              <mat-checkbox formControlName="mapa">Mapa</mat-checkbox>
              <mat-checkbox formControlName="contrato">Contrato</mat-checkbox>
            </div>
          </mat-tab>
        </mat-tab-group>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-stroked-button type="button" (click)="ref.close()">Cancelar</button>
      <button mat-flat-button type="submit" form="cliente-form">Salvar</button>
    </mat-dialog-actions>
  `,
  styles: `
    mat-slide-toggle { display: block; margin-top: 0.5rem; }
  `,
})
export class ClienteFormDialog {
  /** Cliente para editar, ou dados parciais (sem id) para pré-preencher um cliente novo. */
  protected readonly dados = inject<Partial<Cliente> | null>(MAT_DIALOG_DATA);
  protected readonly edicao = !!this.dados?.id;
  protected readonly ref = inject(MatDialogRef<ClienteFormDialog, Cliente>);
  private readonly fb = inject(FormBuilder);
  private readonly negocio = inject(NegocioClient);
  private readonly toast = inject(ToastService);
  protected readonly papeis = PAPEIS;
  protected readonly estadosCivis = ESTADOS_CIVIS;
  protected readonly formulario = this.fb.nonNullable.group({
    nome: [this.dados?.nome ?? '', Validators.required],
    papel: [this.edicao ? (this.dados?.papel ?? '') : (this.dados?.papel ?? 'Noiva'), Validators.required],
    nascimento: this.fb.control<Date | null>(deIsoParaData(this.dados?.nascimento)),
    email: [this.dados?.email ?? '', Validators.required],
    ddi: this.dados?.ddi ?? '+55',
    celular: [aplicarMascara(this.dados?.celular ?? '', 'celular'), Validators.required],
    telefoneFixo: aplicarMascara(this.dados?.telefoneFixo ?? '', 'telefone'),
    documento: aplicarMascara(this.dados?.documento ?? '', 'documento'),
    profissao: this.dados?.profissao ?? '',
    estadoCivil: this.dados?.estadoCivil ?? '',
    nacionalidade: this.dados?.nacionalidade ?? '',
    inscricaoMunicipal: this.dados?.inscricaoMunicipal ?? '',
    religiao: this.dados?.religiao ?? '',
    observacao: this.dados?.observacao ?? '',
    facebook: this.dados?.facebook ?? '',
    instagram: this.dados?.instagram ?? '',
    pais: this.dados?.pais ?? '',
    cep: aplicarMascara(this.dados?.cep ?? '', 'cep'),
    endereco: this.dados?.endereco ?? '',
    numero: this.dados?.numero ?? '',
    estado: this.dados?.estado ?? '',
    cidade: this.dados?.cidade ?? '',
    bairro: this.dados?.bairro ?? '',
    complemento: this.dados?.complemento ?? '',
    acessoPlataforma: this.dados?.acessoPlataforma ?? false,
    permissoes: this.fb.nonNullable.group({
      convidados: this.dados?.permissoes?.convidados ?? false,
      tarefas: this.dados?.permissoes?.tarefas ?? false,
      anexos: this.dados?.permissoes?.anexos ?? false,
      parcelas: this.dados?.permissoes?.parcelas ?? false,
      rsvp: this.dados?.permissoes?.rsvp ?? false,
      mapa: this.dados?.permissoes?.mapa ?? false,
      contrato: this.dados?.permissoes?.contrato ?? false,
    }),
  });

  protected rotulo(papel: string | null): string {
    return papel ? (ROTULO_PAPEL[papel] ?? papel) : 'Sem papel';
  }

  protected completarCep(): void {
    const digitos = this.formulario.controls.cep.value.replace(/\D/g, '');
    if (digitos.length !== 8) {
      return;
    }
    this.negocio.cep(digitos).subscribe({
      next: (endereco) => this.formulario.patchValue({
        pais: endereco.pais || 'Brasil',
        endereco: endereco.endereco,
        estado: endereco.estado,
        cidade: endereco.cidade,
        bairro: endereco.bairro,
      }),
      error: () => undefined,
    });
  }

  protected salvar(): void {
    if (this.formulario.invalid) {
      this.formulario.markAllAsTouched();
      this.toast.erro('Confira os campos obrigatórios.');
      return;
    }
    const valor = this.formulario.getRawValue();
    const pedido = {
      ...valor,
      nascimento: deDataParaIso(valor.nascimento),
    };
    const id = this.dados?.id;
    const destino = id
      ? this.negocio.atualizarCliente(id, pedido)
      : this.negocio.criarCliente(pedido);
    destino.subscribe({
      next: (cliente) => {
        this.toast.sucesso(id ? 'Cliente atualizado.' : 'Cliente criado.');
        this.ref.close(cliente);
      },
      error: (erro: unknown) => this.toast.erro(mensagemDeErro(erro)),
    });
  }
}

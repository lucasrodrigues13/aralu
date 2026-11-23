import { Component, DestroyRef, ElementRef, inject, OnInit, signal, viewChild } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { mensagemDeErro } from '../../core/mensagem-erro';
import { NegocioClient, Perfil } from '../../core/negocio.client';
import { ToastService } from '../../core/toast.service';
import { CampoDataComponent } from '../../shared/campo-data';
import { deDataParaIso, deIsoParaData } from '../../shared/data';
import { MascaraDirective } from '../../shared/mascara.directive';
import { aplicarMascara } from '../../shared/mascaras';

@Component({
  selector: 'app-perfil',
  imports: [ReactiveFormsModule, MatCardModule, MatFormFieldModule, MatInputModule, MatButtonModule, MatIconModule, MascaraDirective, CampoDataComponent],
  template: `
    <form [formGroup]="formulario" (ngSubmit)="salvar()">
      <div class="grid grid-cols-12 gap-6">
        <div class="col-span-12 lg:col-span-6">
          <mat-card class="cardWithShadow h-full">
            <mat-card-content class="flex items-center gap-6 h-full">
              @if (preview()) {
                <img [src]="preview()" alt="Foto do perfil" class="size-24 shrink-0 rounded-full object-cover" />
              } @else {
                <span class="size-24 shrink-0 rounded-full bg-light-primary text-primary flex items-center justify-center">
                  <mat-icon class="text-5xl! size-12!">apartment</mat-icon>
                </span>
              }
              <div class="flex flex-col gap-3 min-w-0">
                @if (nomeCurto()) {
                  <h5 class="text-base font-semibold truncate">{{ nomeCurto() }}</h5>
                }
                <div class="flex gap-3">
                  @if (preview()) {
                    <button mat-flat-button type="button" (click)="escolherFoto()">Alterar</button>
                    <button mat-stroked-button type="button" (click)="removerFoto()">Remover</button>
                  } @else {
                    <button mat-stroked-button type="button" (click)="escolherFoto()">Enviar foto</button>
                  }
                </div>
              </div>
              <input
                #arquivo
                hidden
                type="file"
                accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
                (change)="enviarFoto($event)"
              />
            </mat-card-content>
          </mat-card>
        </div>

        <div class="col-span-12 lg:col-span-6">
          <mat-card class="cardWithShadow h-full">
            <div class="p-6"><mat-card-title class="mb-0">Recebimentos</mat-card-title></div>
            <mat-card-content class="border-t border-border">
              <div class="campo">
                <mat-label class="font-semibold mb-2 block">Chave Pix</mat-label>
                <mat-form-field appearance="outline" class="w-full">
                  <input aria-label="Chave Pix" matInput formControlName="chavePix" maxlength="140" placeholder="CPF, CNPJ, e-mail, celular ou chave aleatória" />
                  <mat-hint>Vai junto na mensagem de "Cobrar" do Dinheiro do evento.</mat-hint>
                </mat-form-field>
              </div>
            </mat-card-content>
          </mat-card>
        </div>

        <div class="col-span-12 lg:col-span-6">
          <mat-card class="cardWithShadow h-full">
            <div class="p-6">
              <mat-card-title class="mb-0">Informações pessoais</mat-card-title>
              <mat-card-subtitle>Dados da assessoria.</mat-card-subtitle>
            </div>
            <mat-card-content class="border-t border-border">
              <div class="grid grid-cols-12 gap-x-6 gap-y-4">
                <div class="campo col-span-12 md:col-span-6">
                  <mat-label class="font-semibold mb-2 block">Nome da empresa</mat-label>
                  <mat-form-field appearance="outline" class="w-full">
                    <input aria-label="Nome da empresa" matInput formControlName="nomeEmpresa" placeholder="Ex.: Aralu Assessoria" />
                  </mat-form-field>
                </div>
                <div class="campo col-span-12 md:col-span-6">
                  <mat-label class="font-semibold mb-2 block">Responsável</mat-label>
                  <mat-form-field appearance="outline" class="w-full">
                    <input aria-label="Responsável" matInput formControlName="responsavel" />
                  </mat-form-field>
                </div>
                <div class="campo col-span-12">
                  <mat-label class="font-semibold mb-2 block">E-mail</mat-label>
                  <mat-form-field appearance="outline" class="w-full">
                    <input aria-label="E-mail" matInput [value]="email" readonly />
                  </mat-form-field>
                </div>
                <div class="campo col-span-12 md:col-span-6">
                  <mat-label class="font-semibold mb-2 block">CPF ou CNPJ</mat-label>
                  <mat-form-field appearance="outline" class="w-full">
                    <input aria-label="CPF ou CNPJ" matInput formControlName="documento" gdMascara="documento" />
                  </mat-form-field>
                </div>
                <div class="campo col-span-12 md:col-span-6">
                  <mat-label class="font-semibold mb-2 block">Celular</mat-label>
                  <mat-form-field appearance="outline" class="w-full">
                    <input aria-label="Celular" matInput formControlName="celular" gdMascara="celular" placeholder="(11) 90000-0000" />
                  </mat-form-field>
                </div>
                <app-campo-data class="col-span-12 md:col-span-6" rotulo="Nascimento" formControlName="nascimento" />
              </div>
            </mat-card-content>
          </mat-card>
        </div>

        <div class="col-span-12 lg:col-span-6">
          <mat-card class="cardWithShadow h-full">
            <div class="p-6"><mat-card-title class="mb-0">Endereço</mat-card-title></div>
            <mat-card-content class="border-t border-border">
              <div class="grid grid-cols-12 gap-x-6 gap-y-4">
                <div class="campo col-span-12 md:col-span-6">
                  <mat-label class="font-semibold mb-2 block">CEP</mat-label>
                  <mat-form-field appearance="outline" class="w-full">
                    <input aria-label="CEP" matInput formControlName="cep" gdMascara="cep" (blur)="completarCep()" />
                  </mat-form-field>
                </div>
                <div class="campo col-span-12 md:col-span-6">
                  <mat-label class="font-semibold mb-2 block">País</mat-label>
                  <mat-form-field appearance="outline" class="w-full">
                    <input aria-label="País" matInput formControlName="pais" />
                  </mat-form-field>
                </div>
                <div class="campo col-span-12 md:col-span-6">
                  <mat-label class="font-semibold mb-2 block">Endereço</mat-label>
                  <mat-form-field appearance="outline" class="w-full">
                    <input aria-label="Endereço" matInput formControlName="endereco" />
                  </mat-form-field>
                </div>
                <div class="campo col-span-12 md:col-span-6">
                  <mat-label class="font-semibold mb-2 block">Número</mat-label>
                  <mat-form-field appearance="outline" class="w-full">
                    <input aria-label="Número" matInput formControlName="numero" />
                  </mat-form-field>
                </div>
                <div class="campo col-span-12 md:col-span-6">
                  <mat-label class="font-semibold mb-2 block">Complemento</mat-label>
                  <mat-form-field appearance="outline" class="w-full">
                    <input aria-label="Complemento" matInput formControlName="complemento" />
                  </mat-form-field>
                </div>
                <div class="campo col-span-12 md:col-span-6">
                  <mat-label class="font-semibold mb-2 block">Bairro</mat-label>
                  <mat-form-field appearance="outline" class="w-full">
                    <input aria-label="Bairro" matInput formControlName="bairro" />
                  </mat-form-field>
                </div>
                <div class="campo col-span-12 md:col-span-6">
                  <mat-label class="font-semibold mb-2 block">Cidade</mat-label>
                  <mat-form-field appearance="outline" class="w-full">
                    <input aria-label="Cidade" matInput formControlName="cidade" />
                  </mat-form-field>
                </div>
                <div class="campo col-span-12 md:col-span-6">
                  <mat-label class="font-semibold mb-2 block">Estado</mat-label>
                  <mat-form-field appearance="outline" class="w-full">
                    <input aria-label="Estado" matInput formControlName="estado" />
                  </mat-form-field>
                </div>
              </div>
            </mat-card-content>
          </mat-card>
        </div>

        <div class="col-span-12">
          <mat-card class="cardWithShadow">
            <mat-card-content class="flex justify-end gap-3 p-4!">
              <button mat-stroked-button type="button" (click)="cancelar()">Cancelar</button>
              <button mat-flat-button type="submit">Salvar</button>
            </mat-card-content>
          </mat-card>
        </div>
      </div>
    </form>
  `,
})
export class PerfilPage implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly negocio = inject(NegocioClient);
  private readonly toast = inject(ToastService);
  private readonly destruir = inject(DestroyRef);
  private readonly arquivo = viewChild<ElementRef<HTMLInputElement>>('arquivo');
  private fotoLocal: string | null = null;
  private gravado: Perfil | null = null;
  protected email = '';
  protected readonly preview = signal<string | null>(null);
  protected readonly formulario = this.fb.group({
    nomeEmpresa: '',
    responsavel: '',
    documento: '',
    celular: '',
    nascimento: this.fb.control<Date | null>(null),
    cep: '',
    pais: '',
    endereco: '',
    numero: '',
    complemento: '',
    bairro: '',
    cidade: '',
    estado: '',
    chavePix: '',
  });

  constructor() {
    this.destruir.onDestroy(() => this.soltarFoto());
  }

  ngOnInit(): void {
    this.negocio.perfil().subscribe({
      next: (perfil) => this.aplicar(perfil, true),
      error: (erro: unknown) => this.toast.erro(mensagemDeErro(erro)),
    });
  }

  protected nomeCurto(): string {
    const valor = this.formulario.getRawValue();
    return (valor.responsavel || valor.nomeEmpresa || '').trim();
  }

  protected escolherFoto(): void {
    this.arquivo()?.nativeElement.click();
  }

  protected enviarFoto(evento: Event): void {
    const entrada = evento.target as HTMLInputElement;
    const arquivo = entrada.files?.[0] ?? null;
    entrada.value = '';
    if (!arquivo) {
      return;
    }

    this.negocio.enviarFotoPerfil(arquivo).subscribe({
      next: () => this.mostrarFoto(arquivo),
      error: (erro: unknown) => this.toast.erro(mensagemDeErro(erro)),
    });
  }

  protected removerFoto(): void {
    this.negocio.removerFotoPerfil().subscribe({
      next: () => {
        this.soltarFoto();
        this.preview.set(null);
        if (this.gravado) {
          this.gravado = { ...this.gravado, fotoId: null };
        }
      },
      error: (erro: unknown) => this.toast.erro(mensagemDeErro(erro)),
    });
  }

  protected salvar(): void {
    const valor = this.formulario.getRawValue();
    this.negocio.salvarPerfil({
      nomeEmpresa: valor.nomeEmpresa ?? '',
      responsavel: valor.responsavel ?? '',
      documento: valor.documento ?? '',
      celular: valor.celular ?? '',
      nascimento: deDataParaIso(valor.nascimento),
      cep: valor.cep ?? '',
      pais: valor.pais ?? '',
      endereco: valor.endereco ?? '',
      numero: valor.numero ?? '',
      complemento: valor.complemento ?? '',
      bairro: valor.bairro ?? '',
      cidade: valor.cidade ?? '',
      estado: valor.estado ?? '',
      chavePix: valor.chavePix ?? '',
    }).subscribe({
      next: (perfil) => {
        this.aplicar(perfil, false);
        this.toast.sucesso('Perfil salvo.');
      },
      error: (erro: unknown) => this.toast.erro(mensagemDeErro(erro)),
    });
  }

  protected completarCep(): void {
    const digitos = (this.formulario.controls.cep.value ?? '').replace(/\D/g, '');
    if (digitos.length !== 8) {
      return;
    }

    this.negocio.cep(digitos).subscribe({
      next: (endereco) => {
        this.formulario.patchValue({
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

  protected cancelar(): void {
    if (this.gravado) {
      this.aplicar(this.gravado, false);
    }
  }

  private aplicar(perfil: Perfil, buscarFoto: boolean): void {
    this.gravado = perfil;
    this.email = perfil.email;
    this.formulario.patchValue({
      nomeEmpresa: perfil.nomeEmpresa ?? '',
      responsavel: perfil.responsavel ?? '',
      documento: aplicarMascara(perfil.documento ?? '', 'documento'),
      celular: aplicarMascara(perfil.celular ?? '', 'celular'),
      nascimento: deIsoParaData(perfil.nascimento),
      cep: aplicarMascara(perfil.cep ?? '', 'cep'),
      pais: perfil.pais ?? '',
      endereco: perfil.endereco ?? '',
      numero: perfil.numero ?? '',
      complemento: perfil.complemento ?? '',
      bairro: perfil.bairro ?? '',
      cidade: perfil.cidade ?? '',
      estado: perfil.estado ?? '',
      chavePix: perfil.chavePix ?? '',
    });
    if (buscarFoto) {
      this.carregarFoto(perfil.fotoId);
    }
  }

  private carregarFoto(fotoId: string | null): void {
    if (!fotoId) {
      this.soltarFoto();
      this.preview.set(null);
      return;
    }

    this.negocio.baixarArquivo(fotoId).subscribe({
      next: (arquivo) => this.mostrarFoto(arquivo),
      error: () => {
        this.soltarFoto();
        this.preview.set(null);
      },
    });
  }

  private mostrarFoto(arquivo: Blob): void {
    this.soltarFoto();
    this.fotoLocal = URL.createObjectURL(arquivo);
    this.preview.set(this.fotoLocal);
  }

  private soltarFoto(): void {
    if (this.fotoLocal) {
      URL.revokeObjectURL(this.fotoLocal);
      this.fotoLocal = null;
    }
  }
}

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
  imports: [
    ReactiveFormsModule, MatCardModule, MatFormFieldModule, MatInputModule, MatButtonModule, MatIconModule,
    MascaraDirective, CampoDataComponent,
  ],
  styles: `
    .gd-edicao {
      display: grid;
      grid-template-columns: minmax(0, 1fr) 280px;
      gap: 16px;
      align-items: start;
    }

    .gd-coluna {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .gd-grade {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
    }

    app-campo-data {
      display: block;
      min-width: 0;
    }

    .gd-largo {
      grid-column: 1 / -1;
    }

    .gd-foto-cartao {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
      padding: 28px 16px;
    }

    .gd-foto {
      position: relative;
      width: 112px;
      height: 112px;
      border-radius: 50%;
      overflow: hidden;
    }

    .gd-foto img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }

    .gd-foto-acoes {
      position: absolute;
      inset: 0;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 4px;
      background: color-mix(in oklch, oklch(0.075 0 0) 55%, transparent);
      opacity: 0;
    }

    .gd-foto:hover .gd-foto-acoes,
    .gd-foto:focus-within .gd-foto-acoes {
      opacity: 1;
    }

    .gd-foto-acoes button {
      color: #fff;
      min-width: 0;
      line-height: 28px;
      padding: 0 8px;
    }

    .gd-foto-nome {
      margin: 0;
      font-weight: 700;
      text-align: center;
    }

    .gd-acoes {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .gd-acoes button {
      width: 100%;
    }

    @media (max-width: 959px) {
      .gd-edicao {
        grid-template-columns: 1fr;
      }
    }

    @media (max-width: 720px) {
      .gd-grade {
        grid-template-columns: 1fr;
      }
    }
  `,
  template: `
    <header class="gd-cabecalho">
      <div>
        <h1>{{ titulo() }}</h1>
        <p>Dados da assessoria.</p>
      </div>
    </header>
    <form class="formulario" [formGroup]="formulario" (ngSubmit)="salvar()">
      <div class="gd-edicao">
        <div class="gd-coluna">
          <mat-card>
            <mat-card-header><mat-card-title>Identidade</mat-card-title></mat-card-header>
            <mat-card-content>
              <div class="gd-grade">
                <mat-form-field appearance="outline">
                  <mat-label>Nome da empresa</mat-label>
                  <input matInput formControlName="nomeEmpresa" />
                </mat-form-field>
                <mat-form-field appearance="outline">
                  <mat-label>Responsável</mat-label>
                  <input matInput formControlName="responsavel" />
                </mat-form-field>
                <mat-form-field appearance="outline" class="gd-largo">
                  <mat-label>E-mail</mat-label>
                  <input matInput [value]="email" readonly />
                </mat-form-field>
                <mat-form-field appearance="outline">
                  <mat-label>CPF ou CNPJ</mat-label>
                  <input matInput formControlName="documento" gdMascara="documento" />
                </mat-form-field>
                <mat-form-field appearance="outline">
                  <mat-label>Celular</mat-label>
                  <input matInput formControlName="celular" gdMascara="celular" />
                </mat-form-field>
                <app-campo-data class="gd-largo" rotulo="Nascimento" formControlName="nascimento" />
              </div>
            </mat-card-content>
          </mat-card>
          <mat-card>
            <mat-card-header><mat-card-title>Endereço</mat-card-title></mat-card-header>
            <mat-card-content>
              <mat-form-field appearance="outline">
                <mat-label>Endereço</mat-label>
                <textarea matInput rows="4" formControlName="endereco"></textarea>
              </mat-form-field>
            </mat-card-content>
          </mat-card>
        </div>
        <div class="gd-coluna">
          <mat-card class="gd-foto-cartao">
            @if (preview()) {
              <div class="gd-foto">
                <img [src]="preview()" alt="Foto do perfil" />
                <div class="gd-foto-acoes">
                  <button mat-button type="button" (click)="escolherFoto()">Alterar</button>
                  <button mat-button type="button" (click)="removerFoto()">Remover</button>
                </div>
              </div>
              @if (nomeCurto()) {
                <p class="gd-foto-nome">{{ nomeCurto() }}</p>
              }
            } @else {
              <button mat-stroked-button type="button" (click)="escolherFoto()">Enviar foto</button>
            }
            <input
              #arquivo
              hidden
              type="file"
              accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
              (change)="enviarFoto($event)"
            />
          </mat-card>
          <mat-card>
            <mat-card-header><mat-card-title>Ações</mat-card-title></mat-card-header>
            <mat-card-content class="gd-acoes">
              <button mat-flat-button type="submit">Salvar</button>
              <button mat-stroked-button type="button" (click)="cancelar()">Cancelar</button>
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
    endereco: '',
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

  protected titulo(): string {
    const nome = this.nomeCurto();
    return nome ? `Editar ${nome}` : 'Editar perfil';
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
      endereco: valor.endereco ?? '',
    }).subscribe({
      next: (perfil) => {
        this.aplicar(perfil, false);
        this.toast.sucesso('Perfil salvo.');
      },
      error: (erro: unknown) => this.toast.erro(mensagemDeErro(erro)),
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
      endereco: perfil.endereco ?? '',
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

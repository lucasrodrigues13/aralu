import { Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { mensagemDeErro } from '../../core/mensagem-erro';
import { NegocioClient } from '../../core/negocio.client';
import { ToastService } from '../../core/toast.service';

@Component({
  selector: 'app-lead-publico',
  imports: [ReactiveFormsModule, MatCardModule, MatButtonModule, MatFormFieldModule, MatInputModule],
  template: `
    <section class="flex min-h-screen w-full items-center justify-center p-4 bg-light">
      <mat-card class="cardWithShadow w-full max-w-[440px] mb-0!">
        <div class="px-6 pt-6"><h3 class="text-xl font-semibold">Solicitar orçamento</h3></div>
        <mat-card-content class="pt-6!">
          @if (enviado()) {
            <p>Recebemos o seu contato. Em breve a assessoria retorna.</p>
          } @else {
            <form class="grid grid-cols-1 gap-4" [formGroup]="form" (ngSubmit)="enviar()">
              <div class="campo">
                <mat-label class="font-semibold mb-2 block">Nome da oportunidade</mat-label>
                <mat-form-field appearance="outline" class="w-full">
                <input [attr.aria-label]="'Nome da oportunidade'" matInput formControlName="nome" />
              </mat-form-field>
              </div>
              <div class="campo">
                <mat-label class="font-semibold mb-2 block">Seu nome</mat-label>
                <mat-form-field appearance="outline" class="w-full">
                <input [attr.aria-label]="'Seu nome'" matInput formControlName="contatoNome" />
              </mat-form-field>
              </div>
              <div class="campo">
                <mat-label class="font-semibold mb-2 block">Telefone</mat-label>
                <mat-form-field appearance="outline" class="w-full">
                <input [attr.aria-label]="'Telefone'" matInput formControlName="telefone" />
              </mat-form-field>
              </div>
              <div class="campo">
                <mat-label class="font-semibold mb-2 block">E-mail</mat-label>
                <mat-form-field appearance="outline" class="w-full">
                <input [attr.aria-label]="'E-mail'" matInput formControlName="email" />
              </mat-form-field>
              </div>
              <button mat-flat-button class="w-full" type="submit" [disabled]="!contaId">Enviar</button>
            </form>
          }
        </mat-card-content>
      </mat-card>
    </section>
  `,
})
export class LeadPublicoPage implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly negocio = inject(NegocioClient);
  private readonly rota = inject(ActivatedRoute);
  private readonly toast = inject(ToastService);
  protected contaId = '';
  protected readonly enviado = signal(false);
  protected readonly form = this.fb.nonNullable.group({
    nome: ['', Validators.required],
    contatoNome: ['', Validators.required],
    telefone: [''],
    email: [''],
  });

  ngOnInit(): void {
    this.contaId = this.rota.snapshot.paramMap.get('contaId') ?? '';
  }

  protected enviar(): void {
    if (this.form.invalid || !this.contaId) {
      this.form.markAllAsTouched();
      this.toast.erro('Informe o nome e o contato.');
      return;
    }
    const v = this.form.getRawValue();
    this.negocio.criarLeadPublico(this.contaId, {
      nome: v.nome,
      contatoNome: v.contatoNome,
      telefone: v.telefone || null,
      email: v.email || null,
    }).subscribe({
      next: () => {
        this.enviado.set(true);
        this.toast.sucesso('Contato enviado.');
      },
      error: (erro: unknown) => this.toast.erro(mensagemDeErro(erro)),
    });
  }
}

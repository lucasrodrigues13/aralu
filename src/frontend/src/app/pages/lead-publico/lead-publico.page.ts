import { Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { mensagemDeErro } from '../../core/mensagem-erro';
import { NegocioClient, TIPOS } from '../../core/negocio.client';
import { CampoDataComponent } from '../../shared/campo-data';
import { MascaraDirective } from '../../shared/mascara.directive';
import { deDataParaIso } from '../../shared/data';
import { ToastService } from '../../core/toast.service';

@Component({
  selector: 'app-lead-publico',
  imports: [ReactiveFormsModule, MatCardModule, MatButtonModule, MatFormFieldModule, MatInputModule, MatSelectModule, CampoDataComponent, MascaraDirective],
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
                <mat-label class="font-semibold mb-2 block">Seu nome</mat-label>
                <mat-form-field appearance="outline" class="w-full">
                <input [attr.aria-label]="'Seu nome'" matInput formControlName="contatoNome" />
              </mat-form-field>
              </div>
              <div class="campo">
                <mat-label class="font-semibold mb-2 block">Telefone</mat-label>
                <mat-form-field appearance="outline" class="w-full">
                <input [attr.aria-label]="'Telefone'" matInput formControlName="telefone" gdMascara="celular" />
              </mat-form-field>
              </div>
              <div class="campo">
                <mat-label class="font-semibold mb-2 block">E-mail</mat-label>
                <mat-form-field appearance="outline" class="w-full">
                <input [attr.aria-label]="'E-mail'" matInput formControlName="email" />
              </mat-form-field>
              </div>
              <div class="campo">
                <mat-label class="font-semibold mb-2 block">Tipo de evento</mat-label>
                <mat-form-field appearance="outline" class="w-full">
                  <mat-select [attr.aria-label]="'Tipo de evento'" formControlName="tipoEvento">
                    <mat-option [value]="null">—</mat-option>
                    @for (t of tipos; track t.valor) { <mat-option [value]="t.valor">{{ t.rotulo }}</mat-option> }
                  </mat-select>
                </mat-form-field>
              </div>
              <app-campo-data formControlName="dataPrevista" rotulo="Data prevista" />
              <div class="campo">
                <mat-label class="font-semibold mb-2 block">Convidados</mat-label>
                <mat-form-field appearance="outline" class="w-full">
                  <input [attr.aria-label]="'Convidados'" matInput type="number" min="0" formControlName="quantidadeConvidados" />
                </mat-form-field>
              </div>
              <div class="grid grid-cols-[1fr_6rem] gap-4">
                <div class="campo">
                  <mat-label class="font-semibold mb-2 block">Cidade</mat-label>
                  <mat-form-field appearance="outline" class="w-full">
                    <input [attr.aria-label]="'Cidade'" matInput maxlength="120" formControlName="cidade" />
                  </mat-form-field>
                </div>
                <div class="campo">
                  <mat-label class="font-semibold mb-2 block">UF</mat-label>
                  <mat-form-field appearance="outline" class="w-full">
                    <input [attr.aria-label]="'UF'" matInput maxlength="2" formControlName="uf" />
                  </mat-form-field>
                </div>
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
  protected readonly tipos = TIPOS;
  protected contaId = '';
  protected readonly enviado = signal(false);
  protected readonly form = this.fb.nonNullable.group({
    contatoNome: ['', Validators.required],
    telefone: [''],
    email: [''],
    tipoEvento: this.fb.control<string | null>(null),
    dataPrevista: this.fb.control<Date | null>(null),
    quantidadeConvidados: this.fb.control<number | null>(null),
    cidade: [''],
    uf: [''],
  });

  ngOnInit(): void {
    this.contaId = this.rota.snapshot.paramMap.get('contaId') ?? '';
  }

  protected enviar(): void {
    if (this.form.invalid || !this.contaId) {
      this.form.markAllAsTouched();
      this.toast.erro('Informe o seu nome.');
      return;
    }
    const v = this.form.getRawValue();
    this.negocio.criarLeadPublico(this.contaId, {
      contatoNome: v.contatoNome,
      telefone: v.telefone || null,
      email: v.email || null,
      tipoEvento: v.tipoEvento,
      dataPrevista: deDataParaIso(v.dataPrevista),
      quantidadeConvidados: v.quantidadeConvidados,
      cidade: v.cidade || null,
      uf: v.uf || null,
    }).subscribe({
      next: () => {
        this.enviado.set(true);
        this.toast.sucesso('Contato enviado.');
      },
      error: (erro: unknown) => this.toast.erro(mensagemDeErro(erro)),
    });
  }
}

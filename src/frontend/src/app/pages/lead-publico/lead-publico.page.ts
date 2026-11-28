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
import { Estado } from '../../shared/estado';
import { PaginaPublica } from '../../shared/pagina-publica';
import { MascaraDirective } from '../../shared/mascara.directive';
import { deDataParaIso } from '../../shared/data';
import { ToastService } from '../../core/toast.service';

@Component({
  selector: 'app-lead-publico',
  imports: [ReactiveFormsModule, MatCardModule, MatButtonModule, MatFormFieldModule, MatInputModule, MatSelectModule, CampoDataComponent, MascaraDirective, Estado, PaginaPublica],
  template: `
    <app-pagina-publica titulo="Solicitar orçamento" [estreita]="true">
      <mat-card class="cardWithShadow">
        <mat-card-content>
          @if (enviado()) {
            <app-estado icone="check_circle" titulo="Pedido enviado" texto="Em breve a assessoria retorna." />
          } @else {
            <form class="grid grid-cols-1 gap-4" [formGroup]="form" (ngSubmit)="enviar()">
              <div class="campo">
                <mat-label class="font-semibold mb-2 block">Seu nome</mat-label>
                <mat-form-field appearance="outline" class="w-full">
                <input [attr.aria-label]="'Seu nome'" matInput maxlength="120" formControlName="contatoNome" />
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
              <!-- Campo isca (honeypot): fora da tela; pessoas não preenchem, robôs sim. -->
              <input type="text" name="site" formControlName="site" tabindex="-1" autocomplete="off" aria-hidden="true"
                style="position:absolute; left:-9999px; width:1px; height:1px; overflow:hidden" />
              <div class="acoes-publicas">
                <button mat-flat-button type="submit" [disabled]="!contaId">Enviar</button>
              </div>
            </form>
          }
        </mat-card-content>
      </mat-card>
    </app-pagina-publica>
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
    contatoNome: ['', [Validators.required, Validators.maxLength(120)]],
    telefone: ['', Validators.maxLength(200)],
    email: ['', Validators.maxLength(200)],
    site: [''],
    tipoEvento: this.fb.control<string | null>(null),
    dataPrevista: this.fb.control<Date | null>(null),
    quantidadeConvidados: this.fb.control<number | null>(null),
    cidade: [''],
    uf: [''],
  });

  ngOnInit(): void {
    this.contaId = this.rota.snapshot.paramMap.get('contaId') ?? '';
    this.iniciadoEm = Date.now();
  }

  /** Quando o formulário abriu (epoch ms): envio rápido demais é descartado no servidor. */
  private iniciadoEm = 0;

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
      site: v.site || null,
      iniciadoEm: this.iniciadoEm,
    }).subscribe({
      next: () => {
        this.enviado.set(true);
        this.toast.sucesso('Contato enviado.');
      },
      error: (erro: unknown) => this.toast.erro(mensagemDeErro(erro)),
    });
  }
}

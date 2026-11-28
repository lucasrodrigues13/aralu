import { Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatRadioModule } from '@angular/material/radio';
import { Estado } from '../../shared/estado';
import { GdDataPipe } from '../../shared/gd-data.pipe';
import { PaginaPublica } from '../../shared/pagina-publica';
import { mensagemDeErro } from '../../core/mensagem-erro';
import { NegocioClient } from '../../core/negocio.client';
import { ToastService } from '../../core/toast.service';

@Component({
  selector: 'app-rsvp',
  imports: [ReactiveFormsModule, MatCardModule, MatButtonModule, MatRadioModule, MatCheckboxModule, GdDataPipe, Estado, PaginaPublica],
  template: `
    <app-pagina-publica [titulo]="titulo() || 'Confirmação de presença'" [estreita]="true">
      <mat-card class="cardWithShadow">
        <mat-card-content>
          @if (!carregado()) {
            <app-estado titulo="Carregando…" />
          } @else if (expirado()) {
            <app-estado icone="event_busy" titulo="Este convite expirou" data-teste="convite-expirado"
              [texto]="'O prazo para confirmar presença terminou' + (prazo() ? ' em ' + (prazo() | gdData) : '') + '. Fale com quem enviou o convite.'" />
          } @else if (convidados().length === 0) {
            <app-estado icone="link_off" titulo="Este link não está mais disponível" texto="Fale com quem enviou o convite." />
          }
          @if (temConfirmado()) {
            <div class="text-center mb-4" data-teste="qr-entrada">
              <p class="font-semibold">Seu QR code de entrada</p>
              <img class="mx-auto w-48 h-48" [src]="urlQr()" alt="QR code de entrada no evento" />
              <p class="text-sm text-muted">Mostre na portaria. Vale para os convidados confirmados deste convite.</p>
            </div>
          }
          <form class="grid grid-cols-1 gap-4" [formGroup]="formulario" (ngSubmit)="enviar()">
            @for (pessoa of convidados(); track pessoa.id) {
              <fieldset class="border border-border rounded p-4">
                <legend class="font-semibold px-1">{{ pessoa.nome }}</legend>
                <mat-radio-group class="flex flex-wrap gap-4" [formControlName]="pessoa.id">
                  <mat-radio-button value="Confirmado">Vou</mat-radio-button>
                  <mat-radio-button value="NaoComparecera">Não vou</mat-radio-button>
                </mat-radio-group>
              </fieldset>
            }
            @if (convidados().length) {
              <mat-checkbox formControlName="pretendeRealizarEvento">
                Pretendo realizar um evento nos próximos dois anos
              </mat-checkbox>
              <div class="acoes-publicas">
                <button mat-flat-button type="submit">Enviar resposta</button>
              </div>
            }
          </form>
        </mat-card-content>
      </mat-card>
    </app-pagina-publica>
  `,
})
export class RsvpPage implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly negocio = inject(NegocioClient);
  private readonly rota = inject(ActivatedRoute);
  private readonly toast = inject(ToastService);
  protected readonly titulo = signal('');
  protected readonly carregado = signal(false);
  protected readonly expirado = signal(false);
  protected readonly prazo = signal<string | null>(null);
  protected readonly convidados = signal<{ id: string; nome: string; situacao: string }[]>([]);
  protected formulario: FormGroup = this.fb.group({ pretendeRealizarEvento: false });
  private token = '';

  protected temConfirmado(): boolean {
    return !this.expirado() && this.convidados().some((pessoa) => pessoa.situacao === 'Confirmado');
  }

  protected urlQr(): string {
    return this.negocio.urlQrEntradaDoRsvp(this.token);
  }

  ngOnInit(): void {
    this.token = this.rota.snapshot.paramMap.get('token') ?? '';
    this.negocio.abrirRsvp(this.token).subscribe({
      next: (pagina) => {
        this.titulo.set(pagina.convite);
        this.expirado.set(pagina.expirado);
        this.prazo.set(pagina.prazo);
        this.convidados.set(pagina.convidados);
        this.carregado.set(true);
        const controles: Record<string, FormControl<string | boolean | null>> = {
          pretendeRealizarEvento: this.fb.nonNullable.control(false),
        };
        for (const pessoa of pagina.convidados) {
          controles[pessoa.id] = this.fb.nonNullable.control(
            pessoa.situacao === 'Pendente' ? '' : pessoa.situacao,
          );
        }
        this.formulario = this.fb.group(controles);
      },
      error: (erro: unknown) => {
        this.carregado.set(true);
        this.toast.erro(mensagemDeErro(erro));
      },
    });
  }

  protected enviar(): void {
    const respostas = this.convidados()
      .map((pessoa) => ({ convidadoId: pessoa.id, situacao: String(this.formulario.get(pessoa.id)?.value ?? '') }))
      .filter((resposta) => resposta.situacao === 'Confirmado' || resposta.situacao === 'NaoComparecera');
    if (respostas.length === 0) {
      this.toast.erro('Escolha a presença de ao menos uma pessoa.');
      return;
    }
    const pretende = !!this.formulario.get('pretendeRealizarEvento')?.value;
    this.negocio.responderRsvp(this.token, respostas, pretende || undefined).subscribe({
      next: (pagina) => {
        this.convidados.set(pagina.convidados);
        this.toast.sucesso('Presença registrada.');
      },
      error: (erro: unknown) => this.toast.erro(mensagemDeErro(erro)),
    });
  }
}

import { Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatRadioModule } from '@angular/material/radio';
import { GdDataPipe } from '../../shared/gd-data.pipe';
import { mensagemDeErro } from '../../core/mensagem-erro';
import { NegocioClient } from '../../core/negocio.client';
import { ToastService } from '../../core/toast.service';

@Component({
  selector: 'app-rsvp',
  imports: [ReactiveFormsModule, MatCardModule, MatButtonModule, MatRadioModule, MatCheckboxModule, GdDataPipe],
  template: `
    <section class="flex min-h-screen w-full items-center justify-center p-4 bg-light">
      <mat-card class="cardWithShadow w-full max-w-[440px] mb-0!">
        <div class="px-6 pt-6"><h3 class="text-xl font-semibold">{{ titulo() || 'Confirmação de presença' }}</h3></div>
        <mat-card-content class="pt-6!">
          @if (expirado()) {
            <p class="font-semibold" data-teste="convite-expirado">Este convite expirou.</p>
            <p>O prazo para confirmar presença terminou@if (prazo()) { em {{ prazo() | gdData }} }. Fale com quem enviou o convite.</p>
          } @else if (convidados().length === 0 && carregado()) {
            <p>Não há quem responder.</p>
          }
          <form class="grid grid-cols-1 gap-4" [formGroup]="formulario" (ngSubmit)="enviar()">
            @for (pessoa of convidados(); track pessoa.id) {
              <fieldset class="border border-border rounded p-4">
                <legend class="font-semibold px-1">{{ pessoa.nome }}</legend>
                <mat-radio-group class="flex flex-wrap gap-4" [formControlName]="pessoa.id">
                  <mat-radio-button value="Confirmado">Confirmado</mat-radio-button>
                  <mat-radio-button value="NaoComparecera">Não comparecerá</mat-radio-button>
                </mat-radio-group>
              </fieldset>
            }
            @if (convidados().length) {
              <mat-checkbox formControlName="pretendeRealizarEvento">
                Pretendo realizar um evento nos próximos dois anos
              </mat-checkbox>
              <button mat-flat-button class="w-full" type="submit">Enviar</button>
            }
          </form>
        </mat-card-content>
      </mat-card>
    </section>
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

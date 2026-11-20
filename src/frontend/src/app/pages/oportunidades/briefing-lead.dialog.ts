import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { mensagemDeErro } from '../../core/mensagem-erro';
import { Briefing, BriefingDoLead, NegocioClient } from '../../core/negocio.client';
import { ToastService } from '../../core/toast.service';
import { ConfirmaDialog } from '../../shared/confirma-dialog';
import { DIALOG_PEQUENO } from '../../shared/dialog';

export interface BriefingLeadDados {
  id: string;
  nome: string;
}

/** Briefing do lead: roteiro interno da conversa, com as respostas anotadas (SPEC-031 §6.7, ponto 4). */
@Component({
  selector: 'app-briefing-lead-dialog',
  imports: [FormsModule, MatDialogModule, MatButtonModule, MatFormFieldModule, MatInputModule, MatSelectModule],
  template: `
    <h2 mat-dialog-title>Briefing de {{ dados.nome }}</h2>
    <p class="text-muted text-sm px-6 -mt-2 mb-4">Use as perguntas como roteiro da conversa e anote as respostas aqui.</p>
    <mat-dialog-content>
      @if (carregando()) {
        <p class="text-center text-muted py-6">Carregando...</p>
      } @else {
        <div class="flex flex-wrap items-end gap-3 mb-4">
          <div class="campo flex-1 min-w-48">
            <mat-label class="font-semibold mb-2 block">{{ briefing() ? 'Trocar o modelo' : 'Modelo de briefing' }}</mat-label>
            <mat-form-field appearance="outline" subscriptSizing="dynamic" class="w-full">
              <mat-select [attr.aria-label]="'Modelo de briefing'" [value]="modeloId()" (valueChange)="modeloId.set($event)">
                @for (modelo of modelos(); track modelo.id) { <mat-option [value]="modelo.id">{{ modelo.nome }}</mat-option> }
              </mat-select>
            </mat-form-field>
          </div>
          <button mat-stroked-button type="button" [disabled]="!modeloId()" (click)="aplicar()">{{ briefing() ? 'Trocar' : 'Aplicar' }}</button>
        </div>
        @if (modelos().length === 0) {
          <p class="text-muted text-sm">Nenhum modelo de briefing na conta. Crie um em Modelos de briefing.</p>
        }
        @if (briefing(); as b) {
          <p class="text-sm text-muted mb-3">Modelo: {{ b.modeloNome }}</p>
          @for (item of b.itens; track item.id; let i = $index) {
            @if (item.secao && (i === 0 || b.itens[i - 1].secao !== item.secao)) {
              <h3 class="font-semibold mt-4 mb-2">{{ item.secao }}</h3>
            }
            <div class="campo">
              <mat-label class="font-semibold mb-1 block">{{ item.pergunta }}</mat-label>
              <mat-form-field appearance="outline" subscriptSizing="dynamic" class="w-full">
                <textarea matInput rows="2" maxlength="2000" [attr.aria-label]="item.pergunta" [ngModel]="respostas()[item.id] ?? ''" (ngModelChange)="responder(item.id, $event)"></textarea>
              </mat-form-field>
            </div>
          }
        }
      }
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      @if (briefing()) {
        <button mat-button type="button" (click)="remover()">Remover briefing</button>
      }
      <button mat-stroked-button type="button" (click)="ref.close()">Fechar</button>
      @if (briefing()) {
        <button mat-flat-button type="button" (click)="salvar()">Salvar respostas</button>
      }
    </mat-dialog-actions>
  `,
})
export class BriefingLeadDialog implements OnInit {
  protected readonly dados = inject<BriefingLeadDados>(MAT_DIALOG_DATA);
  protected readonly ref = inject(MatDialogRef<BriefingLeadDialog>);
  private readonly negocio = inject(NegocioClient);
  private readonly toast = inject(ToastService);
  private readonly dialog = inject(MatDialog);
  protected readonly carregando = signal(true);
  protected readonly briefing = signal<BriefingDoLead | null>(null);
  protected readonly modelos = signal<Briefing[]>([]);
  protected readonly modeloId = signal('');
  protected readonly respostas = signal<Record<string, string>>({});

  ngOnInit(): void {
    this.negocio.briefings().subscribe({ next: (lista) => this.modelos.set(lista), error: () => undefined });
    this.negocio.briefingDoLead(this.dados.id).subscribe({
      next: (resposta) => {
        this.definir(resposta.briefing);
        this.carregando.set(false);
      },
      error: (erro: unknown) => {
        this.carregando.set(false);
        this.toast.erro(mensagemDeErro(erro));
      },
    });
  }

  protected responder(id: string, texto: string): void {
    this.respostas.update((atual) => ({ ...atual, [id]: texto }));
  }

  protected aplicar(): void {
    const aplicar = () =>
      this.negocio.aplicarBriefingAoLead(this.dados.id, this.modeloId()).subscribe({
        next: (resposta) => {
          this.definir(resposta.briefing);
          this.modeloId.set('');
          this.toast.sucesso('Briefing aplicado.');
        },
        error: (erro: unknown) => this.toast.erro(mensagemDeErro(erro)),
      });
    if (!this.briefing()) {
      aplicar();
      return;
    }

    this.dialog
      .open(ConfirmaDialog, {
        ...DIALOG_PEQUENO,
        data: { titulo: 'Trocar o modelo', texto: 'As respostas anotadas neste briefing serão perdidas.', confirmar: 'Trocar' },
      })
      .afterClosed()
      .subscribe((ok) => ok && aplicar());
  }

  protected salvar(): void {
    const respostas = Object.entries(this.respostas()).map(([id, resposta]) => ({ id, resposta }));
    this.negocio.salvarBriefingDoLead(this.dados.id, respostas).subscribe({
      next: (resposta) => {
        this.definir(resposta.briefing);
        this.toast.sucesso('Respostas salvas.');
      },
      error: (erro: unknown) => this.toast.erro(mensagemDeErro(erro)),
    });
  }

  protected remover(): void {
    this.dialog
      .open(ConfirmaDialog, {
        ...DIALOG_PEQUENO,
        data: { titulo: 'Remover briefing', texto: 'O briefing e as respostas deste lead serão apagados.', confirmar: 'Remover' },
      })
      .afterClosed()
      .subscribe((ok) => {
        if (!ok) return;
        this.negocio.removerBriefingDoLead(this.dados.id).subscribe({
          next: () => {
            this.definir(null);
            this.toast.sucesso('Briefing removido.');
          },
          error: (erro: unknown) => this.toast.erro(mensagemDeErro(erro)),
        });
      });
  }

  private definir(briefing: BriefingDoLead | null): void {
    this.briefing.set(briefing);
    this.respostas.set(Object.fromEntries((briefing?.itens ?? []).map((item) => [item.id, item.resposta ?? ''])));
  }
}

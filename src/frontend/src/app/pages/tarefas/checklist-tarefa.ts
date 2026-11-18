import { Component, EventEmitter, inject, Input, Output, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { mensagemDeErro } from '../../core/mensagem-erro';
import { ItemChecklistTarefa, NegocioClient, Tarefa } from '../../core/negocio.client';
import { ToastService } from '../../core/toast.service';

/** Progresso da checklist: itens cancelados saem da conta. */
export function progressoChecklist(tarefa: Tarefa): { feitos: number; total: number } {
  const validos = tarefa.checklist.filter((item) => !item.cancelado);
  return { feitos: validos.filter((item) => item.feito).length, total: validos.length };
}

/** Itens da checklist com marcar como feito e cancelar (risca o texto). Grava item a item. */
@Component({
  selector: 'app-checklist-tarefa',
  imports: [MatCheckboxModule, MatButtonModule, MatIconModule, MatTooltipModule],
  template: `
    <ul class="itens">
      @for (item of tarefa.checklist; track item.id + ':' + versao()) {
        <li [class.cancelado]="item.cancelado" [class.feito]="item.feito">
          <mat-checkbox
            [checked]="item.feito"
            [disabled]="!editavel || item.cancelado || gravando() === item.id"
            (change)="marcar(item, $event.checked, false)"
            [attr.aria-label]="'Marcar como feito: ' + item.texto"
          />
          <span class="texto">{{ item.texto }}</span>
          @if (editavel) {
            <button
              mat-icon-button
              type="button"
              class="cancelar"
              [disabled]="gravando() === item.id"
              [matTooltip]="item.cancelado ? 'Restaurar item' : 'Cancelar item'"
              [attr.aria-label]="(item.cancelado ? 'Restaurar item: ' : 'Cancelar item: ') + item.texto"
              (click)="marcar(item, false, !item.cancelado)"
            >
              <mat-icon>{{ item.cancelado ? 'undo' : 'block' }}</mat-icon>
            </button>
          }
        </li>
      }
    </ul>
  `,
  styles: `
    :host { display: block; }
    .itens { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 2px; }
    li { display: flex; align-items: center; gap: 4px; min-height: 36px; padding: 0 4px 0 0; border-radius: 8px; }
    li:hover { background: color-mix(in oklab, var(--gd-muted) 60%, transparent); }
    li > mat-checkbox { flex-shrink: 0; }
    .texto { flex: 1; min-width: 0; font-size: 14px; line-height: 20px; overflow-wrap: anywhere; }
    li.feito .texto { color: var(--gd-muted-foreground); }
    li.cancelado .texto { text-decoration: line-through; color: var(--gd-muted-foreground); }
    .cancelar { flex-shrink: 0; width: 32px; height: 32px; padding: 4px; color: var(--gd-muted-foreground); opacity: 0; transition: opacity 0.15s; }
    .cancelar mat-icon { font-size: 18px; width: 18px; height: 18px; }
    li:hover .cancelar, li.cancelado .cancelar, .cancelar:focus-visible { opacity: 1; }
    @media (hover: none) { .cancelar { opacity: 1; } }
  `,
})
export class ChecklistTarefaComponent {
  @Input({ required: true }) tarefa!: Tarefa;
  @Input() editavel = true;
  @Output() readonly mudou = new EventEmitter<Tarefa>();

  private readonly negocio = inject(NegocioClient);
  private readonly toast = inject(ToastService);
  protected readonly gravando = signal<string | null>(null);
  /** Muda quando a gravação falha, para redesenhar a marcação com o valor que ficou no servidor. */
  protected readonly versao = signal(0);

  protected marcar(item: ItemChecklistTarefa, feito: boolean, cancelado: boolean): void {
    this.gravando.set(item.id);
    this.negocio.marcarItemChecklist(this.tarefa.id, item.id, { feito, cancelado }).subscribe({
      next: (tarefa) => {
        this.gravando.set(null);
        this.mudou.emit(tarefa);
      },
      error: (erro: unknown) => {
        this.gravando.set(null);
        this.toast.erro(mensagemDeErro(erro));
        this.versao.update((valor) => valor + 1);
      },
    });
  }
}

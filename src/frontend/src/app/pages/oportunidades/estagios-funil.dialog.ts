import { Component, inject, signal } from '@angular/core';
import { FormBuilder, FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { CdkDrag, CdkDragDrop, CdkDragHandle, CdkDropList, moveItemInArray } from '@angular/cdk/drag-drop';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { mensagemDeErro } from '../../core/mensagem-erro';
import {
  CORES_ESTAGIO,
  EstagioFunil,
  MAXIMO_ESTAGIOS_ABERTOS,
  NegocioClient,
  SalvarEstagiosFunil,
} from '../../core/negocio.client';
import { ToastService } from '../../core/toast.service';
import { FecharModal } from '../../shared/fechar-modal';

interface LinhaEstagio {
  /** Nulo para estágio novo. */
  id: string | null;
  nome: FormControl<string>;
  cor: FormControl<string>;
  quantidade: number;
}

interface Removido {
  id: string;
  nome: string;
  quantidade: number;
  destino: FormControl<string | null>;
}

/** Monta o pedido de gravação a partir das linhas do modal (exportado para teste). */
export function montarPedidoEstagios(
  abertos: { id: string | null; nome: string; cor: string }[],
  corContratado: string,
  corDescartado: string,
  removidos: { id: string; destinoId: string | null }[],
): SalvarEstagiosFunil {
  return {
    abertos: abertos.map((a) => ({ id: a.id, nome: a.nome.trim(), cor: a.cor })),
    corContratado,
    corDescartado,
    exclusoes: removidos.map((r) => ({ id: r.id, destinoId: r.destinoId })),
  };
}

/** Primeiro nome repetido (sem diferenciar maiúsculas), ou nulo. */
export function nomeRepetido(nomes: string[]): string | null {
  const vistos = new Set<string>();
  for (const nome of nomes) {
    const chave = nome.trim().toLocaleLowerCase('pt-BR');
    if (vistos.has(chave)) return nome.trim();
    vistos.add(chave);
  }
  return null;
}

/** Gerenciar estágios do funil (SPEC-031 §6.1). Contratado e Descartado são fixos. */
@Component({
  selector: 'app-estagios-funil-dialog',
  imports: [FecharModal, 
    ReactiveFormsModule, MatDialogModule, MatButtonModule, MatFormFieldModule, MatInputModule, MatSelectModule,
    MatIconModule, MatTooltipModule, CdkDropList, CdkDrag, CdkDragHandle,
  ],
  template: `
    <h2 mat-dialog-title>Gerenciar estágios <app-fechar-modal /></h2>
    <mat-dialog-content>
      <p class="text-sm text-muted mb-4">Arraste para mudar a ordem. Contratado e Descartado ficam sempre no fim do funil.</p>
      <div cdkDropList class="lista" (cdkDropListDropped)="reordenar($event)">
        @for (linha of linhas(); track linha; let i = $index) {
          <div class="linha" cdkDrag cdkDragLockAxis="y">
            <button mat-icon-button type="button" cdkDragHandle class="alca" aria-label="Arrastar para mudar a ordem">
              <mat-icon>drag_indicator</mat-icon>
            </button>
            <mat-form-field appearance="outline" subscriptSizing="dynamic" class="cor">
              <mat-select [formControl]="linha.cor" aria-label="Cor do estágio" panelWidth="200px" panelClass="painel-cores-estagio">
                <mat-select-trigger><span class="bolinha" [style.background]="'var(--color-' + linha.cor.value + ')'"></span></mat-select-trigger>
                @for (c of cores; track c.valor) {
                  <mat-option [value]="c.valor"><span class="bolinha" [style.background]="'var(--color-' + c.valor + ')'"></span> {{ c.rotulo }}</mat-option>
                }
              </mat-select>
            </mat-form-field>
            <mat-form-field appearance="outline" subscriptSizing="dynamic" class="nome">
              <input matInput [formControl]="linha.nome" maxlength="40" [attr.aria-label]="'Nome do estágio ' + (i + 1)" placeholder="Nome do estágio" />
            </mat-form-field>
            <span class="qtd text-xs text-muted" [matTooltip]="linha.quantidade + ' leads neste estágio'">{{ linha.quantidade }}</span>
            <button mat-icon-button type="button" aria-label="Excluir estágio" matTooltip="Excluir estágio"
              [disabled]="linhas().length === 1" (click)="remover(i)">
              <mat-icon>delete</mat-icon>
            </button>
          </div>
        }
      </div>

      <button mat-stroked-button type="button" class="mt-2" [disabled]="linhas().length >= maximo" (click)="adicionar()">
        <mat-icon>add</mat-icon> Novo estágio
      </button>
      @if (linhas().length >= maximo) {
        <p class="text-xs text-muted mt-1">No máximo {{ maximo }} estágios além de Contratado e Descartado.</p>
      }

      <h3 class="titulo-fixos">Fixos</h3>
      @for (fixo of fixos; track fixo.id) {
        <div class="linha fixa">
          <mat-icon class="cadeado" matTooltip="Estágio fixo: só a cor muda">lock</mat-icon>
          <mat-form-field appearance="outline" subscriptSizing="dynamic" class="cor">
            <mat-select [formControl]="fixo.tipo === 'Contratado' ? corContratado : corDescartado" [attr.aria-label]="'Cor de ' + fixo.nome" panelWidth="200px" panelClass="painel-cores-estagio">
              <mat-select-trigger>
                <span class="bolinha" [style.background]="'var(--color-' + (fixo.tipo === 'Contratado' ? corContratado.value : corDescartado.value) + ')'"></span>
              </mat-select-trigger>
              @for (c of cores; track c.valor) {
                <mat-option [value]="c.valor"><span class="bolinha" [style.background]="'var(--color-' + c.valor + ')'"></span> {{ c.rotulo }}</mat-option>
              }
            </mat-select>
          </mat-form-field>
          <span class="nome-fixo">{{ fixo.nome }}</span>
          <span class="qtd text-xs text-muted">{{ fixo.quantidade }}</span>
        </div>
      }

      @if (removidosComLeads().length) {
        <h3 class="titulo-fixos">Para onde vão os leads</h3>
        @for (r of removidosComLeads(); track r.id) {
          <div class="campo">
            <mat-label class="font-semibold mb-2 block">
              {{ r.quantidade }} {{ r.quantidade === 1 ? 'lead' : 'leads' }} de "{{ r.nome }}"
            </mat-label>
            <mat-form-field appearance="outline" subscriptSizing="dynamic" class="w-full">
              <mat-select [formControl]="r.destino" [attr.aria-label]="'Destino dos leads de ' + r.nome" placeholder="Escolha o estágio">
                @for (d of destinos(); track d.id) {
                  <mat-option [value]="d.id">{{ d.nome }}</mat-option>
                }
              </mat-select>
            </mat-form-field>
          </div>
        }
      }
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-stroked-button type="button" (click)="ref.close()">Cancelar</button>
      <button mat-flat-button type="button" [disabled]="salvando()" (click)="salvar()">Salvar</button>
    </mat-dialog-actions>
  `,
  styles: `
    .lista { display: grid; gap: 8px; }
    .linha {
      display: flex; align-items: center; gap: 8px;
      background: var(--mat-sys-surface); border: 1px solid var(--color-border); border-radius: 10px; padding: 6px 8px;
    }
    .linha.fixa { margin-bottom: 8px; padding-left: 14px; }
    .alca { cursor: grab; flex: none; }
    .cor { width: 76px; flex: none; }
    .nome { flex: 1; min-width: 0; }
    .nome-fixo { flex: 1; font-weight: 600; }
    .qtd { min-width: 24px; text-align: center; }
    .cadeado { opacity: 0.5; font-size: 20px; width: 20px; height: 20px; margin-right: 14px; }
    .bolinha { display: inline-block; width: 14px; height: 14px; border-radius: 50%; vertical-align: -2px; margin-right: 4px; }
    ::ng-deep .painel-cores-estagio .mat-mdc-option .bolinha {
      display: inline-block; width: 16px; height: 16px; border-radius: 50%; vertical-align: -3px; margin-right: 10px;
    }
    ::ng-deep .painel-cores-estagio { max-height: 360px !important; }
    .titulo-fixos { margin: 20px 0 8px; font-size: 0.95rem; }
    .cdk-drag-preview { box-shadow: 0 8px 24px rgb(0 0 0 / 0.15); }
    .cdk-drag-placeholder { opacity: 0.3; }
    .cdk-drag-animating, .lista.cdk-drop-list-dragging .linha:not(.cdk-drag-placeholder) { transition: transform 200ms ease; }
  `,
})
export class EstagiosFunilDialog {
  private readonly fb = inject(FormBuilder);
  private readonly negocio = inject(NegocioClient);
  private readonly toast = inject(ToastService);
  protected readonly ref = inject(MatDialogRef<EstagiosFunilDialog, boolean>);
  private readonly atuais = inject<EstagioFunil[]>(MAT_DIALOG_DATA);

  protected readonly cores = CORES_ESTAGIO;
  protected readonly maximo = MAXIMO_ESTAGIOS_ABERTOS;
  protected readonly fixos = this.atuais.filter((e) => e.tipo !== 'Aberto');
  protected readonly corContratado = this.fb.nonNullable.control(this.fixos.find((e) => e.tipo === 'Contratado')?.cor ?? 'success');
  protected readonly corDescartado = this.fb.nonNullable.control(this.fixos.find((e) => e.tipo === 'Descartado')?.cor ?? 'error');
  protected readonly linhas = signal<LinhaEstagio[]>(
    this.atuais.filter((e) => e.tipo === 'Aberto').map((e) => this.linha(e.id, e.nome, e.cor, e.quantidade)),
  );
  protected readonly removidos = signal<Removido[]>([]);
  protected readonly salvando = signal(false);

  protected removidosComLeads(): Removido[] {
    return this.removidos().filter((r) => r.quantidade > 0);
  }

  /** Destinos possíveis: estágios abertos que já existem e continuam, e Contratado. */
  protected destinos(): { id: string; nome: string }[] {
    const abertos = this.linhas()
      .filter((l): l is LinhaEstagio & { id: string } => l.id !== null)
      .map((l) => ({ id: l.id, nome: l.nome.value.trim() || 'Sem nome' }));
    const contratado = this.fixos.find((e) => e.tipo === 'Contratado');
    return contratado ? [...abertos, { id: contratado.id, nome: contratado.nome }] : abertos;
  }

  protected reordenar(evento: CdkDragDrop<unknown>): void {
    const copia = [...this.linhas()];
    moveItemInArray(copia, evento.previousIndex, evento.currentIndex);
    this.linhas.set(copia);
  }

  protected adicionar(): void {
    const usadas = new Set([...this.linhas().map((l) => l.cor.value), this.corContratado.value, this.corDescartado.value]);
    const cor = this.cores.find((c) => !usadas.has(c.valor))?.valor ?? 'info';
    this.linhas.update((l) => [...l, this.linha(null, '', cor, 0)]);
  }

  protected remover(indice: number): void {
    const linha = this.linhas()[indice];
    this.linhas.update((l) => l.filter((_, i) => i !== indice));
    if (linha.id) {
      const id = linha.id;
      this.removidos.update((r) => [
        ...r,
        { id, nome: linha.nome.value.trim() || 'Sem nome', quantidade: linha.quantidade, destino: new FormControl<string | null>(null) },
      ]);
    }
  }

  protected salvar(): void {
    const linhas = this.linhas();
    if (linhas.some((l) => !l.nome.value.trim())) {
      linhas.forEach((l) => l.nome.markAsTouched());
      this.toast.erro('Informe o nome de cada estágio.');
      return;
    }
    const repetido = nomeRepetido([...linhas.map((l) => l.nome.value), ...this.fixos.map((f) => f.nome)]);
    if (repetido) {
      this.toast.erro(`Já existe um estágio chamado "${repetido}".`);
      return;
    }
    const semDestino = this.removidosComLeads().find((r) => !r.destino.value);
    if (semDestino) {
      this.toast.erro(`Escolha para onde vão os leads de "${semDestino.nome}".`);
      return;
    }
    const pedido = montarPedidoEstagios(
      linhas.map((l) => ({ id: l.id, nome: l.nome.value, cor: l.cor.value })),
      this.corContratado.value,
      this.corDescartado.value,
      this.removidos().map((r) => ({ id: r.id, destinoId: r.destino.value })),
    );
    this.salvando.set(true);
    this.negocio.salvarEstagiosFunil(pedido).subscribe({
      next: () => {
        this.toast.sucesso('Estágios salvos.');
        this.ref.close(true);
      },
      error: (erro: unknown) => {
        this.salvando.set(false);
        this.toast.erro(mensagemDeErro(erro));
      },
    });
  }

  private linha(id: string | null, nome: string, cor: string, quantidade: number): LinhaEstagio {
    return {
      id,
      nome: this.fb.nonNullable.control(nome, Validators.required),
      cor: this.fb.nonNullable.control(cor),
      quantidade,
    };
  }
}

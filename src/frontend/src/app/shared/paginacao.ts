import { computed, Injectable, Signal, signal } from '@angular/core';
import { MatPaginatorIntl, PageEvent } from '@angular/material/paginator';

/**
 * Paginação padrão do sistema (docs/design-system.md, "Paginação"): `mat-paginator` do Tailwind Admin, com botões
 * de primeira/última página e 50, 100 ou 150 itens por página.
 */
export const TAMANHOS_PAGINA = [50, 100, 150];

/** Textos do paginador em português; registrado no app.config.ts. */
@Injectable()
export class PaginadorPtBr extends MatPaginatorIntl {
  override itemsPerPageLabel = 'Itens por página:';
  override nextPageLabel = 'Próxima página';
  override previousPageLabel = 'Página anterior';
  override firstPageLabel = 'Primeira página';
  override lastPageLabel = 'Última página';
  override getRangeLabel = (pagina: number, tamanho: number, total: number): string => {
    if (total === 0) {
      return '0 de 0';
    }
    const inicio = pagina * tamanho;
    const fim = Math.min(inicio + tamanho, total);
    const n = (valor: number) => valor.toLocaleString('pt-BR');
    return `${n(inicio + 1)} – ${n(fim)} de ${n(total)}`;
  };
}

/**
 * Estado da página de uma lista já carregada inteira. Uso:
 * `protected readonly pagina = new Paginacao(this.itensFiltrados);` e, no template,
 * `[dataSource]="pagina.itens()"` + `<mat-paginator ... (page)="pagina.mudar($event)">`.
 * Ao trocar busca ou filtro, chame `pagina.inicio()` para voltar à primeira página.
 */
export class Paginacao<T> {
  readonly indice = signal(0);
  readonly tamanho = signal(TAMANHOS_PAGINA[0]);
  readonly tamanhos = TAMANHOS_PAGINA;
  readonly total = computed(() => this.lista().length);
  readonly itens = computed(() => {
    const inicio = this.indice() * this.tamanho();
    return this.lista().slice(inicio, inicio + this.tamanho());
  });

  constructor(private readonly lista: Signal<T[]>) {}

  mudar(evento: PageEvent): void {
    this.tamanho.set(evento.pageSize);
    this.indice.set(evento.pageIndex);
  }

  inicio(): void {
    this.indice.set(0);
  }
}

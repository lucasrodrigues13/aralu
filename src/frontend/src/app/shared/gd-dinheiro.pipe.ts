import { Pipe, PipeTransform } from '@angular/core';
import { numeroParaDinheiro } from './mascaras';

@Pipe({ name: 'gdDinheiro' })
export class GdDinheiroPipe implements PipeTransform {
  transform(valor: number | null | undefined): string {
    if (valor === null || valor === undefined || Number.isNaN(Number(valor))) {
      return '—';
    }

    return numeroParaDinheiro(valor);
  }
}

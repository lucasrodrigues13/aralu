import { Pipe, PipeTransform } from '@angular/core';
import { formatarHora24 } from './mascaras';

@Pipe({ name: 'gdHora' })
export class GdHoraPipe implements PipeTransform {
  transform(valor: string | null | undefined): string {
    return formatarHora24(valor);
  }
}

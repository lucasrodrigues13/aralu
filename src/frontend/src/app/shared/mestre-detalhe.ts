import { moveItemInArray } from '@angular/cdk/drag-drop';
import { FormArray } from '@angular/forms';

/** Reordena os controles de um FormArray depois de arrastar (o cdk só move itens de array comum). */
export function moverControle(lista: FormArray, de: number, para: number): void {
  const controles = [...lista.controls];
  moveItemInArray(controles, de, para);
  lista.clear();
  controles.forEach((controle) => lista.push(controle));
}

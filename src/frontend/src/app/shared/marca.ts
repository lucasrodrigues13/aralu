import { Component, input } from '@angular/core';

/**
 * Logo aralu. A assinatura troca para a versão creme no modo escuro (ou quando `sobreEscuro`),
 * porque as letras petróleo somem em fundo escuro.
 */
@Component({
  selector: 'app-marca',
  host: { class: 'logo-aralu', '[class.sobre-escuro]': 'sobreEscuro()', '[style.--logo-altura.px]': 'altura()' },
  template: `
    @if (icone()) {
      <img src="marca/aralu-icone.svg" alt="aralu" />
    } @else {
      <img class="logo-petroleo" src="marca/aralu.svg" alt="aralu" />
      <img class="logo-creme" src="marca/aralu-claro.svg" alt="" aria-hidden="true" />
    }
  `,
})
export class Marca {
  /** Altura da assinatura em pixels. */
  readonly altura = input(32);
  /** Mostra só o ícone (a com brilho, no quadrado creme). */
  readonly icone = input(false);
  /** Força a versão creme, para fundos escuros no modo claro. */
  readonly sobreEscuro = input(false);
}

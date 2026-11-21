import { Component, inject, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { TemaService } from './core/tema.service';
import { CarregandoOverlay } from './shared/carregando-overlay';
import { TemaBotao } from './shared/tema-botao';

@Component({
  imports: [RouterOutlet, TemaBotao, CarregandoOverlay],
  selector: 'app-root',
  styleUrl: './app.scss',
  templateUrl: './app.html',
})
export class App {
  protected readonly title = signal('aralu');

  constructor() {
    inject(TemaService);
  }
}

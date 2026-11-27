import { Component, computed, inject, input, OnInit, output } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { cardsPorSituacao, FiltroDeConvites } from './convite-lista';
import { GdDataPipe } from './gd-data.pipe';
import { MascaraDirective } from './mascara.directive';

/**
 * Topo da aba Convidados (SPEC-059 §6.5), igual na organizadora e no link do cliente: cards por situação (clicáveis
 * para filtrar), prazo e data de envio, ferramentas (Data de envio, Prazo de confirmação, Lista de presença,
 * Importar, Novo convite) e filtros. A lista entra pelo conteúdo projetado. O filtro de observação só aparece
 * onde a observação é visível (organizadora).
 */
@Component({
  selector: 'app-convidados-topo',
  imports: [ReactiveFormsModule, MatCardModule, MatButtonModule, MatIconModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatCheckboxModule, MascaraDirective, GdDataPipe],
  template: `
    <div class="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-6">
      @for (item of cards(); track item.valor) {
        <button type="button" class="card-situacao text-start p-0 border-0 bg-transparent cursor-pointer" [attr.aria-label]="item.titulo" [attr.aria-pressed]="filtro.controls.situacao.value === item.valor" (click)="filtrarPorSituacao(item.valor)">
          <mat-card class="shadow-none text-center mb-0! h-full {{ 'bg-light-' + item.cor }}" [class.ring-2]="filtro.controls.situacao.value === item.valor">
            <mat-card-content>
              <mat-icon class="{{ 'text-' + item.cor }}">{{ item.icone }}</mat-icon>
              <h4 class="text-sm font-semibold mt-2! {{ 'text-' + item.cor }}">{{ item.titulo }}</h4>
              <h6 class="text-xl font-semibold mt-2! {{ 'text-' + item.cor }}">{{ item.quantidade }}</h6>
            </mat-card-content>
          </mat-card>
        </button>
      }
    </div>

    <mat-card class="cardWithShadow">
      <div class="p-6">
        <div>
          <mat-card-title class="mb-0">Convites e convidados</mat-card-title>
          <mat-card-subtitle>Lista do evento e o RSVP de cada convite.</mat-card-subtitle>
          <p class="text-sm text-muted mt-1 mb-0" data-teste="prazo-rsvp">
            @if (prazoRsvp(); as prazo) {
              Confirmar presença até {{ prazo | gdData }}@if (prazoEncerrado()) { · <strong>Prazo encerrado</strong> }
            } @else {
              Sem prazo para confirmar presença.
            }
          </p>
          <p class="text-sm text-muted mt-1 mb-0" data-teste="envio-convites">
            @if (dataEnvio(); as envio) {
              Envio dos convites em {{ envio | gdData }}
            } @else {
              Data de envio dos convites não definida.
            }
          </p>
        </div>
      </div>
      <mat-card-content class="border-t border-border">
        <div class="barra-lista barra-lista-alta">
          <div class="barra-lista-filtros flex-col items-start!">
        <ng-content select="[antesDoFiltro]" />
        <form class="flex flex-wrap items-end gap-4" [formGroup]="filtro" (ngSubmit)="emitirFiltro()">
          <div class="campo w-full sm:w-64">
            <mat-label class="font-semibold mb-2 block">Convite</mat-label>
            <mat-form-field appearance="outline" class="w-full">
              <mat-icon matIconPrefix>search</mat-icon>
              <input matInput formControlName="nome" aria-label="Convite" placeholder="Ex.: Família Souza" />
            </mat-form-field>
          </div>
          <div class="campo w-full sm:w-44">
            <mat-label class="font-semibold mb-2 block">Situação</mat-label>
            <mat-form-field appearance="outline" class="w-full">
              <mat-select formControlName="situacao" aria-label="Situação">
                <mat-option value="">Todas</mat-option>
                <mat-option value="Pendente">Pendente</mat-option>
                <mat-option value="Confirmado">Confirmado</mat-option>
                <mat-option value="NaoComparecera">Não comparecerá</mat-option>
              </mat-select>
            </mat-form-field>
          </div>
          <div class="campo w-full sm:w-44">
            <mat-label class="font-semibold mb-2 block">Telefone</mat-label>
            <mat-form-field appearance="outline" class="w-full">
              <input matInput formControlName="telefone" gdMascara="celular" aria-label="Telefone" placeholder="(11) 90000-0000" />
            </mat-form-field>
          </div>
          @if (mostrarObservacao()) {
            <div class="campo w-full sm:w-44">
              <mat-label class="font-semibold mb-2 block">Observação</mat-label>
              <mat-form-field appearance="outline" class="w-full">
                <input matInput formControlName="observacao" aria-label="Observação" placeholder="Ex.: vegetariano" />
              </mat-form-field>
            </div>
          }
          <mat-checkbox formControlName="somenteConfirmados" class="mb-1">Só confirmados</mat-checkbox>
          <button mat-flat-button type="submit">Filtrar</button>
        </form>
          </div>
          <div class="barra-lista-acoes">
            <button mat-stroked-button type="button" (click)="envio.emit()"><mat-icon>send</mat-icon> Data de envio</button>
            <button mat-stroked-button type="button" (click)="prazo.emit()"><mat-icon>event_busy</mat-icon> Prazo de confirmação</button>
            <button mat-stroked-button type="button" (click)="presencas.emit()"><mat-icon>fact_check</mat-icon> Lista de presença</button>
            <button mat-stroked-button type="button" (click)="importar.emit()"><mat-icon>upload_file</mat-icon> Importar planilha</button>
            <button mat-flat-button type="button" (click)="novoConvite.emit()"><mat-icon>add</mat-icon> Novo convite</button>
          </div>
        </div>
        <ng-content />
      </mat-card-content>
    </mat-card>
  `,
})
export class ConvidadosTopoComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  readonly porSituacao = input<{ rotulo: string; quantidade: number }[]>([]);
  readonly prazoRsvp = input<string | null>(null);
  readonly prazoEncerrado = input(false);
  readonly dataEnvio = input<string | null>(null);
  readonly mostrarObservacao = input(true);
  readonly situacaoInicial = input('');
  readonly filtrar = output<FiltroDeConvites>();
  readonly novoConvite = output<void>();
  readonly envio = output<void>();
  readonly prazo = output<void>();
  readonly presencas = output<void>();
  readonly importar = output<void>();

  protected readonly cards = computed(() => cardsPorSituacao(this.porSituacao()));
  protected readonly filtro = this.fb.nonNullable.group({ nome: '', situacao: '', telefone: '', observacao: '', somenteConfirmados: false });

  ngOnInit(): void {
    if (this.situacaoInicial()) this.filtro.patchValue({ situacao: this.situacaoInicial() });
  }

  protected filtrarPorSituacao(valor: string): void {
    const atual = this.filtro.controls.situacao.value;
    this.filtro.controls.situacao.setValue(atual === valor ? '' : valor);
    this.emitirFiltro();
  }

  protected emitirFiltro(): void {
    this.filtrar.emit(this.filtro.getRawValue());
  }

}

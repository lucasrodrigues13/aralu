import { Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatTabsModule } from '@angular/material/tabs';
import { mensagemDeErro } from '../../core/mensagem-erro';
import { CatalogoRelatoriosFunil, NegocioClient } from '../../core/negocio.client';
import { ToastService } from '../../core/toast.service';
import { CampoDataComponent } from '../../shared/campo-data';
import { GdDinheiroPipe } from '../../shared/gd-dinheiro.pipe';
import { deDataParaIso } from '../../shared/data';

@Component({
  selector: 'app-relatorios-funil',
  imports: [MatCardModule, ReactiveFormsModule, MatButtonModule, MatFormFieldModule, MatIconModule, MatTableModule, MatTabsModule, CampoDataComponent, GdDinheiroPipe],
  template: `
    <mat-card class="cardWithShadow">
      <div class="p-6 flex flex-wrap items-center justify-between gap-4">
      <div><mat-card-title class="mb-0">Relatórios do funil</mat-card-title><mat-card-subtitle>Catálogo de métricas comerciais da conta.</mat-card-subtitle></div>
      <button mat-stroked-button type="button" (click)="exportar()"><mat-icon>download</mat-icon> Exportar</button>
    </div>
      <mat-card-content class="border-t border-border">
      <form class="flex flex-wrap items-end gap-4 mb-6" [formGroup]="periodo" (ngSubmit)="carregar()">
        <app-campo-data class="w-full sm:w-40" formControlName="inicio" rotulo="Início" />
        <app-campo-data class="w-full sm:w-40" formControlName="fim" rotulo="Fim" />
        <button mat-flat-button type="submit">Atualizar</button>
      </form>
      @if (dados(); as catalogo) {
        <mat-tab-group class="catalogo" mat-align-tabs="start" animationDuration="0ms">
          @for (bloco of blocos(catalogo); track bloco.titulo) {
            <mat-tab [label]="bloco.titulo">
            <article class="pt-4">
              <h2>{{ bloco.titulo }}</h2>
              @if (bloco.linhas.length === 0) {
                <p class="text-center text-muted py-10">Sem movimento no período.</p>
              } @else {
                <table mat-table class="min-w-full" [dataSource]="bloco.linhas">
                  <ng-container matColumnDef="chave">
                    <th mat-header-cell *matHeaderCellDef>Item</th>
                    <td mat-cell *matCellDef="let item">{{ item.chave }}</td>
                  </ng-container>
                  <ng-container matColumnDef="quantidade">
                    <th mat-header-cell *matHeaderCellDef>Qtd</th>
                    <td mat-cell *matCellDef="let item">{{ item.quantidade }}</td>
                  </ng-container>
                  <ng-container matColumnDef="valor">
                    <th mat-header-cell *matHeaderCellDef>Valor</th>
                    <td mat-cell *matCellDef="let item">{{ item.valor | gdDinheiro }}</td>
                  </ng-container>
                  <tr mat-header-row *matHeaderRowDef="colunas"></tr>
                  <tr mat-row *matRowDef="let row; columns: colunas"></tr>
                </table>
              }
            </article>
            </mat-tab>
          }
          <mat-tab label="9. Oportunidades de RSVP">
          <article class="pt-4">
            <h2>Oportunidades de RSVP</h2>
            <div class="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6 mb-6">
              <div><mat-card class="shadow-none text-center mb-0! h-full bg-light-primary"><mat-card-content><h4 class="text-sm font-semibold text-primary">Visualizações</h4><h6 class="text-xl font-semibold text-primary mt-2!">{{ catalogo.oportunidadesRsvp.visualizacoes }}</h6></mat-card-content></mat-card></div>
              <div><mat-card class="shadow-none text-center mb-0! h-full bg-light-primary"><mat-card-content><h4 class="text-sm font-semibold text-primary">Cliques</h4><h6 class="text-xl font-semibold text-primary mt-2!">{{ catalogo.oportunidadesRsvp.cliquesBotao }}</h6></mat-card-content></mat-card></div>
              <div><mat-card class="shadow-none text-center mb-0! h-full bg-light-primary"><mat-card-content><h4 class="text-sm font-semibold text-primary">Contatados</h4><h6 class="text-xl font-semibold text-primary mt-2!">{{ catalogo.oportunidadesRsvp.contatados }}</h6></mat-card-content></mat-card></div>
              <div><mat-card class="shadow-none text-center mb-0! h-full bg-light-primary"><mat-card-content><h4 class="text-sm font-semibold text-primary">Descartados</h4><h6 class="text-xl font-semibold text-primary mt-2!">{{ catalogo.oportunidadesRsvp.descartados }}</h6></mat-card-content></mat-card></div>
              <div><mat-card class="shadow-none text-center mb-0! h-full bg-light-primary"><mat-card-content><h4 class="text-sm font-semibold text-primary">Geradas</h4><h6 class="text-xl font-semibold text-primary mt-2!">{{ catalogo.oportunidadesRsvp.geradas }}</h6></mat-card-content></mat-card></div>
              <div><mat-card class="shadow-none text-center mb-0! h-full bg-light-primary"><mat-card-content><h4 class="text-sm font-semibold text-primary">Conversão %</h4><h6 class="text-xl font-semibold text-primary mt-2!">{{ catalogo.oportunidadesRsvp.conversao }}</h6></mat-card-content></mat-card></div>
              <div><mat-card class="shadow-none text-center mb-0! h-full bg-light-primary"><mat-card-content><h4 class="text-sm font-semibold text-primary">Conversões anteriores</h4><h6 class="text-xl font-semibold text-primary mt-2!">{{ catalogo.oportunidadesRsvp.conversoesAnteriores }}</h6></mat-card-content></mat-card></div>
            </div>
          </article>
          </mat-tab>
        </mat-tab-group>
      }
    </mat-card-content>
    </mat-card>
  `,
  styles: `
    article h2 { margin: 0 0 8px; font-size: 1rem; }
  `,
})
export class RelatoriosFunilPage implements OnInit {
  private readonly negocio = inject(NegocioClient);
  private readonly toast = inject(ToastService);
  private readonly fb = inject(FormBuilder);
  protected readonly dados = signal<CatalogoRelatoriosFunil | null>(null);
  protected readonly colunas = ['chave', 'quantidade', 'valor'];
  protected readonly periodo = this.fb.nonNullable.group({
    inicio: this.fb.control<Date | null>(primeiroDoMes(), Validators.required),
    fim: this.fb.control<Date | null>(new Date(), Validators.required),
  });

  ngOnInit(): void {
    this.carregar();
  }

  protected blocos(catalogo: CatalogoRelatoriosFunil): { titulo: string; linhas: { chave: string; quantidade: number; valor: number }[] }[] {
    return [
      { titulo: '1. Negócios fechados x perdidos', linhas: catalogo.fechadosPerdidos },
      { titulo: '2. Por fonte', linhas: catalogo.porFonte },
      { titulo: '3. Por serviço/produto', linhas: catalogo.porServicoProduto },
      { titulo: '4. Por estágio', linhas: catalogo.porEstagio },
      {
        titulo: '5. Por região',
        linhas: catalogo.porRegiao.map((r) => ({ chave: `${r.uf} / ${r.cidade}`, quantidade: r.quantidade, valor: r.valor })),
      },
      { titulo: '6. Por responsável', linhas: catalogo.porResponsavel },
      { titulo: '7. Por data prevista', linhas: catalogo.porDataPrevista },
      { titulo: '8. Por motivos de descarte', linhas: catalogo.porMotivosDescarte },
    ];
  }

  protected carregar(): void {
    if (this.periodo.invalid) {
      this.toast.erro('Informe um período válido.');
      return;
    }
    const v = this.periodo.getRawValue();
    const inicio = deDataParaIso(v.inicio)!;
    const fim = deDataParaIso(v.fim)!;
    this.negocio.relatoriosFunil(inicio, fim).subscribe({
      next: (dados) => this.dados.set(dados),
      error: (erro: unknown) => this.toast.erro(mensagemDeErro(erro)),
    });
  }

  protected exportar(): void {
    const v = this.periodo.getRawValue();
    const inicio = deDataParaIso(v.inicio);
    const fim = deDataParaIso(v.fim);
    if (!inicio || !fim) return;
    this.negocio.exportarRelatoriosFunil(inicio, fim).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'relatorios-funil.csv';
        a.click();
        URL.revokeObjectURL(url);
      },
      error: (erro: unknown) => this.toast.erro(mensagemDeErro(erro)),
    });
  }
}

function primeiroDoMes(): Date {
  const hoje = new Date();
  return new Date(hoje.getFullYear(), hoje.getMonth(), 1);
}

import { CurrencyPipe } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { mensagemDeErro } from '../../core/mensagem-erro';
import { Plano, PlanosClient, RECURSOS_PLANO, SalvarPlano } from '../../core/planos.client';
import { ToastService } from '../../core/toast.service';

interface Edicao extends SalvarPlano {
  id: string | null;
  marcados: Record<string, { ligado: boolean; limite: number | null }>;
}

/** Admin → Planos (SPEC-062 §13): lista com valor, público, ativo e contas; editor com recursos e limite. */
@Component({
  selector: 'app-planos-admin',
  imports: [FormsModule, MatCardModule, MatButtonModule, MatCheckboxModule, MatFormFieldModule, MatInputModule, CurrencyPipe],
  template: `
    <mat-card class="cardWithShadow">
      <div class="p-6 flex items-center justify-between gap-3">
        <div>
          <mat-card-title class="mb-0">Planos</mat-card-title>
          <mat-card-subtitle>Mudar o preço vale para assinaturas novas; quem já assina segue com o valor dela.</mat-card-subtitle>
        </div>
        <button mat-flat-button type="button" (click)="novo()">Novo plano</button>
      </div>
      <mat-card-content class="border-t border-border">
        <table class="tabela">
          <thead>
            <tr>
              <th>Plano</th>
              <th>Valor</th>
              <th>Público</th>
              <th>Ativo</th>
              <th>Contas</th>
              <th class="text-end! whitespace-nowrap">Ações</th>
            </tr>
          </thead>
          <tbody>
            @for (p of planos(); track p.id) {
              <tr>
                <td><button type="button" class="link-nome" (click)="editar(p)">{{ p.nome }}</button> @if (p.padrao) { <small class="text-muted">(padrão)</small> }</td>
                <td>{{ p.valorMensal | currency: 'BRL' }}</td>
                <td>{{ p.publico ? 'Sim' : 'Não' }}</td>
                <td>{{ p.ativo ? 'Sim' : 'Não' }}</td>
                <td>{{ p.contas }}</td>
                <td class="text-end! whitespace-nowrap"><button mat-stroked-button type="button" (click)="editar(p)">Editar</button></td>
              </tr>
            }
          </tbody>
        </table>

        @if (edicao(); as e) {
          <form class="grid gap-4 mt-8 max-w-xl" (ngSubmit)="salvar()">
            <h3 class="font-semibold">{{ e.id ? 'Editar plano' : 'Novo plano' }}</h3>
            <mat-form-field appearance="outline"><mat-label>Código</mat-label><input matInput name="codigo" required maxlength="40" [(ngModel)]="e.codigo" /></mat-form-field>
            <mat-form-field appearance="outline"><mat-label>Nome</mat-label><input matInput name="nome" required maxlength="80" [(ngModel)]="e.nome" /></mat-form-field>
            <mat-form-field appearance="outline"><mat-label>Descrição</mat-label><textarea matInput name="descricao" [(ngModel)]="e.descricao"></textarea></mat-form-field>
            <mat-form-field appearance="outline"><mat-label>Valor mensal (R$)</mat-label><input matInput type="number" min="0" step="0.01" name="valor" required [(ngModel)]="e.valorMensal" /></mat-form-field>
            <div class="flex gap-6 flex-wrap">
              <mat-checkbox name="publico" [(ngModel)]="e.publico">Público (o Dono pode escolher)</mat-checkbox>
              <mat-checkbox name="ativo" [(ngModel)]="e.ativo">Ativo</mat-checkbox>
              <mat-checkbox name="padrao" [(ngModel)]="e.padrao">Padrão (trial e oferta principal)</mat-checkbox>
            </div>
            <div class="grid gap-2">
              <span class="font-semibold">Recursos</span>
              @for (r of recursos; track r.recurso) {
                <div class="flex items-center gap-4">
                  <mat-checkbox [name]="'r-' + r.recurso" [(ngModel)]="e.marcados[r.recurso].ligado">{{ r.rotulo }}</mat-checkbox>
                  @if (e.marcados[r.recurso].ligado) {
                    <mat-form-field appearance="outline" class="w-40"><mat-label>Limite/mês</mat-label><input matInput type="number" min="0" [name]="'l-' + r.recurso" [(ngModel)]="e.marcados[r.recurso].limite" /></mat-form-field>
                  }
                </div>
              }
            </div>
            <div class="flex gap-3">
              <button mat-flat-button type="submit">Salvar</button>
              <button mat-stroked-button type="button" (click)="edicao.set(null)">Cancelar</button>
            </div>
          </form>
        }
      </mat-card-content>
    </mat-card>
  `,
})
export class PlanosAdminPage implements OnInit {
  private readonly cliente = inject(PlanosClient);
  private readonly toast = inject(ToastService);
  protected readonly planos = signal<Plano[]>([]);
  protected readonly edicao = signal<Edicao | null>(null);
  protected readonly recursos = RECURSOS_PLANO;

  ngOnInit(): void {
    this.carregar();
  }

  protected novo(): void {
    this.edicao.set(this.montar(null));
  }

  protected editar(plano: Plano): void {
    this.edicao.set(this.montar(plano));
  }

  protected salvar(): void {
    const e = this.edicao();
    if (!e) return;
    const pedido: SalvarPlano = {
      codigo: e.codigo,
      nome: e.nome,
      descricao: e.descricao,
      valorMensal: Number(e.valorMensal),
      publico: e.publico,
      padrao: e.padrao,
      ativo: e.ativo,
      ordem: e.ordem,
      recursos: Object.entries(e.marcados)
        .filter(([, v]) => v.ligado)
        .map(([recurso, v]) => ({ recurso, limite: v.limite === null || v.limite === undefined || `${v.limite}` === '' ? null : Number(v.limite) })),
    };
    (e.id ? this.cliente.atualizar(e.id, pedido) : this.cliente.criar(pedido)).subscribe({
      next: () => {
        this.toast.sucesso('Plano salvo.');
        this.edicao.set(null);
        this.carregar();
      },
      error: (erro: unknown) => this.toast.erro(mensagemDeErro(erro)),
    });
  }

  private montar(plano: Plano | null): Edicao {
    const marcados: Edicao['marcados'] = {};
    for (const r of RECURSOS_PLANO) {
      const atual = plano?.recursos.find((x) => x.recurso === r.recurso);
      marcados[r.recurso] = { ligado: !!atual, limite: atual?.limite ?? null };
    }
    return {
      id: plano?.id ?? null,
      codigo: plano?.codigo ?? '',
      nome: plano?.nome ?? '',
      descricao: plano?.descricao ?? null,
      valorMensal: plano?.valorMensal ?? 0,
      publico: plano?.publico ?? false,
      padrao: plano?.padrao ?? false,
      ativo: plano?.ativo ?? true,
      ordem: plano?.ordem ?? 0,
      recursos: plano?.recursos ?? [],
      marcados,
    };
  }

  private carregar(): void {
    this.cliente.listar().subscribe({
      next: (lista) => this.planos.set(lista),
      error: (erro: unknown) => this.toast.erro(mensagemDeErro(erro)),
    });
  }
}

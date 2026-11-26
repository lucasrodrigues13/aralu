import { Component, inject, OnInit, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AssistentesClient, GrupoAcesso, MODULOS_GRUPO } from '../../core/assistentes.client';
import { mensagemDeErro } from '../../core/mensagem-erro';
import { ToastService } from '../../core/toast.service';
import { ConfirmaDialog } from '../../shared/confirma-dialog';
import { DIALOG_LARGO, DIALOG_PEQUENO } from '../../shared/dialog';
import { GrupoFormDialog } from './grupo-form.dialog';

/** Configurações → Grupos (só o Dono, SPEC-062 §13): lista com número de membros, criar, editar e apagar. */
@Component({
  selector: 'app-grupos',
  imports: [MatCardModule, MatButtonModule, MatIconModule, MatTooltipModule],
  template: `
    <mat-card class="cardWithShadow">
      <div class="p-6">
        <mat-card-title class="mb-0">Grupos de acesso</mat-card-title>
        <mat-card-subtitle>O que cada membro da equipe vê e faz. O Dono não pertence a grupo: pode tudo.</mat-card-subtitle>
      </div>
      <mat-card-content class="border-t border-border">
        <div class="barra-lista">
          <div class="barra-lista-filtros"></div>
          <div class="barra-lista-acoes">
            <button mat-flat-button type="button" (click)="abrir()"><mat-icon>group_add</mat-icon> Novo grupo</button>
          </div>
        </div>
        @if (carregando()) {
          <p class="text-center text-muted py-10">Carregando...</p>
        } @else if (itens().length === 0) {
          <p class="text-center text-muted py-10">Nenhum grupo. Crie um para convidar membros.</p>
        } @else {
          <div class="overflow-x-auto">
            <table class="w-full text-left">
              <thead>
                <tr>
                  <th class="py-3 pr-4 font-semibold">Grupo</th>
                  <th class="py-3 pr-4 font-semibold">Membros</th>
                  <th class="py-3 pr-4 font-semibold">Eventos</th>
                  <th class="py-3 pr-4 font-semibold">Módulos que vê</th>
                  <th class="py-3 font-semibold"><span class="sr-only">Ações</span></th>
                </tr>
              </thead>
              <tbody>
                @for (item of itens(); track item.id) {
                  <tr class="border-t border-border">
                    <td class="py-3 pr-4">{{ item.nome }}</td>
                    <td class="py-3 pr-4">{{ item.membros }}</td>
                    <td class="py-3 pr-4">{{ item.veTodosEventos ? 'Todos' : 'Só os atribuídos' }}</td>
                    <td class="py-3 pr-4">{{ modulosQueVe(item) }}</td>
                    <td class="py-3 whitespace-nowrap text-right">
                      <button mat-icon-button type="button" [attr.aria-label]="'Editar ' + item.nome" [matTooltip]="'Editar ' + item.nome" (click)="abrir(item)"><mat-icon>edit</mat-icon></button>
                      <button mat-icon-button type="button" [attr.aria-label]="'Apagar ' + item.nome" [matTooltip]="'Apagar ' + item.nome" (click)="apagar(item)"><mat-icon>delete</mat-icon></button>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }
      </mat-card-content>
    </mat-card>
  `,
})
export class GruposPage implements OnInit {
  private readonly cliente = inject(AssistentesClient);
  private readonly dialog = inject(MatDialog);
  private readonly toast = inject(ToastService);
  protected readonly itens = signal<GrupoAcesso[]>([]);
  protected readonly carregando = signal(true);

  ngOnInit(): void {
    this.carregar();
  }

  protected modulosQueVe(grupo: GrupoAcesso): string {
    const vistos = MODULOS_GRUPO.filter((m) => grupo.permissoes.some((p) => p.modulo === m.modulo && p.ver)).map((m) => m.rotulo);
    if (vistos.length === 0) return 'Nenhum';
    return vistos.length === MODULOS_GRUPO.length ? 'Todos' : vistos.join(', ');
  }

  protected abrir(grupo?: GrupoAcesso): void {
    this.dialog
      .open(GrupoFormDialog, { ...DIALOG_LARGO, data: { grupo } })
      .afterClosed()
      .subscribe((salvou) => {
        if (salvou) this.carregar();
      });
  }

  protected apagar(grupo: GrupoAcesso): void {
    if (grupo.membros > 0) {
      this.toast.erro(grupo.membros === 1 ? 'Mova o membro deste grupo antes de apagá-lo.' : `Mova os ${grupo.membros} membros deste grupo antes de apagá-lo.`);
      return;
    }

    this.dialog
      .open(ConfirmaDialog, {
        ...DIALOG_PEQUENO,
        data: { titulo: 'Apagar grupo', texto: `O grupo ${grupo.nome} será apagado.`, confirmar: 'Apagar grupo' },
      })
      .afterClosed()
      .subscribe((confirmou) => {
        if (!confirmou) return;
        this.cliente.excluirGrupo(grupo.id).subscribe({
          next: () => {
            this.toast.sucesso('Grupo apagado.');
            this.carregar();
          },
          error: (erro: unknown) => this.toast.erro(mensagemDeErro(erro)),
        });
      });
  }

  private carregar(): void {
    this.cliente.grupos().subscribe({
      next: (lista) => {
        this.itens.set(lista);
        this.carregando.set(false);
      },
      error: (erro: unknown) => {
        this.carregando.set(false);
        this.toast.erro(mensagemDeErro(erro));
      },
    });
  }
}

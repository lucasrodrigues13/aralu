import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { AssistentesClient, GrupoAcesso, MODULOS_GRUPO, PermissaoGrupo } from '../../core/assistentes.client';
import { mensagemDeErro } from '../../core/mensagem-erro';
import { ToastService } from '../../core/toast.service';
import { FecharModal } from '../../shared/fechar-modal';

export interface GrupoFormDados {
  grupo?: GrupoAcesso;
}

/** Editor de grupo (SPEC-062 §9 e §13): nome, alcance de eventos e a grade módulo × ver/editar/excluir. */
@Component({
  selector: 'app-grupo-form',
  imports: [FecharModal, FormsModule, MatDialogModule, MatButtonModule, MatCheckboxModule, MatFormFieldModule, MatInputModule, MatSelectModule],
  template: `
    <h2 mat-dialog-title>{{ dados.grupo ? 'Editar grupo' : 'Novo grupo' }} <app-fechar-modal [manual]="true" (fechar)="ref.close(false)" /></h2>
    <mat-dialog-content>
      <form id="grupo-form" (ngSubmit)="salvar()" class="grid gap-4">
        <div class="campo">
          <mat-label class="font-semibold mb-2 block">Nome do grupo</mat-label>
          <mat-form-field appearance="outline" class="w-full">
            <input matInput aria-label="Nome do grupo" name="nome" maxlength="60" required [(ngModel)]="nome" />
          </mat-form-field>
        </div>
        <div class="campo">
          <mat-label class="font-semibold mb-2 block">Eventos que o grupo vê</mat-label>
          <mat-form-field appearance="outline" class="w-full">
            <mat-select aria-label="Eventos que o grupo vê" name="veTodosEventos" [(ngModel)]="veTodosEventos">
              <mat-option [value]="true">Todos os eventos da conta</mat-option>
              <mat-option [value]="false">Só os eventos em que a pessoa está atribuída</mat-option>
            </mat-select>
          </mat-form-field>
        </div>
        <div class="overflow-x-auto">
          <table class="w-full text-left text-sm">
            <thead>
              <tr>
                <th class="py-2 pr-4 font-semibold">Módulo</th>
                <th class="py-2 px-2 font-semibold text-center">Ver</th>
                <th class="py-2 px-2 font-semibold text-center">Editar</th>
                <th class="py-2 px-2 font-semibold text-center">Excluir</th>
              </tr>
            </thead>
            <tbody>
              @for (linha of linhas(); track linha.modulo) {
                <tr class="border-t border-border">
                  <td class="py-2 pr-4">
                    <span class="font-semibold">{{ rotulo(linha.modulo) }}</span>
                    <span class="block text-muted text-xs">{{ cobre(linha.modulo) }}</span>
                  </td>
                  <td class="text-center">
                    <mat-checkbox [attr.aria-label]="'Ver ' + rotulo(linha.modulo)" [checked]="linha.ver" (change)="marcar(linha, 'ver', $event.checked)" />
                  </td>
                  <td class="text-center">
                    <mat-checkbox [attr.aria-label]="'Editar ' + rotulo(linha.modulo)" [checked]="linha.editar" (change)="marcar(linha, 'editar', $event.checked)" />
                  </td>
                  <td class="text-center">
                    <mat-checkbox [attr.aria-label]="'Excluir ' + rotulo(linha.modulo)" [checked]="linha.excluir" (change)="marcar(linha, 'excluir', $event.checked)" />
                  </td>
                </tr>
              }
            </tbody>
          </table>
          <p class="text-muted text-xs mt-2">Editar ou excluir marca também "ver". Sem "ver", o módulo some do menu de quem está no grupo.</p>
        </div>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-stroked-button type="button" (click)="ref.close(false)">Cancelar</button>
      <button mat-flat-button type="submit" form="grupo-form" [disabled]="enviando">{{ dados.grupo ? 'Salvar' : 'Criar grupo' }}</button>
    </mat-dialog-actions>
  `,
})
export class GrupoFormDialog {
  protected readonly dados = inject<GrupoFormDados>(MAT_DIALOG_DATA);
  protected readonly ref = inject(MatDialogRef<GrupoFormDialog, boolean>);
  private readonly cliente = inject(AssistentesClient);
  private readonly toast = inject(ToastService);
  protected enviando = false;
  protected nome = this.dados.grupo?.nome ?? '';
  protected veTodosEventos = this.dados.grupo?.veTodosEventos ?? true;
  protected readonly linhas = signal<PermissaoGrupo[]>(
    MODULOS_GRUPO.map(({ modulo }) => {
      const atual = this.dados.grupo?.permissoes.find((p) => p.modulo === modulo);
      return { modulo, ver: atual?.ver ?? false, editar: atual?.editar ?? false, excluir: atual?.excluir ?? false };
    }),
  );

  protected rotulo(modulo: string): string {
    return MODULOS_GRUPO.find((m) => m.modulo === modulo)?.rotulo ?? modulo;
  }

  protected cobre(modulo: string): string {
    return MODULOS_GRUPO.find((m) => m.modulo === modulo)?.cobre ?? '';
  }

  /** Editar ou excluir sem ver não vale (§9): marcar um deles liga "ver"; desligar "ver" desliga os dois. */
  protected marcar(linha: PermissaoGrupo, campo: 'ver' | 'editar' | 'excluir', valor: boolean): void {
    this.linhas.update((lista) =>
      lista.map((item) => {
        if (item.modulo !== linha.modulo) return item;
        const novo = { ...item, [campo]: valor };
        if (campo !== 'ver' && valor) novo.ver = true;
        if (campo === 'ver' && !valor) {
          novo.editar = false;
          novo.excluir = false;
        }
        return novo;
      }),
    );
  }

  protected salvar(): void {
    const nome = this.nome.trim();
    if (!nome) {
      this.toast.erro('Informe o nome do grupo.');
      return;
    }

    const pedido = { nome, veTodosEventos: this.veTodosEventos, permissoes: this.linhas() };
    this.enviando = true;
    const destino = this.dados.grupo ? this.cliente.atualizarGrupo(this.dados.grupo.id, pedido) : this.cliente.criarGrupo(pedido);
    destino.subscribe({
      next: () => {
        this.toast.sucesso(this.dados.grupo ? 'Grupo salvo. Vale na próxima ação de quem está nele.' : 'Grupo criado.');
        this.ref.close(true);
      },
      error: (erro: unknown) => {
        this.enviando = false;
        this.toast.erro(mensagemDeErro(erro));
      },
    });
  }
}

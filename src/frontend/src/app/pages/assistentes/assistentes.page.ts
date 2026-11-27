import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { Assistente, AssistentesClient } from '../../core/assistentes.client';
import { mensagemDeErro } from '../../core/mensagem-erro';
import { ToastService } from '../../core/toast.service';
import { ConfirmaDialog } from '../../shared/confirma-dialog';
import { DIALOG, DIALOG_PEQUENO } from '../../shared/dialog';
import { AssistenteFormDialog } from './assistente-form.dialog';
import { MatTooltipModule } from '@angular/material/tooltip';

/** Configurações → Assistentes (só o Dono, SPEC-062 §13): convidar Dono ou Membro, mudar tipo e grupo, reenviar, desativar e reativar. */
@Component({
  selector: 'app-assistentes',
  imports: [MatCardModule, MatButtonModule, MatIconModule, MatTooltipModule, MatFormFieldModule, MatSelectModule],
  template: `
    <mat-card class="cardWithShadow">
      <div class="p-6">
        <mat-card-title class="mb-0">Assistentes</mat-card-title>
        <mat-card-subtitle>Donos e membros da conta, cada um com login próprio. O membro acessa o que o grupo dele permite.</mat-card-subtitle>
      </div>
      <mat-card-content class="border-t border-border">
        <div class="barra-lista">
          <div class="barra-lista-filtros">
            <div class="campo w-full sm:w-48">
              <mat-label class="font-semibold mb-2 block">Situação</mat-label>
              <mat-form-field appearance="outline" class="w-full">
                <mat-select aria-label="Situação" [value]="filtro()" (valueChange)="filtro.set($event)">
                  <mat-option value="ativas">Ativos</mat-option>
                  <mat-option value="inativas">Inativos</mat-option>
                </mat-select>
              </mat-form-field>
            </div>
          </div>
          <div class="barra-lista-acoes">
            <button mat-flat-button type="button" (click)="convidar()"><mat-icon>person_add</mat-icon> Convidar pessoa</button>
          </div>
        </div>
        @if (carregando()) {
          <p class="text-center text-muted py-10">Carregando...</p>
        } @else if (itens().length === 0) {
          <p class="text-center text-muted py-10">Ninguém na equipe ainda. Convide a primeira pessoa.</p>
        } @else if (visiveis().length === 0) {
          <p class="text-center text-muted py-10">{{ filtro() === 'inativas' ? 'Ninguém com acesso desativado.' : 'Ninguém ativo.' }}</p>
        } @else {
          <div>
            <table class="tabela">
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>E-mail</th>
                  <th>Situação</th>
                  <th>Tipo</th>
                  <th>Grupo</th>
                  <th class="text-end! whitespace-nowrap">Ações</th>
                </tr>
              </thead>
              <tbody>
                @for (item of visiveis(); track item.id) {
                  <tr>
                    <td><button type="button" class="link-nome" (click)="editar(item)">{{ item.nome }}</button></td>
                    <td>{{ item.email }}</td>
                    <td>
                      @switch (item.situacao) {
                        @case ('Ativa') { <span [class]="selo('success')">Ativa</span> }
                        @case ('Inativa') { <span [class]="selo('error')">Acesso desativado</span> }
                        @default { <span [class]="selo('warning')">Convite enviado</span> }
                      }
                    </td>
                    <td>{{ item.tipo }}</td>
                    <td>{{ item.grupo ?? "—" }}</td>
                    <td class="text-end! whitespace-nowrap">
                      <button mat-icon-button type="button" aria-label="Editar" matTooltip="Editar" (click)="editar(item)"><mat-icon>edit</mat-icon></button>
                      @if (item.situacao === 'Convidada') {
                        <button mat-icon-button type="button" aria-label="Reenviar convite" matTooltip="Reenviar convite" (click)="reenviar(item)"><mat-icon>forward_to_inbox</mat-icon></button>
                      }
                      @if (item.situacao === 'Inativa') {
                        <button mat-icon-button type="button" aria-label="Reativar acesso" matTooltip="Reativar acesso" (click)="reativar(item)"><mat-icon>person_add_alt</mat-icon></button>
                      } @else {
                        <button mat-icon-button type="button" aria-label="Desativar acesso" matTooltip="Desativar acesso" (click)="desativar(item)"><mat-icon>person_off</mat-icon></button>
                      }
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
export class AssistentesPage implements OnInit {
  private readonly cliente = inject(AssistentesClient);
  private readonly dialog = inject(MatDialog);
  private readonly toast = inject(ToastService);
  protected readonly itens = signal<Assistente[]>([]);
  protected readonly carregando = signal(true);
  protected readonly filtro = signal<'ativas' | 'inativas'>('ativas');
  protected readonly visiveis = computed(() =>
    this.itens().filter((item) => (item.situacao === 'Inativa') === (this.filtro() === 'inativas')),
  );

  ngOnInit(): void {
    this.carregar();
  }

  protected selo(cor: 'success' | 'warning' | 'error'): string {
    return `inline-block rounded font-semibold px-2 py-1 text-xs whitespace-nowrap bg-light-${cor} text-${cor}`;
  }

  protected convidar(): void {
    this.abrir();
  }

  protected editar(item: Assistente): void {
    this.abrir(item);
  }

  protected reenviar(item: Assistente): void {
    this.cliente.reenviar(item.id).subscribe({
      next: (resposta) => {
        if (resposta.conviteEnviado === false) {
          this.toast.erro('Não foi possível enviar o e-mail. Tente reenviar.');
        } else {
          this.toast.sucesso('Convite reenviado. O link anterior deixou de valer.');
        }
      },
      error: (erro: unknown) => this.toast.erro(mensagemDeErro(erro)),
    });
  }

  protected reativar(item: Assistente): void {
    this.cliente.reativar(item.id).subscribe({
      next: (resposta) => {
        if (resposta.conviteEnviado === false) {
          this.toast.erro('Acesso reativado, mas o e-mail de convite não foi enviado. Tente reenviar.');
        } else if (resposta.situacao === 'Convidada') {
          this.toast.sucesso('Acesso reativado. Enviamos um novo convite para criar a senha.');
        } else {
          this.toast.sucesso('Acesso reativado.');
        }
        this.carregar();
      },
      error: (erro: unknown) => this.toast.erro(mensagemDeErro(erro)),
    });
  }

  protected desativar(item: Assistente): void {
    this.dialog
      .open(ConfirmaDialog, {
        ...DIALOG_PEQUENO,
        data: {
          titulo: 'Desativar acesso',
          texto: `${item.nome} perde o acesso no próximo pedido. O cadastro fica guardado e você pode reativar quando precisar.`,
          confirmar: 'Desativar acesso', destrutivo: true,
        },
      })
      .afterClosed()
      .subscribe((confirmou) => {
        if (!confirmou) return;
        this.cliente.desativar(item.id).subscribe({
          next: () => {
            this.toast.sucesso('Acesso desativado.');
            this.carregar();
          },
          error: (erro: unknown) => this.toast.erro(mensagemDeErro(erro)),
        });
      });
  }

  private abrir(assistente?: Assistente): void {
    this.dialog
      .open(AssistenteFormDialog, { ...DIALOG, data: { assistente } })
      .afterClosed()
      .subscribe((salvou) => {
        if (salvou) this.carregar();
      });
  }

  private carregar(): void {
    this.cliente.listar().subscribe({
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

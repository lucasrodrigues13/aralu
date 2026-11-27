import { DatePipe } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MAT_DIALOG_DATA, MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatMenuModule } from '@angular/material/menu';
import { MatSelectModule } from '@angular/material/select';
import { forkJoin } from 'rxjs';
import {
  EquipeEvento,
  EquipeEventoClient,
  linkEquipe,
  PessoaEquipe,
  SalvarPessoaEquipe,
  SituacaoPessoaEquipe,
  whatsappEquipe,
} from '../../core/equipe-evento.client';
import { mensagemDeErro } from '../../core/mensagem-erro';
import { NegocioClient } from '../../core/negocio.client';
import { ToastService } from '../../core/toast.service';
import { ConfirmaDialog } from '../../shared/confirma-dialog';
import { DIALOG_PEQUENO } from '../../shared/dialog';
import { FecharModal } from '../../shared/fechar-modal';

const SITUACAO: Record<SituacaoPessoaEquipe, string> = {
  NaoEnviado: 'Não enviado',
  Enviado: 'Enviado',
  Acessou: 'Acessou',
  Vencido: 'Vencido',
  Encerrado: 'Encerrado',
};

function vazia(): SalvarPessoaEquipe {
  return { nome: '', email: '', telefone: null, funcao: null, recebePortaria: false, recebeRoteiro: false, recebeCronograma: false };
}

/** O que a pessoa recebe, em texto curto para a lista. */
export function itensDaPessoa(p: Pick<PessoaEquipe, 'recebePortaria' | 'recebeRoteiro' | 'recebeCronograma'>): string {
  return [p.recebePortaria && 'Portaria', p.recebeCronograma && 'Cronograma', p.recebeRoteiro && 'Roteiro'].filter(Boolean).join(', ');
}

/**
 * Equipe de apoio do evento (SPEC-067), só para a Organizer: escolhe o roteiro e o cronograma que a equipe vê,
 * cadastra quem trabalha no dia e envia o link de cada pessoa (abre só com código no e-mail dela).
 */
@Component({
  selector: 'app-equipe-evento-dialog',
  imports: [FecharModal, DatePipe, FormsModule, MatDialogModule, MatButtonModule, MatCheckboxModule, MatFormFieldModule, MatIconModule, MatInputModule, MatMenuModule, MatSelectModule],
  template: `
    <h2 mat-dialog-title>Equipe de apoio <app-fechar-modal [manual]="true" (fechar)="cancelar()" /></h2>
    <mat-dialog-content>
      <p class="text-muted text-sm mt-0">
        Quem trabalha no dia (segurança, buffet, DJ…) sem ser da sua conta. Cada pessoa recebe um link próprio, que só abre
        com um código enviado ao e-mail dela, e vê só o que você marcar.
      </p>

      @if (equipe(); as e) {
        @if (editando(); as form) {
          <section class="form">
            <h3>{{ editandoId() ? 'Editar pessoa' : 'Adicionar pessoa' }}</h3>
            <div class="grade">
              <mat-form-field appearance="outline" subscriptSizing="dynamic">
                <mat-label>Nome</mat-label>
                <input matInput required maxlength="200" [(ngModel)]="form.nome" name="nome" />
              </mat-form-field>
              <mat-form-field appearance="outline" subscriptSizing="dynamic">
                <mat-label>Função</mat-label>
                <input matInput maxlength="120" placeholder="Segurança" [(ngModel)]="form.funcao" name="funcao" />
              </mat-form-field>
              <mat-form-field appearance="outline" subscriptSizing="dynamic">
                <mat-label>E-mail</mat-label>
                <input matInput required type="email" maxlength="320" [(ngModel)]="form.email" name="email" />
                <mat-hint>Recebe o código de acesso</mat-hint>
              </mat-form-field>
              <mat-form-field appearance="outline" subscriptSizing="dynamic">
                <mat-label>WhatsApp</mat-label>
                <input matInput maxlength="40" inputmode="tel" [(ngModel)]="form.telefone" name="telefone" />
              </mat-form-field>
            </div>
            <p class="rotulo">O que essa pessoa recebe</p>
            <div class="opcoes">
              <mat-checkbox [(ngModel)]="form.recebePortaria" name="portaria">Portaria (check-in dos convidados)</mat-checkbox>
              <mat-checkbox [(ngModel)]="form.recebeCronograma" name="cronograma">
                Cronograma @if (!e.cronograma) { <span class="text-xs text-muted">(escolha o cronograma acima)</span> }
              </mat-checkbox>
              <mat-checkbox [(ngModel)]="form.recebeRoteiro" name="roteiro">
                Roteiro @if (!e.roteiro) { <span class="text-xs text-muted">(escolha o roteiro acima)</span> }
              </mat-checkbox>
            </div>
            @if (erroForm()) { <p class="text-error text-sm mb-0" role="alert">{{ erroForm() }}</p> }
          </section>
        } @else {
          <div class="grade">
            <mat-form-field appearance="outline" subscriptSizing="dynamic">
              <mat-label>Cronograma do evento</mat-label>
              <mat-select [value]="e.cronograma?.id ?? null" (selectionChange)="definirModelos(e.roteiro?.id ?? null, $event.value)">
                <mat-option [value]="null">Nenhum</mat-option>
                @for (c of cronogramas(); track c.id) { <mat-option [value]="c.id">{{ c.nome }}</mat-option> }
              </mat-select>
            </mat-form-field>
            <mat-form-field appearance="outline" subscriptSizing="dynamic">
              <mat-label>Roteiro do evento</mat-label>
              <mat-select [value]="e.roteiro?.id ?? null" (selectionChange)="definirModelos($event.value, e.cronograma?.id ?? null)">
                <mat-option [value]="null">Nenhum</mat-option>
                @for (r of roteiros(); track r.id) { <mat-option [value]="r.id">{{ r.nome }}</mat-option> }
              </mat-select>
            </mat-form-field>
          </div>

          <ul class="pessoas">
            @for (p of e.pessoas; track p.id) {
              <li class="pessoa">
                <div class="min-w-0">
                  <p class="m-0 font-semibold">{{ p.nome }}{{ p.funcao ? ' · ' + p.funcao : '' }}</p>
                  <p class="m-0 text-sm text-muted">{{ itens(p) }}</p>
                  <p class="m-0 text-xs text-muted">
                    {{ situacao(p.situacao) }}
                    @if (p.validoAte && (p.situacao === 'Enviado' || p.situacao === 'Acessou')) { · vale até {{ p.validoAte | date: 'dd/MM/yyyy' }} }
                  </p>
                </div>
                <div class="botoes">
                  <button mat-stroked-button type="button" (click)="enviarWhatsapp(p)"><mat-icon>send</mat-icon> WhatsApp</button>
                  <button mat-icon-button type="button" [matMenuTriggerFor]="menu" aria-label="Mais ações"><mat-icon>more_vert</mat-icon></button>
                  <mat-menu #menu="matMenu" xPosition="before">
                    <button mat-menu-item type="button" (click)="copiar(p)"><mat-icon>content_copy</mat-icon> Copiar link</button>
                    <button mat-menu-item type="button" (click)="editar(p)"><mat-icon>edit</mat-icon> Editar</button>
                    @if (p.situacao === 'Enviado' || p.situacao === 'Acessou') {
                      <button mat-menu-item type="button" (click)="encerrar(p)"><mat-icon>link_off</mat-icon> Encerrar link</button>
                    }
                    <button mat-menu-item type="button" (click)="remover(p)"><mat-icon>delete</mat-icon> Remover</button>
                  </mat-menu>
                </div>
              </li>
            } @empty {
              <li class="text-muted text-sm">Ninguém na equipe de apoio ainda.</li>
            }
          </ul>
          <button mat-stroked-button type="button" (click)="novo()"><mat-icon>person_add</mat-icon> Adicionar pessoa</button>
          <p class="text-xs text-muted">O link vale até o dia seguinte ao evento. Enviar ou copiar de novo reabre um link encerrado.</p>
        }
      } @else {
        <p class="text-muted">Carregando…</p>
      }
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      @if (editando()) {
        <button mat-stroked-button type="button" (click)="cancelar()">Cancelar</button>
        <button mat-flat-button type="button" [disabled]="salvando()" (click)="salvar()">Salvar</button>
      } @else {
        <button mat-stroked-button type="button" mat-dialog-close>Fechar</button>
      }
    </mat-dialog-actions>
  `,
  styles: `
    .grade { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); align-items: start; gap: 16px; padding-top: 6px; margin-bottom: 16px; }
    .grade mat-form-field { width: 100%; }
    @media (max-width: 560px) { .grade { grid-template-columns: 1fr; } }
    .rotulo { font-size: 14px; font-weight: 600; margin: 4px 0 2px; }
    .opcoes { display: grid; margin-left: -11px; }
    .form h3 { font-size: 16px; margin: 0 0 10px; }
    .pessoas { list-style: none; padding: 0; margin: 0 0 12px; }
    .pessoa { display: flex; justify-content: space-between; align-items: center; gap: 12px; padding: 10px 0; border-top: 1px solid var(--mat-sys-outline-variant); }
    .botoes { display: flex; align-items: center; gap: 4px; flex: none; }
  `,
})
export class EquipeEventoDialog implements OnInit {
  private readonly cliente = inject(EquipeEventoClient);
  private readonly negocio = inject(NegocioClient);
  private readonly dialog = inject(MatDialog);
  private readonly toast = inject(ToastService);
  private readonly dados = inject<{ eventoId: string; nomeEvento: string }>(MAT_DIALOG_DATA);
  protected readonly equipe = signal<EquipeEvento | null>(null);
  protected readonly roteiros = signal<{ id: string; nome: string }[]>([]);
  protected readonly cronogramas = signal<{ id: string; nome: string }[]>([]);
  protected readonly editando = signal<SalvarPessoaEquipe | null>(null);
  protected readonly editandoId = signal<string | null>(null);
  protected readonly salvando = signal(false);
  protected readonly erroForm = signal('');
  protected readonly itens = itensDaPessoa;

  ngOnInit(): void {
    forkJoin({
      equipe: this.cliente.equipe(this.dados.eventoId),
      roteiros: this.negocio.roteiros(),
      cronogramas: this.negocio.cronogramas(),
    }).subscribe({
      next: ({ equipe, roteiros, cronogramas }) => {
        this.equipe.set(equipe);
        this.roteiros.set(roteiros.map((r) => ({ id: r.id, nome: r.nome })));
        this.cronogramas.set(cronogramas.map((c) => ({ id: c.id, nome: c.titulo })));
      },
      error: (erro: unknown) => this.toast.erro(mensagemDeErro(erro)),
    });
  }

  protected situacao(valor: SituacaoPessoaEquipe): string {
    return SITUACAO[valor];
  }

  protected definirModelos(roteiroId: string | null, cronogramaId: string | null): void {
    this.cliente.definirModelos(this.dados.eventoId, roteiroId, cronogramaId).subscribe({
      next: (equipe) => this.equipe.set(equipe),
      error: (erro: unknown) => this.toast.erro(mensagemDeErro(erro)),
    });
  }

  protected novo(): void {
    this.erroForm.set('');
    this.editandoId.set(null);
    this.editando.set(vazia());
  }

  protected editar(p: PessoaEquipe): void {
    this.erroForm.set('');
    this.editandoId.set(p.id);
    this.editando.set({
      nome: p.nome,
      email: p.email,
      telefone: p.telefone,
      funcao: p.funcao,
      recebePortaria: p.recebePortaria,
      recebeRoteiro: p.recebeRoteiro,
      recebeCronograma: p.recebeCronograma,
    });
  }

  protected cancelar(): void {
    this.editando.set(null);
    this.editandoId.set(null);
  }

  protected salvar(): void {
    const form = this.editando();
    if (!form) return;
    if (!form.nome.trim()) return this.erroForm.set('Informe o nome.');
    if (!form.email.trim()) return this.erroForm.set('Informe o e-mail. É nele que a pessoa recebe o código.');
    if (!form.recebePortaria && !form.recebeRoteiro && !form.recebeCronograma) return this.erroForm.set('Marque ao menos uma opção.');
    this.salvando.set(true);
    const id = this.editandoId();
    const chamada = id ? this.cliente.atualizar(this.dados.eventoId, id, form) : this.cliente.criar(this.dados.eventoId, form);
    chamada.subscribe({
      next: (pessoa) => {
        this.salvando.set(false);
        this.substituir(pessoa);
        this.cancelar();
        this.toast.sucesso(id ? 'Pessoa atualizada.' : 'Pessoa adicionada. Envie o link pelo WhatsApp.');
      },
      error: (erro: unknown) => {
        this.salvando.set(false);
        this.erroForm.set(mensagemDeErro(erro));
      },
    });
  }

  /** Abre a aba já no clique (senão o navegador bloqueia) e só depois aponta para o wa.me. */
  protected enviarWhatsapp(p: PessoaEquipe): void {
    const janela = window.open('', '_blank');
    this.cliente.liberar(this.dados.eventoId, p.id).subscribe({
      next: (pessoa) => {
        this.substituir(pessoa);
        if (janela) janela.location.href = whatsappEquipe(pessoa, this.dados.nomeEvento, linkEquipe(pessoa.token));
      },
      error: (erro: unknown) => {
        janela?.close();
        this.toast.erro(mensagemDeErro(erro));
      },
    });
  }

  protected copiar(p: PessoaEquipe): void {
    this.cliente.liberar(this.dados.eventoId, p.id).subscribe({
      next: (pessoa) => {
        this.substituir(pessoa);
        void navigator.clipboard?.writeText(linkEquipe(pessoa.token));
        this.toast.sucesso('Link copiado.');
      },
      error: (erro: unknown) => this.toast.erro(mensagemDeErro(erro)),
    });
  }

  protected encerrar(p: PessoaEquipe): void {
    this.confirmar('Encerrar link', `${p.nome} perde o acesso na hora. Enviar de novo reabre o mesmo link.`, 'Encerrar', () =>
      this.cliente.encerrar(this.dados.eventoId, p.id).subscribe({
        next: (pessoa) => {
          this.substituir(pessoa);
          this.toast.sucesso('Link encerrado.');
        },
        error: (erro: unknown) => this.toast.erro(mensagemDeErro(erro)),
      }),
    );
  }

  protected remover(p: PessoaEquipe): void {
    this.confirmar('Remover pessoa', `${p.nome} sai da equipe de apoio e o link deixa de funcionar.`, 'Remover', () =>
      this.cliente.remover(this.dados.eventoId, p.id).subscribe({
        next: () => {
          this.equipe.update((e) => (e ? { ...e, pessoas: e.pessoas.filter((item) => item.id !== p.id) } : e));
          this.toast.sucesso('Pessoa removida.');
        },
        error: (erro: unknown) => this.toast.erro(mensagemDeErro(erro)),
      }),
    );
  }

  private confirmar(titulo: string, texto: string, confirmar: string, acao: () => void): void {
    this.dialog.open(ConfirmaDialog, { ...DIALOG_PEQUENO, data: { titulo, texto, confirmar, destrutivo: ['Excluir', 'Remover'].includes(confirmar) } }).afterClosed().subscribe((ok) => {
      if (ok) acao();
    });
  }

  private substituir(pessoa: PessoaEquipe): void {
    this.equipe.update((e) => {
      if (!e) return e;
      const existe = e.pessoas.some((item) => item.id === pessoa.id);
      const pessoas = existe ? e.pessoas.map((item) => (item.id === pessoa.id ? pessoa : item)) : [...e.pessoas, pessoa];
      return { ...e, pessoas: pessoas.sort((a, b) => a.nome.localeCompare(b.nome)) };
    });
  }
}

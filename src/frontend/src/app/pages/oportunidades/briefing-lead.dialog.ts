import { DatePipe } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { mensagemDeErro } from '../../core/mensagem-erro';
import { Briefing, BriefingDoLead, NegocioClient } from '../../core/negocio.client';
import { ToastService } from '../../core/toast.service';
import { ConfirmaDialog } from '../../shared/confirma-dialog';
import { DIALOG_PEQUENO } from '../../shared/dialog';
import { FecharModal } from '../../shared/fechar-modal';

export interface BriefingLeadDados {
  id: string;
  nome: string;
  /** Contato que recebe o convite pelo WhatsApp (SPEC-066). */
  contatoNome?: string | null;
  telefone?: string | null;
  /** Algum contato (ou o contratante) tem e-mail: sem isso o briefing não vai ao cliente. */
  temEmail?: boolean;
}

/** Situação do link do briefing para a organizadora (SPEC-066). */
export function situacaoBriefing(b: BriefingDoLead, agora: Date = new Date()): 'aberto' | 'concluido' | 'fechado' {
  if (!b.liberadoEm || !b.token) return 'fechado';
  if (b.concluidoEm) return 'concluido';
  return b.validoAte && new Date(b.validoAte) <= agora ? 'fechado' : 'aberto';
}

/** Endereço público do briefing (SPEC-066). */
export function linkBriefing(token: string, origem: string = location.origin): string {
  return `${origem}/briefing/${token}`;
}

/** wa.me pedindo o preenchimento. Telefone sem DDI ganha o 55; sem telefone, o WhatsApp abre para escolher o contato. */
export function whatsappBriefing(telefone: string | null | undefined, nomeContato: string | null | undefined, link: string): string {
  const digitos = (telefone ?? '').replace(/\D/g, '');
  const destino = digitos.length >= 10 ? (digitos.length <= 11 ? '55' + digitos : digitos) : '';
  const saudacao = nomeContato?.trim() ? `Olá, ${nomeContato.trim().split(/\s+/)[0]}!` : 'Olá!';
  const texto = `${saudacao} Para prepararmos tudo do seu jeito, preencha o briefing do seu evento: ${link}\nPara sua segurança, o link pede um código que chega no seu e-mail. Você pode salvar e voltar depois.`;
  return `https://wa.me/${destino}?text=${encodeURIComponent(texto)}`;
}

/** Briefing do lead: roteiro interno da conversa, com as respostas anotadas (SPEC-031 §6.7, ponto 4). */
@Component({
  selector: 'app-briefing-lead-dialog',
  imports: [FecharModal, DatePipe, FormsModule, MatDialogModule, MatButtonModule, MatFormFieldModule, MatInputModule, MatSelectModule],
  template: `
    <h2 mat-dialog-title>Briefing de {{ dados.nome }} <app-fechar-modal /></h2>
    <p class="text-muted text-sm px-6 -mt-2 mb-4">Use as perguntas como roteiro da conversa e anote as respostas aqui.</p>
    <mat-dialog-content>
      @if (carregando()) {
        <p class="text-center text-muted py-6">Carregando...</p>
      } @else {
        <div class="flex flex-wrap items-end gap-3 mb-4">
          <div class="campo flex-1 min-w-48">
            <mat-label class="font-semibold mb-2 block">{{ briefing() ? 'Trocar o modelo' : 'Modelo de briefing' }}</mat-label>
            <mat-form-field appearance="outline" subscriptSizing="dynamic" class="w-full">
              <mat-select [attr.aria-label]="'Modelo de briefing'" [value]="modeloId()" (valueChange)="modeloId.set($event)">
                @for (modelo of modelos(); track modelo.id) { <mat-option [value]="modelo.id">{{ modelo.nome }}</mat-option> }
              </mat-select>
            </mat-form-field>
          </div>
          <button mat-stroked-button type="button" [disabled]="!modeloId()" (click)="aplicar()">{{ briefing() ? 'Trocar' : 'Aplicar' }}</button>
        </div>
        @if (modelos().length === 0) {
          <p class="text-muted text-sm">Nenhum modelo de briefing na conta. Crie um em Modelos de briefing.</p>
        }
        @if (briefing(); as b) {
          <p class="text-sm text-muted mb-3">Modelo: {{ b.modeloNome }}</p>
          <section class="cliente mb-4" aria-label="Briefing pelo cliente">
            @switch (situacao(b)) {
              @case ('aberto') {
                <p class="text-sm mb-2">
                  <strong>Liberado para o cliente</strong> até {{ b.validoAte | date: 'dd/MM HH:mm' }}.
                  {{ b.respondidoEm ? 'Salvou respostas em ' + (b.respondidoEm | date: 'dd/MM HH:mm') + '.' : 'Ainda não respondeu.' }}
                </p>
                <div class="flex flex-wrap gap-2">
                  <button mat-flat-button type="button" (click)="enviarWhatsapp()">Enviar pelo WhatsApp</button>
                  <button mat-stroked-button type="button" (click)="copiarLink()">Copiar link</button>
                  <button mat-button type="button" (click)="encerrar()">Encerrar link</button>
                </div>
              }
              @case ('concluido') {
                <p class="text-sm mb-2"><strong>O cliente concluiu o briefing</strong> em {{ b.concluidoEm | date: 'dd/MM HH:mm' }}. O link está fechado.</p>
                <button mat-stroked-button type="button" [disabled]="!dados.temEmail" (click)="liberarEEnviar()">Reabrir e enviar pelo WhatsApp</button>
              }
              @default {
                @if (b.token && b.validoAte) {
                  <p class="text-sm text-muted mb-2">O prazo do link venceu em {{ b.validoAte | date: 'dd/MM HH:mm' }}.</p>
                } @else {
                  <p class="text-sm text-muted mb-2">
                    Quer que o cliente responda sozinho? Libere o briefing e envie o link pelo WhatsApp. O link vale 7 dias e
                    abre com um código enviado ao e-mail do contato.
                  </p>
                }
                <button mat-flat-button type="button" [disabled]="!dados.temEmail" (click)="liberarEEnviar()">Liberar e enviar pelo WhatsApp</button>
              }
            }
            @if (!dados.temEmail && situacao(b) !== 'aberto') {
              <p class="text-sm text-warning mt-2" role="note">Cadastre o e-mail do contato para enviar o briefing. O cliente recebe nele o código de acesso.</p>
            }
          </section>
          @for (item of b.itens; track item.id; let i = $index) {
            @if (item.secao && (i === 0 || b.itens[i - 1].secao !== item.secao)) {
              <h3 class="font-semibold mt-4 mb-2">{{ item.secao }}</h3>
            }
            <div class="campo">
              <mat-label class="font-semibold mb-1 block">{{ item.pergunta }}</mat-label>
              <mat-form-field appearance="outline" subscriptSizing="dynamic" class="w-full">
                <textarea matInput rows="2" maxlength="2000" [attr.aria-label]="item.pergunta" [ngModel]="respostas()[item.id] ?? ''" (ngModelChange)="responder(item.id, $event)"></textarea>
              </mat-form-field>
            </div>
          }
        }
      }
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      @if (briefing()) {
        <button mat-button type="button" class="text-error me-auto" (click)="remover()">Remover briefing</button>
      }
      <button mat-stroked-button type="button" (click)="ref.close()">Fechar</button>
      @if (briefing()) {
        <button mat-flat-button type="button" (click)="salvar()">Salvar respostas</button>
      }
    </mat-dialog-actions>
  `,
  styles: `
    .cliente { border: 1px solid var(--color-border); border-radius: 10px; padding: 12px; }
  `,
})
export class BriefingLeadDialog implements OnInit {
  protected readonly dados = inject<BriefingLeadDados>(MAT_DIALOG_DATA);
  protected readonly ref = inject(MatDialogRef<BriefingLeadDialog>);
  private readonly negocio = inject(NegocioClient);
  private readonly toast = inject(ToastService);
  private readonly dialog = inject(MatDialog);
  protected readonly carregando = signal(true);
  protected readonly briefing = signal<BriefingDoLead | null>(null);
  protected readonly modelos = signal<Briefing[]>([]);
  protected readonly modeloId = signal('');
  protected readonly respostas = signal<Record<string, string>>({});

  ngOnInit(): void {
    this.negocio.briefings().subscribe({ next: (lista) => this.modelos.set(lista), error: () => undefined });
    this.negocio.briefingDoLead(this.dados.id).subscribe({
      next: (resposta) => {
        this.definir(resposta.briefing);
        this.carregando.set(false);
      },
      error: (erro: unknown) => {
        this.carregando.set(false);
        this.toast.erro(mensagemDeErro(erro));
      },
    });
  }

  protected responder(id: string, texto: string): void {
    this.respostas.update((atual) => ({ ...atual, [id]: texto }));
  }

  protected aplicar(): void {
    const aplicar = () =>
      this.negocio.aplicarBriefingAoLead(this.dados.id, this.modeloId()).subscribe({
        next: (resposta) => {
          this.definir(resposta.briefing);
          this.modeloId.set('');
          this.toast.sucesso('Briefing aplicado.');
        },
        error: (erro: unknown) => this.toast.erro(mensagemDeErro(erro)),
      });
    if (!this.briefing()) {
      aplicar();
      return;
    }

    this.dialog
      .open(ConfirmaDialog, {
        ...DIALOG_PEQUENO,
        data: { titulo: 'Trocar o modelo', texto: 'As respostas anotadas neste briefing serão perdidas.', confirmar: 'Trocar' },
      })
      .afterClosed()
      .subscribe((ok) => ok && aplicar());
  }

  protected salvar(): void {
    const respostas = Object.entries(this.respostas()).map(([id, resposta]) => ({ id, resposta }));
    this.negocio.salvarBriefingDoLead(this.dados.id, respostas).subscribe({
      next: (resposta) => {
        this.definir(resposta.briefing);
        this.toast.sucesso('Respostas salvas.');
      },
      error: (erro: unknown) => this.toast.erro(mensagemDeErro(erro)),
    });
  }

  protected remover(): void {
    this.dialog
      .open(ConfirmaDialog, {
        ...DIALOG_PEQUENO,
        data: { titulo: 'Remover briefing', texto: 'O briefing e as respostas deste lead serão apagados.', confirmar: 'Remover', destrutivo: true },
      })
      .afterClosed()
      .subscribe((ok) => {
        if (!ok) return;
        this.negocio.removerBriefingDoLead(this.dados.id).subscribe({
          next: () => {
            this.definir(null);
            this.toast.sucesso('Briefing removido.');
          },
          error: (erro: unknown) => this.toast.erro(mensagemDeErro(erro)),
        });
      });
  }

  /** Abre a aba já no clique (senão o navegador bloqueia) e só depois aponta para o wa.me. */
  protected liberarEEnviar(): void {
    const janela = window.open('', '_blank');
    this.negocio.liberarBriefingDoLead(this.dados.id).subscribe({
      next: (resposta) => {
        this.atualizarLiberacao(resposta.briefing);
        const token = resposta.briefing?.token;
        if (token && janela) janela.location.href = this.urlWhatsapp(token);
        else janela?.close();
        this.toast.sucesso('Briefing liberado para o cliente.');
      },
      error: (erro: unknown) => {
        janela?.close();
        this.toast.erro(mensagemDeErro(erro));
      },
    });
  }

  protected enviarWhatsapp(): void {
    const token = this.briefing()?.token;
    if (token) window.open(this.urlWhatsapp(token), '_blank', 'noopener');
  }

  protected copiarLink(): void {
    const token = this.briefing()?.token;
    if (!token) return;
    navigator.clipboard.writeText(linkBriefing(token)).then(
      () => this.toast.sucesso('Link copiado.'),
      () => this.toast.erro('Não foi possível copiar o link.'),
    );
  }

  protected encerrar(): void {
    this.negocio.encerrarBriefingDoLead(this.dados.id).subscribe({
      next: (resposta) => {
        this.atualizarLiberacao(resposta.briefing);
        this.toast.sucesso('Link encerrado. O cliente não consegue mais abrir o briefing.');
      },
      error: (erro: unknown) => this.toast.erro(mensagemDeErro(erro)),
    });
  }

  protected situacao(b: BriefingDoLead) {
    return situacaoBriefing(b);
  }

  private urlWhatsapp(token: string): string {
    return whatsappBriefing(this.dados.telefone, this.dados.contatoNome, linkBriefing(token));
  }

  /** Atualiza só o estado do link, sem apagar respostas que a dona digitou e ainda não salvou. */
  private atualizarLiberacao(briefing: BriefingDoLead | null): void {
    const atual = this.briefing();
    if (!atual || !briefing) return;
    this.briefing.set({
      ...atual,
      token: briefing.token,
      liberadoEm: briefing.liberadoEm,
      respondidoEm: briefing.respondidoEm,
      validoAte: briefing.validoAte,
      concluidoEm: briefing.concluidoEm,
    });
  }

  private definir(briefing: BriefingDoLead | null): void {
    this.briefing.set(briefing);
    this.respostas.set(Object.fromEntries((briefing?.itens ?? []).map((item) => [item.id, item.resposta ?? ''])));
  }
}

import { ExpandirTodosComponent } from '../../shared/expandir-todos.component';
import { DatePipe } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';
import { mensagemDeErro } from '../../core/mensagem-erro';
import { EventoDetalhe, EventoServico, NegocioClient } from '../../core/negocio.client';
import { ToastService } from '../../core/toast.service';
import { ConfirmaDialog } from '../../shared/confirma-dialog';
import { DIALOG_PEQUENO } from '../../shared/dialog';
import { ComprovanteDialog } from '../dinheiro/comprovante.dialog';
import { EventoAbasComponent } from './evento-abas.component';

type Vinculo = EventoServico['fornecedores'][number];

/** Aba Contratos do evento: contratos de fornecedor enviados ao sistema, pelo organizador ou pelo cliente (SPEC-048). */
@Component({
  selector: 'app-evento-contratos',
  imports: [ExpandirTodosComponent, DatePipe, MatCardModule, MatButtonModule, MatIconModule, MatTooltipModule, EventoAbasComponent],
  template: `
    <app-evento-abas [eventoId]="id" />
    <mat-card class="cardWithShadow">
      <div class="p-6">
        <mat-card-title class="mb-0">Contratos</mat-card-title>
        <mat-card-subtitle>{{ evento()?.nome }} · contratos com fornecedores enviados para o sistema.</mat-card-subtitle>
      </div>
      <div class="px-6 pb-6">
        @if (!evento()) {
          <p class="text-sm text-muted">Carregando…</p>
        } @else if (grupos().length === 0) {
          <p class="text-sm text-muted">
            Nenhum fornecedor neste evento ainda. Adicione serviços e fornecedores na aba Fornecedores para enviar os contratos.
          </p>
        } @else {
          <app-expandir-todos [abertos]="todosAbertos()" (alternar)="alternarTodos()">
            {{ grupos().length }} {{ grupos().length === 1 ? 'serviço' : 'serviços' }} ·
            {{ totalFornecedores() }} {{ totalFornecedores() === 1 ? 'fornecedor' : 'fornecedores' }}
          </app-expandir-todos>
          <ul class="servicos-lista com-cabecalho" aria-label="Contratos por serviço">
            @for (grupo of grupos(); track grupo.servicoId) {
              <li class="servico" [class.aberto]="!fechados().has(grupo.servicoId)">
                <button type="button" class="servico-cabecalho" [attr.aria-expanded]="!fechados().has(grupo.servicoId)"
                  [attr.aria-controls]="'contratos-' + grupo.servicoId" (click)="alternar(grupo.servicoId)">
                  <mat-icon class="seta">expand_more</mat-icon>
                  <span class="servico-texto">
                    <span class="nome">{{ grupo.servico }}</span>
                    <span class="block text-xs text-muted">{{ grupo.enviados }} de {{ grupo.itens.length }} {{ grupo.itens.length === 1 ? 'contrato enviado' : 'contratos enviados' }}</span>
                  </span>
                </button>
                @if (!fechados().has(grupo.servicoId)) {
                <div class="fornecedores" [id]="'contratos-' + grupo.servicoId">
                  @for (vinculo of grupo.itens; track vinculo.id) {
                    <div class="fornecedor">
                      <div>
                        <span class="nome">{{ vinculo.fornecedor }}</span>
                        <span class="block text-xs text-muted">{{ vinculo.etapa === 'Contratado' ? 'Contratado' : 'Em orçamento' }}</span>
                      </div>
                      @if (vinculo.contratoAssinado; as contrato) {
                        <div>
                          <span class="block text-xs text-muted">Enviado por</span>
                          <span>{{ vinculo.contratoAssinadoPor ?? "—" }}</span>
                        </div>
                        <div>
                          <span class="block text-xs text-muted">Data</span>
                          <span>{{ vinculo.contratoAssinadoEm ? (vinculo.contratoAssinadoEm | date: "dd/MM/yyyy") : "—" }}</span>
                        </div>
                        <div class="fornecedor-acoes">
                          <button mat-button type="button" (click)="abrir(contrato.arquivoId, false)"><mat-icon>open_in_new</mat-icon> Abrir</button>
                          <button mat-button type="button" (click)="abrir(contrato.arquivoId, true, contrato.nome)"><mat-icon>download</mat-icon> Baixar</button>
                          <button mat-button type="button" (click)="enviar(grupo.servicoId, vinculo)"><mat-icon>upload_file</mat-icon> Nova versão</button>
                          <button mat-icon-button type="button" aria-label="Excluir contrato" matTooltip="Excluir contrato" (click)="excluir(grupo.servicoId, vinculo)"><mat-icon>delete</mat-icon></button>
                        </div>
                      } @else {
                        <div class="text-sm text-muted sem-contrato">Nenhum contrato enviado</div>
                        <div class="fornecedor-acoes">
                          <button mat-stroked-button type="button" (click)="enviar(grupo.servicoId, vinculo)"><mat-icon>upload_file</mat-icon> Enviar contrato</button>
                        </div>
                      }
                    </div>
                  }
                </div>
                }
              </li>
            }
          </ul>
        }
      </div>
    </mat-card>
  `,
  styles: `
    .nome { display: block; font-weight: 500; }
    .com-cabecalho { border-top-left-radius: 0 !important; border-top-right-radius: 0 !important; }
    .servicos-lista { list-style: none; padding: 0; margin: 0; border: 1px solid rgba(128,128,128,.25); border-radius: 8px; overflow: hidden; }
    .servico + .servico { border-top: 1px solid rgba(128,128,128,.25); }
    .servico-cabecalho { width: 100%; display: flex; align-items: center; gap: 12px; padding: 16px 16px 16px 12px; border: 0; background: none; color: inherit; font: inherit; text-align: left; cursor: pointer; }
    .servico-cabecalho:focus-visible { outline: 2px solid var(--mat-sys-primary); outline-offset: -2px; }
    .seta { transition: transform .15s; flex-shrink: 0; transform: rotate(-90deg); }
    .servico.aberto .seta { transform: none; }
    .servico-texto { flex: 1; min-width: 0; }
    .fornecedores { background: rgba(128,128,128,.1); border-top: 1px solid rgba(128,128,128,.3); }
    .sem-contrato { grid-column: span 2; }
    .fornecedor { display: grid; grid-template-columns: minmax(160px, 2fr) minmax(110px, 1fr) minmax(110px, 1fr) auto; align-items: center; gap: 12px; padding: 10px 16px 10px 52px; }
    .fornecedor + .fornecedor { border-top: 1px dashed rgba(128,128,128,.2); }
    .fornecedor:hover, .servico-cabecalho:hover { background: rgba(128,128,128,.08); }
    .fornecedor-acoes { display: flex; justify-content: flex-end; gap: 4px; white-space: nowrap; }
    @media (max-width: 900px) {
      .fornecedor { grid-template-columns: 1fr 1fr; padding-left: 16px; }
      .fornecedor-acoes { grid-column: 1 / -1; justify-content: flex-start; }
    }
  `,
})
export class EventoContratosPage implements OnInit {
  private readonly negocio = inject(NegocioClient);
  private readonly rota = inject(ActivatedRoute);
  private readonly toast = inject(ToastService);
  private readonly dialog = inject(MatDialog);

  protected id = '';
  protected readonly evento = signal<EventoDetalhe | null>(null);
  /** Serviços recolhidos; todos começam abertos para os contratos ficarem à vista. */
  protected readonly fechados = signal<Set<string>>(new Set());
  /** Todos os fornecedores por serviço, com ou sem contrato, para enviar e trocar versões aqui mesmo. */
  protected readonly grupos = computed(() => (this.evento()?.servicos ?? [])
    .filter((servico) => servico.fornecedores.length > 0)
    .map((servico) => ({
      servicoId: servico.id,
      servico: servico.nome,
      itens: servico.fornecedores,
      enviados: servico.fornecedores.filter((vinculo) => !!vinculo.contratoAssinado).length,
    }))
    .sort((a, b) => a.servico.localeCompare(b.servico, 'pt-BR')));

  protected readonly totalFornecedores = computed(() => this.grupos().reduce((soma, grupo) => soma + grupo.itens.length, 0));
  protected readonly todosAbertos = computed(() => this.grupos().every((grupo) => !this.fechados().has(grupo.servicoId)));

  protected alternarTodos(): void {
    this.fechados.set(this.todosAbertos() ? new Set(this.grupos().map((grupo) => grupo.servicoId)) : new Set());
  }

  ngOnInit(): void {
    this.id = this.rota.snapshot.paramMap.get('id') ?? '';
    this.negocio.evento(this.id).subscribe({
      next: (evento) => this.evento.set(evento),
      error: (erro: unknown) => this.toast.erro(mensagemDeErro(erro)),
    });
  }

  /** Envia o contrato ou uma nova versão; a anterior é substituída (fica só a versão atual). */
  protected enviar(servicoId: string, vinculo: Vinculo): void {
    const titulo = vinculo.contratoAssinado ? `Nova versão · ${vinculo.fornecedor}` : `Contrato · ${vinculo.fornecedor}`;
    this.dialog.open(ComprovanteDialog, { ...DIALOG_PEQUENO, data: { titulo } }).afterClosed().subscribe((arquivo?: File) => {
      if (!arquivo) return;
      this.negocio.enviarContratoAssinado(this.id, servicoId, vinculo.id, arquivo).subscribe({
        next: (evento) => {
          this.evento.set(evento);
          this.toast.sucesso(vinculo.contratoAssinado ? 'Nova versão do contrato enviada.' : 'Contrato enviado.');
        },
        error: (erro: unknown) => this.toast.erro(mensagemDeErro(erro)),
      });
    });
  }

  protected excluir(servicoId: string, vinculo: Vinculo): void {
    this.dialog.open(ConfirmaDialog, {
      ...DIALOG_PEQUENO,
      data: { titulo: 'Excluir contrato', texto: `Excluir o contrato de ${vinculo.fornecedor}? O arquivo é apagado.`, confirmar: 'Excluir' },
    }).afterClosed().subscribe((confirmou) => {
      if (!confirmou) return;
      this.negocio.excluirContratoAssinado(this.id, servicoId, vinculo.id).subscribe({
        next: (evento) => {
          this.evento.set(evento);
          this.toast.sucesso('Contrato excluído.');
        },
        error: (erro: unknown) => this.toast.erro(mensagemDeErro(erro)),
      });
    });
  }

  protected alternar(servicoId: string): void {
    const novos = new Set(this.fechados());
    if (!novos.delete(servicoId)) novos.add(servicoId);
    this.fechados.set(novos);
  }

  protected abrir(arquivoId: string, baixar: boolean, nome?: string): void {
    const janela = baixar ? null : window.open('', '_blank');
    this.negocio.baixarArquivo(arquivoId).subscribe({
      next: (arquivo) => {
        const url = URL.createObjectURL(arquivo);
        if (baixar) {
          const link = document.createElement('a');
          link.href = url;
          link.download = nome ?? 'contrato';
          link.click();
        } else if (janela) {
          janela.location.href = url;
        } else {
          window.open(url, '_blank');
        }
        setTimeout(() => URL.revokeObjectURL(url), 60_000);
      },
      error: (erro: unknown) => {
        janela?.close();
        this.toast.erro(mensagemDeErro(erro));
      },
    });
  }
}

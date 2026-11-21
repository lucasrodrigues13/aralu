import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { mensagemDeErro } from '../../core/mensagem-erro';
import { EventoDetalhe, NegocioClient } from '../../core/negocio.client';
import { ToastService } from '../../core/toast.service';
import { EventoAbasComponent } from './evento-abas.component';
import { montarContratosDoEvento } from './contratos-do-evento';

/** Aba Contratos do evento: contratos de fornecedor enviados ao sistema, pelo organizador ou pelo casal (SPEC-048). */
@Component({
  selector: 'app-evento-contratos',
  imports: [MatCardModule, MatButtonModule, MatIconModule, EventoAbasComponent],
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
        } @else if (contratos().length === 0) {
          <p class="text-sm text-muted">
            Nenhum contrato de fornecedor enviado ainda. Anexe o contrato assinado na aba Fornecedores; se o link do casal estiver
            liberado, o que o casal subir também aparece aqui.
          </p>
        } @else {
          <div class="overflow-x-auto">
            <table class="w-full text-sm">
              <thead>
                <tr class="text-left text-muted">
                  <th class="py-2 pr-4">Fornecedor</th>
                  <th class="py-2 pr-4">Serviço</th>
                  <th class="py-2 pr-4">Arquivo</th>
                  <th class="py-2 text-end"><span class="sr-only">Ações</span></th>
                </tr>
              </thead>
              <tbody>
                @for (contrato of contratos(); track contrato.servicoId) {
                  <tr class="border-t">
                    <td class="py-2 pr-4">{{ contrato.fornecedores.length ? contrato.fornecedores.join(', ') : '—' }}</td>
                    <td class="py-2 pr-4">{{ contrato.servico }}</td>
                    <td class="py-2 pr-4"><mat-icon class="align-middle mr-1">description</mat-icon>{{ contrato.nome }}</td>
                    <td class="py-2 text-end whitespace-nowrap">
                      <button mat-stroked-button type="button" (click)="abrir(contrato.arquivoId, false)"><mat-icon>open_in_new</mat-icon> Abrir</button>
                      <button mat-stroked-button type="button" class="ml-2" (click)="abrir(contrato.arquivoId, true, contrato.nome)"><mat-icon>download</mat-icon> Baixar</button>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }
      </div>
    </mat-card>
  `,
})
export class EventoContratosPage implements OnInit {
  private readonly negocio = inject(NegocioClient);
  private readonly rota = inject(ActivatedRoute);
  private readonly toast = inject(ToastService);

  protected id = '';
  protected readonly evento = signal<EventoDetalhe | null>(null);
  protected readonly contratos = computed(() => montarContratosDoEvento(this.evento()?.servicos ?? []));

  ngOnInit(): void {
    this.id = this.rota.snapshot.paramMap.get('id') ?? '';
    this.negocio.evento(this.id).subscribe({
      next: (evento) => this.evento.set(evento),
      error: (erro: unknown) => this.toast.erro(mensagemDeErro(erro)),
    });
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

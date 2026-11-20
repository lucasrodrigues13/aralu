import { Component, inject, OnInit, signal } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { AssistentesClient, ContaComAssistentes } from '../../core/assistentes.client';
import { ContaClient } from '../../core/conta.client';
import { mensagemDeErro } from '../../core/mensagem-erro';
import { ToastService } from '../../core/toast.service';

@Component({
  selector: 'app-area-admin',
  imports: [MatCardModule],
  template: `
    <mat-card>
      <mat-card-header>
        <mat-card-title>Área administrativa</mat-card-title>
      </mat-card-header>
      <mat-card-content>
        <p>{{ status() }}</p>
      </mat-card-content>
    </mat-card>

    <mat-card>
      <mat-card-header>
        <mat-card-title>Assistentes das contas</mat-card-title>
      </mat-card-header>
      <mat-card-content>
        @if (contas().length === 0) {
          <p>Nenhuma conta tem assistentes.</p>
        }
        @for (conta of contas(); track conta.contaId) {
          <h3>{{ conta.emailDaConta }}</h3>
          <ul>
            @for (assistente of conta.assistentes; track assistente.id) {
              <li>
                {{ assistente.nome }} ({{ assistente.email }}) — {{ assistente.situacao }};
                financeiro: {{ assistente.podeVerFinanceiro ? 'sim' : 'não' }};
                {{ assistente.somenteDela ? 'só os dela' : 'todos os eventos' }}
              </li>
            }
          </ul>
        }
      </mat-card-content>
    </mat-card>
  `,
})
export class AreaAdminPage implements OnInit {
  private readonly conta = inject(ContaClient);
  private readonly assistentes = inject(AssistentesClient);
  private readonly toast = inject(ToastService);
  protected readonly status = signal('Carregando...');
  protected readonly contas = signal<ContaComAssistentes[]>([]);

  ngOnInit(): void {
    this.conta.areaAdmin().subscribe({
      next: (area) => this.status.set(`Administrador ${area.email}.`),
      error: (erro: unknown) => {
        const mensagem = mensagemDeErro(erro);
        this.status.set(mensagem);
        this.toast.erro(mensagem);
      },
    });
    this.assistentes.doAdmin().subscribe({
      next: (contas) => this.contas.set(contas),
      error: (erro: unknown) => this.toast.erro(mensagemDeErro(erro)),
    });
  }
}

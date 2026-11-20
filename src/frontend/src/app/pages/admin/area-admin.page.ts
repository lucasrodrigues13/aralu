import { Component, inject, OnInit, signal } from '@angular/core';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { AssistentesClient, ContaComAssistentes } from '../../core/assistentes.client';
import { AuthService } from '../../core/auth.service';
import { ContaClient, UsuarioAdmin } from '../../core/conta.client';
import { mensagemDeErro } from '../../core/mensagem-erro';
import { ToastService } from '../../core/toast.service';

@Component({
  selector: 'app-area-admin',
  imports: [MatCardModule, MatButtonModule],
  template: `
    <mat-card>
      <mat-card-header>
        <mat-card-title>Início Admin</mat-card-title>
      </mat-card-header>
      <mat-card-content>
        <p>{{ status() }}</p>
        @if (auth.contaSelecionada(); as atual) {
          <p>
            Você está operando a conta <strong>{{ atual.email }}</strong> com acesso total.
            <button mat-stroked-button type="button" (click)="sairDaConta()">Voltar ao Início Admin</button>
          </p>
        }
      </mat-card-content>
    </mat-card>

    <mat-card>
      <mat-card-header>
        <mat-card-title>Usuários</mat-card-title>
      </mat-card-header>
      <mat-card-content>
        @if (usuarios().length === 0) {
          <p>Nenhum usuário organizer cadastrado.</p>
        }
        @for (usuario of usuarios(); track usuario.id) {
          <div class="flex items-center justify-between gap-3 py-2">
            <span class="min-w-0 truncate">{{ usuario.email }} <small class="text-muted">({{ usuario.papel }})</small></span>
            <button mat-flat-button type="button" (click)="assumir(usuario)" [disabled]="auth.contaSelecionada()?.id === usuario.id">
              {{ auth.contaSelecionada()?.id === usuario.id ? 'Conta atual' : 'Acessar conta' }}
            </button>
          </div>
        }
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
  protected readonly auth = inject(AuthService);
  private readonly conta = inject(ContaClient);
  private readonly assistentes = inject(AssistentesClient);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);
  protected readonly status = signal('Carregando...');
  protected readonly usuarios = signal<UsuarioAdmin[]>([]);
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
    this.conta.usuariosAdmin().subscribe({
      next: (usuarios) => this.usuarios.set(usuarios),
      error: (erro: unknown) => this.toast.erro(mensagemDeErro(erro)),
    });
    this.assistentes.doAdmin().subscribe({
      next: (contas) => this.contas.set(contas),
      error: (erro: unknown) => this.toast.erro(mensagemDeErro(erro)),
    });
  }

  protected assumir(usuario: UsuarioAdmin): void {
    this.auth.selecionarConta({ id: usuario.id, email: usuario.email });
    void this.router.navigateByUrl('/hoje');
  }

  protected sairDaConta(): void {
    this.auth.selecionarConta(null);
  }
}

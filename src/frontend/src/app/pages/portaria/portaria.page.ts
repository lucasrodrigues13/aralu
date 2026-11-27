import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatIconModule } from '@angular/material/icon';
import { Observable } from 'rxjs';
import { mensagemDeErro } from '../../core/mensagem-erro';
import { ConvitePortaria, PortariaClient, PortariaLeitura } from '../../core/portaria.client';
import { ToastService } from '../../core/toast.service';
import { GdDataPipe } from '../../shared/gd-data.pipe';
import { LeitorQrComponent } from './leitor-qr.component';

/** Portaria do evento pelo link da pessoa da equipe (SPEC-058 e SPEC-067): escanear o QR, conferir a lista e marcar quem compareceu. */
@Component({
  selector: 'app-portaria',
  imports: [MatCardModule, MatButtonModule, MatCheckboxModule, MatIconModule, DatePipe, GdDataPipe, LeitorQrComponent, RouterLink],
  template: `
    <main class="pagina">
      @if (carregando()) {
        <p class="text-xs text-muted">Carregando…</p>
      } @else if (indisponivel()) {
        <mat-card class="cardWithShadow"><mat-card-content class="aviso">
          <mat-icon>link_off</mat-icon>
          <h1>Este link não está mais disponível</h1>
          <p class="text-muted">Fale com quem organizou o evento.</p>
        </mat-card-content></mat-card>
      } @else if (dados(); as d) {
        <header class="topo">
          <a mat-button [routerLink]="['/equipe', token]"><mat-icon>arrow_back</mat-icon> Voltar</a>
          <h1>Portaria: {{ d.evento }}</h1>
          @if (d.data) { <span class="text-sm text-muted">{{ d.data | gdData }}</span> }
        </header>

        @if (convite(); as c) {
          <mat-card class="cardWithShadow" data-teste="convite-portaria">
            <mat-card-content>
              <h2 class="titulo">{{ c.nome }}</h2>
              <p class="text-muted text-sm">Marque quem está entrando. Só convidados confirmados podem entrar.</p>
              <ul class="pessoas">
                @for (pessoa of c.convidados; track pessoa.id) {
                  <li class="linha">
                    <mat-checkbox
                      [checked]="marcados().has(pessoa.id)"
                      [disabled]="!pessoa.confirmado"
                      (change)="alternar(pessoa.id, $event.checked)">
                      {{ pessoa.nome }}
                    </mat-checkbox>
                    <span class="text-sm" [class.text-muted]="!pessoa.confirmado">
                      @if (!pessoa.confirmado) { {{ pessoa.situacao }} }
                      @else if (pessoa.compareceuEm) { Entrou às {{ pessoa.compareceuEm | date: 'HH:mm' }} }
                      @else { Ainda não entrou }
                    </span>
                  </li>
                }
              </ul>
              <div class="acoes">
                <button mat-stroked-button type="button" (click)="fecharConvite()">Voltar</button>
                <button mat-flat-button type="button" data-teste="confirmar-entrada" [disabled]="salvando()" (click)="salvar(c)">Confirmar presença</button>
              </div>
            </mat-card-content>
          </mat-card>
        } @else if (escaneando()) {
          <mat-card class="cardWithShadow"><mat-card-content>
            <app-leitor-qr (lido)="abrirPeloQr($event)" />
            <div class="acoes">
              <button mat-stroked-button type="button" (click)="escaneando.set(false)">Cancelar</button>
            </div>
          </mat-card-content></mat-card>
        } @else {
          <mat-card class="resumo cardWithShadow"><mat-card-content>
            <div><span class="rotulo">Confirmados</span><strong>{{ d.confirmados }}</strong></div>
            <div><span class="rotulo">Já entraram</span><strong>{{ d.compareceram }}</strong></div>
            <div><span class="rotulo">Faltam</span><strong>{{ d.confirmados - d.compareceram }}</strong></div>
          </mat-card-content></mat-card>

          <button mat-flat-button type="button" data-teste="escanear" (click)="escaneando.set(true)"><mat-icon>qr_code_scanner</mat-icon> Escanear QR code</button>

          <label class="busca">
            <span class="rotulo">Conferir a lista</span>
            <input type="search" aria-label="Buscar convite ou convidado" placeholder="Buscar convite ou convidado" [value]="busca()" (input)="busca.set($any($event.target).value)" />
          </label>

          @if (filtrados().length === 0) {
            <p class="text-muted">Nenhum convite confirmado encontrado.</p>
          }
          @for (item of filtrados(); track item.id) {
            <mat-card class="cardWithShadow">
              <mat-card-content>
                <div class="linha">
                  <div>
                    <h2 class="titulo">{{ item.nome }}</h2>
                    <p class="text-sm text-muted">{{ resumo(item) }}</p>
                  </div>
                  <button mat-stroked-button type="button" (click)="abrir(item)">Abrir</button>
                </div>
                <ul class="pessoas">
                  @for (pessoa of item.convidados; track pessoa.id) {
                    @if (pessoa.confirmado) {
                      <li class="linha">
                        <span>{{ pessoa.nome }}</span>
                        <span class="text-sm" [class.text-muted]="!pessoa.compareceuEm">
                          @if (pessoa.compareceuEm) { Entrou às {{ pessoa.compareceuEm | date: 'HH:mm' }} } @else { Ainda não entrou }
                        </span>
                      </li>
                    }
                  }
                </ul>
              </mat-card-content>
            </mat-card>
          }
        }
      }
    </main>
  `,
  styles: `
    :host { display: block; min-height: 100vh; background: var(--mat-sys-background); }
    .pagina { max-width: 640px; margin: 0 auto; padding: 24px 16px 48px; display: grid; gap: 12px; }
    .topo { border-bottom: 1px solid var(--mat-sys-outline-variant); padding-bottom: 12px; }
    h1 { font-size: 22px; margin: 0; overflow-wrap: anywhere; }
    .titulo { font-size: 17px; font-weight: 600; margin: 0; overflow-wrap: anywhere; }
    .aviso { text-align: center; padding: 32px 16px; }
    .aviso mat-icon { font-size: 40px; width: 40px; height: 40px; line-height: 40px; color: var(--mat-sys-outline); }
    .resumo mat-card-content { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; text-align: center; }
    .resumo strong { font-size: 22px; }
    .rotulo { display: block; font-size: 12px; color: var(--mat-sys-outline); }
    .busca input { width: 100%; padding: 10px 12px; border: 1px solid var(--mat-sys-outline-variant); border-radius: 8px; background: transparent; color: inherit; font: inherit; }
    .pessoas { margin: 8px 0 0; padding: 0; list-style: none; display: grid; gap: 2px; }
    .linha { display: flex; justify-content: space-between; align-items: center; gap: 12px; }
    .acoes { display: flex; flex-wrap: wrap; justify-content: flex-end; gap: 8px; margin-top: 12px; }
  `,
})
export class PortariaPage implements OnInit {
  private readonly portaria = inject(PortariaClient);
  private readonly rota = inject(ActivatedRoute);
  private readonly toast = inject(ToastService);
  protected readonly dados = signal<PortariaLeitura | null>(null);
  protected readonly carregando = signal(true);
  protected readonly indisponivel = signal(false);
  protected readonly escaneando = signal(false);
  protected readonly salvando = signal(false);
  protected readonly convite = signal<ConvitePortaria | null>(null);
  protected readonly marcados = signal<ReadonlySet<string>>(new Set());
  protected readonly busca = signal('');
  protected readonly filtrados = computed(() => {
    const termo = this.busca().trim().toLowerCase();
    const convites = this.dados()?.convites ?? [];
    return termo
      ? convites.filter((item) => item.nome.toLowerCase().includes(termo) || item.convidados.some((pessoa) => pessoa.nome.toLowerCase().includes(termo)))
      : convites;
  });
  private readonly router = inject(Router);
  protected token = '';

  ngOnInit(): void {
    this.token = this.rota.snapshot.paramMap.get('token') ?? '';
    this.portaria.ler(this.token).subscribe({
      next: (dados) => {
        this.dados.set(dados);
        this.carregando.set(false);
      },
      error: (erro: unknown) => {
        // Sem sessão (ou vencida): volta ao painel da equipe, que pede o código.
        if (erro instanceof HttpErrorResponse && erro.status === 401) {
          void this.router.navigate(['/equipe', this.token]);
          return;
        }
        this.indisponivel.set(true);
        this.carregando.set(false);
      },
    });
  }

  protected resumo(item: ConvitePortaria): string {
    const confirmados = item.convidados.filter((pessoa) => pessoa.confirmado);
    const entraram = confirmados.filter((pessoa) => pessoa.compareceuEm).length;
    return `${entraram} de ${confirmados.length} confirmados entraram`;
  }

  protected abrirPeloQr(texto: string): void {
    this.portaria.lerPeloQr(this.token, texto).subscribe({
      next: (convite) => {
        this.escaneando.set(false);
        this.abrir(convite);
      },
      error: (erro: unknown) => this.toast.erro(mensagemDeErro(erro)),
    });
  }

  /** Abre o convite com os já presentes marcados e, se ninguém entrou ainda, todos os confirmados marcados. */
  protected abrir(convite: ConvitePortaria): void {
    const confirmados = convite.convidados.filter((pessoa) => pessoa.confirmado);
    const jaEntraram = confirmados.filter((pessoa) => pessoa.compareceuEm);
    this.marcados.set(new Set((jaEntraram.length ? jaEntraram : confirmados).map((pessoa) => pessoa.id)));
    this.convite.set(convite);
  }

  protected fecharConvite(): void {
    this.convite.set(null);
  }

  protected alternar(id: string, marcado: boolean): void {
    const novo = new Set(this.marcados());
    if (marcado) novo.add(id);
    else novo.delete(id);
    this.marcados.set(novo);
  }

  protected salvar(convite: ConvitePortaria): void {
    this.salvando.set(true);
    const chamada: Observable<ConvitePortaria> = this.portaria.marcar(this.token, convite.id, [...this.marcados()]);
    chamada.subscribe({
      next: (atualizado) => {
        this.salvando.set(false);
        this.convite.set(null);
        this.dados.update((atual) => (atual ? this.comConvite(atual, atualizado) : atual));
        this.toast.sucesso('Presença registrada.');
      },
      error: (erro: unknown) => {
        this.salvando.set(false);
        this.toast.erro(mensagemDeErro(erro));
      },
    });
  }

  private comConvite(atual: PortariaLeitura, convite: ConvitePortaria): PortariaLeitura {
    const convites = atual.convites.map((item) => (item.id === convite.id ? convite : item));
    const confirmados = convites.flatMap((item) => item.convidados).filter((pessoa) => pessoa.confirmado);
    return { ...atual, convites, confirmados: confirmados.length, compareceram: confirmados.filter((pessoa) => pessoa.compareceuEm).length };
  }
}

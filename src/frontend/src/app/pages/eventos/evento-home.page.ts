import { Component, ElementRef, inject, OnDestroy, OnInit, signal, viewChild } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatSelectModule } from '@angular/material/select';
import { mensagemDeErro } from '../../core/mensagem-erro';
import { AlertaEvento, Cliente, EventoDetalhe, NegocioClient, ResumoEvento, ROTULO_PAPEL, TIPOS } from '../../core/negocio.client';
import { ToastService } from '../../core/toast.service';
import { ConfirmaDialog } from '../../shared/confirma-dialog';
import { DIALOG, DIALOG_LARGO, DIALOG_PEQUENO } from '../../shared/dialog';
import { GdDataPipe } from '../../shared/gd-data.pipe';
import { GdDinheiroPipe } from '../../shared/gd-dinheiro.pipe';
import { GdHoraPipe } from '../../shared/gd-hora.pipe';
import { ClienteFormDialog } from '../clientes/cliente-form.dialog';
import { EventoAbasComponent } from './evento-abas.component';
import { AplicarModeloDialog } from './aplicar-modelo.dialog';
import { EventoFormPage } from './evento-form.page';
import { SalvarComoModeloDialog } from './salvar-como-modelo.dialog';

/** Clientes do evento: vincular existente, cadastrar novo ou desvincular. */
@Component({
  selector: 'app-clientes-evento-dialog',
  imports: [MatDialogModule, MatButtonModule, MatFormFieldModule, MatSelectModule, MatIconModule],
  template: `
    <h2 mat-dialog-title>Clientes do evento</h2>
    <p class="gd-dialog-descricao">Quem contratou ou acompanha o evento.</p>
    <mat-dialog-content>
      @if (vinculados().length === 0) {
        <p class="gd-apoio">Nenhum cliente vinculado.</p>
      } @else {
        <ul class="gd-lista">
          @for (cliente of vinculados(); track cliente.id) {
            <li>
              <span class="gd-crescer">
                <strong>{{ cliente.nome }}</strong>
                <span class="gd-sub">{{ rotulo(cliente.papel) }} · {{ cliente.celular }}</span>
              </span>
              <button mat-button class="gd-perigo gd-pequeno" type="button" (click)="desvincular(cliente.id)">Desvincular</button>
            </li>
          }
        </ul>
      }
      <div class="gd-campos duas vincular">
        <mat-form-field>
          <mat-label>Vincular cliente da conta</mat-label>
          <mat-select (valueChange)="vincular($event)">
            @for (cliente of disponiveis(); track cliente.id) {
              <mat-option [value]="cliente.id">{{ cliente.nome }}</mat-option>
            }
          </mat-select>
        </mat-form-field>
        <button mat-button class="gd-secundario" type="button" (click)="novo()"><mat-icon>person_add</mat-icon> Cadastrar novo</button>
      </div>
    </mat-dialog-content>
    <mat-dialog-actions>
      <button mat-flat-button type="button" mat-dialog-close>Pronto</button>
    </mat-dialog-actions>
  `,
  styles: `.vincular { margin-top: 16px; align-items: end; } .vincular button { margin-bottom: 0; }`,
})
export class ClientesEventoDialog implements OnInit {
  private readonly negocio = inject(NegocioClient);
  private readonly dialog = inject(MatDialog);
  private readonly toast = inject(ToastService);
  private readonly eventoId = inject<string>(MAT_DIALOG_DATA);
  protected readonly vinculados = signal<Cliente[]>([]);
  protected readonly disponiveis = signal<Cliente[]>([]);

  ngOnInit(): void {
    this.carregar();
  }

  protected rotulo(papel: string | null): string {
    return papel ? (ROTULO_PAPEL[papel] ?? papel) : 'Sem papel';
  }

  protected vincular(clienteId: string): void {
    if (!clienteId) return;
    this.negocio.vincular(this.eventoId, clienteId).subscribe({
      next: () => {
        this.toast.sucesso('Cliente vinculado.');
        this.carregar();
      },
      error: (erro: unknown) => this.toast.erro(mensagemDeErro(erro)),
    });
  }

  protected desvincular(clienteId: string): void {
    this.negocio.desvincular(this.eventoId, clienteId).subscribe({
      next: () => {
        this.toast.sucesso('Cliente desvinculado.');
        this.carregar();
      },
      error: (erro: unknown) => this.toast.erro(mensagemDeErro(erro)),
    });
  }

  protected novo(): void {
    this.dialog.open(ClienteFormDialog, { ...DIALOG, data: null }).afterClosed().subscribe((cliente) => {
      if (cliente) this.vincular(cliente.id);
    });
  }

  private carregar(): void {
    this.negocio.clientesDoEvento(this.eventoId).subscribe({
      next: (lista) => {
        this.vinculados.set(lista);
        this.negocio.clientes().subscribe({
          next: (todos) => this.disponiveis.set(todos.filter((cliente) => !lista.some((item) => item.id === cliente.id))),
          error: () => this.disponiveis.set([]),
        });
      },
      error: () => this.vinculados.set([]),
    });
  }
}

/** Resumo do evento: cabeçalho, alertas e cartões (SPEC-008 v2, 6.2). */
@Component({
  selector: 'app-evento-home',
  imports: [RouterLink, MatButtonModule, MatIconModule, MatMenuModule, GdDataPipe, GdDinheiroPipe, GdHoraPipe, EventoAbasComponent],
  template: `
    <a mat-button routerLink="/eventos"><mat-icon>arrow_back</mat-icon> Eventos</a>
    <app-evento-abas [eventoId]="id" />
    @if (evento(); as atual) {
      <header class="gd-cabecalho evento-topo">
        <div class="identidade">
          <button type="button" class="foto" [attr.aria-label]="foto() ? 'Trocar a foto do evento' : 'Adicionar foto ao evento'" (click)="escolherFoto()">
            @if (foto(); as url) {
              <img [src]="url" alt="" />
            } @else {
              <span>{{ iniciais(atual) }}</span>
            }
          </button>
          <input #arquivo hidden type="file" accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp" (change)="enviarFoto($event)" />
          <div>
            <h1>{{ atual.nome }}</h1>
            <p class="gd-apoio">
              {{ rotuloTipo(atual.tipo) }} ·
              @if (atual.data) {
                {{ atual.data | gdData }}@if (atual.hora) { às {{ atual.hora | gdHora }} }
              } @else {
                Sem data
              }
              @if (local(atual); as onde) { · {{ onde }} }
            </p>
            <div class="selos">
              <span [class]="classe(atual.situacao)">{{ rotuloSituacao(atual.situacao) }}</span>
              @if (atual.situacao === 'EmAndamento' && atual.diasRestantes !== null && atual.diasRestantes >= 0) {
                <span class="gd-status info">{{ atual.diasRestantes === 0 ? 'É hoje' : 'Faltam ' + atual.diasRestantes + (atual.diasRestantes === 1 ? ' dia' : ' dias') }}</span>
              }
            </div>
          </div>
        </div>
        <div class="gd-cabecalho-acoes">
          <button mat-button class="gd-secundario" type="button" [matMenuTriggerFor]="mais"><mat-icon>more_horiz</mat-icon> Mais</button>
          <mat-menu #mais="matMenu" xPosition="before">
            @if (foto()) {
              <button mat-menu-item type="button" (click)="removerFoto()"><mat-icon>hide_image</mat-icon> Remover foto</button>
            }
            @if (atual.situacao === 'EmAndamento') {
              <button mat-menu-item type="button" (click)="aplicarModelo()"><mat-icon>playlist_add</mat-icon> Aplicar modelo</button>
              <button mat-menu-item type="button" (click)="salvarComoModelo()"><mat-icon>save_as</mat-icon> Salvar como modelo</button>
              <button mat-menu-item type="button" (click)="encerrar('concluir')"><mat-icon>task_alt</mat-icon> Concluir evento</button>
              <button mat-menu-item type="button" (click)="encerrar('cancelar')"><mat-icon>block</mat-icon> Cancelar evento</button>
            }
          </mat-menu>
          @if (atual.situacao === 'EmAndamento') {
            <button mat-flat-button type="button" (click)="editar()"><mat-icon>edit</mat-icon> Editar</button>
          }
        </div>
      </header>

      @if (resumo(); as r) {
        @for (alerta of r.alertas; track alerta.codigo) {
          <div class="gd-alerta" [class.erro]="urgente(alerta)" [class.alerta]="!urgente(alerta)" role="status">
            <mat-icon>{{ urgente(alerta) ? 'error' : 'warning' }}</mat-icon>
            <div class="gd-crescer"><strong>{{ alerta.texto }}</strong></div>
            <button mat-button class="gd-secundario gd-pequeno" type="button" (click)="resolver(alerta)">{{ acaoDoAlerta(alerta) }}</button>
          </div>
        }

        <div class="gd-numeros">
          <a class="gd-numero" [routerLink]="['/eventos', id, 'tarefas']">
            <span>Tarefas</span>
            <strong>{{ percentual(r.tarefasConcluidas, r.tarefas) }}%</strong>
            <span class="gd-icone"><mat-icon>checklist</mat-icon></span>
            <small>{{ r.tarefasConcluidas }} de {{ r.tarefas }} feitas · {{ r.tarefasAtrasadas }} {{ r.tarefasAtrasadas === 1 ? 'atrasada' : 'atrasadas' }}</small>
          </a>
          <a class="gd-numero" [routerLink]="['/eventos', id, 'convidados']">
            <span>Convidados confirmados</span>
            <strong>{{ r.convidadosConfirmados }}</strong>
            <span class="gd-icone"><mat-icon>groups</mat-icon></span>
            <small>{{ r.convidadosPendentes }} pendentes · {{ r.convidadosRecusados }} recusados · de {{ r.convidados }}</small>
          </a>
          <a class="gd-numero" [routerLink]="['/eventos', id, 'fornecedores']">
            <span>Serviços contratados</span>
            <strong>{{ r.servicosContratados }}</strong>
            <span class="gd-icone"><mat-icon>storefront</mat-icon></span>
            <small>{{ r.servicosContratados }} de {{ r.servicos }} serviços · {{ r.servicosSemFornecedor }} sem fornecedor</small>
          </a>
          <a class="gd-numero" [routerLink]="['/eventos', id, 'fornecedores']">
            <span>Orçamento contratado</span>
            <strong>{{ r.valorContratado | gdDinheiro }}</strong>
            <span class="gd-icone"><mat-icon>request_quote</mat-icon></span>
            <small>Estimado {{ r.orcamentoEstimado | gdDinheiro }} · pago {{ r.valorPago | gdDinheiro }}</small>
          </a>
          <button type="button" class="gd-numero" (click)="abrirClientes()">
            <span>Cliente</span>
            <strong class="nome">{{ r.cliente?.nome ?? 'Nenhum cliente' }}</strong>
            <span class="gd-icone"><mat-icon>person</mat-icon></span>
            <small>{{ r.cliente ? r.cliente.celular : 'Vincular cliente' }}</small>
          </button>
        </div>
      }
    }
  `,
  styles: `
    .evento-topo { align-items: center; }
    .identidade { display: flex; align-items: center; gap: 16px; min-width: 0; }
    .identidade h1 { margin: 0; }
    .identidade .gd-apoio { margin: 4px 0 8px; }
    .foto { flex-shrink: 0; width: 64px; height: 64px; padding: 0; border: 0; border-radius: 50%; overflow: hidden; display: grid; place-items: center; cursor: pointer; background: color-mix(in oklab, var(--gd-primary) 15%, transparent); color: var(--gd-primary); font: inherit; font-size: 18px; font-weight: 700; }
    .foto:focus-visible { outline: none; box-shadow: var(--gd-anel-foco); }
    .foto img { width: 100%; height: 100%; object-fit: cover; }
    .selos { display: flex; flex-wrap: wrap; gap: 8px; }
    .gd-alerta { align-items: center; }
    button.gd-numero { border: 0; font: inherit; text-align: left; cursor: pointer; }
    button.gd-numero:hover { box-shadow: 0 0 0 1px color-mix(in oklab, var(--gd-primary) 50%, transparent), 0 1px 2px rgb(0 0 0 / 0.05); }
    .nome { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 18px !important; }
  `,
})
export class EventoHomePage implements OnInit, OnDestroy {
  private readonly negocio = inject(NegocioClient);
  private readonly rota = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly dialog = inject(MatDialog);
  private readonly toast = inject(ToastService);
  protected readonly evento = signal<EventoDetalhe | null>(null);
  protected readonly resumo = signal<ResumoEvento | null>(null);
  protected readonly foto = signal<string | null>(null);
  private fotoAtual: string | null = null;
  private readonly arquivo = viewChild<ElementRef<HTMLInputElement>>('arquivo');
  protected id = '';

  ngOnInit(): void {
    this.id = this.rota.snapshot.paramMap.get('id') ?? '';
    this.recarregar();
  }

  ngOnDestroy(): void {
    this.limparFoto();
  }

  protected iniciais(atual: EventoDetalhe): string {
    const pessoas = [atual.primeiroNome, atual.segundoNome].map((nome) => nome?.trim()).filter((nome): nome is string => !!nome);
    const fontes = pessoas.length
      ? pessoas
      : atual.nome.split(/\s+/).filter((parte) => parte && parte !== '&' && parte.toLowerCase() !== 'e');
    const letras = fontes.slice(0, 2).map((parte) => parte[0]?.toUpperCase() ?? '').filter(Boolean);
    return letras.length === 2 ? `${letras[0]}&${letras[1]}` : letras[0] || 'E';
  }

  protected rotuloTipo(tipo: string): string {
    return TIPOS.find((item) => item.valor === tipo)?.rotulo ?? tipo;
  }

  protected local(atual: EventoDetalhe): string {
    return atual.recepcao.nome || atual.cerimonia.nome || '';
  }

  protected rotuloSituacao(situacao: string): string {
    return { EmAndamento: 'Em andamento', Concluido: 'Concluído', Cancelado: 'Cancelado' }[situacao] ?? situacao;
  }

  protected classe(situacao: string): string {
    if (situacao === 'Concluido') return 'gd-status ok';
    if (situacao === 'Cancelado') return 'gd-status erro';
    return 'gd-status alerta';
  }

  protected percentual(feitas: number, total: number): number {
    return total === 0 ? 0 : Math.round((feitas / total) * 100);
  }

  protected urgente(alerta: AlertaEvento): boolean {
    return alerta.codigo === 'tarefas-atrasadas' || alerta.codigo === 'pagamentos-vencidos';
  }

  protected acaoDoAlerta(alerta: AlertaEvento): string {
    return {
      TarefasAtrasadas: 'Ver tarefas',
      Fornecedores: 'Ver fornecedores',
      ConvidadosPendentes: 'Ver convidados',
      Editar: 'Informar data',
    }[alerta.destino];
  }

  protected resolver(alerta: AlertaEvento): void {
    switch (alerta.destino) {
      case 'TarefasAtrasadas':
        void this.router.navigate(['/eventos', this.id, 'tarefas'], { queryParams: { filtro: 'atrasadas' } });
        break;
      case 'Fornecedores':
        void this.router.navigate(['/eventos', this.id, 'fornecedores']);
        break;
      case 'ConvidadosPendentes':
        void this.router.navigate(['/eventos', this.id, 'convidados'], { queryParams: { situacao: 'Pendente' } });
        break;
      case 'Editar':
        this.editar();
        break;
    }
  }

  protected abrirClientes(): void {
    this.dialog.open(ClientesEventoDialog, { ...DIALOG, data: this.id }).afterClosed().subscribe(() => this.carregarResumo());
  }

  protected escolherFoto(): void {
    this.arquivo()?.nativeElement.click();
  }

  protected enviarFoto(evento: Event): void {
    const entrada = evento.target as HTMLInputElement;
    const arquivo = entrada.files?.[0] ?? null;
    entrada.value = '';
    if (!arquivo) return;
    this.negocio.imagemEvento(this.id, arquivo).subscribe({
      next: (resposta) => {
        this.mostrarFoto(arquivo);
        this.evento.update((atual) => (atual ? { ...atual, imagemId: resposta.imagemId } : atual));
        this.toast.sucesso('Foto adicionada.');
      },
      error: (erro: unknown) => this.toast.erro(mensagemDeErro(erro)),
    });
  }

  protected removerFoto(): void {
    this.negocio.removerImagemEvento(this.id).subscribe({
      next: () => {
        this.limparFoto();
        this.evento.update((atual) => (atual ? { ...atual, imagemId: null } : atual));
        this.toast.sucesso('Foto removida.');
      },
      error: (erro: unknown) => this.toast.erro(mensagemDeErro(erro)),
    });
  }

  protected encerrar(acao: 'concluir' | 'cancelar'): void {
    this.dialog.open(ConfirmaDialog, {
      ...DIALOG_PEQUENO,
      data: {
        titulo: acao === 'concluir' ? 'Concluir evento' : 'Cancelar evento',
        texto: 'Confirma a mudança de situação?',
        confirmar: acao === 'concluir' ? 'Concluir' : 'Cancelar evento',
      },
    }).afterClosed().subscribe((confirmou) => {
      if (!confirmou) return;
      const pedido = acao === 'concluir' ? this.negocio.concluir(this.id) : this.negocio.cancelar(this.id);
      pedido.subscribe({
        next: (evento) => {
          this.evento.set(evento);
          this.carregarResumo();
          this.toast.sucesso(acao === 'concluir' ? 'Evento concluído.' : 'Evento cancelado.');
        },
        error: (erro: unknown) => this.toast.erro(mensagemDeErro(erro)),
      });
    });
  }

  protected editar(): void {
    this.dialog.open(EventoFormPage, { ...DIALOG_LARGO, data: { id: this.id } }).afterClosed().subscribe((salvo) => {
      if (salvo) this.recarregar();
    });
  }

  protected aplicarModelo(): void {
    const atual = this.evento();
    if (!atual) return;
    this.dialog.open(AplicarModeloDialog, {
      ...DIALOG,
      data: { eventoId: this.id, tipo: atual.tipo },
    }).afterClosed().subscribe((ok) => {
      if (ok) this.recarregar();
    });
  }

  protected salvarComoModelo(): void {
    const atual = this.evento();
    if (!atual) return;
    this.dialog.open(SalvarComoModeloDialog, {
      ...DIALOG,
      data: { eventoId: this.id, nomeEvento: atual.nome },
    });
  }

  private recarregar(): void {
    this.negocio.evento(this.id).subscribe({
      next: (evento) => {
        this.evento.set(evento);
        if (evento.imagemId) {
          this.negocio.baixarArquivo(evento.imagemId).subscribe({
            next: (arquivo) => this.mostrarFoto(arquivo),
            error: () => this.limparFoto(),
          });
        } else {
          this.limparFoto();
        }
      },
      error: (erro: unknown) => this.toast.erro(mensagemDeErro(erro)),
    });
    this.carregarResumo();
  }

  private carregarResumo(): void {
    this.negocio.resumoEvento(this.id).subscribe({
      next: (resumo) => this.resumo.set(resumo),
      error: () => this.resumo.set(null),
    });
  }

  private mostrarFoto(arquivo: Blob): void {
    if (this.fotoAtual) URL.revokeObjectURL(this.fotoAtual);
    this.fotoAtual = URL.createObjectURL(arquivo);
    this.foto.set(this.fotoAtual);
  }

  private limparFoto(): void {
    if (this.fotoAtual) {
      URL.revokeObjectURL(this.fotoAtual);
      this.fotoAtual = null;
    }
    this.foto.set(null);
  }
}

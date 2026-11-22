import { Component, ElementRef, inject, OnDestroy, OnInit, signal, viewChild } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatSelectModule } from '@angular/material/select';
import { AuthService } from '../../core/auth.service';
import { mensagemDeErro } from '../../core/mensagem-erro';
import { AlertaEvento, Cliente, EventoDetalhe, NegocioClient, ResumoEvento, ROTULO_PAPEL, TIPOS } from '../../core/negocio.client';
import { ToastService } from '../../core/toast.service';
import { ConfirmaDialog } from '../../shared/confirma-dialog';
import { DIALOG, DIALOG_LARGO, DIALOG_PEQUENO } from '../../shared/dialog';
import { GdDataPipe } from '../../shared/gd-data.pipe';
import { GdDinheiroPipe } from '../../shared/gd-dinheiro.pipe';
import { GdHoraPipe } from '../../shared/gd-hora.pipe';
import { STATUS } from '../../shared/status';
import { ClienteFormDialog } from '../clientes/cliente-form.dialog';
import { EventoAbasComponent } from './evento-abas.component';
import { AplicarModeloDialog } from './aplicar-modelo.dialog';
import { EventoFormPage } from './evento-form.page';
import { LinkCasalDialog } from './link-casal.dialog';
import { LinkPortariaDialog } from './link-portaria.dialog';
import { EventoTarefasComponent } from '../tarefas/evento-tarefas.component';
import { SalvarComoModeloDialog } from './salvar-como-modelo.dialog';

/** Clientes do evento: vincular existente, cadastrar novo ou desvincular. */
@Component({
  selector: 'app-clientes-evento-dialog',
  imports: [MatDialogModule, MatButtonModule, MatFormFieldModule, MatSelectModule, MatIconModule],
  template: `
    <h2 mat-dialog-title>Clientes do evento</h2>
    <p class="text-muted text-sm px-6 -mt-2 mb-4">Quem contratou ou acompanha o evento.</p>
    <mat-dialog-content>
      @if (vinculados().length === 0) {
        <p class="text-muted">Nenhum cliente vinculado.</p>
      } @else {
        <ul class="list-none p-0 m-0 divide-y divide-border [&>li]:flex [&>li]:items-center [&>li]:gap-3 [&>li]:py-3">
          @for (cliente of vinculados(); track cliente.id) {
            <li>
              <span class="flex-1 min-w-0">
                <strong>{{ cliente.nome }}</strong>
                <span class="block text-xs text-muted">{{ rotulo(cliente.papel) }} · {{ cliente.celular }}</span>
              </span>
              <button mat-button class="text-error" type="button" (click)="desvincular(cliente.id)">Desvincular</button>
            </li>
          }
        </ul>
      }
      <div class="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-4 items-end mt-4">
        <div class="campo">
          <mat-label class="font-semibold mb-2 block">Vincular cliente da conta</mat-label>
          <mat-form-field appearance="outline" class="w-full">
          <mat-select [attr.aria-label]="'Vincular cliente da conta'" (valueChange)="vincular($event)">
            @for (cliente of disponiveis(); track cliente.id) {
              <mat-option [value]="cliente.id">{{ cliente.nome }}</mat-option>
            }
          </mat-select>
        </mat-form-field>
        </div>
        <button mat-stroked-button type="button" (click)="novo()"><mat-icon>person_add</mat-icon> Cadastrar novo</button>
      </div>
    </mat-dialog-content>
    <mat-dialog-actions>
      <button mat-flat-button type="button" mat-dialog-close>Pronto</button>
    </mat-dialog-actions>
  `,
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
  imports: [RouterLink, MatCardModule, MatButtonModule, MatIconModule, MatMenuModule, GdDataPipe, GdDinheiroPipe, GdHoraPipe, EventoAbasComponent, EventoTarefasComponent],
  template: `
    <app-evento-abas [eventoId]="id" />
    @if (evento(); as atual) {
      <mat-card class="cardWithShadow">
        <mat-card-content>
          <div class="flex flex-wrap items-center justify-between gap-4">
            <div class="flex items-center gap-4 min-w-0">
              <button
                type="button"
                class="size-16 shrink-0 rounded-full overflow-hidden flex items-center justify-center cursor-pointer border-0 p-0 bg-light-primary text-primary text-lg font-semibold"
                [attr.aria-label]="foto() ? 'Trocar a foto do evento' : 'Adicionar foto ao evento'"
                (click)="escolherFoto()"
              >
                @if (foto(); as url) {
                  <img [src]="url" alt="" class="size-full object-cover" />
                } @else {
                  <span>{{ iniciais(atual) }}</span>
                }
              </button>
              <input #arquivo hidden type="file" accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp" (change)="enviarFoto($event)" />
              <div class="min-w-0">
                <h3 class="text-xl font-semibold">{{ atual.nome }}</h3>
                <p class="text-muted mt-1">
                  {{ rotuloTipo(atual.tipo) }} ·
                  @if (atual.data) {
                    {{ atual.data | gdData }}@if (atual.hora) { às {{ atual.hora | gdHora }} }
                  } @else {
                    Sem data
                  }
                  @if (local(atual); as onde) { · {{ onde }} }
                </p>
                <div class="flex flex-wrap gap-2 mt-2">
                  <span [class]="classe(atual.situacao)">{{ rotuloSituacao(atual.situacao) }}</span>
                  @if (atual.situacao === 'EmAndamento' && atual.diasRestantes !== null && atual.diasRestantes >= 0) {
                    <span [class]="status.info">{{ atual.diasRestantes === 0 ? 'É hoje' : 'Faltam ' + atual.diasRestantes + (atual.diasRestantes === 1 ? ' dia' : ' dias') }}</span>
                  }
                </div>
              </div>
            </div>
            <div class="flex flex-wrap gap-2">
              <button mat-stroked-button type="button" [matMenuTriggerFor]="mais"><mat-icon>more_horiz</mat-icon> Mais</button>
              <mat-menu #mais="matMenu" xPosition="before" class="cardWithShadow">
                @if (foto()) {
                  <button mat-menu-item type="button" (click)="removerFoto()"><mat-icon>hide_image</mat-icon> Remover foto</button>
                }
                @if (!auth.ehAssistente()) {
                  <button mat-menu-item type="button" (click)="linkDoCasal()"><mat-icon>link</mat-icon> Link do casal</button>
                  <button mat-menu-item type="button" (click)="linkDaPortaria()"><mat-icon>qr_code_scanner</mat-icon> Link da portaria</button>
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
          </div>
        </mat-card-content>
      </mat-card>

      @if (resumo(); as r) {
        @for (alerta of r.alertas; track alerta.codigo) {
          <div
            class="flex items-center gap-3 rounded p-4 mb-4"
            [class]="urgente(alerta) ? 'bg-light-error text-error' : 'bg-light-warning text-warning'"
            role="status"
          >
            <mat-icon>{{ urgente(alerta) ? 'error' : 'warning' }}</mat-icon>
            <strong class="flex-1 min-w-0">{{ alerta.texto }}</strong>
            <button mat-stroked-button type="button" (click)="resolver(alerta)">{{ acaoDoAlerta(alerta) }}</button>
          </div>
        }

        <div class="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-6 mb-6">
          <button class="block w-full p-0 border-0 bg-transparent text-left cursor-pointer" type="button" (click)="tarefasDoEvento()?.irParaLista()">
            <mat-card class="shadow-none text-center mb-0! h-full bg-light-primary card-hover">
              <mat-card-content>
                <mat-icon class="text-primary">checklist</mat-icon>
                <h4 class="text-sm font-semibold text-primary mt-2!">Tarefas</h4>
                <h6 class="text-xl font-semibold text-primary mt-2!">{{ percentual(r.tarefasConcluidas, r.tarefas) }}%</h6>
                <span class="block text-xs text-primary mt-1">{{ r.tarefasConcluidas }} de {{ r.tarefas }} feitas · {{ r.tarefasAtrasadas }} {{ r.tarefasAtrasadas === 1 ? 'atrasada' : 'atrasadas' }}</span>
              </mat-card-content>
            </mat-card>
          </button>
          <a class="block no-underline" [routerLink]="['/eventos', id, 'convidados']">
            <mat-card class="shadow-none text-center mb-0! h-full bg-light-info card-hover">
              <mat-card-content>
                <mat-icon class="text-info">groups</mat-icon>
                <h4 class="text-sm font-semibold text-info mt-2!">Convidados confirmados</h4>
                <h6 class="text-xl font-semibold text-info mt-2!">{{ r.convidadosConfirmados }}</h6>
                <span class="block text-xs text-info mt-1">{{ r.convidadosPendentes }} pendentes · {{ r.convidadosRecusados }} recusados · de {{ r.convidados }}</span>
              </mat-card-content>
            </mat-card>
          </a>
          <a class="block no-underline" [routerLink]="['/eventos', id, 'fornecedores']">
            <mat-card class="shadow-none text-center mb-0! h-full bg-light-secondary card-hover">
              <mat-card-content>
                <mat-icon class="text-secondary">storefront</mat-icon>
                <h4 class="text-sm font-semibold text-secondary mt-2!">Serviços contratados</h4>
                <h6 class="text-xl font-semibold text-secondary mt-2!">{{ r.servicosContratados }}</h6>
                <span class="block text-xs text-secondary mt-1">{{ r.servicosContratados }} de {{ r.servicos }} serviços · {{ r.servicosSemFornecedor }} sem fornecedor</span>
              </mat-card-content>
            </mat-card>
          </a>
          @if (auth.podeVerFinanceiro()) {
          <a class="block no-underline" [routerLink]="['/eventos', id, 'fornecedores']">
            <mat-card class="shadow-none text-center mb-0! h-full bg-light-success card-hover">
              <mat-card-content>
                <mat-icon class="text-success">request_quote</mat-icon>
                <h4 class="text-sm font-semibold text-success mt-2!">Orçamento contratado</h4>
                <h6 class="text-xl font-semibold text-success mt-2!">{{ r.valorContratado | gdDinheiro }}</h6>
                <span class="block text-xs text-success mt-1">Estimado {{ r.orcamentoEstimado | gdDinheiro }} · pago {{ r.valorPago | gdDinheiro }}</span>
              </mat-card-content>
            </mat-card>
          </a>
          }
          <button class="block w-full p-0 border-0 bg-transparent text-left cursor-pointer" type="button" (click)="abrirClientes()">
            <mat-card class="shadow-none text-center mb-0! h-full bg-light-warning card-hover">
              <mat-card-content>
                <mat-icon class="text-warning">person</mat-icon>
                <h4 class="text-sm font-semibold text-warning mt-2!">Cliente</h4>
                <h6 class="text-xl font-semibold text-warning mt-2! truncate">{{ r.cliente?.nome ?? 'Nenhum cliente' }}</h6>
                <span class="block text-xs text-warning mt-1">{{ r.cliente ? r.cliente.celular : 'Vincular cliente' }}</span>
              </mat-card-content>
            </mat-card>
          </button>
        </div>
      }
      <app-evento-tarefas [eventoId]="id" (mudou)="carregarResumo()" />
    }
  `,
})
export class EventoHomePage implements OnInit, OnDestroy {
  protected readonly auth = inject(AuthService);
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
  protected readonly tarefasDoEvento = viewChild(EventoTarefasComponent);
  protected id = '';
  protected readonly status = STATUS;

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
    if (situacao === 'Concluido') return STATUS.sucesso;
    if (situacao === 'Cancelado') return STATUS.erro;
    return STATUS.alerta;
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
        this.tarefasDoEvento()?.mostrarAtrasadas();
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
      if (ok) {
        this.recarregar();
        this.tarefasDoEvento()?.recarregar();
      }
    });
  }

  protected linkDaPortaria(): void {
    this.dialog.open(LinkPortariaDialog, { ...DIALOG, data: { eventoId: this.id } });
  }

  protected linkDoCasal(): void {
    this.dialog.open(LinkCasalDialog, { ...DIALOG, data: { eventoId: this.id } });
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

  protected carregarResumo(): void {
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

import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { ActivatedRoute, Router } from '@angular/router';
import { ParcelaContrato } from '../../core/dinheiro.client';
import { mensagemDeErro } from '../../core/mensagem-erro';
import { ContratoFunil, NegocioClient } from '../../core/negocio.client';
import { ToastService } from '../../core/toast.service';
import { DIALOG, DIALOG_LARGO, DIALOG_PEQUENO } from '../../shared/dialog';
import { GdDataPipe } from '../../shared/gd-data.pipe';
import { GdDinheiroPipe } from '../../shared/gd-dinheiro.pipe';
import { STATUS } from '../../shared/status';
import { linkWhatsapp, textoCobranca } from '../dinheiro/cobranca';
import { ChavePixDialog, ReceberDialog } from '../dinheiro/dinheiro.dialogs';
import { DefinirParcelasContratoDialog } from './definir-parcelas-contrato.dialog';
import { ParcelasContratoDialog } from './parcelas-contrato.dialog';
import { MatTooltipModule } from '@angular/material/tooltip';

export type SituacaoFinanceira = 'EmAberto' | 'Atrasados' | 'Quitados' | 'SemParcelas';

/** Situação financeira do contrato, para o filtro e o selo da linha. */
export function situacaoFinanceira(contrato: ContratoFunil): SituacaoFinanceira {
  if (contrato.parcelas.length === 0) return 'SemParcelas';
  if (contrato.parcelas.some((parcela) => parcela.situacao === 'Atrasada')) return 'Atrasados';
  return contrato.saldo > 0 ? 'EmAberto' : 'Quitados';
}

export interface ParcelaPendente {
  contrato: ContratoFunil;
  parcela: ParcelaContrato;
}

/** Parcelas com saldo que vencem no mês de `hoje` e ainda não venceram (SPEC-044 §8). */
export function parcelasDoMes(contratos: ContratoFunil[], hoje: string): ParcelaPendente[] {
  const mes = hoje.slice(0, 7);
  return contratos.flatMap((contrato) =>
    contrato.parcelas
      .filter((parcela) => parcela.saldo > 0 && parcela.situacao !== 'Atrasada' && parcela.vencimento.slice(0, 7) === mes)
      .map((parcela) => ({ contrato, parcela })),
  );
}

/** Parcelas atrasadas de qualquer mês, da mais antiga para a mais nova (SPEC-044 §6.2). */
export function parcelasAtrasadas(contratos: ContratoFunil[]): ParcelaPendente[] {
  return contratos
    .flatMap((contrato) => contrato.parcelas.filter((parcela) => parcela.situacao === 'Atrasada' && parcela.saldo > 0).map((parcela) => ({ contrato, parcela })))
    .sort((a, b) => a.parcela.vencimento.localeCompare(b.parcela.vencimento) || a.contrato.oportunidadeNome.localeCompare(b.contrato.oportunidadeNome, 'pt-BR'));
}

/** Dias à frente que contam como "cobrança da semana" (o mesmo critério do card da tela Hoje). */
export const DIAS_COBRANCA = 7;

/**
 * Cobranças a fazer: parcelas atrasadas e as que vencem nos próximos `DIAS_COBRANCA` dias,
 * todas com saldo, da que vence primeiro para a última.
 */
export function parcelasACobrar(contratos: ContratoFunil[], hoje: string): ParcelaPendente[] {
  const limite = somarDias(hoje, DIAS_COBRANCA);
  return contratos
    .flatMap((contrato) =>
      contrato.parcelas
        .filter((parcela) => parcela.saldo > 0 && (parcela.situacao === 'Atrasada' || parcela.vencimento.slice(0, 10) <= limite))
        .map((parcela) => ({ contrato, parcela })),
    )
    .sort((a, b) => a.parcela.vencimento.localeCompare(b.parcela.vencimento) || a.contrato.oportunidadeNome.localeCompare(b.contrato.oportunidadeNome, 'pt-BR'));
}

function somarDias(iso: string, dias: number): string {
  const [ano, mes, dia] = iso.split('-').map(Number);
  const data = new Date(ano, mes - 1, dia + dias);
  return `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}-${String(data.getDate()).padStart(2, '0')}`;
}

/** Filtro da lista; `Cobrancas` vem do card "Cobranças a fazer" (`?filtro=cobrancas`). */
export type FiltroFinanceiro = SituacaoFinanceira | 'Cobrancas' | '';

const FILTROS: FiltroFinanceiro[] = ['Cobrancas', 'EmAberto', 'Atrasados', 'Quitados', 'SemParcelas'];

/** Filtro vindo da URL, sem diferenciar maiúsculas; valor desconhecido mostra todos. */
export function filtroDaUrl(valor: string | null): FiltroFinanceiro {
  const alvo = (valor ?? '').toLowerCase();
  return FILTROS.find((filtro) => filtro.toLowerCase() === alvo) ?? '';
}

function hojeLocal(): string {
  const agora = new Date();
  return `${agora.getFullYear()}-${String(agora.getMonth() + 1).padStart(2, '0')}-${String(agora.getDate()).padStart(2, '0')}`;
}

/**
 * Gestão Financeira (SPEC-041, card #32): o faturamento da organizadora pelo serviço prestado.
 * Lista os contratos fechados com cada cliente (não cancelados), com valor, recebido e saldo, e leva
 * ao parcelamento e às parcelas (Cobrar, Recebi) de cada um. Nada aqui é específico de evento.
 */
@Component({
  selector: 'app-gestao-financeira',
  imports: [MatButtonModule, MatCardModule, MatFormFieldModule, MatIconModule, MatInputModule, MatSelectModule, GdDataPipe, GdDinheiroPipe, MatTooltipModule],
  template: `
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6">
      <mat-card class="shadow-none text-center mb-0! h-full bg-light-primary">
        <mat-card-content>
          <mat-icon class="text-primary">event</mat-icon>
          <h4 class="text-sm font-semibold text-primary mt-2!">A receber no mês</h4>
          <h6 class="text-2xl font-semibold text-primary mt-2!">{{ totalDoMes() | gdDinheiro }}</h6>
          <p class="text-xs text-muted mt-1!">{{ doMes().length }} {{ doMes().length === 1 ? 'parcela' : 'parcelas' }}</p>
        </mat-card-content>
      </mat-card>
      <mat-card class="shadow-none text-center mb-0! h-full bg-light-error">
        <mat-card-content>
          <mat-icon class="text-error">warning</mat-icon>
          <h4 class="text-sm font-semibold text-error mt-2!">Atrasadas</h4>
          <h6 class="text-2xl font-semibold text-error mt-2!">{{ totalAtrasado() | gdDinheiro }}</h6>
          <p class="text-xs text-muted mt-1!">{{ atrasadas().length }} {{ atrasadas().length === 1 ? 'parcela' : 'parcelas' }}</p>
        </mat-card-content>
      </mat-card>
    </div>
    @if (emCobranca() || atrasadas().length > 0) {
      <mat-card class="cardWithShadow mb-6">
        <div class="p-6">
          <mat-card-title class="mb-0">{{ emCobranca() ? 'Cobranças a fazer' : 'Parcelas atrasadas' }}</mat-card-title>
          <mat-card-subtitle>
            {{ emCobranca() ? 'Parcelas atrasadas e que vencem nos próximos 7 dias. ' : '' }}Cobre pelo WhatsApp ou marque como recebida.
          </mat-card-subtitle>
        </div>
        <mat-card-content class="border-t border-border">
          @if (parcelasDestaque().length === 0) {
            <p class="text-center text-muted py-10">Nenhuma parcela atrasada ou vencendo nos próximos 7 dias.</p>
          } @else {
          <div class="relative">
            <table class="tabela">
              <thead>
                <tr>
                  <th>Cliente</th>
                  <th>Parcela</th>
                  <th>Vencimento</th>
                  <th class="text-end!">Saldo</th>
                  <th class="text-end! whitespace-nowrap">Ações</th>
                </tr>
              </thead>
              <tbody>
                @for (item of parcelasDestaque(); track item.parcela.id) {
                  <tr>
                    <td>{{ item.contrato.oportunidadeNome }}</td>
                    <td>{{ item.parcela.entrada ? 'Entrada' : 'Parcela ' + item.parcela.numero }}</td>
                    <td class="whitespace-nowrap">
                      {{ item.parcela.vencimento | gdData }}
                      @if (emCobranca()) {
                        <span class="block" [class]="item.parcela.situacao === 'Atrasada' ? status.erro : status.alerta">{{ item.parcela.situacao === 'Atrasada' ? 'Atrasada' : 'A vencer' }}</span>
                      }
                    </td>
                    <td class="text-end! valor">{{ item.parcela.saldo | gdDinheiro }}</td>
                    <td class="text-end! whitespace-nowrap">
                      <button mat-stroked-button class="ml-1" type="button" (click)="cobrar(item)"><mat-icon>chat</mat-icon> Cobrar</button>
                      <button mat-stroked-button class="ml-1" type="button" (click)="receber(item)">Recebi</button>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
          }
        </mat-card-content>
      </mat-card>
    }
    <div class="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-6">
      <mat-card class="shadow-none text-center mb-0! h-full bg-light-primary">
        <mat-card-content>
          <mat-icon class="text-primary">receipt_long</mat-icon>
          <h4 class="text-sm font-semibold text-primary mt-2!">Contratado</h4>
          <h6 class="text-xl font-semibold text-primary mt-2!">{{ totalContratado() | gdDinheiro }}</h6>
        </mat-card-content>
      </mat-card>
      <mat-card class="shadow-none text-center mb-0! h-full bg-light-success">
        <mat-card-content>
          <mat-icon class="text-success">check_circle</mat-icon>
          <h4 class="text-sm font-semibold text-success mt-2!">Recebido</h4>
          <h6 class="text-xl font-semibold text-success mt-2!">{{ totalRecebido() | gdDinheiro }}</h6>
        </mat-card-content>
      </mat-card>
      <mat-card class="shadow-none text-center mb-0! h-full bg-light-warning">
        <mat-card-content>
          <mat-icon class="text-warning">schedule</mat-icon>
          <h4 class="text-sm font-semibold text-warning mt-2!">A receber</h4>
          <h6 class="text-xl font-semibold text-warning mt-2!">{{ totalSaldo() | gdDinheiro }}</h6>
        </mat-card-content>
      </mat-card>
    </div>
    <mat-card class="cardWithShadow">
      <div class="p-6">
        <mat-card-title class="mb-0">Gestão Financeira</mat-card-title>
        <mat-card-subtitle>Contratos fechados com seus clientes e o que falta receber de cada um.</mat-card-subtitle>
      </div>
      <mat-card-content class="border-t border-border">
        <div class="flex flex-wrap items-end gap-4 mb-6">
          <div class="campo w-full sm:w-56">
            <mat-label class="font-semibold mb-2 block">Situação</mat-label>
            <mat-form-field appearance="outline" class="w-full">
              <mat-select [value]="filtro()" (valueChange)="mudarFiltro($event)" aria-label="Situação">
                <mat-option value="">Todos</mat-option>
                <mat-option value="Cobrancas">Cobranças: atrasadas e da semana</mat-option>
                <mat-option value="EmAberto">Em aberto</mat-option>
                <mat-option value="Atrasados">Com parcela atrasada</mat-option>
                <mat-option value="Quitados">Quitados</mat-option>
                <mat-option value="SemParcelas">Sem parcelas</mat-option>
              </mat-select>
            </mat-form-field>
          </div>
          <div class="campo w-full sm:w-64">
            <mat-label class="font-semibold mb-2 block">Buscar</mat-label>
            <mat-form-field appearance="outline" class="w-full">
              <mat-icon matIconPrefix>search</mat-icon>
              <input matInput aria-label="Buscar" placeholder="Buscar cliente" [value]="busca()" (input)="busca.set($any($event.target).value)" />
            </mat-form-field>
          </div>
        </div>
        @if (visiveis().length === 0) {
          <p class="text-center text-muted py-10">Nenhum contrato para mostrar.</p>
        } @else {
          <div class="relative">
            <table class="tabela tabela-contratos">
              <thead>
                <tr>
                  <th>Cliente</th>
                  <th>Contrato</th>
                  <th class="text-end!">Valor</th>
                  <th class="text-end!">Recebido</th>
                  <th class="text-end!">Saldo</th>
                  <th>Parcelas</th>
                  <th class="text-end! whitespace-nowrap">Ações</th>
                </tr>
              </thead>
              <tbody>
                @for (item of visiveis(); track item.id) {
                  <tr>
                    <td>{{ item.oportunidadeNome }}</td>
                    <td>
                      <span class="block text-sm">{{ item.assinadoEm ? 'Assinado' : 'Em andamento' }}</span>
                      <span class="block text-xs text-muted">{{ item.criadoEm | gdData }}</span>
                    </td>
                    <td class="text-end! valor">{{ item.valorTotal | gdDinheiro }}</td>
                    <td class="text-end! whitespace-nowrap">{{ item.recebido | gdDinheiro }}</td>
                    <td class="text-end! whitespace-nowrap">{{ item.saldo | gdDinheiro }}</td>
                    <td>
                      <span [class]="selo(item).classe">{{ selo(item).rotulo }}</span>
                      @if (proximoVencimento(item); as vencimento) {
                        <span class="block text-xs text-muted">próxima em {{ vencimento | gdData }}</span>
                      }
                    </td>
                    <td class="text-end! whitespace-nowrap">
                      <button mat-icon-button type="button" aria-label="Parcelas do contrato" matTooltip="Parcelas do contrato" (click)="abrirParcelas(item)" [disabled]="item.parcelas.length === 0"><mat-icon>payments</mat-icon></button>
                      <button mat-icon-button type="button" [attr.aria-label]="item.parcelas.length ? 'Refazer parcelamento' : 'Parcelar contrato'" [matTooltip]="item.parcelas.length ? 'Refazer parcelamento' : 'Parcelar contrato'" (click)="parcelar(item)"><mat-icon>edit_calendar</mat-icon></button>
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
  styles: `
    .valor { font-weight: 600; white-space: nowrap; }
    /* Colunas fora do Cliente mais compactas, para a tabela caber sem rolagem horizontal. */
    .tabela-contratos th:not(:first-child),
    .tabela-contratos td:not(:first-child) { padding-left: 8px; padding-right: 8px; }
    .tabela-contratos th:last-child,
    .tabela-contratos td:last-child { padding-right: 0; }
    .tabela-contratos th, .tabela-contratos td { font-size: 13px; }
    .tabela-contratos td:first-child, .tabela-contratos th:first-child { font-size: 14px; padding-right: 12px; }
  `,
})
export class GestaoFinanceiraPage implements OnInit {
  private readonly negocio = inject(NegocioClient);
  private readonly dialog = inject(MatDialog);
  private readonly toast = inject(ToastService);
  private readonly lista = signal<ContratoFunil[]>([]);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  protected readonly status = STATUS;
  protected readonly filtro = signal<FiltroFinanceiro>(filtroDaUrl(this.route.snapshot.queryParamMap.get('filtro')));
  protected readonly busca = signal('');
  protected readonly emCobranca = computed(() => this.filtro() === 'Cobrancas');

  protected readonly visiveis = computed(() => {
    const termo = this.busca().trim().toLowerCase();
    const filtro = this.filtro();
    const comCobranca = new Set(this.aCobrar().map((item) => item.contrato.id));
    return this.lista()
      .filter((item) => {
        const passaFiltro = !filtro || (filtro === 'Cobrancas' ? comCobranca.has(item.id) : situacaoFinanceira(item) === filtro);
        return passaFiltro && (!termo || item.oportunidadeNome.toLowerCase().includes(termo));
      })
      .sort((a, b) => a.oportunidadeNome.localeCompare(b.oportunidadeNome, 'pt-BR') || a.criadoEm.localeCompare(b.criadoEm));
  });
  protected readonly doMes = computed(() => parcelasDoMes(this.lista(), hojeLocal()));
  protected readonly atrasadas = computed(() => parcelasAtrasadas(this.lista()));
  private readonly aCobrar = computed(() => parcelasACobrar(this.lista(), hojeLocal()));
  /** Tabela do topo: cobranças da semana quando filtrado, senão só as atrasadas. */
  protected readonly parcelasDestaque = computed(() => (this.emCobranca() ? this.aCobrar() : this.atrasadas()));
  protected readonly totalDoMes = computed(() => this.doMes().reduce((soma, item) => soma + item.parcela.saldo, 0));
  protected readonly totalAtrasado = computed(() => this.atrasadas().reduce((soma, item) => soma + item.parcela.saldo, 0));
  protected readonly totalContratado =computed(() => this.visiveis().reduce((soma, item) => soma + item.valorTotal, 0));
  protected readonly totalRecebido = computed(() => this.visiveis().reduce((soma, item) => soma + item.recebido, 0));
  protected readonly totalSaldo = computed(() => this.visiveis().reduce((soma, item) => soma + item.saldo, 0));

  ngOnInit(): void {
    this.carregar();
  }

  /** Mantém o filtro na URL, para voltar e compartilhar a tela já filtrada. */
  protected mudarFiltro(filtro: FiltroFinanceiro): void {
    this.filtro.set(filtro);
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { filtro: filtro ? filtro.toLowerCase() : null },
      replaceUrl: true,
    });
  }

  protected selo(item: ContratoFunil): { rotulo: string; classe: string } {
    switch (situacaoFinanceira(item)) {
      case 'SemParcelas': return { rotulo: 'Sem parcelas', classe: STATUS.neutro };
      case 'Atrasados': return { rotulo: 'Parcela atrasada', classe: STATUS.erro };
      case 'Quitados': return { rotulo: 'Quitado', classe: STATUS.sucesso };
      default: return { rotulo: item.parcelas.length === 1 ? 'À vista, a receber' : `${item.parcelas.length} parcelas`, classe: STATUS.alerta };
    }
  }

  protected proximoVencimento(item: ContratoFunil): string | null {
    return item.parcelas.filter((parcela) => parcela.saldo > 0).map((parcela) => parcela.vencimento).sort()[0] ?? null;
  }

  protected abrirParcelas(item: ContratoFunil): void {
    this.dialog.open(ParcelasContratoDialog, { ...DIALOG_LARGO, data: item }).afterClosed().subscribe(() => this.carregar());
  }

  protected parcelar(item: ContratoFunil): void {
    this.dialog.open(DefinirParcelasContratoDialog, { ...DIALOG, data: item }).afterClosed().subscribe((ok) => ok && this.carregar());
  }

  /** Cobrar pelo WhatsApp: a lista não traz telefone nem chave Pix, então lê o contrato (SPEC-044 §6.2). */
  protected cobrar(item: ParcelaPendente): void {
    this.negocio.contratoFunil(item.contrato.id).subscribe({
      next: (contrato) => {
        if (contrato.chavePix) {
          this.abrirWhatsapp(contrato, item.parcela, contrato.chavePix);
          return;
        }
        this.dialog.open(ChavePixDialog, DIALOG_PEQUENO).afterClosed().subscribe((digitada?: string) => {
          if (digitada) this.abrirWhatsapp(contrato, item.parcela, digitada);
        });
      },
      error: (erro: unknown) => this.toast.erro(mensagemDeErro(erro)),
    });
  }

  protected receber(item: ParcelaPendente): void {
    this.dialog.open(ReceberDialog, { ...DIALOG_PEQUENO, data: item.parcela }).afterClosed().subscribe((pedido) => {
      if (!pedido) return;
      this.negocio.receberParcelaContratoFunil(item.contrato.id, item.parcela.id, pedido).subscribe({
        next: () => {
          this.toast.sucesso('Recebimento registrado.');
          this.carregar();
        },
        error: (erro: unknown) => this.toast.erro(mensagemDeErro(erro)),
      });
    });
  }

  private abrirWhatsapp(contrato: ContratoFunil, parcela: ParcelaContrato, chavePix: string): void {
    const texto = textoCobranca(parcela, contrato.oportunidadeNome, chavePix);
    window.open(linkWhatsapp(texto, '55', contrato.oportunidadeTelefone ?? ''), '_blank', 'noopener');
  }

  private carregar(): void {
    this.negocio.contratosFunil({}).subscribe({
      next: (lista) => this.lista.set(lista.filter((item) => item.situacao !== 'Cancelado')),
      error: (erro: unknown) => this.toast.erro(mensagemDeErro(erro)),
    });
  }
}

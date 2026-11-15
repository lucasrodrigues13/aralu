import { Component, ElementRef, inject, OnDestroy, OnInit, signal, viewChild } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDialog, MatDialogModule, MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { mensagemDeErro } from '../../core/mensagem-erro';
import {
  BudgetEvento,
  Cliente,
  ETAPAS_NEGOCIACAO,
  EventoDetalhe,
  EventoServico,
  FornecedorResumo,
  NegocioClient,
  ROTULO_PAPEL,
  TIPOS,
} from '../../core/negocio.client';
import { ToastService } from '../../core/toast.service';
import { CampoDataComponent } from '../../shared/campo-data';
import { CampoDinheiroComponent } from '../../shared/campo-dinheiro';
import { ConfirmaDialog } from '../../shared/confirma-dialog';
import { deDataParaIso } from '../../shared/data';
import { DIALOG } from '../../shared/dialog';
import { GdDataPipe } from '../../shared/gd-data.pipe';
import { GdDinheiroPipe } from '../../shared/gd-dinheiro.pipe';
import { GdHoraPipe } from '../../shared/gd-hora.pipe';
import { ClienteFormDialog } from '../clientes/cliente-form.dialog';
import { EventoAbasComponent } from './evento-abas.component';

@Component({
  selector: 'app-contratar-dialog',
  imports: [ReactiveFormsModule, MatDialogModule, MatButtonModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatCheckboxModule, CampoDataComponent, CampoDinheiroComponent],
  template: `
    <h2 mat-dialog-title>Contratar fornecedor</h2>
    <mat-dialog-content>
      <form class="formulario" [formGroup]="form">
        <app-campo-dinheiro rotulo="Valor" formControlName="valor" />
        <mat-form-field appearance="outline"><mat-label>Parcelas</mat-label><input matInput type="number" min="1" formControlName="quantidadeParcelas" /></mat-form-field>
        <app-campo-data rotulo="Primeira parcela" formControlName="primeiraParcela" />
        <mat-checkbox formControlName="comEntrada">Incluir entrada</mat-checkbox>
        @if (form.controls.comEntrada.value) {
          <mat-form-field appearance="outline">
            <mat-label>Base</mat-label>
            <mat-select formControlName="baseEntrada">
              <mat-option value="Valor">Valor</mat-option>
              <mat-option value="Porcentagem">Porcentagem</mat-option>
            </mat-select>
          </mat-form-field>
          @if (form.controls.baseEntrada.value === 'Porcentagem') {
            <mat-form-field appearance="outline">
              <mat-label>Valor de entrada</mat-label>
              <input matInput type="number" min="0" formControlName="valorEntrada" />
              <span matTextSuffix>%</span>
            </mat-form-field>
          } @else {
            <app-campo-dinheiro rotulo="Valor de entrada" formControlName="valorEntrada" />
          }
          <app-campo-data rotulo="Data de entrada" formControlName="dataEntrada" />
        }
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button type="button" (click)="ref.close()">Cancelar</button>
      <button mat-flat-button type="button" (click)="confirmar()">Contratar</button>
    </mat-dialog-actions>
  `,
})
export class ContratarDialog {
  private readonly fb = inject(FormBuilder);
  protected readonly ref = inject(MatDialogRef<ContratarDialog, unknown>);
  protected readonly form = this.fb.group({
    valor: this.fb.control<number | null>(null, Validators.required),
    quantidadeParcelas: ['1', Validators.required],
    primeiraParcela: this.fb.control<Date | null>(null),
    comEntrada: false,
    baseEntrada: 'Valor',
    valorEntrada: this.fb.control<number | null>(null),
    dataEntrada: this.fb.control<Date | null>(null),
  });

  protected confirmar(): void {
    const valor = this.form.getRawValue();
    this.ref.close({
      valor: valor.valor,
      quantidadeParcelas: Number(valor.quantidadeParcelas),
      primeiraParcela: deDataParaIso(valor.primeiraParcela),
      comEntrada: !!valor.comEntrada,
      baseEntrada: valor.comEntrada ? valor.baseEntrada : null,
      valorEntrada: valor.comEntrada ? valor.valorEntrada : null,
      dataEntrada: valor.comEntrada ? deDataParaIso(valor.dataEntrada) : null,
    });
  }
}

@Component({
  selector: 'app-nome-servico-dialog',
  imports: [ReactiveFormsModule, MatDialogModule, MatButtonModule, MatFormFieldModule, MatInputModule],
  template: `
    <h2 mat-dialog-title>Adicionar serviço</h2>
    <mat-dialog-content>
      <mat-form-field appearance="outline" class="cheia">
        <mat-label>Nome do serviço</mat-label>
        <input matInput [formControl]="nome" />
      </mat-form-field>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button type="button" (click)="ref.close()">Cancelar</button>
      <button mat-flat-button type="button" (click)="ok()">Adicionar</button>
    </mat-dialog-actions>
  `,
  styles: `.cheia { width: 100%; }`,
})
export class NomeServicoDialog {
  private readonly fb = inject(FormBuilder);
  protected readonly ref = inject(MatDialogRef<NomeServicoDialog, string>);
  protected readonly nome = this.fb.nonNullable.control('', Validators.required);

  protected ok(): void {
    const valor = this.nome.value.trim();
    if (!valor) {
      this.nome.markAsTouched();
      return;
    }
    this.ref.close(valor);
  }
}

@Component({
  selector: 'app-subitens-dialog',
  imports: [ReactiveFormsModule, MatDialogModule, MatButtonModule, MatFormFieldModule, MatInputModule, MatIconModule, CampoDinheiroComponent],
  template: `
    <h2 mat-dialog-title>Subitens — {{ dados.nome }}</h2>
    <mat-dialog-content>
      <form class="formulario" [formGroup]="form">
        <app-campo-dinheiro rotulo="Valor estimado (sem subitens)" formControlName="valorEstimado" />
        <div formArrayName="subitens">
          @for (ctrl of subitens.controls; track $index; let i = $index) {
            <div class="linha" [formGroupName]="i">
              <mat-form-field appearance="outline"><mat-label>Descrição</mat-label><input matInput formControlName="descricao" /></mat-form-field>
              <mat-form-field appearance="outline"><mat-label>Qtd</mat-label><input matInput type="number" min="1" formControlName="quantidade" /></mat-form-field>
              <app-campo-dinheiro rotulo="Unitário" formControlName="valorUnitario" />
              <button mat-icon-button type="button" aria-label="Remover" (click)="remover(i)"><mat-icon>delete</mat-icon></button>
            </div>
          }
        </div>
        <button mat-stroked-button type="button" (click)="adicionar()"><mat-icon>add</mat-icon> Subitem</button>
        <p class="gd-sub">Com subitens, o estimado do serviço vira a soma (quantidade × unitário).</p>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button type="button" (click)="ref.close()">Cancelar</button>
      <button mat-flat-button type="button" (click)="salvar()">Salvar</button>
    </mat-dialog-actions>
  `,
  styles: `
    .linha { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; margin-bottom: 8px; }
    .linha mat-form-field { flex: 1; min-width: 120px; }
  `,
})
export class SubitensDialog {
  private readonly fb = inject(FormBuilder);
  protected readonly dados = inject<{ nome: string; valorEstimado: number | null; subitens: { descricao: string; quantidade: number; valorUnitario: number }[] }>(MAT_DIALOG_DATA);
  protected readonly ref = inject(MatDialogRef<SubitensDialog, { valorEstimado: number | null; subitens: { descricao: string; quantidade: number; valorUnitario: number }[] }>);
  protected readonly form = this.fb.group({
    valorEstimado: [this.dados.valorEstimado],
    subitens: this.fb.array(
      this.dados.subitens.map((item) => this.fb.group({
        descricao: [item.descricao, Validators.required],
        quantidade: [item.quantidade, Validators.required],
        valorUnitario: [item.valorUnitario, Validators.required],
      })),
    ),
  });

  protected get subitens() {
    return this.form.controls.subitens;
  }

  protected adicionar(): void {
    this.subitens.push(this.fb.group({
      descricao: ['', Validators.required],
      quantidade: [1, Validators.required],
      valorUnitario: [0, Validators.required],
    }));
  }

  protected remover(indice: number): void {
    this.subitens.removeAt(indice);
  }

  protected salvar(): void {
    const valor = this.form.getRawValue();
    this.ref.close({
      valorEstimado: valor.valorEstimado ?? null,
      subitens: (valor.subitens ?? [])
        .filter((item) => !!item.descricao?.trim())
        .map((item) => ({
          descricao: item.descricao!.trim(),
          quantidade: Number(item.quantidade) || 1,
          valorUnitario: item.valorUnitario ?? 0,
        })),
    });
  }
}

@Component({
  selector: 'app-budget-dialog',
  imports: [MatDialogModule, MatButtonModule, GdDinheiroPipe],
  template: `
    <h2 mat-dialog-title>Planejamento de orçamento</h2>
    <mat-dialog-content>
      @if (budget) {
        <div class="gd-numeros">
          <div class="gd-numero"><span>Orçamento</span><strong>{{ budget.budget | gdDinheiro }}</strong></div>
          <div class="gd-numero"><span>Estimado</span><strong>{{ budget.estimado | gdDinheiro }}</strong></div>
          <div class="gd-numero"><span>Contratado</span><strong>{{ budget.contratado | gdDinheiro }}</strong></div>
          <div class="gd-numero"><span>Prova real</span><strong>{{ budget.provaReal | gdDinheiro }}</strong></div>
          @if (budget.custoPorConvidado !== null) {
            <div class="gd-numero"><span>Por convidado</span><strong>{{ budget.custoPorConvidado | gdDinheiro }}</strong></div>
          }
        </div>
        <table class="gd-grade">
          <thead><tr><th>Serviço</th><th>Estimado</th><th>Contratado</th></tr></thead>
          <tbody>
            @for (s of budget.servicos; track s.id) {
              <tr>
                <td>{{ s.nome }}</td>
                <td>{{ s.estimado | gdDinheiro }}</td>
                <td>{{ s.contratado | gdDinheiro }}</td>
              </tr>
            }
          </tbody>
        </table>
      }
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button type="button" mat-dialog-close>Fechar</button>
    </mat-dialog-actions>
  `,
})
export class BudgetDialog {
  protected readonly budget = inject<BudgetEvento>(MAT_DIALOG_DATA);
}

@Component({
  selector: 'app-evento-home',
  imports: [
    RouterLink, MatCardModule, MatButtonModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatIconModule,
    GdDataPipe, GdDinheiroPipe, GdHoraPipe, ReactiveFormsModule, EventoAbasComponent,
  ],
  template: `
    <a mat-button routerLink="/eventos"><mat-icon>arrow_back</mat-icon> Eventos</a>
    <app-evento-abas [eventoId]="id" />
    @if (evento(); as atual) {
      <div class="ficha">
        <div class="coluna">
          <mat-card>
            <mat-card-content class="identidade">
              <div class="avatar" tabindex="0">
                @if (foto(); as url) {
                  <img [src]="url" alt="" />
                } @else {
                  <span>{{ iniciais(atual) }}</span>
                }
                <div class="avatar-acoes">
                  <button mat-button type="button" (click)="escolherFoto()">Adicionar</button>
                  @if (foto()) {
                    <button mat-button type="button" (click)="removerFoto()">Remover</button>
                  }
                </div>
              </div>
              <input #arquivo hidden type="file" accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp" (change)="enviarFoto($event)" />
              <h1>{{ atual.nome }}</h1>
              <p class="apoio">
                @if (atual.data) { {{ atual.data | gdData }} }
                @if (atual.hora) { às {{ atual.hora | gdHora }} }
                @if (!atual.data && !atual.hora) { Sem data }
              </p>
              <span [class]="classe(atual.situacao)">{{ rotuloSituacao(atual.situacao) }}</span>
              @if (atual.tipo || pessoas(atual) || atual.cerimonia.nome || atual.recepcao.nome) {
                <ul class="basicos">
                  @if (atual.tipo) { <li>{{ rotuloTipo(atual.tipo) }}</li> }
                  @if (pessoas(atual); as nomes) { <li>{{ nomes }}</li> }
                  @if (atual.cerimonia.nome) { <li>Cerimônia: {{ atual.cerimonia.nome }}</li> }
                  @if (atual.recepcao.nome) { <li>Recepção: {{ atual.recepcao.nome }}</li> }
                </ul>
              }
              @if (links(atual); as atalhos) {
                @if (atalhos.length) {
                  <div class="links">
                    @for (atalho of atalhos; track atalho.rotulo) {
                      <a mat-stroked-button [href]="atalho.href" target="_blank" rel="noopener" [attr.aria-label]="atalho.rotulo">
                        <mat-icon>{{ atalho.icone }}</mat-icon>
                      </a>
                    }
                  </div>
                }
              }
              <button mat-flat-button class="largo" type="button" (click)="editar()"><mat-icon>edit</mat-icon> Editar</button>
              @if (atual.situacao === 'EmAndamento') {
                <div class="encerrar">
                  <button mat-stroked-button type="button" (click)="encerrar('concluir')">Concluir</button>
                  <button mat-stroked-button type="button" (click)="encerrar('cancelar')">Cancelar</button>
                </div>
              }
            </mat-card-content>
          </mat-card>

          <mat-card>
            <mat-card-header><mat-card-title>Resumo</mat-card-title></mat-card-header>
            <mat-card-content>
              @if (atual.diasRestantes !== null && atual.diasRestantes >= 0) {
                <p class="medida"><span>Faltam</span><strong>{{ atual.diasRestantes }} dias</strong></p>
              }
              <p class="medida"><span>Tarefas concluídas</span><strong>{{ atual.tarefasConcluidas }} de {{ atual.tarefas }}</strong></p>
              <p class="medida"><span>Confirmados</span><strong>{{ atual.convidadosConfirmados }}</strong></p>
              <p class="medida"><span>Pendentes</span><strong>{{ atual.convidadosPendentes }}</strong></p>
              <p class="medida"><span>Não comparecerão</span><strong>{{ atual.convidadosRecusados }}</strong></p>
              <p class="medida"><span>Convidados</span><strong>{{ atual.convidados }}</strong></p>
              @if (atual.convidadosEstimados !== null) {
                <p class="medida"><span>Estimados</span><strong>{{ atual.convidadosEstimados }}</strong></p>
              }
              @if (atual.orcamentoEstimado !== null) {
                <p class="medida"><span>Orçamento</span><strong>{{ atual.orcamentoEstimado | gdDinheiro }}</strong></p>
              }
              @if (atual.tempoFesta) { <p class="medida"><span>Tempo de festa</span><strong>{{ atual.tempoFesta | gdHora }}</strong></p> }
              @if (atual.inicioCerimonia) { <p class="medida"><span>Início da cerimônia</span><strong>{{ atual.inicioCerimonia | gdHora }}</strong></p> }
              @if (atual.inicioRecepcao) { <p class="medida"><span>Início da recepção</span><strong>{{ atual.inicioRecepcao | gdHora }}</strong></p> }
              @if (atual.quantidadePadrinhos !== null) { <p class="medida"><span>Padrinhos</span><strong>{{ atual.quantidadePadrinhos }}</strong></p> }
              @if (atual.quantidadeDamas !== null) { <p class="medida"><span>Damas e pajens</span><strong>{{ atual.quantidadeDamas }}</strong></p> }
            </mat-card-content>
          </mat-card>

          @if (atual.tags.length) {
            <mat-card>
              <mat-card-header><mat-card-title>Tags</mat-card-title></mat-card-header>
              <mat-card-content>
                <div class="tags">
                  @for (tag of atual.tags; track tag) { <span>{{ tag }}</span> }
                </div>
              </mat-card-content>
            </mat-card>
          }
        </div>

        <div class="coluna">
      <section class="gd-painel servicos">
        <div class="gd-barra">
          <h2>Serviços e fornecedores</h2>
          <div class="acoes">
            <button mat-stroked-button type="button" (click)="abrirBudget()"><mat-icon>request_quote</mat-icon> Orçamento</button>
            <button mat-stroked-button type="button" (click)="adicionarServico()"><mat-icon>add</mat-icon> Adicionar serviço</button>
          </div>
        </div>
        @for (servico of atual.servicos; track servico.id) {
          <article class="servico">
            <header>
              <strong>{{ servico.nome }}</strong>
              <span>Estimado: {{ servico.valorEstimado | gdDinheiro }} · Contratado: {{ servico.valorContratado | gdDinheiro }}</span>
            </header>
            <div class="trilha">
              @for (etapa of etapas; track etapa.valor) {
                <span class="etapa" [class.ativa]="temEtapa(servico, etapa.valor)">{{ etapa.rotulo }}</span>
                @if (!$last) { <span class="seta">→</span> }
              }
            </div>
            @for (forn of servico.fornecedores; track forn.id) {
              <div class="forn">
                <span>{{ forn.fornecedor }} — {{ rotuloEtapa(forn.etapa) }}</span>
                @if (forn.valorOrcamento !== null) { <span class="gd-sub">{{ forn.valorOrcamento | gdDinheiro }}</span> }
                <button mat-button type="button" (click)="voltar(servico, forn.id)">Voltar</button>
                <button mat-button type="button" (click)="avancar(servico, forn.id)">Avançar</button>
                <button mat-flat-button type="button" (click)="contratar(servico, forn.id)">Contratar</button>
              </div>
            }
            <div class="linha">
              <mat-form-field appearance="outline" subscriptSizing="dynamic">
                <mat-label>Adicionar fornecedor</mat-label>
                <mat-select (valueChange)="adicionarFornecedor(servico, $event)">
                  @for (f of fornecedores(); track f.id) {
                    <mat-option [value]="f.id">{{ f.nome }}</mat-option>
                  }
                </mat-select>
              </mat-form-field>
              <button mat-stroked-button type="button" (click)="editarSubitens(servico)">Estimado / subitens</button>
            </div>
          </article>
        }
      </section>

      <mat-card>
        <mat-card-header><mat-card-title>Clientes do evento</mat-card-title></mat-card-header>
        <mat-card-content>
          @if (clientes().length === 0) { <p>Nenhum cliente vinculado.</p> }
          @for (cliente of clientes(); track cliente.id) {
            <p>{{ cliente.nome }} — {{ rotulo(cliente.papel) }}
              <button mat-button type="button" (click)="desvincular(cliente.id)">Desvincular</button>
            </p>
          }
          <h2>Selecionar existente</h2>
          <mat-form-field appearance="outline">
            <mat-label>Cliente da conta</mat-label>
            <mat-select (valueChange)="vincular($event)">
              @for (cliente of todos(); track cliente.id) {
                <mat-option [value]="cliente.id">{{ cliente.nome }} — {{ rotulo(cliente.papel) }}</mat-option>
              }
            </mat-select>
          </mat-form-field>
          <h2>Cadastrar novo cliente</h2>
          <button mat-flat-button type="button" (click)="criarCliente()"><mat-icon>add</mat-icon> Novo cliente</button>
          <h2>Permissões</h2>
          <p>Nenhum cliente selecionado para permissões.</p>
        </mat-card-content>
      </mat-card>
        </div>
      </div>
    }
  `,
  styles: `
    .ficha { display: grid; grid-template-columns: minmax(260px, 340px) minmax(0, 1fr); gap: 16px; align-items: start; }
    .coluna { display: flex; flex-direction: column; gap: 16px; min-width: 0; }
    .identidade { text-align: center; }
    .identidade h1 { margin: 0; font-size: 22px; }
    .apoio { margin: 4px 0 12px; color: var(--gd-muted-foreground); }
    .avatar { position: relative; width: 112px; height: 112px; margin: 0 auto 12px; border-radius: 50%; display: grid; place-items: center; overflow: hidden; background: color-mix(in oklch, var(--gd-primary) 18%, transparent); color: var(--gd-primary); font-size: 22px; font-weight: 700; letter-spacing: 0.04em; outline: none; }
    .avatar img { width: 100%; height: 100%; object-fit: cover; }
    .avatar-acoes { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2px; background: color-mix(in oklch, oklch(0.075 0 0) 55%, transparent); opacity: 0; }
    .avatar:hover .avatar-acoes, .avatar:focus-within .avatar-acoes { opacity: 1; }
    .avatar-acoes button { color: #fff; min-width: 0; line-height: 24px; padding: 0 6px; font-size: 12px; }
    .basicos { list-style: none; margin: 16px 0; padding: 0; display: flex; flex-direction: column; gap: 4px; }
    .links { display: flex; gap: 8px; margin-bottom: 12px; }
    .links a { flex: 1; min-width: 0; }
    .largo { width: 100%; }
    .encerrar { display: flex; gap: 8px; margin-top: 8px; }
    .encerrar button { flex: 1; }
    .medida { display: flex; justify-content: space-between; gap: 12px; margin: 0; padding: 10px 0; border-bottom: 1px solid var(--gd-border); }
    .medida span { color: var(--gd-muted-foreground); }
    .tags { display: flex; flex-wrap: wrap; gap: 8px; }
    .tags span { border: 1px solid var(--gd-border); border-radius: 999px; padding: 4px 10px; font-size: 12px; }
    .acoes { display: flex; gap: 8px; flex-wrap: wrap; }
    .servicos { margin: 0; }
    @media (max-width: 959px) { .ficha { grid-template-columns: 1fr; } }
    .servico { border-top: 1px solid var(--gd-border); padding: 12px 0; }
    .servico:first-of-type { border-top: 0; }
    .servico header { display: flex; flex-direction: column; gap: 4px; margin-bottom: 8px; }
    .trilha { display: flex; flex-wrap: wrap; align-items: center; gap: 4px; margin-bottom: 8px; font-size: 0.85rem; }
    .etapa { opacity: 0.45; }
    .etapa.ativa { opacity: 1; font-weight: 600; color: var(--gd-primaria, #2ecc71); }
    .forn { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; margin: 4px 0; }
    .linha { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 8px; }
  `,
})
export class EventoHomePage implements OnInit, OnDestroy {
  private readonly negocio = inject(NegocioClient);
  private readonly rota = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly dialog = inject(MatDialog);
  private readonly toast = inject(ToastService);
  protected readonly evento = signal<EventoDetalhe | null>(null);
  protected readonly foto = signal<string | null>(null);
  protected readonly clientes = signal<Cliente[]>([]);
  protected readonly todos = signal<Cliente[]>([]);
  protected readonly fornecedores = signal<FornecedorResumo[]>([]);
  protected readonly etapas = ETAPAS_NEGOCIACAO;
  private fotoAtual: string | null = null;
  private readonly arquivo = viewChild<ElementRef<HTMLInputElement>>('arquivo');
  protected id = '';

  ngOnInit(): void {
    this.id = this.rota.snapshot.paramMap.get('id') ?? '';
    this.recarregar();
    this.negocio.fornecedores().subscribe({
      next: (lista) => this.fornecedores.set(lista),
      error: () => this.fornecedores.set([]),
    });
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
    if (letras.length === 2) {
      return `${letras[0]}&${letras[1]}`;
    }
    return letras[0] || 'E';
  }

  protected escolherFoto(): void {
    this.arquivo()?.nativeElement.click();
  }

  protected enviarFoto(evento: Event): void {
    const entrada = evento.target as HTMLInputElement;
    const arquivo = entrada.files?.[0] ?? null;
    entrada.value = '';
    if (!arquivo) {
      return;
    }
    this.negocio.imagemEvento(this.id, arquivo).subscribe({
      next: (resposta) => {
        this.mostrarFoto(arquivo);
        this.evento.update((atual) => atual ? { ...atual, imagemId: resposta.imagemId } : atual);
        this.toast.sucesso('Foto adicionada.');
      },
      error: (erro: unknown) => this.toast.erro(mensagemDeErro(erro)),
    });
  }

  protected removerFoto(): void {
    this.negocio.removerImagemEvento(this.id).subscribe({
      next: () => {
        this.limparFoto();
        this.evento.update((atual) => atual ? { ...atual, imagemId: null } : atual);
        this.toast.sucesso('Foto removida.');
      },
      error: (erro: unknown) => this.toast.erro(mensagemDeErro(erro)),
    });
  }

  protected pessoas(atual: EventoDetalhe): string {
    return [atual.primeiroNome, atual.segundoNome].map((nome) => nome?.trim()).filter(Boolean).join(' e ');
  }

  protected links(atual: EventoDetalhe): { rotulo: string; href: string; icone: string }[] {
    const itens: { rotulo: string; href: string; icone: string }[] = [];
    const cerimonia = this.mapa(atual.cerimonia);
    if (cerimonia) {
      itens.push({ rotulo: 'Mapa da cerimônia', href: cerimonia, icone: 'place' });
    }
    const recepcao = this.mapa(atual.recepcao);
    if (recepcao) {
      itens.push({ rotulo: 'Mapa da recepção', href: recepcao, icone: 'location_on' });
    }
    const site = atual.urlSite?.trim();
    if (site) {
      itens.push({ rotulo: 'Site', href: site.startsWith('http') ? site : `https://${site}`, icone: 'language' });
    }
    return itens;
  }

  protected rotuloTipo(tipo: string): string {
    return TIPOS.find((item) => item.valor === tipo)?.rotulo ?? tipo;
  }

  protected rotuloSituacao(situacao: string): string {
    if (situacao === 'EmAndamento') {
      return 'Em andamento';
    }
    if (situacao === 'Concluido') {
      return 'Concluído';
    }
    if (situacao === 'Cancelado') {
      return 'Cancelado';
    }
    return situacao;
  }

  protected classe(situacao: string): string {
    if (situacao === 'Concluido') {
      return 'gd-status ok';
    }
    if (situacao === 'Cancelado') {
      return 'gd-status erro';
    }
    return 'gd-status alerta';
  }

  protected mapa(local: EventoDetalhe['cerimonia']): string | null {
    const texto = [local.endereco, local.numero, local.bairro, local.cidade, local.estado].filter(Boolean).join(', ');
    return texto ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(texto)}` : null;
  }

  protected rotulo(papel: string): string {
    return ROTULO_PAPEL[papel] ?? papel;
  }

  protected rotuloEtapa(etapa: string): string {
    return this.etapas.find((item) => item.valor === etapa)?.rotulo ?? etapa;
  }

  protected temEtapa(servico: EventoServico, etapa: string): boolean {
    return servico.fornecedores.some((item) => item.etapa === etapa);
  }

  protected adicionarServico(): void {
    this.dialog.open(NomeServicoDialog, { ...DIALOG, width: 'min(420px, calc(100vw - 32px))' }).afterClosed().subscribe((nome) => {
      if (!nome) {
        return;
      }
      this.negocio.adicionarServicoEvento(this.id, nome).subscribe({
        next: () => {
          this.toast.sucesso('Serviço adicionado.');
          this.recarregar();
        },
        error: (erro: unknown) => this.toast.erro(mensagemDeErro(erro)),
      });
    });
  }

  protected adicionarFornecedor(servico: EventoServico, fornecedorId: string): void {
    if (!fornecedorId) {
      return;
    }
    this.negocio.adicionarFornecedorServico(this.id, servico.id, fornecedorId, 'Recomendado').subscribe({
      next: () => {
        this.toast.sucesso('Fornecedor adicionado.');
        this.recarregar();
      },
      error: (erro: unknown) => this.toast.erro(mensagemDeErro(erro)),
    });
  }

  protected avancar(servico: EventoServico, vinculoId: string): void {
    this.negocio.avancarEtapa(this.id, servico.id, vinculoId).subscribe({
      next: () => {
        this.toast.sucesso('Etapa avançada.');
        this.recarregar();
      },
      error: (erro: unknown) => this.toast.erro(mensagemDeErro(erro)),
    });
  }

  protected voltar(servico: EventoServico, vinculoId: string): void {
    this.negocio.voltarEtapa(this.id, servico.id, vinculoId).subscribe({
      next: () => {
        this.toast.sucesso('Etapa retornada.');
        this.recarregar();
      },
      error: (erro: unknown) => this.toast.erro(mensagemDeErro(erro)),
    });
  }

  protected contratar(servico: EventoServico, vinculoId: string): void {
    this.dialog.open(ContratarDialog, { ...DIALOG, width: 'min(480px, calc(100vw - 32px))' }).afterClosed().subscribe((pedido) => {
      if (!pedido) {
        return;
      }
      this.negocio.contratarFornecedor(this.id, servico.id, vinculoId, pedido).subscribe({
        next: () => {
          this.toast.sucesso('Fornecedor contratado.');
          this.recarregar();
        },
        error: (erro: unknown) => this.toast.erro(mensagemDeErro(erro)),
      });
    });
  }

  protected editarSubitens(servico: EventoServico): void {
    this.dialog.open(SubitensDialog, {
      ...DIALOG,
      data: {
        nome: servico.nome,
        valorEstimado: servico.valorEstimado,
        subitens: servico.subitens.map((item) => ({
          descricao: item.descricao,
          quantidade: item.quantidade,
          valorUnitario: item.valorUnitario,
        })),
      },
    }).afterClosed().subscribe((pedido) => {
      if (!pedido) {
        return;
      }
      this.negocio.atualizarEstimado(this.id, servico.id, pedido).subscribe({
        next: () => {
          this.toast.sucesso('Estimado atualizado.');
          this.recarregar();
        },
        error: (erro: unknown) => this.toast.erro(mensagemDeErro(erro)),
      });
    });
  }

  protected abrirBudget(): void {
    this.negocio.budget(this.id).subscribe({
      next: (budget) => this.dialog.open(BudgetDialog, { ...DIALOG, data: budget }),
      error: (erro: unknown) => this.toast.erro(mensagemDeErro(erro)),
    });
  }

  protected encerrar(acao: 'concluir' | 'cancelar'): void {
    const ref = this.dialog.open(ConfirmaDialog, {
      ...DIALOG,
      data: {
        titulo: acao === 'concluir' ? 'Concluir evento' : 'Cancelar evento',
        texto: 'Confirma a mudança de situação?',
        confirmar: acao === 'concluir' ? 'Concluir' : 'Cancelar evento',
      },
    });
    ref.afterClosed().subscribe((confirmou) => {
      if (!confirmou) {
        return;
      }
      const pedido = acao === 'concluir' ? this.negocio.concluir(this.id) : this.negocio.cancelar(this.id);
      pedido.subscribe({
        next: (evento) => {
          this.evento.set(evento);
          this.toast.sucesso(acao === 'concluir' ? 'Evento concluído.' : 'Evento cancelado.');
        },
        error: (erro: unknown) => this.toast.erro(mensagemDeErro(erro)),
      });
    });
  }

  protected vincular(clienteId: string): void {
    if (!clienteId) {
      return;
    }
    this.negocio.vincular(this.id, clienteId).subscribe({
      next: () => {
        this.toast.sucesso('Cliente vinculado.');
        this.recarregar();
      },
      error: (erro: unknown) => this.toast.erro(mensagemDeErro(erro)),
    });
  }

  protected desvincular(clienteId: string): void {
    this.negocio.desvincular(this.id, clienteId).subscribe({
      next: () => {
        this.toast.sucesso('Cliente desvinculado.');
        this.recarregar();
      },
      error: (erro: unknown) => this.toast.erro(mensagemDeErro(erro)),
    });
  }

  protected editar(): void {
    void this.router.navigate(['/eventos', this.id, 'editar']);
  }

  protected criarCliente(): void {
    this.dialog.open(ClienteFormDialog, { ...DIALOG, data: null }).afterClosed().subscribe((cliente) => {
      if (cliente) {
        this.vincular(cliente.id);
      }
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
    this.negocio.clientesDoEvento(this.id).subscribe({
      next: (clientes) => this.clientes.set(clientes),
      error: () => this.clientes.set([]),
    });
    this.negocio.clientes().subscribe({
      next: (clientes) => this.todos.set(clientes),
      error: () => this.todos.set([]),
    });
  }

  private mostrarFoto(arquivo: Blob): void {
    if (this.fotoAtual) {
      URL.revokeObjectURL(this.fotoAtual);
    }
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

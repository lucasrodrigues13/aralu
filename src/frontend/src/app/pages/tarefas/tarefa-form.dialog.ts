import { Component, ElementRef, inject, OnInit, signal } from '@angular/core';
import { FormArray, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Observable, map, of, switchMap } from 'rxjs';
import { mensagemDeErro } from '../../core/mensagem-erro';
import {
  EventoServico,
  NegocioClient,
  PAPEIS_RESPONSAVEL_MODELO,
  PRIORIDADES_TAREFA,
  SITUACOES_TAREFA,
  ServicoConta,
  Tarefa,
  VISIBILIDADES_TAREFA,
} from '../../core/negocio.client';
import { AssistentesClient } from '../../core/assistentes.client';
import { AuthService } from '../../core/auth.service';
import { ToastService } from '../../core/toast.service';
import { chaveResponsavel, opcoesResponsavel, OpcaoResponsavel, pedidoResponsavel } from '../../shared/responsaveis';
import { CampoDataComponent } from '../../shared/campo-data';
import { deDataParaIso, deIsoParaData, formatarDataBr } from '../../shared/data';
import {
  LIMITE_RELATIVO,
  SENTIDOS_PRAZO,
  SentidoPrazo,
  TIPOS_PRAZO,
  TipoPrazo,
  UNIDADES_PRAZO,
  UnidadePrazo,
  diasParaRelativo,
  prazoEfetivo,
  relativoParaDias,
} from '../../shared/prazo-modelo';
import { SeletorServicoComponent } from '../../shared/seletor-servico.component';

/** Tarefa do modelo como o editor guarda (SPEC-012 v3 §8.2): o serviço é o id do cadastro. */
export interface TarefaModeloEdicao {
  servicoContaId: string;
  titulo: string;
  descricao: string | null;
  prazoRelativo: number | null;
  prioridade: string;
  visibilidade: string;
  responsaveis: string[];
  checklist: { texto: string; prazoRelativo: number | null; responsavelPapel: string | null }[];
}

export interface TarefaFormDados {
  eventoId: string;
  tarefa?: Tarefa;
  /**
   * Modo modelo (SPEC-012 v3 §8.2): sem data exata, sem situação e responsáveis só por papel. Não grava: fecha
   * devolvendo a `TarefaModeloEdicao`, que o editor do modelo guarda até o Salvar.
   */
  modelo?: { tarefa: TarefaModeloEdicao | null; servicoContaId?: string; servicosDoModelo: string[] };
}

/** Formulário da tarefa: o mesmo no evento e no modelo (SPEC-003 v5 §6.1, SPEC-012 v3 §6.3). */
@Component({
  selector: 'app-tarefa-form',
  imports: [ReactiveFormsModule, MatDialogModule, MatButtonModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatCheckboxModule, MatIconModule, CampoDataComponent, MatTooltipModule, SeletorServicoComponent],
  template: `
    <h2 mat-dialog-title>{{ editando ? 'Editar tarefa' : 'Nova tarefa' }}</h2>
    <p class="text-muted text-sm px-6 -mt-2 mb-4">
      @if (emModelo) { Tarefa do modelo: o prazo conta a partir da data de cada evento. } @else { Título, prazo, responsáveis e os detalhes da tarefa. }
    </p>
    <mat-dialog-content>
      <form id="tarefa-form" class="grid grid-cols-1 gap-4" [formGroup]="formulario" (ngSubmit)="salvar()">
        <div class="campo">
          <mat-label class="font-semibold mb-2 block">Título</mat-label>
          <mat-form-field appearance="outline" class="w-full">
            <input [attr.aria-label]="'Título'" matInput formControlName="titulo" maxlength="200" required />
            @if (formulario.controls.titulo.invalid) { <mat-error>Informe o título.</mat-error> }
          </mat-form-field>
        </div>
        <div class="campo">
          <mat-label class="font-semibold mb-2 block">Descrição</mat-label>
          <mat-form-field appearance="outline" class="w-full"><textarea [attr.aria-label]="'Descrição'" matInput rows="2" formControlName="descricao"></textarea></mat-form-field>
        </div>
        <div class="campo">
          <mat-label class="font-semibold mb-2 block">Serviço</mat-label>
          <app-seletor-servico formControlName="servicoContaId" [destaque]="destaque()" [rotuloDestaque]="emModelo ? 'Neste modelo' : 'Neste evento'" (criado)="aoCriarServico($event)" />
        </div>

        <div class="campo">
          <mat-label class="font-semibold mb-2 block">Prazo</mat-label>
          <div class="prazo">
            <mat-form-field appearance="outline" class="tipo">
              <mat-select aria-label="Tipo de prazo" formControlName="tipoPrazo">
                @for (tipo of tiposPrazo; track tipo.valor) { <mat-option [value]="tipo.valor">{{ tipo.rotulo }}</mat-option> }
              </mat-select>
            </mat-form-field>
            @switch (formulario.controls.tipoPrazo.value) {
              @case ('dataExata') {
                <app-campo-data rotulo="" ariaLabel="Data do prazo" formControlName="prazoData" class="data" />
              }
              @case ('relativo') {
                @if (formulario.controls.unidade.value !== 'noDia') {
                  <mat-form-field appearance="outline" class="qtd">
                    <input aria-label="Quantidade" matInput type="number" min="0" [max]="limite" formControlName="quantidade" />
                  </mat-form-field>
                }
                <mat-form-field appearance="outline" class="unidade">
                  <mat-select aria-label="Unidade" formControlName="unidade">
                    @for (u of unidades; track u.valor) { <mat-option [value]="u.valor">{{ u.rotulo }}</mat-option> }
                  </mat-select>
                </mat-form-field>
                @if (formulario.controls.unidade.value !== 'noDia') {
                  <mat-form-field appearance="outline" class="sentido">
                    <mat-select aria-label="Antes ou depois" formControlName="sentido">
                      @for (s of sentidos; track s.valor) { <mat-option [value]="s.valor">{{ s.rotulo }}</mat-option> }
                    </mat-select>
                  </mat-form-field>
                }
              }
            }
          </div>
          @if (formulario.controls.tipoPrazo.value === 'relativo' && !emModelo) {
            <p class="text-xs text-muted -mt-3 mb-0">{{ textoDataCalculada() }}</p>
          }
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
          @if (editando && !emModelo) {
            <div class="campo">
              <mat-label class="font-semibold mb-2 block">Situação</mat-label>
              <mat-form-field appearance="outline" class="w-full">
                <mat-select [attr.aria-label]="'Situação'" formControlName="situacao">
                  @for (item of situacoes; track item.valor) { <mat-option [value]="item.valor">{{ item.rotulo }}</mat-option> }
                </mat-select>
              </mat-form-field>
            </div>
          }
          <div class="campo">
            <mat-label class="font-semibold mb-2 block">Responsáveis</mat-label>
            <mat-form-field appearance="outline" class="w-full">
              <mat-select [attr.aria-label]="'Responsáveis'" formControlName="responsaveis" multiple required>
                @for (papel of papeis(); track papel.valor) { <mat-option [value]="papel.valor">{{ papel.rotulo }}</mat-option> }
              </mat-select>
              @if (formulario.controls.responsaveis.hasError('required')) { <mat-error>Informe ao menos um responsável.</mat-error> }
            </mat-form-field>
          </div>
          <div class="campo">
            <mat-label class="font-semibold mb-2 block">Prioridade</mat-label>
            <mat-form-field appearance="outline" class="w-full">
              <mat-select [attr.aria-label]="'Prioridade'" formControlName="prioridade">
                @for (item of prioridades; track item.valor) { <mat-option [value]="item.valor">{{ item.rotulo }}</mat-option> }
              </mat-select>
            </mat-form-field>
          </div>
          <div class="campo">
            <mat-label class="font-semibold mb-2 block">Visibilidade</mat-label>
            <mat-form-field appearance="outline" class="w-full">
              <mat-select [attr.aria-label]="'Visibilidade'" formControlName="visibilidade">
                @for (item of visibilidades; track item.valor) { <mat-option [value]="item.valor">{{ item.rotulo }}</mat-option> }
              </mat-select>
            </mat-form-field>
          </div>
        </div>

        <div class="flex flex-col gap-2" formArrayName="checklist">
          <span class="font-semibold mb-2 block">Checklist</span>
          @for (item of checklist.controls; track item; let i = $index) {
            <div class="item-lista flex flex-col gap-1" [class.line-through]="item.get('cancelado')?.value" [formGroupName]="i">
              <div class="flex items-center gap-2">
                @if (!emModelo) {
                  <mat-checkbox formControlName="feito" [attr.aria-label]="'Marcar item ' + (i + 1) + ' como feito'" />
                }
                <mat-form-field appearance="outline" class="flex-1 min-w-0">
                  <input matInput formControlName="texto" placeholder="Descreva o item" required [attr.aria-label]="'Item ' + (i + 1)" />
                  @if (item.get('texto')?.invalid) { <mat-error>Preencha ou remova o item.</mat-error> }
                </mat-form-field>
                <button mat-icon-button type="button" aria-label="Remover item" matTooltip="Remover item" (click)="removerItem(i)"><mat-icon>delete</mat-icon></button>
              </div>
              <div class="prazo-item" [class.pl-10]="!emModelo">
                <mat-form-field appearance="outline" class="tipo" subscriptSizing="dynamic">
                  <mat-select [attr.aria-label]="'Tipo de prazo do item ' + (i + 1)" formControlName="tipoPrazo">
                    @for (tipo of tiposPrazo; track tipo.valor) { <mat-option [value]="tipo.valor">{{ tipo.rotulo }}</mat-option> }
                  </mat-select>
                </mat-form-field>
                @if (item.get('tipoPrazo')?.value === 'dataExata') {
                  <app-campo-data rotulo="" [ariaLabel]="'Prazo do item ' + (i + 1)" formControlName="prazo" class="data" />
                } @else if (item.get('tipoPrazo')?.value === 'relativo') {
                  @if (item.get('unidade')?.value !== 'noDia') {
                    <mat-form-field appearance="outline" class="qtd" subscriptSizing="dynamic">
                      <input [attr.aria-label]="'Quantidade do prazo do item ' + (i + 1)" matInput type="number" min="0" [max]="limite" formControlName="quantidade" />
                    </mat-form-field>
                  }
                  <mat-form-field appearance="outline" class="unidade" subscriptSizing="dynamic">
                    <mat-select [attr.aria-label]="'Unidade do prazo do item ' + (i + 1)" formControlName="unidade">
                      @for (u of unidades; track u.valor) { <mat-option [value]="u.valor">{{ u.rotulo }}</mat-option> }
                    </mat-select>
                  </mat-form-field>
                  @if (item.get('unidade')?.value !== 'noDia') {
                    <mat-form-field appearance="outline" class="sentido" subscriptSizing="dynamic">
                      <mat-select [attr.aria-label]="'Antes ou depois, item ' + (i + 1)" formControlName="sentido">
                        @for (s of sentidos; track s.valor) { <mat-option [value]="s.valor">{{ s.rotulo }}</mat-option> }
                      </mat-select>
                    </mat-form-field>
                  }
                }
                <mat-form-field appearance="outline" class="responsavel" subscriptSizing="dynamic">
                  <mat-select formControlName="responsavel" [attr.aria-label]="'Responsável do item ' + (i + 1)">
                    <mat-option value="">Sem responsável</mat-option>
                    @for (papel of papeis(); track papel.valor) { <mat-option [value]="papel.valor">{{ papel.rotulo }}</mat-option> }
                  </mat-select>
                </mat-form-field>
              </div>
            </div>
          }
          <div>
            <button mat-stroked-button type="button" (click)="adicionarItem()"><mat-icon>add</mat-icon> Adicionar item</button>
          </div>
        </div>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-stroked-button type="button" (click)="ref.close(false)">Cancelar</button>
      <button mat-flat-button type="submit" form="tarefa-form" [disabled]="salvando()">{{ emModelo ? 'Aplicar' : 'Salvar' }}</button>
    </mat-dialog-actions>
  `,
  styles: `
    .prazo, .prazo-item { display: flex; flex-wrap: wrap; gap: 8px; align-items: flex-start; }
    .prazo .tipo, .prazo-item .tipo { width: 190px; }
    .prazo .qtd, .prazo-item .qtd { width: 88px; }
    .prazo .unidade, .prazo-item .unidade { width: 170px; }
    .prazo .sentido, .prazo-item .sentido { width: 110px; }
    .prazo .data, .prazo-item .data { width: 170px; }
    .prazo-item .responsavel { flex: 1; min-width: 180px; }
  `,
})
export class TarefaFormDialog implements OnInit {
  protected readonly dados = inject<TarefaFormDados>(MAT_DIALOG_DATA);
  protected readonly ref = inject(MatDialogRef<TarefaFormDialog, boolean | TarefaModeloEdicao>);
  private readonly fb = inject(FormBuilder);
  private readonly negocio = inject(NegocioClient);
  private readonly toast = inject(ToastService);
  private readonly elemento = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly assistentes = inject(AssistentesClient);
  private readonly auth = inject(AuthService);

  protected readonly emModelo = !!this.dados.modelo;
  protected readonly editando = this.emModelo ? !!this.dados.modelo?.tarefa : !!this.dados.tarefa;
  protected readonly situacoes = SITUACOES_TAREFA;
  protected readonly prioridades = PRIORIDADES_TAREFA;
  protected readonly visibilidades = VISIBILIDADES_TAREFA;
  protected readonly tiposPrazo = this.emModelo ? TIPOS_PRAZO.filter((tipo) => tipo.valor !== 'dataExata') : TIPOS_PRAZO;
  protected readonly unidades = UNIDADES_PRAZO;
  protected readonly sentidos = SENTIDOS_PRAZO;
  protected readonly limite = LIMITE_RELATIVO;
  protected readonly papeis = signal<OpcaoResponsavel[]>(
    this.emModelo ? PAPEIS_RESPONSAVEL_MODELO : opcoesResponsavel([], this.auth.ehAssistente() ? 'Dona da conta' : 'Eu'),
  );
  protected readonly destaque = signal<string[]>(this.dados.modelo?.servicosDoModelo ?? []);
  protected readonly salvando = signal(false);
  private readonly dataEvento = signal<string | null>(null);
  private servicosDoEvento: EventoServico[] = [];
  private readonly nomesCriados = new Map<string, string>();

  protected readonly formulario = this.montarFormulario();

  protected get checklist(): FormArray {
    return this.formulario.controls.checklist;
  }

  ngOnInit(): void {
    if (this.emModelo) return;
    const atuais = [
      ...(this.dados.tarefa?.responsaveis ?? []).map((item) => chaveResponsavel(item)),
      ...(this.dados.tarefa?.checklist ?? []).flatMap((item) => (item.responsavel ? [chaveResponsavel(item.responsavel)] : [])),
    ];
    this.assistentes.nomes().subscribe({
      next: (nomes) => this.papeis.set(opcoesResponsavel(nomes, this.auth.ehAssistente() ? 'Dona da conta' : 'Eu', atuais)),
      error: () => undefined,
    });
    const eventoId = this.eventoId();
    if (!eventoId) return;
    this.negocio.evento(eventoId).subscribe({
      next: (evento) => {
        this.dataEvento.set(evento.data ?? null);
        this.servicosDoEvento = evento.servicos;
        this.destaque.set(evento.servicos.map((servico) => servico.servicoContaId).filter((id): id is string => !!id));
        const atual = evento.servicos.find((servico) => servico.id === this.dados.tarefa?.servicoEventoId);
        if (atual?.servicoContaId && !this.formulario.controls.servicoContaId.value) {
          this.formulario.controls.servicoContaId.setValue(atual.servicoContaId);
        }
      },
      error: () => undefined,
    });
  }

  protected textoDataCalculada(): string {
    const valor = this.formulario.getRawValue();
    const dias = relativoParaDias(valor.quantidade, valor.unidade, valor.sentido);
    if (dias == null) return '';
    const data = prazoEfetivo(this.dataEvento(), dias);
    return data ? `= ${formatarDataBr(data)}` : 'O evento ainda não tem data: o prazo aparece quando a data for definida.';
  }

  protected aoCriarServico(servico: ServicoConta): void {
    this.nomesCriados.set(servico.id, servico.nome);
  }

  protected adicionarItem(): void {
    this.checklist.push(this.item('', false, false, 'semPrazo', null, null, ''));
    setTimeout(() => {
      const campos = this.elemento.nativeElement.querySelectorAll<HTMLInputElement>('.item-lista input[matInput]:not([type=number])');
      campos[campos.length - 1]?.focus();
    });
  }

  protected removerItem(indice: number): void {
    this.checklist.removeAt(indice);
  }

  protected salvar(): void {
    if (this.formulario.invalid) {
      this.formulario.markAllAsTouched();
      this.toast.erro('Confira os campos obrigatórios destacados.');
      setTimeout(() => this.focarPrimeiroInvalido());
      return;
    }
    const valor = this.formulario.getRawValue();
    const prazoRelativo = valor.tipoPrazo === 'relativo' ? relativoParaDias(valor.quantidade, valor.unidade, valor.sentido) : null;
    if (valor.tipoPrazo === 'relativo' && prazoRelativo == null) {
      this.toast.erro('Informe o prazo: quantidade e unidade.');
      return;
    }
    const itens = valor.checklist.map((item) => ({
      texto: item.texto.trim(),
      feito: item.feito,
      cancelado: item.cancelado,
      prazoRelativo: item.tipoPrazo === 'relativo' ? relativoParaDias(item.quantidade, item.unidade, item.sentido) : null,
      prazo: item.tipoPrazo === 'dataExata' ? deDataParaIso(item.prazo) : null,
      responsavel: item.responsavel || null,
    }));

    if (this.emModelo) {
      this.ref.close({
        servicoContaId: valor.servicoContaId,
        titulo: valor.titulo.trim(),
        descricao: valor.descricao.trim() || null,
        prazoRelativo,
        prioridade: valor.prioridade,
        visibilidade: valor.visibilidade,
        responsaveis: valor.responsaveis,
        checklist: itens.map((item) => ({ texto: item.texto, prazoRelativo: item.prazoRelativo, responsavelPapel: item.responsavel })),
      } satisfies TarefaModeloEdicao);
      return;
    }

    this.salvando.set(true);
    this.servicoDoEvento(valor.servicoContaId).subscribe({
      next: (servicoEventoId) => {
        const pedido = {
          titulo: valor.titulo,
          descricao: valor.descricao,
          prazoRelativo,
          prazo: valor.tipoPrazo === 'dataExata' ? deDataParaIso(valor.prazoData) : null,
          situacao: valor.situacao,
          prioridade: valor.prioridade,
          visibilidade: valor.visibilidade,
          servicoEventoId,
          atualizarServico: true,
          responsaveis: valor.responsaveis.map((chave) => pedidoResponsavel(chave)),
          checklist: itens.map((item) => ({
            texto: item.texto,
            feito: item.feito,
            cancelado: item.cancelado,
            prazo: item.prazo,
            prazoRelativo: item.prazoRelativo,
            responsavel: item.responsavel ? pedidoResponsavel(item.responsavel) : null,
          })),
        };
        const destino = this.dados.tarefa
          ? this.negocio.atualizarTarefa(this.dados.tarefa.id, pedido)
          : this.negocio.criarTarefa(this.dados.eventoId, pedido);
        destino.subscribe({
          next: () => {
            this.toast.sucesso(this.dados.tarefa ? 'Tarefa atualizada.' : 'Tarefa criada.');
            this.ref.close(true);
          },
          error: (erro: unknown) => {
            this.salvando.set(false);
            this.toast.erro(mensagemDeErro(erro));
          },
        });
      },
      error: (erro: unknown) => {
        this.salvando.set(false);
        this.toast.erro(mensagemDeErro(erro));
      },
    });
  }

  private eventoId(): string {
    return this.dados.eventoId || this.dados.tarefa?.eventoId || '';
  }

  /** Serviço do evento para o serviço do cadastro escolhido; se o evento ainda não tem, inclui (SPEC-012 v3 §8.4). */
  private servicoDoEvento(servicoContaId: string): Observable<string | null> {
    if (!servicoContaId) return of(null);
    const existente = this.servicosDoEvento.find((servico) => servico.servicoContaId === servicoContaId);
    if (existente) return of(existente.id);
    return this.negocio.servicosConta().pipe(
      switchMap((catalogo) => {
        const nome = catalogo.find((servico) => servico.id === servicoContaId)?.nome ?? this.nomesCriados.get(servicoContaId) ?? '';
        const peloNome = this.servicosDoEvento.find((servico) => normalizar(servico.nome) === normalizar(nome));
        if (peloNome) return of(peloNome.id);
        if (!nome) return of(null);
        return this.negocio.adicionarServicoEvento(this.eventoId(), nome).pipe(
          map((evento) => {
            this.servicosDoEvento = evento.servicos;
            return evento.servicos.find((servico) => servico.servicoContaId === servicoContaId)?.id
              ?? evento.servicos.find((servico) => normalizar(servico.nome) === normalizar(nome))?.id
              ?? null;
          }),
        );
      }),
    );
  }

  private montarFormulario() {
    const tarefa = this.dados.tarefa;
    const modelo = this.dados.modelo?.tarefa;
    const relativo = modelo ? modelo.prazoRelativo : tarefa?.prazoRelativo ?? null;
    const tipo: TipoPrazo = relativo != null ? 'relativo' : !modelo && tarefa?.prazo ? 'dataExata' : 'semPrazo';
    const decomposto = diasParaRelativo(relativo);
    const responsaveis = modelo
      ? modelo.responsaveis
      : tarefa?.responsaveis.map((item) => chaveResponsavel(item)) ?? ['Organizer'];
    const itens = modelo
      ? modelo.checklist.map((item) => this.item(item.texto, false, false, item.prazoRelativo != null ? 'relativo' : 'semPrazo', item.prazoRelativo, null, item.responsavelPapel ?? ''))
      : (tarefa?.checklist ?? []).map((item) => this.item(
        item.texto,
        item.feito,
        item.cancelado,
        item.prazoRelativo != null ? 'relativo' : item.prazo ? 'dataExata' : 'semPrazo',
        item.prazoRelativo,
        deIsoParaData(item.prazo),
        item.responsavel ? chaveResponsavel(item.responsavel) : '',
      ));
    return this.fb.nonNullable.group({
      titulo: [modelo?.titulo ?? tarefa?.titulo ?? '', [Validators.required, Validators.pattern(/\S/)]],
      descricao: modelo?.descricao ?? tarefa?.descricao ?? '',
      servicoContaId: modelo?.servicoContaId ?? this.dados.modelo?.servicoContaId ?? '',
      tipoPrazo: tipo,
      quantidade: this.fb.control<number | null>(decomposto.quantidade),
      unidade: decomposto.unidade as UnidadePrazo,
      sentido: decomposto.sentido as SentidoPrazo,
      prazoData: this.fb.control<Date | null>(relativo == null ? deIsoParaData(tarefa?.prazo) : null),
      situacao: tarefa?.situacao ?? 'Pendente',
      responsaveis: [responsaveis as string[], Validators.required],
      prioridade: modelo?.prioridade ?? tarefa?.prioridade ?? 'Media',
      visibilidade: modelo?.visibilidade ?? tarefa?.visibilidade ?? 'SoEu',
      checklist: this.fb.array(itens),
    });
  }

  private focarPrimeiroInvalido(): void {
    const campo = this.elemento.nativeElement.querySelector<HTMLElement>('input.ng-invalid, textarea.ng-invalid, .mat-mdc-select.ng-invalid');
    campo?.focus();
  }

  private item(texto: string, feito: boolean, cancelado: boolean, tipoPrazo: TipoPrazo, relativo: number | null, prazo: Date | null, responsavel: string) {
    const decomposto = diasParaRelativo(relativo);
    return this.fb.nonNullable.group({
      texto: [texto, [Validators.required, Validators.pattern(/\S/)]],
      feito,
      cancelado,
      tipoPrazo,
      quantidade: this.fb.control<number | null>(decomposto.quantidade),
      unidade: decomposto.unidade as UnidadePrazo,
      sentido: decomposto.sentido as SentidoPrazo,
      prazo: this.fb.control<Date | null>(prazo),
      responsavel,
    });
  }
}

function normalizar(texto: string): string {
  return texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}

import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormArray, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { forkJoin, map, Observable, of } from 'rxjs';
import { AssistentesClient, NomeAssistente } from '../../core/assistentes.client';
import { AuthService } from '../../core/auth.service';
import { mensagemDeErro } from '../../core/mensagem-erro';
import {
  LeituraTarefasEmMassa,
  NegocioClient,
  PAPEIS_RESPONSAVEL_MODELO,
  PRIORIDADES_TAREFA,
  ServicoConta,
  TarefaLidaEmMassa,
} from '../../core/negocio.client';
import { ToastService } from '../../core/toast.service';
import { CampoDataComponent } from '../../shared/campo-data';
import { deDataParaIso, deIsoParaData } from '../../shared/data';
import {
  LIMITE_RELATIVO,
  SENTIDOS_PRAZO,
  SentidoPrazo,
  TIPOS_PRAZO,
  TipoPrazo,
  UNIDADES_PRAZO,
  UnidadePrazo,
  diasParaRelativo,
  relativoParaDias,
} from '../../shared/prazo-modelo';
import { opcoesResponsavel, OpcaoResponsavel, pedidoResponsavel } from '../../shared/responsaveis';
import { SeletorServicoComponent } from '../../shared/seletor-servico.component';
import { TarefaModeloEdicao } from './tarefa-form.dialog';
import { FecharModal } from '../../shared/fechar-modal';
import { Estado } from '../../shared/estado';

export type DadosTarefasEmMassa =
  | { modo: 'evento'; eventoId: string }
  | { modo: 'modelo'; servicosDoModelo: string[] };

/** No modo modelo o modal devolve as tarefas para o editor (que só grava no Salvar) e os serviços cadastrados. */
export interface ResultadoTarefasEmMassaModelo {
  tarefas: TarefaModeloEdicao[];
  servicosCadastrados: ServicoConta[];
}

const MAXIMO_LINHAS = 500;

interface LinhaInicial {
  titulo: string;
  servicoContaId: string;
  servicoNovo: string;
  tipoPrazo: TipoPrazo;
  relativo: number | null;
  prazoData: Date | null;
  responsaveis: string[];
  prioridade: string;
  descricao: string;
  avisos: string[];
}

function criarLinha(fb: FormBuilder, inicial?: LinhaInicial) {
  const decomposto = diasParaRelativo(inicial?.relativo ?? null);
  return fb.nonNullable.group({
    titulo: [inicial?.titulo ?? '', Validators.maxLength(200)],
    servicoContaId: inicial?.servicoContaId ?? '',
    servicoNovo: inicial?.servicoNovo ?? '',
    tipoPrazo: (inicial?.tipoPrazo ?? 'semPrazo') as TipoPrazo,
    quantidade: fb.control<number | null>(decomposto.quantidade),
    unidade: decomposto.unidade as UnidadePrazo,
    sentido: decomposto.sentido as SentidoPrazo,
    prazoData: fb.control<Date | null>(inicial?.prazoData ?? null),
    responsaveis: fb.nonNullable.control<string[]>(inicial?.responsaveis ?? ['Organizer']),
    prioridade: inicial?.prioridade ?? 'Media',
    descricao: inicial?.descricao ?? '',
    avisos: fb.nonNullable.control<string[]>(inicial?.avisos ?? []),
  });
}

type LinhaForm = ReturnType<typeof criarLinha>;

/** Adicionar tarefas em massa (SPEC-012 v3 §6.4): grade editável que é a prévia; lista colada e planilha preenchem. */
@Component({
  selector: 'app-adicionar-tarefas-em-massa',
  imports: [FecharModal, ReactiveFormsModule, MatDialogModule, MatButtonModule, MatFormFieldModule, MatIconModule, MatInputModule, MatSelectModule, MatTooltipModule, CampoDataComponent, SeletorServicoComponent, Estado],
  template: `
    <h2 mat-dialog-title>Adicionar tarefas em massa <app-fechar-modal /></h2>
    <p class="text-muted text-sm px-6 -mt-2 mb-4">
      Digite, cole uma lista ou envie a planilha. A grade é a prévia: nada é gravado antes de "Adicionar".
      @if (emModelo) { No modelo o prazo é só relativo ao evento. }
    </p>
    <mat-dialog-content>
      <div class="flex flex-wrap items-center gap-2 mb-4">
        <button mat-stroked-button type="button" (click)="colando.set(!colando())"><mat-icon>content_paste</mat-icon> Colar lista</button>
        <input #arquivo type="file" class="hidden" accept=".xlsx,.xls,.csv" (change)="enviarPlanilha($event)" />
        <button mat-stroked-button type="button" (click)="arquivo.click()"><mat-icon>upload_file</mat-icon> Enviar planilha</button>
        <button mat-button type="button" (click)="baixarModelo()"><mat-icon>download</mat-icon> Baixar planilha modelo</button>
        <button mat-icon-button type="button" aria-label="Ajuda" matTooltip="Como preencher" (click)="ajuda.set(!ajuda())"><mat-icon>help_outline</mat-icon></button>
      </div>

      @if (ajuda()) {
        <div class="ajuda mb-4 text-sm">
          <strong class="block mb-1">Lista colada</strong>
          <ul class="mb-2">
            <li>Cada linha é uma tarefa. Marcadores (<code>-</code>, <code>*</code>, <code>1.</code>, <code>[ ]</code>) são removidos.</li>
            <li>Linha que termina com <code>:</code> ou toda em maiúsculas é o <strong>serviço</strong> das tarefas abaixo dela (ex.: <code>Buffet:</code>).</li>
            <li>Prazo entre parênteses no fim: <code>(6 semanas)</code>, <code>(30 dias antes)</code>, <code>(2 semanas depois)</code>, <code>(no dia)</code>@if (!emModelo) {, ou uma data <code>(15/03/2027)</code>}.</li>
          </ul>
          <strong class="block mb-1">Planilha (.xlsx ou .csv)</strong>
          <ul class="mb-0">
            <li>Colunas: <strong>Tarefa</strong> (obrigatória), Serviço, Prazo, Responsáveis, Prioridade e Descrição, em qualquer ordem.</li>
            <li>Responsáveis: Organizador, Assistente ou Cliente, separados por <code>;</code>@if (!emModelo) {, ou o nome de uma assistente}. Vazio = Organizador.</li>
            <li>Prioridade: Baixa, Média ou Alta. Vazio = Média. Serviço que não existe no cadastro é cadastrado.</li>
          </ul>
        </div>
      }

      @if (colando()) {
        <div class="campo mb-4">
          <mat-form-field appearance="outline" class="w-full">
            <textarea matInput rows="6" aria-label="Lista de tarefas" [value]="texto()" (input)="texto.set($any($event.target).value)"
              placeholder="Buffet:&#10;- Pedir orçamentos (6 semanas)&#10;- Degustação (30 dias)"></textarea>
          </mat-form-field>
          <div class="flex justify-end"><button mat-flat-button type="button" [disabled]="!texto().trim()" (click)="lerTexto()">Acrescentar à grade</button></div>
        </div>
      }

      @if (ignoradas().length > 0) {
        <p class="gd-alerta text-sm mb-4">Linhas ignoradas: {{ ignoradas().join(' · ') }}</p>
      }

      <div [formGroup]="formulario">
        <div formArrayName="linhas" class="grade">
          @for (linha of linhas.controls; track linha; let i = $index) {
            <div class="linha" [formGroupName]="i" [class.repetida]="repetidas().has(i)">
              <div class="linha-principal">
                <mat-form-field appearance="outline" subscriptSizing="dynamic" class="titulo">
                  <input matInput formControlName="titulo" placeholder="Tarefa" [attr.aria-label]="'Tarefa da linha ' + (i + 1)" maxlength="200" />
                </mat-form-field>
                <div class="servico">
                  @if (linha.get('servicoNovo')?.value; as novo) {
                    <div class="servico-novo">
                      <span class="text-xs"><strong>Serviço novo, será cadastrado:</strong> {{ novo }}</span>
                      <button mat-icon-button type="button" aria-label="Trocar o serviço" matTooltip="Trocar o serviço" (click)="linha.get('servicoNovo')?.setValue('')"><mat-icon>swap_horiz</mat-icon></button>
                    </div>
                  } @else {
                    <app-seletor-servico formControlName="servicoContaId" [compacto]="true" [catalogo]="catalogo()" [destaque]="destaque()" [rotuloDestaque]="emModelo ? 'Neste modelo' : 'Neste evento'" (criado)="aoCriarServico($event)" [rotulo]="'Serviço da linha ' + (i + 1)" />
                  }
                </div>
                <mat-form-field appearance="outline" subscriptSizing="dynamic" class="responsaveis">
                  <mat-select formControlName="responsaveis" multiple [attr.aria-label]="'Responsáveis da linha ' + (i + 1)">
                    @for (papel of papeis(); track papel.valor) { <mat-option [value]="papel.valor">{{ papel.rotulo }}</mat-option> }
                  </mat-select>
                </mat-form-field>
                <mat-form-field appearance="outline" subscriptSizing="dynamic" class="prioridade">
                  <mat-select formControlName="prioridade" [attr.aria-label]="'Prioridade da linha ' + (i + 1)">
                    @for (item of prioridades; track item.valor) { <mat-option [value]="item.valor">{{ item.rotulo }}</mat-option> }
                  </mat-select>
                </mat-form-field>
                <button mat-icon-button type="button" aria-label="Remover linha" matTooltip="Remover linha" (click)="remover(i)"><mat-icon>delete</mat-icon></button>
              </div>
              <div class="linha-prazo">
                <mat-form-field appearance="outline" subscriptSizing="dynamic" class="tipo">
                  <mat-select formControlName="tipoPrazo" [attr.aria-label]="'Tipo de prazo da linha ' + (i + 1)">
                    @for (tipo of tiposPrazo; track tipo.valor) { <mat-option [value]="tipo.valor">{{ tipo.rotulo }}</mat-option> }
                  </mat-select>
                </mat-form-field>
                @if (linha.get('tipoPrazo')?.value === 'dataExata') {
                  <app-campo-data rotulo="" [ariaLabel]="'Data do prazo da linha ' + (i + 1)" formControlName="prazoData" class="data" />
                } @else if (linha.get('tipoPrazo')?.value === 'relativo') {
                  @if (linha.get('unidade')?.value !== 'noDia') {
                    <mat-form-field appearance="outline" subscriptSizing="dynamic" class="qtd">
                      <input matInput type="number" min="0" [max]="limite" formControlName="quantidade" [attr.aria-label]="'Quantidade do prazo da linha ' + (i + 1)" />
                    </mat-form-field>
                  }
                  <mat-form-field appearance="outline" subscriptSizing="dynamic" class="unidade">
                    <mat-select formControlName="unidade" [attr.aria-label]="'Unidade do prazo da linha ' + (i + 1)">
                      @for (u of unidades; track u.valor) { <mat-option [value]="u.valor">{{ u.rotulo }}</mat-option> }
                    </mat-select>
                  </mat-form-field>
                  @if (linha.get('unidade')?.value !== 'noDia') {
                    <mat-form-field appearance="outline" subscriptSizing="dynamic" class="sentido">
                      <mat-select formControlName="sentido" [attr.aria-label]="'Antes ou depois, linha ' + (i + 1)">
                        @for (s of sentidos; track s.valor) { <mat-option [value]="s.valor">{{ s.rotulo }}</mat-option> }
                      </mat-select>
                    </mat-form-field>
                  }
                }
                <mat-form-field appearance="outline" subscriptSizing="dynamic" class="descricao">
                  <input matInput formControlName="descricao" placeholder="Descrição (opcional)" [attr.aria-label]="'Descrição da linha ' + (i + 1)" />
                </mat-form-field>
              </div>
              @if (avisosDa(i).length > 0 || repetidas().has(i)) {
                <p class="gd-alerta text-xs mt-2 mb-0">
                  @if (repetidas().has(i)) { Repetida: mesmo serviço e mesmo título de outra linha; não entra. }
                  {{ avisosDa(i).join(' ') }}
                </p>
              }
            </div>
          } @empty {
            <app-estado titulo="Nenhuma linha ainda" texto="Use &quot;+ Linha&quot;, &quot;Colar lista&quot; ou &quot;Enviar planilha&quot;." />
          }
        </div>
      </div>
      <div class="mt-2"><button mat-stroked-button type="button" (click)="adicionarLinha()" [disabled]="linhas.length >= maximo"><mat-icon>add</mat-icon> Linha</button></div>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-stroked-button type="button" (click)="ref.close()">Cancelar</button>
      <button mat-flat-button type="button" [disabled]="quantasEntram() === 0 || gravando()" (click)="adicionar()">
        Adicionar {{ quantasEntram() }} {{ quantasEntram() === 1 ? 'tarefa' : 'tarefas' }}
      </button>
    </mat-dialog-actions>
  `,
  styles: `
    .ajuda { border: 1px solid var(--mat-sys-outline-variant); border-radius: 8px; padding: 12px 16px; }
    .ajuda ul { padding-left: 18px; list-style: disc; }
    .grade { display: flex; flex-direction: column; border: 1px solid rgba(128,128,128,.25); border-radius: 8px; overflow: hidden; }
    .linha { padding: 10px 12px; display: flex; flex-direction: column; gap: 8px; }
    .linha + .linha { border-top: 1px solid rgba(128,128,128,.25); }
    .linha.repetida { opacity: .6; }
    .linha-principal { display: grid; grid-template-columns: minmax(0, 2fr) minmax(0, 1.5fr) minmax(0, 1.3fr) 120px auto; gap: 8px; align-items: center; }
    .linha-prazo { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
    .linha-prazo .tipo { width: 180px; }
    .linha-prazo .qtd { width: 84px; }
    .linha-prazo .unidade { width: 160px; }
    .linha-prazo .sentido { width: 104px; }
    .linha-prazo .data { width: 160px; }
    .linha-prazo .descricao { flex: 1; min-width: 180px; }
    .servico-novo { display: flex; align-items: center; justify-content: space-between; gap: 4px; padding: 4px 8px; border: 1px dashed var(--mat-sys-primary); border-radius: 6px; }
    @media (max-width: 900px) {
      .linha-principal { grid-template-columns: 1fr 1fr; }
      .linha-principal .titulo { grid-column: 1 / -1; }
    }
  `,
})
export class AdicionarTarefasEmMassaDialog implements OnInit {
  protected readonly dados = inject<DadosTarefasEmMassa>(MAT_DIALOG_DATA);
  protected readonly ref = inject(MatDialogRef<AdicionarTarefasEmMassaDialog, boolean | ResultadoTarefasEmMassaModelo>);
  private readonly fb = inject(FormBuilder);
  private readonly negocio = inject(NegocioClient);
  private readonly toast = inject(ToastService);
  private readonly assistentes = inject(AssistentesClient);
  private readonly auth = inject(AuthService);

  protected readonly emModelo = this.dados.modo === 'modelo';
  protected readonly maximo = MAXIMO_LINHAS;
  protected readonly limite = LIMITE_RELATIVO;
  protected readonly prioridades = PRIORIDADES_TAREFA;
  protected readonly tiposPrazo = this.emModelo ? TIPOS_PRAZO.filter((tipo) => tipo.valor !== 'dataExata') : TIPOS_PRAZO;
  protected readonly unidades = UNIDADES_PRAZO;
  protected readonly sentidos = SENTIDOS_PRAZO;
  protected readonly papeis = signal<OpcaoResponsavel[]>(
    this.emModelo ? PAPEIS_RESPONSAVEL_MODELO : opcoesResponsavel([], this.auth.ehAssistente() ? 'Dona da conta' : 'Eu'),
  );
  protected readonly catalogo = signal<ServicoConta[]>([]);
  protected readonly destaque = signal<string[]>(this.dados.modo === 'modelo' ? this.dados.servicosDoModelo : []);
  protected readonly colando = signal(false);
  protected readonly ajuda = signal(false);
  protected readonly texto = signal('');
  protected readonly ignoradas = signal<string[]>([]);
  protected readonly gravando = signal(false);
  private readonly versao = signal(0);
  private nomesAssistentes: NomeAssistente[] = [];
  private readonly cadastrados: ServicoConta[] = [];

  protected readonly formulario = this.fb.nonNullable.group({ linhas: this.fb.array<LinhaForm>([]) });

  protected get linhas(): FormArray<LinhaForm> {
    return this.formulario.controls.linhas;
  }

  /** Linhas com o mesmo serviço e título de uma anterior (SPEC-012 v3 §8.5). */
  protected readonly repetidas = computed(() => {
    this.versao();
    const vistas = new Set<string>();
    const repetidas = new Set<number>();
    this.linhas.controls.forEach((linha, i) => {
      const valor = linha.getRawValue();
      if (!valor.titulo.trim()) return;
      const chave = `${valor.servicoContaId || normalizar(valor.servicoNovo)}|${normalizar(valor.titulo)}`;
      if (vistas.has(chave)) repetidas.add(i);
      vistas.add(chave);
    });
    return repetidas;
  });

  protected readonly quantasEntram = computed(() => {
    this.versao();
    return this.linhas.controls.filter((linha, i) => !!linha.getRawValue().titulo.trim() && !this.repetidas().has(i)).length;
  });

  ngOnInit(): void {
    this.formulario.valueChanges.subscribe(() => this.versao.update((v) => v + 1));
    this.negocio.servicosConta().subscribe({ next: (lista) => this.catalogo.set(lista), error: () => this.catalogo.set([]) });
    if (this.dados.modo === 'evento') {
      const eventoId = this.dados.eventoId;
      this.assistentes.nomes().subscribe({
        next: (nomes) => {
          this.nomesAssistentes = nomes.filter((item) => !item.removida);
          this.papeis.set(opcoesResponsavel(nomes, this.auth.ehAssistente() ? 'Dona da conta' : 'Eu'));
        },
        error: () => undefined,
      });
      this.negocio.evento(eventoId).subscribe({
        next: (evento) => this.destaque.set(evento.servicos.map((servico) => servico.servicoContaId).filter((id): id is string => !!id)),
        error: () => undefined,
      });
    }
    this.adicionarLinha();
  }

  protected avisosDa(indice: number): string[] {
    return this.linhas.at(indice)?.getRawValue().avisos ?? [];
  }

  protected adicionarLinha(): void {
    if (this.linhas.length >= MAXIMO_LINHAS) return;
    this.linhas.push(criarLinha(this.fb));
  }

  protected remover(indice: number): void {
    this.linhas.removeAt(indice);
  }

  protected aoCriarServico(servico: ServicoConta): void {
    this.catalogo.update((lista) => (lista.some((item) => item.id === servico.id) ? lista : [...lista, servico]));
    this.cadastrados.push(servico);
  }

  protected lerTexto(): void {
    this.negocio.lerTarefasEmMassa({ texto: this.texto() }, this.emModelo).subscribe({
      next: (lido) => {
        this.acrescentar(lido);
        this.texto.set('');
        this.colando.set(false);
      },
      error: (erro: unknown) => this.toast.erro(mensagemDeErro(erro)),
    });
  }

  protected enviarPlanilha(evento: Event): void {
    const campo = evento.target as HTMLInputElement;
    const arquivo = campo.files?.[0];
    campo.value = '';
    if (!arquivo) return;
    const dados = new FormData();
    dados.append('arquivo', arquivo);
    this.negocio.lerTarefasEmMassa(dados, this.emModelo).subscribe({
      next: (lido) => this.acrescentar(lido),
      error: (erro: unknown) => this.toast.erro(mensagemDeErro(erro)),
    });
  }

  protected baixarModelo(): void {
    this.negocio.planilhaTarefasModelo().subscribe({
      next: (blob) => {
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = 'tarefas-modelo.xlsx';
        link.click();
        setTimeout(() => URL.revokeObjectURL(link.href), 1000);
      },
      error: (erro: unknown) => this.toast.erro(mensagemDeErro(erro)),
    });
  }

  protected adicionar(): void {
    const validas = this.linhas.controls
      .map((linha, i) => ({ valor: linha.getRawValue(), i }))
      .filter(({ valor, i }) => !!valor.titulo.trim() && !this.repetidas().has(i))
      .map(({ valor }) => valor);
    const semQuantidade = validas.find((valor) => valor.tipoPrazo === 'relativo' && relativoParaDias(valor.quantidade, valor.unidade, valor.sentido) == null);
    if (semQuantidade) {
      this.toast.erro(`Informe a quantidade do prazo de "${semQuantidade.titulo.trim()}".`);
      return;
    }
    this.gravando.set(true);
    this.cadastrarNovos(validas.map((valor) => valor.servicoNovo).filter((nome) => !!nome.trim())).subscribe({
      next: (porNome) => {
        const linhas = validas.map((valor) => ({
          ...valor,
          servicoContaId: valor.servicoContaId || (valor.servicoNovo ? porNome.get(normalizar(valor.servicoNovo)) ?? '' : ''),
          prazoRelativo: valor.tipoPrazo === 'relativo' ? relativoParaDias(valor.quantidade, valor.unidade, valor.sentido) : null,
        }));
        if (this.dados.modo === 'modelo') {
          this.ref.close({
            tarefas: linhas.map((linha) => ({
              servicoContaId: linha.servicoContaId,
              titulo: linha.titulo.trim(),
              descricao: linha.descricao.trim() || null,
              prazoRelativo: linha.prazoRelativo,
              prioridade: linha.prioridade,
              visibilidade: 'SoEu',
              responsaveis: linha.responsaveis.length > 0 ? linha.responsaveis : ['Organizer'],
              checklist: [],
            })),
            servicosCadastrados: this.cadastrados,
          });
          return;
        }
        const pedido = linhas.map((linha) => ({
          titulo: linha.titulo.trim(),
          servicoContaId: linha.servicoContaId || null,
          servicoNome: null,
          prazoRelativo: linha.prazoRelativo,
          prazo: linha.tipoPrazo === 'dataExata' ? deDataParaIso(linha.prazoData) : null,
          responsaveis: (linha.responsaveis.length > 0 ? linha.responsaveis : ['Organizer']).map((chave) => pedidoResponsavel(chave)),
          prioridade: linha.prioridade,
          descricao: linha.descricao.trim() || null,
        }));
        this.negocio.adicionarTarefasEmMassa(this.dados.eventoId, pedido).subscribe({
          next: (resultado) => {
            const repetidas = resultado.repetidas > 0 ? ` ${resultado.repetidas} já existiam e ficaram de fora.` : '';
            this.toast.sucesso(`${resultado.adicionadas} ${resultado.adicionadas === 1 ? 'tarefa adicionada' : 'tarefas adicionadas'}.${repetidas}`);
            this.ref.close(true);
          },
          error: (erro: unknown) => {
            this.gravando.set(false);
            this.toast.erro(mensagemDeErro(erro));
          },
        });
      },
      error: (erro: unknown) => {
        this.gravando.set(false);
        this.toast.erro(mensagemDeErro(erro));
      },
    });
  }

  /** Cadastra os serviços novos (o back-end devolve o existente se o nome já estiver no cadastro). */
  private cadastrarNovos(nomes: string[]): Observable<Map<string, string>> {
    const unicos = [...new Map(nomes.map((nome) => [normalizar(nome), nome.trim()])).values()];
    if (unicos.length === 0) return of(new Map());
    return forkJoin(unicos.map((nome) => this.negocio.criarServicoConta(nome))).pipe(
      map((criados) => {
        for (const servico of criados) this.cadastrados.push(servico);
        return new Map(criados.map((servico) => [normalizar(servico.nome), servico.id]));
      }),
    );
  }

  private acrescentar(lido: LeituraTarefasEmMassa): void {
    this.ignoradas.set(lido.linhasIgnoradas);
    // A linha vazia inicial sai quando a leitura traz tarefas.
    if (this.linhas.length === 1 && !this.linhas.at(0).getRawValue().titulo.trim() && lido.tarefas.length > 0) {
      this.linhas.removeAt(0);
    }
    const espaco = MAXIMO_LINHAS - this.linhas.length;
    for (const tarefa of lido.tarefas.slice(0, Math.max(espaco, 0))) {
      this.linhas.push(this.linhaLida(tarefa));
    }
    if (lido.tarefas.length > espaco) {
      this.toast.erro(`A grade aceita até ${MAXIMO_LINHAS} linhas; ${lido.tarefas.length - espaco} ficaram de fora.`);
    }
    if (lido.tarefas.length === 0) {
      this.toast.erro('Nenhuma tarefa encontrada.');
    }
  }

  private linhaLida(tarefa: TarefaLidaEmMassa) {
    const avisos = [...tarefa.avisos];
    const doCadastro = tarefa.servico ? this.catalogo().find((servico) => normalizar(servico.nome) === normalizar(tarefa.servico!)) : undefined;
    const responsaveis: string[] = [];
    for (const nome of tarefa.responsaveis) {
      const chave = this.chaveResponsavel(nome);
      if (chave) {
        if (!responsaveis.includes(chave)) responsaveis.push(chave);
      } else {
        avisos.push(`Responsável não reconhecido: ${nome}.`);
      }
    }
    const tipo: TipoPrazo = tarefa.prazoRelativo != null ? 'relativo' : tarefa.prazoData ? 'dataExata' : 'semPrazo';
    return criarLinha(this.fb, {
      titulo: tarefa.titulo,
      servicoContaId: doCadastro?.id ?? '',
      servicoNovo: tarefa.servico && !doCadastro ? tarefa.servico : '',
      tipoPrazo: tipo,
      relativo: tarefa.prazoRelativo,
      prazoData: deIsoParaData(tarefa.prazoData),
      responsaveis: responsaveis.length > 0 ? responsaveis : ['Organizer'],
      prioridade: tarefa.prioridade ?? 'Media',
      descricao: tarefa.descricao ?? '',
      avisos,
    });
  }

  /** Papel ou assistente pelo texto da planilha (SPEC-012 v3 §8.7). */
  private chaveResponsavel(texto: string): string | null {
    const nome = normalizar(texto);
    if (['organizador', 'organizadora', 'organizer', 'eu', 'dona', 'dona da conta'].includes(nome)) return 'Organizer';
    if (['assistente', 'assistentes'].includes(nome)) return 'Assistente';
    if (['cliente', 'clientes', 'noivos'].includes(nome)) return 'Cliente';
    if (!this.emModelo) {
      const assistente = this.nomesAssistentes.find((item) => normalizar(item.nome) === nome);
      if (assistente) return `Assistente:${assistente.id}`;
    }
    return null;
  }
}

function normalizar(texto: string): string {
  return (texto ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}

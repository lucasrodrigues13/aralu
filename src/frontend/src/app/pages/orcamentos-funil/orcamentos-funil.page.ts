import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDialog, MatDialogModule, MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatMenuModule } from '@angular/material/menu';
import { mensagemDeErro } from '../../core/mensagem-erro';
import { MensagemModelo, ModeloOrcamentoFunil, NegocioClient, Oportunidade, OrcamentoFunil, RespostaProposta } from '../../core/negocio.client';
import { AuthService } from '../../core/auth.service';
import { ToastService } from '../../core/toast.service';
import { ConfirmaDialog } from '../../shared/confirma-dialog';
import { CampoDinheiroComponent } from '../../shared/campo-dinheiro';
import { DIALOG, DIALOG_PEQUENO } from '../../shared/dialog';
import { GdDataPipe } from '../../shared/gd-data.pipe';
import { linkProposta, SELO_PROPOSTA, whatsappProposta, whatsappTexto } from '../../shared/proposta';
import { ParcelasOrcamentoDialog } from './parcelas-orcamento.dialog';
import { EditorRico } from '../../shared/editor-rico';
import { abrirPreviaAceite } from '../modelos-funil/pagina-aceite';
import { FecharModal } from '../../shared/fechar-modal';

@Component({
  selector: 'app-orcamento-funil-dialog',
  imports: [FecharModal, ReactiveFormsModule, MatDialogModule, MatButtonModule, MatFormFieldModule, MatIconModule, MatInputModule, MatSelectModule, CampoDinheiroComponent, EditorRico],
  template: `
    <h2 mat-dialog-title>{{ dados ? 'Editar orçamento' : 'Novo orçamento' }} <app-fechar-modal /></h2>
    <mat-dialog-content>
      <form class="grid grid-cols-1 gap-4" [formGroup]="form">
        @if (!dados) {
          <div class="campo">
            <mat-label class="font-semibold mb-2 block">Oportunidade</mat-label>
            <mat-form-field appearance="outline" class="w-full">
            <mat-select [attr.aria-label]="'Oportunidade'" formControlName="oportunidadeId">
              @for (o of oportunidades(); track o.id) { <mat-option [value]="o.id">{{ o.nome }}</mat-option> }
            </mat-select>
          </mat-form-field>
          </div>
          <div class="campo">
            <mat-label class="font-semibold mb-2 block">Modelo</mat-label>
            <mat-form-field appearance="outline" class="w-full">
            <mat-select [attr.aria-label]="'Modelo'" formControlName="modeloId" (selectionChange)="aplicarModelo($event.value)">
              <mat-option [value]="null">Sem modelo</mat-option>
              @for (m of modelos(); track m.id) { <mat-option [value]="m.id">{{ m.nome }}</mat-option> }
            </mat-select>
          </mat-form-field>
          </div>
        }
        <div class="campo">
          <mat-label class="font-semibold mb-2 block">Conteúdo</mat-label>
          <app-editor-rico formControlName="conteudo" rotulo="Conteúdo" altura="260px" />
        </div>
        <app-campo-dinheiro rotulo="Valor" formControlName="valor" />
        <div class="campo">
          <mat-label class="font-semibold mb-2 block">Validade da proposta</mat-label>
          <mat-form-field appearance="outline" class="w-full" subscriptSizing="dynamic">
            <input matInput type="number" min="1" max="180" aria-label="Validade em dias" formControlName="diasValidade" />
            <span matTextSuffix>dias</span>
            <mat-hint>
              @if (form.controls.diasValidade.valid) { Conta a partir do envio do link. O padrão vem das configurações de propostas. }
              @else { A validade da proposta vai de 1 a 180 dias. }
            </mat-hint>
          </mat-form-field>
        </div>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-stroked-button type="button" (click)="ref.close()">Cancelar</button>
      @if (!dados) {
        <button mat-stroked-button type="button" [disabled]="!form.controls.modeloId.value" (click)="previa()">
          <mat-icon>visibility</mat-icon> Live Preview
        </button>
      }
      <button mat-flat-button type="button" (click)="salvar()">Salvar</button>
    </mat-dialog-actions>
  `,
})
export class OrcamentoFunilDialog implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly negocio = inject(NegocioClient);
  private readonly toast = inject(ToastService);
  private readonly dialog = inject(MatDialog);
  protected readonly dados = inject<OrcamentoFunil | null>(MAT_DIALOG_DATA);
  protected readonly ref = inject(MatDialogRef<OrcamentoFunilDialog, boolean>);
  protected readonly oportunidades = signal<Oportunidade[]>([]);
  protected readonly modelos = signal<ModeloOrcamentoFunil[]>([]);
  protected readonly form = this.fb.nonNullable.group({
    oportunidadeId: [this.dados?.oportunidadeId ?? '', Validators.required],
    modeloId: [this.dados?.modeloId ?? null as string | null],
    conteudo: [this.dados?.conteudo ?? '', Validators.required],
    valor: [this.dados?.valor ?? null as number | null],
    diasValidade: [this.dados?.diasValidade ?? 30, [Validators.required, Validators.min(1), Validators.max(180), Validators.pattern(/^\d+$/)]],
  });

  ngOnInit(): void {
    // SPEC-064: sem validade própria, o campo vem com o padrão das configurações de propostas.
    if (!this.dados?.diasValidade) {
      this.negocio.configuracaoPropostas().subscribe({ next: (c) => this.form.controls.diasValidade.setValue(c.validadeDias), error: () => undefined });
    }
    this.negocio.oportunidades().subscribe({ next: (lista) => this.oportunidades.set(lista) });
    this.negocio.modelosOrcamentoFunil().subscribe({ next: (lista) => this.modelos.set(lista) });
  }

  protected aplicarModelo(id: string | null): void {
    const modelo = this.modelos().find((m) => m.id === id);
    if (!modelo) return;
    const oportunidadeId = this.form.controls.oportunidadeId.value;
    if (!oportunidadeId) {
      this.form.controls.conteudo.setValue(modelo.texto);
      this.toast.erro('Escolha a oportunidade para preencher os parâmetros do modelo.');
      return;
    }

    // SPEC-031 §17, ponto 12: o servidor troca os parâmetros pelos dados do lead.
    this.negocio.textoDoModeloOrcamento(modelo.id, oportunidadeId, this.form.controls.valor.value).subscribe({
      next: (resposta) => this.form.controls.conteudo.setValue(resposta.texto),
      error: (erro: unknown) => this.toast.erro(mensagemDeErro(erro)),
    });
  }

  /** Mostra em tela cheia a página que o lead vai ver, para conferir se o modelo escolhido é o certo. */
  protected previa(): void {
    const modelo = this.modelos().find((m) => m.id === this.form.controls.modeloId.value);
    if (!modelo) return;
    abrirPreviaAceite(this.dialog, {
      texto: this.form.controls.conteudo.value || modelo.texto || null,
      htmlAceite: modelo.htmlAceite ?? null,
      corPrimaria: modelo.corPrimaria,
      corSecundaria: modelo.corSecundaria,
      midias: modelo.midias ?? [],
      depoimentos: modelo.depoimentos ?? [],
    });
  }

  protected salvar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const valor = { ...this.form.getRawValue(), diasValidade: Number(this.form.controls.diasValidade.value) };
    const req = this.dados
      ? this.negocio.atualizarOrcamentoFunil(this.dados.id, valor)
      : this.negocio.criarOrcamentoFunil(valor);
    req.subscribe({
      next: () => {
        this.toast.sucesso('Orçamento salvo.');
        this.ref.close(true);
      },
      error: (erro: unknown) => this.toast.erro(mensagemDeErro(erro)),
    });
  }
}

/** Há mensagem de modelo e ela não traz o link da proposta. Sem modelo (nulo) vale a mensagem padrão, que já tem o link. */
export function mensagemSemLink(texto: string | null, link: string): boolean {
  return texto !== null && !!link && !texto.includes(link);
}

/** Troca o trecho [inicio, fim) pelo trecho novo, com espaço em volta quando encosta em outra palavra. */
export function inserirTexto(atual: string, trecho: string, inicio: number, fim: number): { texto: string; cursor: number } {
  const antes = atual.slice(0, inicio);
  const depois = atual.slice(fim);
  const esquerda = antes && !/\s$/.test(antes) ? ' ' : '';
  const direita = depois && !/^\s/.test(depois) ? ' ' : '';
  const texto = antes + esquerda + trecho + direita + depois;
  return { texto, cursor: (antes + esquerda + trecho).length };
}

/** Link da proposta: copiar ou mandar pelo WhatsApp (SPEC-031 §6.6, item 2). A mensagem do modelo pode ser editada antes do envio. */
@Component({
  selector: 'app-enviar-proposta-dialog',
  imports: [FecharModal, MatDialogModule, MatButtonModule, MatFormFieldModule, MatInputModule, MatIconModule, MatSelectModule, GdDataPipe],
  template: `
    <h2 mat-dialog-title>Enviar proposta <app-fechar-modal /></h2>
    <mat-dialog-content>
      <p class="text-sm text-muted mb-4">
        Mande este link para {{ contato()?.nome || dados.oportunidadeNome }}. O lead abre sem login, vê a proposta e responde por lá.
        @if (dados.validoAte) { O link vale até {{ dados.validoAte | gdData }}. }
      </p>
      <div class="campo">
        <mat-label class="font-semibold mb-2 block">Link da proposta</mat-label>
        <mat-form-field appearance="outline" class="w-full">
          <input matInput readonly aria-label="Link da proposta" [value]="link" (focus)="$any($event.target).select()" />
        </mat-form-field>
      </div>
      @if (modelos().length) {
        <div class="campo">
          <mat-label class="font-semibold mb-2 block">Modelo de mensagem</mat-label>
          <mat-form-field appearance="outline" class="w-full">
            <mat-select aria-label="Modelo de mensagem" [value]="modeloId()" (selectionChange)="escolherModelo($event.value)">
              <mat-option [value]="null">Mensagem padrão com o link</mat-option>
              @for (m of modelos(); track m.id) { <mat-option [value]="m.id">{{ m.nome }}</mat-option> }
            </mat-select>
          </mat-form-field>
        </div>
        @if (texto() !== null) {
          <div class="campo">
            <mat-label class="font-semibold mb-2 block">Mensagem</mat-label>
            <mat-form-field appearance="outline" class="w-full" subscriptSizing="dynamic">
              <textarea #caixa matInput rows="7" aria-label="Mensagem" [value]="texto()" (input)="texto.set(caixa.value)"></textarea>
              <mat-hint>Você pode ajustar o texto antes de enviar.</mat-hint>
            </mat-form-field>
            @if (semLink()) {
              <div class="aviso-link" role="alert">
                <mat-icon>link_off</mat-icon>
                <span class="grow">A mensagem está sem o link da proposta. Coloque o cursor onde ele deve ficar e insira.
                  Para não precisar disso, use a tag <code>{{ '{{link_proposta}}' }}</code> no modelo.</span>
                <button mat-stroked-button type="button" (click)="inserirLink(caixa)">Inserir link</button>
              </div>
            }
          </div>
        }
      }
      <div class="flex flex-wrap gap-2">
        @if (texto()) { <button mat-stroked-button type="button" (click)="copiarMensagem()"><mat-icon>content_copy</mat-icon> Copiar mensagem</button> }
        <button mat-stroked-button type="button" (click)="copiar()"><mat-icon>content_copy</mat-icon> Copiar link</button>
        <button mat-flat-button type="button" (click)="abrirWhatsapp()"><mat-icon>chat</mat-icon> Enviar pelo WhatsApp</button>
      </div>
      <p class="text-xs text-muted mt-4">O envio por e-mail chega quando o canal de e-mail estiver pronto.</p>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-stroked-button type="button" (click)="ref.close()">Fechar</button>
    </mat-dialog-actions>
  `,
  styles: `
    .aviso-link { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; margin-top: 8px; padding: 10px 12px; border-radius: 8px;
      background: var(--mat-sys-error-container); color: var(--mat-sys-on-error-container); font-size: 13px; }
    .aviso-link code { font-size: 12px; }
  `,
})
export class EnviarPropostaDialog implements OnInit {
  private readonly negocio = inject(NegocioClient);
  private readonly toast = inject(ToastService);
  protected readonly dados = inject<OrcamentoFunil>(MAT_DIALOG_DATA);
  protected readonly ref = inject(MatDialogRef<EnviarPropostaDialog>);
  protected readonly link = linkProposta(this.dados.tokenLink ?? '');
  protected readonly contato = signal<{ nome: string; telefone: string | null } | null>(null);
  protected readonly modelos = signal<MensagemModelo[]>([]);
  protected readonly modeloId = signal<string | null>(null);
  protected readonly texto = signal<string | null>(null);
  /** Modelo escolhido e o texto não traz o link (o modelo não tem {{link_proposta}} ou o link foi apagado na edição). */
  protected readonly semLink = computed(() => mensagemSemLink(this.texto(), this.link));

  ngOnInit(): void {
    this.negocio.oportunidade(this.dados.oportunidadeId).subscribe({
      next: (o) => this.contato.set(o.contatos[0] ?? null),
      error: () => this.contato.set(null),
    });
    this.negocio.mensagens().subscribe({ next: (lista) => this.modelos.set(lista), error: () => this.modelos.set([]) });
  }

  protected escolherModelo(id: string | null): void {
    this.modeloId.set(id);
    this.texto.set(null);
    if (!id) return;
    this.negocio.mensagemDoOrcamento(this.dados.id, id, this.link).subscribe({
      next: (r) => this.texto.set(r.texto),
      error: (erro: unknown) => this.toast.erro(mensagemDeErro(erro)),
    });
  }

  /** Põe o link onde está o cursor (ou no fim) e devolve o foco logo depois dele. */
  protected inserirLink(caixa: HTMLTextAreaElement): void {
    const atual = this.texto() ?? '';
    const inicio = caixa.selectionStart ?? atual.length;
    const fim = caixa.selectionEnd ?? inicio;
    const novo = inserirTexto(atual, this.link, inicio, fim);
    this.texto.set(novo.texto);
    caixa.value = novo.texto;
    caixa.focus();
    caixa.setSelectionRange(novo.cursor, novo.cursor);
  }

  protected abrirWhatsapp(): void {
    if (this.semLink()) {
      this.toast.erro('Insira o link da proposta na mensagem antes de enviar.');
      return;
    }
    const c = this.contato();
    const texto = this.texto();
    window.open(texto ? whatsappTexto(c?.telefone, texto) : whatsappProposta(c?.telefone, c?.nome, this.link), '_blank', 'noopener');
  }

  protected copiarMensagem(): void {
    if (this.semLink()) {
      this.toast.erro('Insira o link da proposta na mensagem antes de copiar.');
      return;
    }
    void navigator.clipboard.writeText(this.texto() ?? '').then(
      () => this.toast.sucesso('Mensagem copiada.'),
      () => this.toast.erro('Não deu para copiar. Selecione o texto e copie.'),
    );
  }

  protected copiar(): void {
    void navigator.clipboard.writeText(this.link).then(
      () => this.toast.sucesso('Link copiado.'),
      () => this.toast.erro('Não deu para copiar. Selecione o link e copie.'),
    );
  }
}

/** A assessoria registra o que o cliente respondeu por fora do link (ligação, WhatsApp, conversa). */
@Component({
  selector: 'app-resposta-manual-dialog',
  imports: [FecharModal, ReactiveFormsModule, MatDialogModule, MatButtonModule, MatFormFieldModule, MatInputModule, MatSelectModule],
  template: `
    <h2 mat-dialog-title>Registrar resposta <app-fechar-modal /></h2>
    <mat-dialog-content>
      <p class="text-sm text-muted mb-4">{{ dados.oportunidadeNome }}: o que o cliente respondeu?</p>
      <div class="campo">
        <mat-label class="font-semibold mb-2 block">Resposta</mat-label>
        <mat-form-field appearance="outline" class="w-full">
          <mat-select aria-label="Resposta" [formControl]="tipo">
            @for (o of opcoes; track o.valor) { <mat-option [value]="o.valor">{{ o.rotulo }}</mat-option> }
          </mat-select>
        </mat-form-field>
      </div>
      @if (tipo.value && tipo.value !== 'Aceitar') {
        <div class="campo">
          <mat-label class="font-semibold mb-2 block">{{ tipo.value === 'Duvidas' ? 'Qual é a dúvida?' : 'Motivo (opcional)' }}</mat-label>
          <mat-form-field appearance="outline" class="w-full">
            <textarea matInput rows="4" [formControl]="mensagem" maxlength="1000"
              [attr.aria-label]="tipo.value === 'Duvidas' ? 'Dúvida' : 'Motivo'"></textarea>
          </mat-form-field>
        </div>
      }
      <p class="text-xs text-muted">
        @if (tipo.value === 'Duvidas') { O orçamento continua em andamento e o retorno do lead fica para hoje. }
        @else if (tipo.value) { O orçamento vai para Respondidos. }
      </p>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-stroked-button type="button" mat-dialog-close>Cancelar</button>
      <button mat-flat-button type="button" [disabled]="!tipo.value || enviando()" (click)="registrar()">Registrar</button>
    </mat-dialog-actions>
  `,
})
export class RespostaManualDialog {
  private readonly negocio = inject(NegocioClient);
  private readonly toast = inject(ToastService);
  protected readonly dados = inject<OrcamentoFunil>(MAT_DIALOG_DATA);
  private readonly ref = inject(MatDialogRef<RespostaManualDialog, boolean>);
  protected readonly opcoes: { valor: RespostaProposta; rotulo: string }[] = [
    { valor: 'Aceitar', rotulo: 'Aceitou a proposta' },
    { valor: 'Duvidas', rotulo: 'Tem dúvidas' },
    { valor: 'Recusar', rotulo: 'Não vai seguir' },
  ];
  protected readonly tipo = new FormControl<RespostaProposta | null>(null);
  protected readonly mensagem = new FormControl('', { nonNullable: true });
  protected readonly enviando = signal(false);

  protected registrar(): void {
    const tipo = this.tipo.value;
    if (!tipo) return;
    const texto = this.mensagem.value.trim();
    if (tipo === 'Duvidas' && !texto) {
      this.toast.erro('Escreva a dúvida do cliente.');
      return;
    }
    this.enviando.set(true);
    this.negocio.responderOrcamentoFunil(this.dados.id, tipo, tipo === 'Aceitar' ? null : texto || null).subscribe({
      next: () => {
        this.toast.sucesso('Resposta registrada.');
        this.ref.close(true);
      },
      error: (erro: unknown) => {
        this.toast.erro(mensagemDeErro(erro));
        this.enviando.set(false);
      },
    });
  }
}

@Component({
  selector: 'app-orcamentos-funil',
  imports: [MatButtonToggleModule, MatCardModule, MatButtonModule, MatFormFieldModule, MatInputModule, MatIconModule, MatTableModule, MatCheckboxModule, MatTooltipModule, MatMenuModule, GdDataPipe],
  template: `
    <mat-card class="cardWithShadow">
      <div class="p-6">
        <div><mat-card-title class="mb-0">Orçamentos</mat-card-title><mat-card-subtitle>Orçamentos comerciais do funil.</mat-card-subtitle></div>
      </div>
      <mat-card-content class="border-t border-border">
      <div class="barra-lista">
        <div class="barra-lista-filtros">
          <mat-button-toggle-group [value]="situacao()" (change)="situacao.set($event.value); carregar()" aria-label="Situação">
            @for (aba of abas; track aba.valor) {
              <mat-button-toggle [value]="aba.valor">{{ aba.rotulo }}</mat-button-toggle>
            }
          </mat-button-toggle-group>
          <div class="campo w-full sm:w-64">
            <mat-label class="font-semibold mb-2 block">Buscar</mat-label>
            <mat-form-field appearance="outline" class="w-full">
            <mat-icon matIconPrefix>search</mat-icon>
            <input matInput aria-label="Buscar" placeholder="Buscar" [value]="busca()" (input)="buscar($event)" />
          </mat-form-field>
          </div>
        </div>
        <div class="barra-lista-acoes">
          <button mat-flat-button type="button" (click)="abrir()"><mat-icon>add</mat-icon> Novo orçamento</button>
        </div>
      </div>
      @if (lista().length === 0) {
        <p class="text-center text-muted py-10">Não há orçamento nesta aba.</p>
      } @else {
        <table mat-table class="min-w-full" [dataSource]="lista()">
          <ng-container matColumnDef="oportunidade">
            <th mat-header-cell *matHeaderCellDef>Oportunidade</th>
            <td mat-cell *matCellDef="let item">@if (item.situacao === 'EmAndamento') {
                <button type="button" class="link-nome" (click)="abrir(item)">{{ item.oportunidadeNome }}</button>
              } @else {
                {{ item.oportunidadeNome }}
              }</td>
          </ng-container>
          <ng-container matColumnDef="criadoEm">
            <th mat-header-cell *matHeaderCellDef>Criado em</th>
            <td mat-cell *matCellDef="let item">{{ item.criadoEm | gdData }}</td>
          </ng-container>
          <ng-container matColumnDef="proposta">
            <th mat-header-cell *matHeaderCellDef>Proposta</th>
            <td mat-cell *matCellDef="let item">
              @if (seloDe(item); as s) {
                <span [class]="s.classe" [matTooltip]="item.respostaMensagem ?? ''">{{ s.texto }}</span>
              } @else {
                <span class="text-xs text-muted">Não enviada</span>
              }
            </td>
          </ng-container>
          <ng-container matColumnDef="acoes">
            <th mat-header-cell *matHeaderCellDef class="text-end! whitespace-nowrap">Ações</th>
            <td mat-cell *matCellDef="let item" class="text-end! whitespace-nowrap">
              @if (item.situacao === 'EmAndamento') {
                <button mat-icon-button type="button" aria-label="Enviar proposta" matTooltip="Enviar proposta" (click)="enviar(item)"><mat-icon>send</mat-icon></button>
                <button mat-icon-button type="button" aria-label="Editar" matTooltip="Editar" (click)="abrir(item)"><mat-icon>edit</mat-icon></button>
              }
              @if (item.situacao === 'EmAndamento' || (item.situacao === 'Respondido' && item.tokenLink)) {
                <button mat-icon-button type="button" aria-label="Mais ações" matTooltip="Mais ações" [matMenuTriggerFor]="mais"><mat-icon>more_vert</mat-icon></button>
                <mat-menu #mais="matMenu" class="cardWithShadow">
                  @if (item.situacao === 'EmAndamento') {
                    <button mat-menu-item type="button" (click)="parcelar(item)"><mat-icon>payments</mat-icon> Parcelas</button>
                    <button mat-menu-item type="button" (click)="responder(item)"><mat-icon>mark_email_read</mat-icon> Registrar resposta</button>
                  } @else {
                    <button mat-menu-item type="button" (click)="mostrarLink(item)"><mat-icon>link</mat-icon> Link da proposta</button>
                  }
                  @if (item.situacao === 'EmAndamento') {
                    <button mat-menu-item type="button" (click)="cancelar(item)"><mat-icon>cancel</mat-icon> Cancelar</button>
                    @if (auth.podeExcluirDoFunil(item.criadoPor)) {
                      <button mat-menu-item type="button" class="text-error" (click)="excluir(item)"><mat-icon>delete</mat-icon> Excluir</button>
                    }
                  }
                </mat-menu>
              }
            </td>
          </ng-container>
          <tr mat-header-row *matHeaderRowDef="colunas"></tr>
          <tr mat-row *matRowDef="let row; columns: colunas"></tr>
        </table>
      }
    </mat-card-content>
    </mat-card>
  `,
})
export class OrcamentosFunilPage implements OnInit {
  private readonly negocio = inject(NegocioClient);
  protected readonly auth = inject(AuthService);
  private readonly dialog = inject(MatDialog);
  private readonly toast = inject(ToastService);
  protected readonly abas = [
    { valor: 'EmAndamento', rotulo: 'Em andamento' },
    { valor: 'Respondido', rotulo: 'Respondidos' },
    { valor: 'Cancelado', rotulo: 'Cancelados' },
  ];
  protected readonly situacao = signal('EmAndamento');
  protected readonly busca = signal('');
  protected readonly lista = signal<OrcamentoFunil[]>([]);
  protected readonly colunas = ['oportunidade', 'criadoEm', 'proposta', 'acoes'];
  protected seloDe(item: OrcamentoFunil) {
    return item.situacaoProposta ? SELO_PROPOSTA[item.situacaoProposta] : null;
  }

  ngOnInit(): void {
    this.carregar();
  }

  protected buscar(evento: Event): void {
    this.busca.set((evento.target as HTMLInputElement).value);
    this.carregar();
  }

  protected abrir(item?: OrcamentoFunil): void {
    this.dialog.open(OrcamentoFunilDialog, { ...DIALOG, data: item ?? null }).afterClosed().subscribe((ok) => ok && this.carregar());
  }

  protected parcelar(item: OrcamentoFunil): void {
    if (item.situacao !== 'EmAndamento') {
      this.toast.erro('Só orçamentos em andamento podem ser parcelados.');
      return;
    }
    if (!item.valor || item.valor <= 0) {
      this.toast.erro('Informe o valor do orçamento antes de parcelar.');
      return;
    }
    this.dialog.open(ParcelasOrcamentoDialog, { ...DIALOG, data: item }).afterClosed().subscribe((ok) => ok && this.carregar());
  }

  /** Gera o link com a validade salva no orçamento (ou o padrão da conta) e abre as opções de envio (SPEC-031 §6.6, SPEC-064). */
  protected enviar(item: OrcamentoFunil): void {
    this.negocio.enviarOrcamentoFunil(item.id).subscribe({
      next: (enviado) => {
        this.carregar();
        this.mostrarLink(enviado);
      },
      error: (erro: unknown) => this.toast.erro(mensagemDeErro(erro)),
    });
  }

  protected mostrarLink(item: OrcamentoFunil): void {
    this.dialog.open(EnviarPropostaDialog, { ...DIALOG, data: item });
  }

  protected responder(item: OrcamentoFunil): void {
    this.dialog.open(RespostaManualDialog, { ...DIALOG_PEQUENO, data: item }).afterClosed().subscribe((ok) => ok && this.carregar());
  }

  protected cancelar(item: OrcamentoFunil): void {
    this.negocio.cancelarOrcamentoFunil(item.id).subscribe({
      next: () => { this.toast.sucesso('Orçamento cancelado.'); this.carregar(); },
      error: (erro: unknown) => this.toast.erro(mensagemDeErro(erro)),
    });
  }

  protected excluir(item: OrcamentoFunil): void {
    this.dialog.open(ConfirmaDialog, {
      ...DIALOG_PEQUENO,
      data: { titulo: 'Excluir orçamento', texto: 'Confirma a exclusão?', confirmar: 'Excluir', destrutivo: true },
    }).afterClosed().subscribe((ok) => {
      if (!ok) return;
      this.negocio.excluirOrcamentoFunil(item.id).subscribe({
        next: () => { this.toast.sucesso('Orçamento excluído.'); this.carregar(); },
        error: (erro: unknown) => this.toast.erro(mensagemDeErro(erro)),
      });
    });
  }

  protected carregar(): void {
    this.negocio.orcamentosFunil({ situacao: this.situacao(), busca: this.busca() || undefined }).subscribe({
      next: (lista) => this.lista.set(lista),
      error: (erro: unknown) => this.toast.erro(mensagemDeErro(erro)),
    });
  }
}

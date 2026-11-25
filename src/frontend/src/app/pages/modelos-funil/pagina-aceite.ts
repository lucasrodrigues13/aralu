import { Component, computed, effect, ElementRef, inject, input, output, signal, viewChild } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatTooltipModule } from '@angular/material/tooltip';
import { forkJoin, map, Observable, of, switchMap } from 'rxjs';
import { mensagemDeErro } from '../../core/mensagem-erro';
import { DepoimentoAceite, MidiaAceite, NegocioClient, PreviaPaginaAceite } from '../../core/negocio.client';
import { ToastService } from '../../core/toast.service';
import { copiarTexto } from '../../shared/copiar-texto';
import { DIALOG, DIALOG_LARGO } from '../../shared/dialog';
import { reduzirImagem } from '../../shared/reduzir-imagem';
import { PreviasArquivo } from '../modelos-inspiracoes/previas-arquivo';

/** Tag para o seletor: a marca vai para o texto, o rótulo ajuda a achar. */
export interface TagAceite {
  marca: string;
  rotulo: string;
}

export interface GrupoTags {
  titulo: string;
  tags: TagAceite[];
}

/** As 17 tags de dados do orçamento (SPEC-061 §11.1). Valem no texto e no HTML. */
export const TAGS_DADOS: TagAceite[] = [
  { marca: 'nome_oportunidade', rotulo: 'Nome da oportunidade' },
  { marca: 'nome_contratante', rotulo: 'Nome do contratante' },
  { marca: 'tipo_evento', rotulo: 'Tipo do evento' },
  { marca: 'data_evento', rotulo: 'Data do evento' },
  { marca: 'hora_evento', rotulo: 'Horário do evento' },
  { marca: 'convidados', rotulo: 'Quantidade de convidados' },
  { marca: 'local_cerimonia', rotulo: 'Local da cerimônia' },
  { marca: 'local_recepcao', rotulo: 'Local da recepção' },
  { marca: 'endereco_cerimonia', rotulo: 'Endereço da cerimônia' },
  { marca: 'endereco_recepcao', rotulo: 'Endereço da recepção' },
  { marca: 'valor', rotulo: 'Valor da proposta' },
  { marca: 'validade', rotulo: 'Validade da proposta' },
  { marca: 'servicos_contratados', rotulo: 'Serviço ou produto da oportunidade' },
  { marca: 'forma_pagamento', rotulo: 'Forma de pagamento (parcelas)' },
  { marca: 'nome_assessoria', rotulo: 'Nome da assessoria' },
  { marca: 'telefone_assessoria', rotulo: 'Telefone da assessoria' },
  { marca: 'link_whatsapp', rotulo: 'Link do WhatsApp da assessoria' },
];

/** Componentes que o sistema monta (SPEC-061 §11.2). */
export const TAGS_COMPONENTES: TagAceite[] = [
  { marca: 'logo', rotulo: 'Logo da assessoria' },
  { marca: 'imagem:capa', rotulo: 'Uma foto (troque "capa" pelo nome que quiser)' },
  { marca: 'galeria:bastidores', rotulo: 'Grade de fotos (troque o nome)' },
  { marca: 'carrossel:dia_do_evento', rotulo: 'Carrossel de fotos (troque o nome)' },
  { marca: 'video:https://youtu.be/...', rotulo: 'Vídeo do YouTube ou Vimeo (cole o link)' },
  { marca: 'mapa:local_cerimonia', rotulo: 'Mapa da cerimônia' },
  { marca: 'mapa:local_recepcao', rotulo: 'Mapa da recepção' },
  { marca: 'depoimentos', rotulo: 'Depoimentos de clientes' },
  { marca: 'botao_whatsapp', rotulo: 'Botão do WhatsApp' },
];

/** Blocos do sistema (SPEC-061 §11.3). */
export const TAGS_BLOCOS: TagAceite[] = [
  { marca: 'bloco_proposta', rotulo: 'Texto da proposta' },
  { marca: 'bloco_valor', rotulo: 'Valor e parcelas' },
  { marca: 'botoes_resposta', rotulo: 'Botões Aceitar, Dúvidas e Não vou seguir' },
];

/** Prompt pronto para a IA da preferência da cerimonialista (SPEC-061 §11.4). */
export const PROMPT_IA = `Você vai transformar a apresentação anexada (PDF ou PowerPoint) da minha assessoria de eventos numa página web de aceite de proposta. Ela será colada no sistema Aralu, que troca algumas marcações pelos dados reais.

REGRAS OBRIGATÓRIAS
1. Responda SOMENTE com o código HTML, sem explicações.
2. Um único arquivo: comece com <style> com todo o CSS e depois o conteúdo. Não use <script>, <iframe>, <form>, <input>, <svg> nem atributos como onclick. Não use JavaScript.
3. Fontes: só Google Fonts, por @import no início do <style>.
4. Página responsiva, bonita no celular e no computador, fiel às cores, fontes e tom da apresentação.
5. Não coloque fotos com <img> nem imagens de fundo. No lugar de cada foto ou grupo de fotos, escreva uma destas marcações, sozinha no lugar da imagem:
   - {{logo}} para o logo da assessoria (normalmente no topo)
   - {{imagem:nome}} para uma foto única, por exemplo {{imagem:capa}} ou {{imagem:retrato}}
   - {{galeria:nome}} para uma grade de várias fotos, por exemplo {{galeria:bastidores}}
   - {{carrossel:nome}} para fotos que devem passar uma a uma, por exemplo {{carrossel:dia_do_evento}}
   Use nomes curtos, em minúsculas, sem acento e com _ no lugar de espaço. Use um nome diferente para cada seção de fotos da apresentação.
6. Onde a apresentação falar do cliente ou do evento, use estas marcações (o sistema troca pelos dados reais):
   {{nome_oportunidade}} {{nome_contratante}} {{tipo_evento}} {{data_evento}} {{hora_evento}} {{convidados}} {{local_cerimonia}} {{local_recepcao}} {{endereco_cerimonia}} {{endereco_recepcao}} {{valor}} {{validade}} {{servicos_contratados}} {{forma_pagamento}} {{nome_assessoria}} {{telefone_assessoria}}
7. Outros recursos que você pode usar: {{video:LINK_DO_YOUTUBE}}, {{mapa:local_cerimonia}}, {{mapa:local_recepcao}}, {{depoimentos}} (depoimentos de clientes) e {{botao_whatsapp}}.
8. Blocos do sistema, cada um sozinho numa linha: {{bloco_proposta}} (texto da proposta), {{bloco_valor}} (valor e parcelas) e {{botoes_resposta}} (botões de aceitar). Coloque {{bloco_valor}} e {{botoes_resposta}} perto do fim da página.
9. Você pode estilizar os blocos e componentes do sistema pelas classes .aralu-logo, .aralu-imagem, .aralu-galeria, .aralu-carrossel, .aralu-video, .aralu-mapa, .aralu-depoimentos, .aralu-whatsapp, .aralu-proposta, .aralu-valor, .aralu-botoes, .aralu-botao e .aralu-aceitar. A cor principal pode ser usada como var(--aralu-primaria).
10. Mantenha todos os textos da apresentação (serviços, diferenciais, como a assessoria trabalha, etapas), organizados em seções com títulos.`;

const TAG = /\{\{\s*([A-Za-z_]+)(?::([^{}<>"]{1,300}))?\s*\}\}/g;
const ESPACO = /^(logo|(imagem|galeria|carrossel):[a-z0-9_]{1,40})$/;

export interface EspacoAceite {
  espaco: string;
  tipo: 'logo' | 'imagem' | 'galeria' | 'carrossel';
  nome: string;
  rotulo: string;
  dica: string;
  varias: boolean;
}

/** Espaços de foto usados no HTML, na ordem em que aparecem (espelha PaginaAceite.EspacosUsados no servidor). */
export function espacosDoHtml(html: string | null | undefined): EspacoAceite[] {
  const vistos = new Set<string>();
  const lista: EspacoAceite[] = [];
  for (const m of (html ?? '').matchAll(TAG)) {
    const tipo = m[1].toLowerCase();
    const nome = (m[2] ?? '').trim().toLowerCase();
    const espaco = tipo === 'logo' && !m[2] ? 'logo' : ['imagem', 'galeria', 'carrossel'].includes(tipo) ? `${tipo}:${nome}` : '';
    if (!ESPACO.test(espaco) || vistos.has(espaco)) {
      continue;
    }
    vistos.add(espaco);
    const legivel = nome.replace(/_/g, ' ');
    lista.push({
      espaco,
      tipo: tipo as EspacoAceite['tipo'],
      nome,
      rotulo: tipo === 'logo' ? 'Logo' : `${tipo[0].toUpperCase()}${tipo.slice(1)} · ${legivel}`,
      dica:
        tipo === 'logo' ? 'Topo da página. Sem foto aqui, usamos a foto do seu perfil. PNG com fundo transparente fica melhor.'
        : tipo === 'imagem' ? 'Uma foto. Para capa, use foto larga (1600 × 900).'
        : tipo === 'galeria' ? 'Várias fotos em grade. Fotos quadradas ou parecidas entre si ficam melhores.'
        : 'Várias fotos, uma por vez. Use fotos deitadas (horizontais).',
      varias: tipo === 'galeria' || tipo === 'carrossel',
    });
  }
  return lista;
}

/** Componentes escritos com nome inválido (ex.: acento ou espaço): o assistente avisa. */
export function componentesInvalidos(html: string | null | undefined): string[] {
  const erros: string[] = [];
  for (const m of (html ?? '').matchAll(TAG)) {
    const tipo = m[1].toLowerCase();
    if (['imagem', 'galeria', 'carrossel'].includes(tipo) && !ESPACO.test(`${tipo}:${(m[2] ?? '').trim().toLowerCase()}`)) {
      erros.push(m[0]);
    }
  }
  return [...new Set(erros)];
}

export function usaTag(html: string | null | undefined, marca: string): boolean {
  return new RegExp(`\\{\\{\\s*${marca}\\s*\\}\\}`, 'i').test(html ?? '');
}

/** Lê um Blob como data: URL (o iframe isolado não acessa os endereços locais da página). */
function comoDataUrl(blob: Blob): Observable<string> {
  return new Observable<string>((assinante) => {
    const leitor = new FileReader();
    leitor.onload = () => {
      assinante.next(String(leitor.result));
      assinante.complete();
    };
    leitor.onerror = () => assinante.error(leitor.error);
    leitor.readAsDataURL(blob);
  });
}

/**
 * Seletor de tags com busca e ajuda (padrão SPEC-053), em grupos. Ao escolher, emite a marca e limpa a busca.
 */
@Component({
  selector: 'app-seletor-tags-aceite',
  imports: [ReactiveFormsModule, MatAutocompleteModule, MatFormFieldModule, MatInputModule, MatIconModule, MatButtonModule, MatTooltipModule],
  template: `
    <div class="seletor">
      <mat-form-field appearance="outline" class="busca" subscriptSizing="dynamic">
        <mat-icon matPrefix>sell</mat-icon>
        <input matInput [formControl]="busca" [matAutocomplete]="auto" [attr.aria-label]="rotulo()" [placeholder]="rotulo()" />
        <mat-autocomplete #auto="matAutocomplete" (optionSelected)="escolher($event.option.value)">
          @for (grupo of filtrados(); track grupo.titulo) {
            <mat-optgroup [label]="grupo.titulo">
              @for (tag of grupo.tags; track tag.marca) {
                <mat-option [value]="tag">
                  <span class="font-medium">{{ marcaDe(tag) }}</span>
                  <span class="text-muted text-xs"> · {{ tag.rotulo }}</span>
                </mat-option>
              }
            </mat-optgroup>
          } @empty {
            <mat-option disabled>Nenhuma tag encontrada</mat-option>
          }
        </mat-autocomplete>
      </mat-form-field>
      <button mat-icon-button type="button" [attr.aria-label]="'Ajuda: ' + rotulo()" [matTooltip]="'Ajuda: ' + rotulo()" (click)="ajuda.emit()">
        <mat-icon>help_outline</mat-icon>
      </button>
    </div>
  `,
  styles: `.seletor { display: flex; align-items: center; gap: 4px; } .busca { width: min(360px, 100%); }`,
})
export class SeletorTagsAceite {
  readonly grupos = input.required<GrupoTags[]>();
  readonly rotulo = input('Inserir tags no cursor');
  readonly escolhida = output<string>();
  readonly ajuda = output<void>();
  protected readonly busca = new FormControl<string | TagAceite>('', { nonNullable: true });
  private readonly termo = toSignal(this.busca.valueChanges, { initialValue: '' });
  protected readonly filtrados = computed(() => {
    const termo = this.termo();
    const t = typeof termo === 'string' ? termo.trim().toLowerCase().replace(/[{}]/g, '') : '';
    return this.grupos()
      .map((g) => ({ ...g, tags: g.tags.filter((tag) => !t || tag.marca.includes(t) || tag.rotulo.toLowerCase().includes(t)) }))
      .filter((g) => g.tags.length > 0);
  });

  protected marcaDe(tag: TagAceite): string {
    return `{{${tag.marca}}}`;
  }

  protected escolher(tag: TagAceite): void {
    this.busca.setValue('');
    this.escolhida.emit(tag.marca);
  }
}

export type AssuntoAjuda = 'tags-texto' | 'tags-html' | 'pagina';

/** Ajudas do modal do modelo de orçamento (SPEC-061). */
@Component({
  selector: 'app-ajuda-aceite-dialog',
  imports: [MatDialogModule, MatButtonModule],
  template: `
    @switch (assunto) {
      @case ('tags-texto') {
        <h2 mat-dialog-title>Tags no texto da proposta</h2>
        <mat-dialog-content class="ajuda">
          <p>Tags são marcações que o sistema troca pelos dados de cada cliente quando o orçamento é criado.</p>
          <ol>
            <li>Clique no texto onde o dado deve entrar.</li>
            <li>Em "Inserir tags no cursor", busque e escolha a tag. Ela aparece assim: <code ngNonBindable>{{nome_oportunidade}}</code>.</li>
            <li>Se a oportunidade não tiver o dado, a tag fica em branco.</li>
          </ol>
        </mat-dialog-content>
      }
      @case ('tags-html') {
        <h2 mat-dialog-title>Tags na tela de aceite</h2>
        <mat-dialog-content class="ajuda">
          <p>Clique no ponto do código onde a tag deve entrar e escolha na lista. Há três grupos:</p>
          <ul>
            <li><strong>Dados</strong>: nome, data, local, valor... No Live Preview aparecem com um exemplo em amarelo; para o cliente, com o dado real.</li>
            <li><strong>Componentes</strong>: logo, fotos, galeria, carrossel, vídeo, mapa, depoimentos e WhatsApp. O sistema monta cada um, pronto para celular. Para fotos, troque o nome depois dos dois-pontos (<code ngNonBindable>{{galeria:bastidores}}</code>) e envie as fotos no assistente abaixo do código.</li>
            <li><strong>Blocos do sistema</strong>: texto da proposta, valor e parcelas, e os botões de resposta. Coloque onde quiser na página.</li>
          </ul>
          <p>Se você esquecer <code ngNonBindable>{{botoes_resposta}}</code>, colocamos os botões no fim da página: nenhuma proposta fica sem o botão de aceitar.</p>
          <p>Para personalizar o visual dos componentes, use as classes <code>.aralu-galeria</code>, <code>.aralu-carrossel</code>, <code>.aralu-botoes</code>, <code>.aralu-aceitar</code>, <code>.aralu-valor</code> etc. no seu CSS.</p>
        </mat-dialog-content>
      }
      @default {
        <h2 mat-dialog-title>Sua tela de aceite</h2>
        <mat-dialog-content class="ajuda">
          <p>Este campo define <strong>a página inteira</strong> que o cliente vê ao abrir a proposta: fundo, fontes, cores, capa, fotos, seções e textos. É o lugar da sua apresentação, aquela que hoje vai em PDF ou PowerPoint, já com o botão de aceitar.</p>
          <p>O campo aceita HTML e CSS (dentro de <code>&lt;style&gt;</code>). Por segurança, scripts, formulários e iframes são removidos.</p>
          <p><strong>O jeito mais fácil:</strong> clique em "Gerar com IA", leve o prompt e seu PDF para a IA que você usa (ChatGPT, Gemini, Claude...) e cole aqui o código que ela devolver. Depois, envie as fotos de cada espaço no assistente abaixo do código e confira no Live Preview.</p>
          <p>Deixe em branco para usar a tela padrão.</p>
          <p class="destaque">Prefere não montar? A Aralu monta a sua página a partir da sua apresentação. Fale com o nosso suporte.</p>
        </mat-dialog-content>
      }
    }
    <mat-dialog-actions align="end"><button mat-flat-button mat-dialog-close type="button">Entendi</button></mat-dialog-actions>
  `,
  styles: `.ajuda p, .ajuda li { line-height: 1.6; } .ajuda li { margin-bottom: 6px; } .destaque { padding: 10px 12px; border-radius: 8px; background: var(--mat-sys-primary-container); color: var(--mat-sys-on-primary-container); }`,
})
export class AjudaAceiteDialog {
  protected readonly assunto = inject<AssuntoAjuda>(MAT_DIALOG_DATA);
}

/** "Gerar com IA": passo a passo e o prompt pronto para copiar (SPEC-061 §6.1). */
@Component({
  selector: 'app-gerar-com-ia-dialog',
  imports: [MatDialogModule, MatButtonModule, MatIconModule],
  template: `
    <h2 mat-dialog-title>Gerar a tela de aceite com IA</h2>
    <mat-dialog-content>
      <ol class="passos">
        <li><strong>Copie o prompt</strong> no botão abaixo.</li>
        <li><strong>Abra a IA que você usa</strong> (ChatGPT, Gemini, Claude...), cole o prompt e <strong>anexe seu PDF ou PowerPoint</strong> de apresentação.</li>
        <li><strong>Copie o código</strong> que a IA devolver e cole no campo "Tela de aceite".</li>
        <li><strong>Envie as fotos</strong> de cada espaço no assistente abaixo do código e confira no Live Preview.</li>
      </ol>
      <p class="text-sm text-muted">A IA não consegue copiar as fotos do PDF com qualidade. Por isso ela deixa marcações como <code ngNonBindable>{{galeria:bastidores}}</code>, e você envia as fotos aqui.</p>
      <pre class="prompt" aria-label="Prompt">{{ prompt }}</pre>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-stroked-button mat-dialog-close type="button">Fechar</button>
      <button mat-flat-button type="button" (click)="copiar()"><mat-icon>content_copy</mat-icon> {{ copiado() ? 'Copiado' : 'Copiar prompt' }}</button>
    </mat-dialog-actions>
  `,
  styles: `.passos li { margin-bottom: 6px; line-height: 1.6; } .prompt { white-space: pre-wrap; font-size: 12px; max-height: 260px; overflow: auto; padding: 12px; border-radius: 8px; background: var(--mat-sys-surface-container); border: 1px solid var(--mat-sys-outline-variant); }`,
})
export class GerarComIaDialog {
  private readonly toast = inject(ToastService);
  protected readonly prompt = PROMPT_IA;
  protected readonly copiado = signal(false);

  protected async copiar(): Promise<void> {
    if (await copiarTexto(PROMPT_IA)) {
      this.copiado.set(true);
      this.toast.sucesso('Prompt copiado.');
    } else {
      this.toast.erro('Não deu para copiar. Selecione o texto e copie.');
    }
  }
}

/** Live Preview da página de aceite em modal próprio (SPEC-061): iframe isolado, sem scripts. */
@Component({
  selector: 'app-previa-aceite-dialog',
  imports: [MatDialogModule, MatButtonModule, MatIconModule],
  template: `
    <div class="topo">
      <h2 mat-dialog-title class="m-0!">Live Preview · tela de aceite</h2>
      <div class="larguras" role="group" aria-label="Largura da tela">
        <button mat-button type="button" [class.ativo]="!celular()" [attr.aria-pressed]="!celular()" (click)="celular.set(false)"><mat-icon>computer</mat-icon> Computador</button>
        <button mat-button type="button" [class.ativo]="celular()" [attr.aria-pressed]="celular()" (click)="celular.set(true)"><mat-icon>smartphone</mat-icon> Celular</button>
      </div>
    </div>
    <mat-dialog-content class="conteudo">
      <p class="text-xs text-muted mt-0">Como o cliente vê. Em amarelo, exemplos no lugar das tags; quadros tracejados são espaços sem foto (não aparecem para o cliente).</p>
      @if (erro()) {
        <p class="text-sm text-error" role="alert">{{ erro() }}</p>
      } @else if (carregando()) {
        <p class="text-sm text-muted">Montando a página…</p>
      }
      <div class="moldura" [class.celular]="celular()">
        <iframe #quadro title="Live Preview da tela de aceite" sandbox="allow-popups allow-popups-to-escape-sandbox"></iframe>
      </div>
    </mat-dialog-content>
    <mat-dialog-actions align="end"><button mat-flat-button mat-dialog-close type="button">Voltar ao editor</button></mat-dialog-actions>
  `,
  styles: `
    .topo { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding-right: 16px; flex-wrap: wrap; }
    .larguras .ativo { background: var(--mat-sys-secondary-container); }
    .conteudo { max-height: none !important; }
    .moldura { margin: 0 auto; width: 100%; height: 70vh; border: 1px solid var(--mat-sys-outline-variant); border-radius: 12px; overflow: hidden; transition: width .2s; }
    .moldura.celular { width: 390px; max-width: 100%; }
    iframe { width: 100%; height: 100%; border: 0; display: block; background: #fff; }
  `,
})
export class PreviaAceiteDialog {
  private readonly negocio = inject(NegocioClient);
  private readonly pedido = inject<PreviaPaginaAceite>(MAT_DIALOG_DATA);
  private readonly quadro = viewChild.required<ElementRef<HTMLIFrameElement>>('quadro');
  protected readonly carregando = signal(true);
  protected readonly erro = signal('');
  protected readonly celular = signal(false);
  private readonly html = signal('');

  constructor() {
    this.negocio
      .previaPaginaAceite(this.pedido)
      .pipe(switchMap(({ html }) => this.trocarFotos(html)))
      .subscribe({
        next: (html) => {
          this.html.set(html);
          this.carregando.set(false);
        },
        error: (e: unknown) => {
          this.erro.set(mensagemDeErro(e));
          this.carregando.set(false);
        },
      });
    // O documento vem montado e sanitizado do servidor e roda num iframe sem scripts (sandbox).
    effect(() => {
      this.quadro().nativeElement.srcdoc = this.html();
    });
  }

  private trocarFotos(html: string): Observable<string> {
    const ids = [...new Set([...html.matchAll(/aralu-midia:([0-9a-f-]{36})/g)].map((m) => m[1]))];
    if (ids.length === 0) {
      return of(html);
    }
    return forkJoin(ids.map((id) => this.negocio.baixarArquivo(id).pipe(switchMap(comoDataUrl), map((url) => [id, url] as const)))).pipe(
      map((pares) => pares.reduce((doc, [id, url]) => doc.split(`aralu-midia:${id}`).join(url), html)),
    );
  }
}

/**
 * Assistente de mídia (SPEC-061 §6.1.4): lê os espaços de foto do HTML e mostra o que falta, com envio, ordem e
 * remoção. As fotos ficam no modelo.
 */
@Component({
  selector: 'app-assistente-midia-aceite',
  imports: [MatButtonModule, MatIconModule, MatTooltipModule, MatFormFieldModule, MatInputModule],
  providers: [PreviasArquivo],
  template: `
    <div class="assistente" aria-label="Assistente de mídia">
      <div class="cabeca">
        <span class="font-semibold">Assistente de mídia</span>
        <span class="text-xs text-muted">
          @if (espacos().length === 0) {
            <span ngNonBindable>Nenhum espaço de foto no HTML. Use {{logo}}, {{imagem:nome}}, {{galeria:nome}} ou {{carrossel:nome}}.</span>
          } @else {
            {{ espacos().length }} {{ espacos().length === 1 ? 'espaço' : 'espaços' }} de foto · {{ preenchidos() }} com foto
          }
        </span>
      </div>
      @for (e of espacos(); track e.espaco) {
        <div class="item">
          <mat-icon [class.ok]="fotosDe(e.espaco).length > 0 || e.tipo === 'logo'" [class.falta]="fotosDe(e.espaco).length === 0 && e.tipo !== 'logo'" aria-hidden="true">
            {{ fotosDe(e.espaco).length > 0 || e.tipo === 'logo' ? 'check_circle' : 'error_outline' }}
          </mat-icon>
          <div class="info">
            <span class="font-medium">{{ e.rotulo }}</span>
            <span class="text-xs text-muted">{{ e.dica }}</span>
            @if (fotosDe(e.espaco).length > 0) {
              <div class="fotos">
                @for (f of fotosDe(e.espaco); track f.arquivoId; let i = $index; let ultimo = $last) {
                  <div class="foto">
                    @if (previas.previas()[f.arquivoId]; as previa) {
                      <img [src]="previa.url" alt="" />
                    } @else {
                      <span class="carregando"></span>
                    }
                    <div class="acoes-foto">
                      @if (e.varias && i > 0) {
                        <button type="button" aria-label="Mover para antes" matTooltip="Mover para antes" (click)="mover(e.espaco, i, -1)"><mat-icon>chevron_left</mat-icon></button>
                      }
                      <button type="button" aria-label="Remover foto" matTooltip="Remover" (click)="remover(f)"><mat-icon>close</mat-icon></button>
                      @if (e.varias && !ultimo) {
                        <button type="button" aria-label="Mover para depois" matTooltip="Mover para depois" (click)="mover(e.espaco, i, 1)"><mat-icon>chevron_right</mat-icon></button>
                      }
                    </div>
                  </div>
                }
              </div>
            }
          </div>
          <button mat-stroked-button type="button" [disabled]="enviando() === e.espaco" (click)="entrada.click()">
            <mat-icon>upload</mat-icon>
            {{ enviando() === e.espaco ? 'Enviando…' : e.varias ? 'Enviar fotos' : fotosDe(e.espaco).length ? 'Trocar' : 'Enviar' }}
          </button>
          <input #entrada type="file" hidden accept="image/jpeg,image/png" [multiple]="e.varias" [attr.aria-label]="'Enviar fotos: ' + e.rotulo" (change)="enviar(e, $event)" />
        </div>
      }
      @for (aviso of avisos(); track aviso) {
        <p class="aviso"><mat-icon aria-hidden="true">info</mat-icon> {{ aviso }}</p>
      }
      @if (usaDepoimentos()) {
        <div class="depoimentos">
          <span class="font-semibold">Depoimentos</span>
          @for (d of depoimentos(); track $index; let i = $index) {
            <div class="depoimento">
              <mat-form-field appearance="outline" class="texto" subscriptSizing="dynamic">
                <textarea matInput rows="2" maxlength="600" aria-label="Depoimento" placeholder="Foi o dia mais leve da nossa vida." [value]="d.texto" (input)="editarDepoimento(i, 'texto', $any($event.target).value)"></textarea>
              </mat-form-field>
              <mat-form-field appearance="outline" class="autor" subscriptSizing="dynamic">
                <input matInput maxlength="120" aria-label="Quem disse" placeholder="Júlia e Rafael" [value]="d.autor ?? ''" (input)="editarDepoimento(i, 'autor', $any($event.target).value)" />
              </mat-form-field>
              <button mat-icon-button type="button" aria-label="Remover depoimento" (click)="removerDepoimento(i)"><mat-icon>delete</mat-icon></button>
            </div>
          }
          <button mat-button type="button" (click)="adicionarDepoimento()"><mat-icon>add</mat-icon> Adicionar depoimento</button>
        </div>
      }
    </div>
  `,
  styles: `
    .assistente { border: 1px solid var(--mat-sys-outline-variant); border-radius: 12px; padding: 12px 14px; display: grid; gap: 8px; }
    .cabeca { display: flex; flex-wrap: wrap; align-items: baseline; gap: 8px; }
    .item { display: grid; grid-template-columns: 24px 1fr auto; gap: 10px; align-items: start; padding: 10px; border-radius: 8px; background: color-mix(in srgb, var(--mat-sys-on-surface) 5%, transparent); }
    .info { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
    .ok { color: var(--mat-sys-primary); } .falta { color: #ba7517; }
    .fotos { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 6px; }
    .foto { position: relative; width: 72px; height: 54px; border-radius: 6px; overflow: hidden; background: var(--mat-sys-surface-container-high); }
    .foto img { width: 100%; height: 100%; object-fit: cover; display: block; }
    .acoes-foto { position: absolute; inset: auto 0 0 0; display: flex; justify-content: space-between; background: rgb(0 0 0 / .45); opacity: 0; transition: opacity .15s; }
    .foto:hover .acoes-foto, .foto:focus-within .acoes-foto { opacity: 1; }
    .acoes-foto button { border: 0; background: none; color: #fff; padding: 0; cursor: pointer; display: flex; }
    .acoes-foto mat-icon { font-size: 18px; width: 18px; height: 18px; }
    .aviso { display: flex; gap: 6px; align-items: center; margin: 0; font-size: 13px; color: var(--mat-sys-on-surface-variant); }
    .aviso mat-icon { font-size: 18px; width: 18px; height: 18px; }
    .depoimentos { display: grid; gap: 6px; margin-top: 4px; }
    .depoimento { display: grid; grid-template-columns: 1fr 200px auto; gap: 8px; align-items: center; }
  `,
})
export class AssistenteMidiaAceite {
  private readonly negocio = inject(NegocioClient);
  private readonly toast = inject(ToastService);
  protected readonly previas = inject(PreviasArquivo);
  readonly html = input<string>('');
  readonly midias = input.required<MidiaAceite[]>();
  readonly depoimentos = input.required<DepoimentoAceite[]>();
  readonly midiasMudaram = output<MidiaAceite[]>();
  readonly depoimentosMudaram = output<DepoimentoAceite[]>();
  protected readonly enviando = signal<string | null>(null);
  protected readonly espacos = computed(() => espacosDoHtml(this.html()));
  protected readonly preenchidos = computed(() => this.espacos().filter((e) => this.fotosDe(e.espaco).length > 0).length);
  protected readonly usaDepoimentos = computed(() => usaTag(this.html(), 'depoimentos'));
  protected readonly avisos = computed(() => {
    const html = this.html();
    if (!html.trim()) {
      return [];
    }
    const avisos = componentesInvalidos(html).map((t) => `${t}: use só letras minúsculas sem acento, números e _ no nome.`);
    if (!usaTag(html, 'botoes_resposta')) {
      avisos.push('Sem {{botoes_resposta}} no HTML: os botões de aceitar entram no fim da página.');
    }
    if (usaTag(html, 'depoimentos') && this.depoimentos().length === 0) {
      avisos.push('O HTML usa {{depoimentos}}, mas nenhum depoimento foi cadastrado.');
    }
    return avisos;
  });

  constructor() {
    effect(() => this.midias().forEach((m) => this.previas.carregar(m.arquivoId)));
  }

  protected fotosDe(espaco: string): MidiaAceite[] {
    return this.midias().filter((m) => m.espaco === espaco).sort((a, b) => a.ordem - b.ordem);
  }

  protected async enviar(e: EspacoAceite, evento: Event): Promise<void> {
    const campo = evento.target as HTMLInputElement;
    const arquivos = Array.from(campo.files ?? []);
    campo.value = '';
    if (arquivos.length === 0) {
      return;
    }
    this.enviando.set(e.espaco);
    const reduzidos = await Promise.all((e.varias ? arquivos : arquivos.slice(0, 1)).map((a) => reduzirImagem(a)));
    forkJoin(reduzidos.map((a) => this.negocio.enviarMidiaAceite(a).pipe(map((r) => ({ r, a }))))).subscribe({
      next: (enviados) => {
        enviados.forEach(({ r, a }) => this.previas.guardar(r.arquivoId, a));
        const base = e.varias ? this.fotosDe(e.espaco) : [];
        const novas = enviados.map(({ r }, i) => ({ espaco: e.espaco, arquivoId: r.arquivoId, ordem: base.length + i }));
        this.midiasMudaram.emit([...this.midias().filter((m) => m.espaco !== e.espaco), ...base, ...novas]);
        this.enviando.set(null);
      },
      error: (erro: unknown) => {
        this.toast.erro(mensagemDeErro(erro));
        this.enviando.set(null);
      },
    });
  }

  protected remover(foto: MidiaAceite): void {
    const restantes = this.fotosDe(foto.espaco).filter((m) => m.arquivoId !== foto.arquivoId).map((m, i) => ({ ...m, ordem: i }));
    this.midiasMudaram.emit([...this.midias().filter((m) => m.espaco !== foto.espaco), ...restantes]);
  }

  protected mover(espaco: string, indice: number, passo: number): void {
    const lista = [...this.fotosDe(espaco)];
    const [foto] = lista.splice(indice, 1);
    lista.splice(indice + passo, 0, foto);
    this.midiasMudaram.emit([...this.midias().filter((m) => m.espaco !== espaco), ...lista.map((m, i) => ({ ...m, ordem: i }))]);
  }

  protected adicionarDepoimento(): void {
    this.depoimentosMudaram.emit([...this.depoimentos(), { texto: '', autor: null }]);
  }

  protected editarDepoimento(indice: number, campo: 'texto' | 'autor', valor: string): void {
    this.depoimentosMudaram.emit(this.depoimentos().map((d, i) => (i === indice ? { ...d, [campo]: campo === 'autor' ? valor || null : valor } : d)));
  }

  protected removerDepoimento(indice: number): void {
    this.depoimentosMudaram.emit(this.depoimentos().filter((_, i) => i !== indice));
  }
}

/** Abre as ajudas e diálogos da tela de aceite. */
export function abrirAjudaAceite(dialog: MatDialog, assunto: AssuntoAjuda): void {
  dialog.open(AjudaAceiteDialog, { ...DIALOG, data: assunto });
}

export function abrirGerarComIa(dialog: MatDialog): void {
  dialog.open(GerarComIaDialog, DIALOG_LARGO);
}

export function abrirPreviaAceite(dialog: MatDialog, pedido: PreviaPaginaAceite): void {
  dialog.open(PreviaAceiteDialog, { ...DIALOG_LARGO, width: 'min(1200px, calc(100vw - 32px))', maxHeight: '96vh', data: pedido });
}

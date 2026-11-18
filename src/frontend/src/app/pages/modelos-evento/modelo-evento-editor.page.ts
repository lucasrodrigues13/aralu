import { Component, inject, OnInit, signal } from '@angular/core';
import { FormArray, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTabsModule } from '@angular/material/tabs';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { ContratoClient, ContratoResumo } from '../../core/contrato.client';
import { mensagemDeErro } from '../../core/mensagem-erro';
import {
  Briefing,
  Inspiracao,
  MensagemModelo,
  NegocioClient,
  Roteiro,
  TIPOS,
  TIPOS_ITEM_CHECKLIST,
} from '../../core/negocio.client';
import { ToastService } from '../../core/toast.service';
import { CampoDinheiroComponent } from '../../shared/campo-dinheiro';
import { ConfirmaDialog } from '../../shared/confirma-dialog';
import { DIALOG_LARGO, DIALOG_PEQUENO } from '../../shared/dialog';
import { exibirPrazo, prazoDeDias, prazoParaDias, UNIDADES_PRAZO, UnidadePrazo } from '../../shared/prazo-modelo';
import { ImportarTarefasModeloDialog } from './importar-tarefas-modelo.dialog';

@Component({
  selector: 'app-modelo-evento-editor',
  imports: [
    ReactiveFormsModule, RouterLink, MatButtonModule, MatFormFieldModule, MatInputModule,
    MatSelectModule, MatTabsModule, MatIconModule, MatCheckboxModule, CampoDinheiroComponent,
  ],
  template: `
    <a mat-button routerLink="/modelos-evento">Voltar</a>
    <header class="gd-cabecalho">
      <div>
        <h1>Editar modelo</h1>
        <p>Configure checklist, tarefas e vínculos.</p>
      </div>
      <div class="acoes">
        <button mat-stroked-button type="button" (click)="colarTarefas()"><mat-icon>content_paste</mat-icon> Colar tarefas</button>
        <button mat-stroked-button type="button" (click)="clonar()"><mat-icon>content_copy</mat-icon> Clonar</button>
        <button mat-stroked-button type="button" (click)="excluir()"><mat-icon>delete</mat-icon> Excluir</button>
        <button mat-flat-button type="button" (click)="salvar()">Salvar</button>
      </div>
    </header>
    <form class="gd-campos gd-painel-form" [formGroup]="form">
      <mat-form-field appearance="outline"><mat-label>Nome</mat-label><input matInput formControlName="nome" /></mat-form-field>
      <mat-form-field appearance="outline">
        <mat-label>Tipo</mat-label>
        <mat-select formControlName="tipo">
          @for (tipo of tipos; track tipo.valor) {
            <mat-option [value]="tipo.valor">{{ tipo.rotulo }}</mat-option>
          }
        </mat-select>
      </mat-form-field>
      <mat-tab-group>
        <mat-tab label="Checklist">
          <div formArrayName="servicos" class="aba">
            @for (servico of servicos.controls; track $index; let i = $index) {
              <div class="bloco" [formGroupName]="i">
                <div class="linha linha-servico">
                  <mat-form-field appearance="outline"><mat-label>Serviço</mat-label><input matInput formControlName="nome" /></mat-form-field>
                  <app-campo-dinheiro rotulo="Valor estimado" formControlName="valorEstimado" />
                </div>
                <div formArrayName="itens" class="itens">
                  @for (item of itensDe(i).controls; track $index; let j = $index) {
                    <div class="linha" [formGroupName]="j">
                      <mat-form-field class="curto" appearance="outline">
                        <mat-label>Tipo</mat-label>
                        <mat-select formControlName="tipo">
                          @for (t of tiposItem; track t.valor) {
                            <mat-option [value]="t.valor">{{ t.rotulo }}</mat-option>
                          }
                        </mat-select>
                      </mat-form-field>
                      <mat-form-field appearance="outline" class="grow"><mat-label>Texto</mat-label><input matInput formControlName="texto" /></mat-form-field>
                      <button mat-icon-button type="button" aria-label="Remover item" (click)="removerItem(i, j)"><mat-icon>close</mat-icon></button>
                    </div>
                  }
                </div>
                <div class="acoes-lista">
                  <button mat-icon-button type="button" aria-label="Adicionar item" (click)="adicionarItem(i)"><mat-icon>add</mat-icon></button>
                  <button mat-icon-button type="button" aria-label="Remover serviço" (click)="removerServico(i)"><mat-icon>delete</mat-icon></button>
                </div>
              </div>
            }
            <button mat-stroked-button type="button" class="acao-esquerda" (click)="adicionarServico()">Adicionar serviço</button>
          </div>
        </mat-tab>
        <mat-tab label="Tarefas">
          <div formArrayName="tarefas" class="aba">
            @for (tarefa of tarefas.controls; track $index; let i = $index) {
              <div class="bloco" [formGroupName]="i">
                <div class="linha linha-tarefa">
                  <mat-form-field appearance="outline" class="grow"><mat-label>Título</mat-label><input matInput formControlName="titulo" /></mat-form-field>
                  <mat-form-field appearance="outline" class="grupo"><mat-label>Grupo</mat-label><input matInput formControlName="grupo" maxlength="80" /></mat-form-field>
                  <div class="prazo">
                    @if (mostraQuantidade(i)) {
                      <mat-form-field class="qtd" appearance="outline">
                        <mat-label>Prazo</mat-label>
                        <input matInput type="number" min="0" max="999" formControlName="quantidade" />
                      </mat-form-field>
                    }
                    <mat-form-field class="unidade" appearance="outline">
                      <mat-label>{{ mostraQuantidade(i) ? 'Unidade' : 'Prazo' }}</mat-label>
                      <mat-select formControlName="unidade">
                        @for (u of unidadesPrazo; track u.valor) {
                          <mat-option [value]="u.valor">{{ u.rotulo }}</mat-option>
                        }
                      </mat-select>
                    </mat-form-field>
                  </div>
                  <button mat-icon-button type="button" (click)="removerTarefa(i)"><mat-icon>delete</mat-icon></button>
                </div>
                <p class="prazo-legivel">{{ textoPrazo(i) }}</p>
              </div>
            }
            <button mat-stroked-button type="button" class="acao-esquerda" (click)="adicionarTarefa()">Adicionar tarefa</button>
          </div>
        </mat-tab>
        <mat-tab label="Briefings">
          <div class="aba">
            <div class="bloco bloco-curto">
            <mat-form-field class="campo" appearance="outline">
              <mat-label>Modelo de briefing</mat-label>
              <mat-select [value]="vinculo('Briefing')" (valueChange)="definirVinculo('Briefing', $event)">
                <mat-option value="">Nenhum</mat-option>
                @for (item of briefings(); track item.id) {
                  <mat-option [value]="item.id">{{ item.nome }}</mat-option>
                }
              </mat-select>
            </mat-form-field>
            </div>
          </div>
        </mat-tab>
        <mat-tab label="Roteiros">
          <div class="aba">
            <div class="bloco bloco-curto">
            <mat-form-field class="campo" appearance="outline">
              <mat-label>Modelo de roteiro</mat-label>
              <mat-select [value]="vinculo('Roteiro')" (valueChange)="definirVinculo('Roteiro', $event)">
                <mat-option value="">Nenhum</mat-option>
                @for (item of roteiros(); track item.id) {
                  <mat-option [value]="item.id">{{ item.nome }}</mat-option>
                }
              </mat-select>
            </mat-form-field>
            </div>
          </div>
        </mat-tab>
        <mat-tab label="Inspirações">
          <div class="aba">
            <div class="bloco bloco-curto">
            <mat-form-field class="campo" appearance="outline">
              <mat-label>Modelo de inspirações</mat-label>
              <mat-select [value]="vinculo('Inspiracao')" (valueChange)="definirVinculo('Inspiracao', $event)">
                <mat-option value="">Nenhum</mat-option>
                @for (item of inspiracoes(); track item.id) {
                  <mat-option [value]="item.id">{{ item.nome }}</mat-option>
                }
              </mat-select>
            </mat-form-field>
            </div>
          </div>
        </mat-tab>
        <mat-tab label="Contratos">
          <div class="aba">
            <p class="gd-sub">Os contratos marcados entram nos eventos criados a partir deste modelo.</p>
            @if (contratos().length === 0) {
              <p class="gd-vazio">Nenhum contrato cadastrado. Cadastre em <a routerLink="/contratos">Contratos</a>.</p>
            } @else {
              <div class="lista-contratos">
                @for (contrato of contratos(); track contrato.id) {
                  <mat-checkbox [checked]="contratosDoModelo().has(contrato.id)" (change)="marcarContrato(contrato.id, $event.checked)">
                    {{ contrato.nome }}
                  </mat-checkbox>
                }
              </div>
            }
          </div>
        </mat-tab>
        <mat-tab label="RSVP e Mensagens">
          <div class="aba">
            <div class="bloco bloco-curto">
            <mat-form-field class="campo" appearance="outline">
              <mat-label>Modelo de mensagem</mat-label>
              <mat-select [value]="vinculo('Mensagem')" (valueChange)="definirVinculo('Mensagem', $event)">
                <mat-option value="">Nenhum</mat-option>
                @for (item of mensagens(); track item.id) {
                  <mat-option [value]="item.id">{{ item.nome }}</mat-option>
                }
              </mat-select>
            </mat-form-field>
            </div>
          </div>
        </mat-tab>
      </mat-tab-group>
    </form>
  `,
  styles: `
    :host { display: block; max-width: 100%; min-width: 0; }
    :host .gd-painel-form {
      width: min(1040px, 100%);
      margin-inline: auto;
      box-sizing: border-box;
      background: var(--gd-card);
      border: 1px solid var(--gd-border);
      border-radius: 14px;
      padding: 24px;
    }
    :host .formulario,
    :host mat-tab-group { min-width: 0; max-width: 100%; }
    .acoes { display: flex; gap: 8px; flex-wrap: wrap; }
    .lista-contratos { display: flex; flex-direction: column; gap: 4px; margin-left: -8px; }
    .aba { padding: 16px 0; display: flex; flex-direction: column; gap: 12px; min-width: 0; max-width: 100%; }
    .bloco {
      box-sizing: border-box;
      width: min(840px, 100%);
      margin-inline: auto;
      border: 1px solid var(--gd-border);
      border-radius: 8px;
      padding: 12px;
      margin-bottom: 8px;
    }
    .bloco-curto {
      width: fit-content;
      max-width: 100%;
      align-self: center;
    }
    .itens .linha + .linha {
      border-top: 1px solid var(--gd-border);
      margin-top: 8px;
      padding-top: 16px;
    }
    .linha {
      display: flex;
      gap: 12px;
      align-items: flex-start;
    }
    :host .linha mat-form-field {
      width: auto;
      flex: 1 1 0;
      min-width: 0;
    }
    :host .linha .curto {
      flex: 0 0 220px;
      width: 220px;
    }
    .linha button {
      flex: 0 0 auto;
      margin-top: 6px;
    }
    .linha-tarefa {
      display: grid;
      grid-template-columns: minmax(0, 1.2fr) minmax(120px, 180px) minmax(220px, 300px) auto;
      width: 100%;
      max-width: 100%;
      min-width: 0;
    }
    :host .linha-tarefa .grupo { width: 100%; }
    :host .linha-tarefa > * { min-width: 0; }
    :host .linha-tarefa mat-form-field {
      width: 100%;
      min-width: 0;
      max-width: 100%;
    }
    .prazo {
      display: flex;
      gap: 8px;
      align-items: flex-start;
      min-width: 0;
    }
    :host .prazo .qtd { flex: 0 0 96px; width: 96px; }
    :host .prazo .unidade { flex: 1 1 0; min-width: 0; }
    .prazo-legivel {
      margin: 0 0 0 0;
      padding-left: 2px;
      font-size: 0.85rem;
      color: var(--gd-muted, #6b7280);
    }
    .linha-servico {
      display: grid;
      grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
      gap: 12px;
      align-items: start;
    }
    :host .linha-servico mat-form-field,
    .linha-servico app-campo-dinheiro {
      width: 100%;
      min-width: 0;
    }
    :host .aba .campo {
      width: 320px;
      max-width: 100%;
      align-self: flex-start;
    }
    .acoes-lista { display: flex; align-items: center; }
    .acao-esquerda { align-self: flex-start; }
    .grow { flex: 1; min-width: 0; }
    @media (max-width: 720px) {
      .linha { flex-wrap: wrap; }
      :host .linha mat-form-field,
      :host .linha .curto { flex: 1 1 100%; width: 100%; }
      .linha-servico,
      .linha-tarefa { grid-template-columns: 1fr; width: 100%; }
      :host .aba .campo { width: 100%; }
    }
  `,
})
export class ModeloEventoEditorPage implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly negocio = inject(NegocioClient);
  private readonly rota = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly dialog = inject(MatDialog);
  private readonly toast = inject(ToastService);
  protected readonly tipos = TIPOS;
  protected readonly tiposItem = TIPOS_ITEM_CHECKLIST;
  protected readonly unidadesPrazo = UNIDADES_PRAZO;
  protected readonly briefings = signal<Briefing[]>([]);
  protected readonly roteiros = signal<Roteiro[]>([]);
  protected readonly inspiracoes = signal<Inspiracao[]>([]);
  protected readonly mensagens = signal<MensagemModelo[]>([]);
  private readonly vinculosMap = signal<Record<string, string>>({});
  private readonly contratoClient = inject(ContratoClient);
  protected readonly contratos = signal<ContratoResumo[]>([]);
  protected readonly contratosDoModelo = signal<ReadonlySet<string>>(new Set());
  private id = '';

  protected readonly form = this.fb.group({
    nome: ['', Validators.required],
    tipo: ['Casamento', Validators.required],
    permissoes: this.fb.nonNullable.group({
      gerais: true,
      planejamento: true,
      tarefas: true,
      servicosFornecedores: true,
      convites: true,
    }),
    servicos: this.fb.array([]),
    tarefas: this.fb.array([]),
  });

  protected get servicos(): FormArray {
    return this.form.get('servicos') as FormArray;
  }

  protected get tarefas(): FormArray {
    return this.form.get('tarefas') as FormArray;
  }

  protected itensDe(indice: number): FormArray {
    return this.servicos.at(indice).get('itens') as FormArray;
  }

  ngOnInit(): void {
    this.id = this.rota.snapshot.paramMap.get('id') ?? '';
    this.negocio.briefings().subscribe({ next: (lista) => this.briefings.set(lista) });
    this.negocio.roteiros().subscribe({ next: (lista) => this.roteiros.set(lista) });
    this.negocio.inspiracoes().subscribe({ next: (lista) => this.inspiracoes.set(lista) });
    this.negocio.mensagens().subscribe({ next: (lista) => this.mensagens.set(lista) });
    this.contratoClient.listar().subscribe({ next: (lista) => this.contratos.set(lista) });
    this.contratoClient.doModelo(this.id).subscribe({ next: (ids) => this.contratosDoModelo.set(new Set(ids)) });
    this.negocio.modelo(this.id).subscribe({
      next: (modelo) => {
        this.form.patchValue({
          nome: modelo.nome,
          tipo: modelo.tipo,
          permissoes: modelo.permissoes,
        });
        this.servicos.clear();
        for (const servico of modelo.servicos) {
          const grupo = this.novoServico(servico.nome, servico.valorEstimado);
          const itens = grupo.get('itens') as FormArray;
          for (const item of servico.itens) {
            itens.push(this.fb.nonNullable.group({ tipo: item.tipo, texto: item.texto }));
          }
          this.servicos.push(grupo);
        }
        this.tarefas.clear();
        for (const tarefa of modelo.tarefas) {
          this.tarefas.push(this.novaTarefa(tarefa.titulo, tarefa.grupo, tarefa.diasAntes));
        }
        const mapa: Record<string, string> = {};
        for (const vinculo of modelo.vinculos) {
          mapa[vinculo.tipo] = vinculo.bibliotecaId;
        }
        this.vinculosMap.set(mapa);
      },
      error: (erro: unknown) => this.toast.erro(mensagemDeErro(erro)),
    });
  }

  protected vinculo(tipo: string): string {
    return this.vinculosMap()[tipo] ?? '';
  }

  protected definirVinculo(tipo: string, id: string): void {
    this.vinculosMap.update((mapa) => {
      const novo = { ...mapa };
      if (id) {
        novo[tipo] = id;
      } else {
        delete novo[tipo];
      }
      return novo;
    });
  }

  protected adicionarServico(): void {
    this.servicos.push(this.novoServico('', null));
  }

  protected removerServico(indice: number): void {
    this.servicos.removeAt(indice);
  }

  protected adicionarItem(indice: number): void {
    this.itensDe(indice).push(this.fb.nonNullable.group({ tipo: 'Tarefa', texto: '' }));
  }

  protected removerItem(servico: number, item: number): void {
    this.itensDe(servico).removeAt(item);
  }

  protected adicionarTarefa(): void {
    this.tarefas.push(this.novaTarefa('', null, null));
  }

  protected colarTarefas(): void {
    this.dialog.open(ImportarTarefasModeloDialog, {
      ...DIALOG_LARGO,
      data: { modeloId: this.id, tipoPadrao: this.form.controls.tipo.value },
    }).afterClosed().subscribe((ok) => {
      if (ok) {
        this.ngOnInit();
      }
    });
  }

  protected removerTarefa(indice: number): void {
    this.tarefas.removeAt(indice);
  }

  protected mostraQuantidade(indice: number): boolean {
    const unidade = this.tarefas.at(indice).get('unidade')?.value as UnidadePrazo;
    return unidade === 'dias' || unidade === 'semanas' || unidade === 'meses';
  }

  protected textoPrazo(indice: number): string {
    const raw = this.tarefas.at(indice).getRawValue() as {
      quantidade: number | string | null;
      unidade: UnidadePrazo;
    };
    const qtd = raw.quantidade === '' || raw.quantidade == null ? null : Number(raw.quantidade);
    return exibirPrazo(prazoParaDias(qtd, raw.unidade));
  }

  protected marcarContrato(id: string, marcado: boolean): void {
    this.contratosDoModelo.update((atual) => {
      const proximo = new Set(atual);
      if (marcado) proximo.add(id); else proximo.delete(id);
      return proximo;
    });
  }

  protected salvar(): void {
    const valor = this.form.getRawValue() as {
      nome: string | null;
      tipo: string | null;
      permissoes: Record<string, boolean>;
      servicos: { nome: string; valorEstimado: number | string | null; itens: { tipo: string; texto: string }[] }[];
      tarefas: { titulo: string; grupo: string | null; quantidade: number | string | null; unidade: UnidadePrazo }[];
    };
    const vinculos = Object.entries(this.vinculosMap()).map(([tipo, bibliotecaId]) => ({ tipo, bibliotecaId }));
    this.negocio.atualizarModelo(this.id, {
      nome: valor.nome,
      tipo: valor.tipo,
      permissoes: valor.permissoes,
      servicos: (valor.servicos ?? []).map((servico) => ({
        nome: servico.nome,
        valorEstimado: typeof servico.valorEstimado === 'number' ? servico.valorEstimado : null,
        itens: (servico.itens ?? []).filter((item) => item.texto?.trim()),
      })),
      tarefas: (valor.tarefas ?? []).map((tarefa) => {
        const qtd = tarefa.quantidade === '' || tarefa.quantidade == null ? null : Number(tarefa.quantidade);
        return {
          titulo: tarefa.titulo,
          grupo: tarefa.grupo?.trim() || null,
          diasAntes: prazoParaDias(qtd, tarefa.unidade),
        };
      }),
      vinculos,
    }).subscribe({
      next: () => {
        this.contratoClient.vincularAoModelo(this.id, [...this.contratosDoModelo()]).subscribe({
          next: () => this.toast.sucesso('Modelo salvo.'),
          error: (erro: unknown) => this.toast.erro(mensagemDeErro(erro)),
        });
      },
      error: (erro: unknown) => this.toast.erro(mensagemDeErro(erro)),
    });
  }

  protected clonar(): void {
    this.negocio.clonarModelo(this.id).subscribe({
      next: (copia) => {
        this.toast.sucesso('Modelo clonado.');
        void this.router.navigate(['/modelos-evento', copia.id]);
      },
      error: (erro: unknown) => this.toast.erro(mensagemDeErro(erro)),
    });
  }

  protected excluir(): void {
    this.dialog.open(ConfirmaDialog, {
      ...DIALOG_PEQUENO,
      data: { titulo: 'Excluir modelo', texto: 'Confirma a exclusão deste modelo?', confirmar: 'Excluir' },
    }).afterClosed().subscribe((confirmou) => {
      if (!confirmou) {
        return;
      }
      this.negocio.excluirModelo(this.id).subscribe({
        next: () => {
          this.toast.sucesso('Modelo excluído.');
          void this.router.navigate(['/modelos-evento']);
        },
        error: (erro: unknown) => this.toast.erro(mensagemDeErro(erro)),
      });
    });
  }

  private novoServico(nome: string, valorEstimado: number | null) {
    return this.fb.group({
      nome: [nome, Validators.required],
      valorEstimado: [valorEstimado as number | null],
      itens: this.fb.array([]),
    });
  }

  private novaTarefa(titulo: string, grupo: string | null, diasAntes: number | null) {
    const decomposto = prazoDeDias(diasAntes);
    return this.fb.group({
      titulo: [titulo, Validators.required],
      grupo: [grupo],
      quantidade: [decomposto.quantidade as number | null],
      unidade: [decomposto.unidade as UnidadePrazo],
    });
  }
}

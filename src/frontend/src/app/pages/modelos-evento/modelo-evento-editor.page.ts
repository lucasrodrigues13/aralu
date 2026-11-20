import { Component, inject, OnInit, signal } from '@angular/core';
import { FormArray, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
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
  imports: [MatCardModule, ReactiveFormsModule, RouterLink, MatButtonModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatTabsModule, MatIconModule, MatCheckboxModule, CampoDinheiroComponent],
  template: `
    <mat-card class="cardWithShadow">
      <div class="p-6 flex flex-wrap items-center justify-between gap-4">
        <div class="flex items-center gap-2">
          <a mat-icon-button routerLink="/modelos-evento" aria-label="Voltar para modelos de evento"><mat-icon>arrow_back</mat-icon></a>
          <div>
            <mat-card-title class="mb-0">Editar modelo</mat-card-title>
            <mat-card-subtitle>Configure checklist, tarefas e vínculos.</mat-card-subtitle>
          </div>
        </div>
        <div class="flex flex-wrap gap-2">
          <button mat-stroked-button type="button" (click)="colarTarefas()"><mat-icon>content_paste</mat-icon> Colar tarefas</button>
          <button mat-stroked-button type="button" (click)="clonar()"><mat-icon>content_copy</mat-icon> Clonar</button>
          <button mat-stroked-button type="button" (click)="excluir()"><mat-icon>delete</mat-icon> Excluir</button>
          <button mat-flat-button type="button" (click)="salvar()">Salvar</button>
        </div>
      </div>
      <mat-card-content class="border-t border-border">
        <form [formGroup]="form">
          <div class="grid grid-cols-12 gap-x-6 gap-y-4 mb-2">
            <div class="campo col-span-12 md:col-span-8">
              <mat-label class="font-semibold mb-2 block">Nome</mat-label>
              <mat-form-field appearance="outline" class="w-full"><input aria-label="Nome" matInput formControlName="nome" /></mat-form-field>
            </div>
            <div class="campo col-span-12 md:col-span-4">
              <mat-label class="font-semibold mb-2 block">Tipo</mat-label>
              <mat-form-field appearance="outline" class="w-full">
                <mat-select aria-label="Tipo" formControlName="tipo">
                  @for (tipo of tipos; track tipo.valor) {
                    <mat-option [value]="tipo.valor">{{ tipo.rotulo }}</mat-option>
                  }
                </mat-select>
              </mat-form-field>
            </div>
          </div>
          <mat-tab-group>
            <mat-tab label="Checklist">
              <div formArrayName="servicos" class="flex flex-col gap-4">
                @for (servico of servicos.controls; track $index; let i = $index) {
                  <mat-card class="border! border-border! shadow-none mb-0!" [formGroupName]="i">
                    <mat-card-content>
                      <div class="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
                        <div class="campo">
                          <mat-label class="font-semibold mb-2 block">Serviço</mat-label>
                          <mat-form-field appearance="outline" class="w-full"><input aria-label="Serviço" matInput formControlName="nome" /></mat-form-field>
                        </div>
                        <app-campo-dinheiro rotulo="Valor estimado" formControlName="valorEstimado" />
                      </div>
                      <div formArrayName="itens" class="divide-y divide-border">
                        @for (item of itensDe(i).controls; track $index; let j = $index) {
                          <div class="grid grid-cols-1 sm:grid-cols-[220px_1fr_auto] gap-4 items-end py-4" [formGroupName]="j">
                            <div class="campo">
                              <mat-label class="font-semibold mb-2 block">Tipo</mat-label>
                              <mat-form-field appearance="outline" class="w-full">
                                <mat-select aria-label="Tipo" formControlName="tipo">
                                  @for (t of tiposItem; track t.valor) {
                                    <mat-option [value]="t.valor">{{ t.rotulo }}</mat-option>
                                  }
                                </mat-select>
                              </mat-form-field>
                            </div>
                            <div class="campo">
                              <mat-label class="font-semibold mb-2 block">Texto</mat-label>
                              <mat-form-field appearance="outline" class="w-full"><input aria-label="Texto" matInput formControlName="texto" /></mat-form-field>
                            </div>
                            <button mat-icon-button type="button" aria-label="Remover item" (click)="removerItem(i, j)"><mat-icon>close</mat-icon></button>
                          </div>
                        }
                      </div>
                      <div class="flex items-center gap-1 mt-2">
                        <button mat-stroked-button type="button" (click)="adicionarItem(i)"><mat-icon>add</mat-icon> Item</button>
                        <button mat-icon-button type="button" aria-label="Remover serviço" (click)="removerServico(i)"><mat-icon>delete</mat-icon></button>
                      </div>
                    </mat-card-content>
                  </mat-card>
                }
                <div><button mat-stroked-button type="button" (click)="adicionarServico()"><mat-icon>add</mat-icon> Adicionar serviço</button></div>
              </div>
            </mat-tab>
            <mat-tab label="Tarefas">
              <div formArrayName="tarefas" class="flex flex-col gap-4">
                @for (tarefa of tarefas.controls; track $index; let i = $index) {
                  <mat-card class="border! border-border! shadow-none mb-0!" [formGroupName]="i">
                    <mat-card-content>
                      <div class="grid grid-cols-1 lg:grid-cols-[minmax(0,1.2fr)_minmax(120px,180px)_minmax(220px,300px)_auto] gap-4 items-end">
                        <div class="campo">
                          <mat-label class="font-semibold mb-2 block">Título</mat-label>
                          <mat-form-field appearance="outline" class="w-full"><input aria-label="Título" matInput formControlName="titulo" /></mat-form-field>
                        </div>
                        <div class="campo">
                          <mat-label class="font-semibold mb-2 block">Grupo</mat-label>
                          <mat-form-field appearance="outline" class="w-full"><input aria-label="Grupo" matInput formControlName="grupo" maxlength="80" /></mat-form-field>
                        </div>
                        <div class="flex gap-2 items-end min-w-0">
                          @if (mostraQuantidade(i)) {
                            <div class="campo w-24 shrink-0">
                              <mat-label class="font-semibold mb-2 block">Prazo</mat-label>
                              <mat-form-field appearance="outline" class="w-full">
                                <input aria-label="Prazo" matInput type="number" min="0" max="999" formControlName="quantidade" />
                              </mat-form-field>
                            </div>
                          }
                          <div class="campo flex-1">
                            <mat-label class="font-semibold mb-2 block">{{ mostraQuantidade(i) ? 'Unidade' : 'Prazo' }}</mat-label>
                            <mat-form-field appearance="outline" class="w-full">
                              <mat-select [attr.aria-label]="mostraQuantidade(i) ? 'Unidade' : 'Prazo'" formControlName="unidade">
                                @for (u of unidadesPrazo; track u.valor) {
                                  <mat-option [value]="u.valor">{{ u.rotulo }}</mat-option>
                                }
                              </mat-select>
                            </mat-form-field>
                          </div>
                        </div>
                        <button mat-icon-button type="button" aria-label="Remover tarefa" (click)="removerTarefa(i)"><mat-icon>delete</mat-icon></button>
                      </div>
                      <p class="text-sm text-muted mt-2">{{ textoPrazo(i) }}</p>
                    </mat-card-content>
                  </mat-card>
                }
                <div><button mat-stroked-button type="button" (click)="adicionarTarefa()"><mat-icon>add</mat-icon> Adicionar tarefa</button></div>
              </div>
            </mat-tab>
            <mat-tab label="Briefings">
              <div class="campo w-full sm:w-80">
                <mat-label class="font-semibold mb-2 block">Modelo de briefing</mat-label>
                <mat-form-field appearance="outline" class="w-full">
                  <mat-select aria-label="Modelo de briefing" [value]="vinculo('Briefing')" (valueChange)="definirVinculo('Briefing', $event)">
                    <mat-option value="">Nenhum</mat-option>
                    @for (item of briefings(); track item.id) {
                      <mat-option [value]="item.id">{{ item.nome }}</mat-option>
                    }
                  </mat-select>
                </mat-form-field>
              </div>
            </mat-tab>
            <mat-tab label="Roteiros">
              <div class="campo w-full sm:w-80">
                <mat-label class="font-semibold mb-2 block">Modelo de roteiro</mat-label>
                <mat-form-field appearance="outline" class="w-full">
                  <mat-select aria-label="Modelo de roteiro" [value]="vinculo('Roteiro')" (valueChange)="definirVinculo('Roteiro', $event)">
                    <mat-option value="">Nenhum</mat-option>
                    @for (item of roteiros(); track item.id) {
                      <mat-option [value]="item.id">{{ item.nome }}</mat-option>
                    }
                  </mat-select>
                </mat-form-field>
              </div>
            </mat-tab>
            <mat-tab label="Inspirações">
              <div class="campo w-full sm:w-80">
                <mat-label class="font-semibold mb-2 block">Modelo de inspirações</mat-label>
                <mat-form-field appearance="outline" class="w-full">
                  <mat-select aria-label="Modelo de inspirações" [value]="vinculo('Inspiracao')" (valueChange)="definirVinculo('Inspiracao', $event)">
                    <mat-option value="">Nenhum</mat-option>
                    @for (item of inspiracoes(); track item.id) {
                      <mat-option [value]="item.id">{{ item.nome }}</mat-option>
                    }
                  </mat-select>
                </mat-form-field>
              </div>
            </mat-tab>
            <mat-tab label="Contratos">
              <p class="text-sm text-muted mb-4">Os contratos marcados entram nos eventos criados a partir deste modelo.</p>
              @if (contratos().length === 0) {
                <p class="text-center text-muted py-10">Nenhum contrato cadastrado. Cadastre em <a routerLink="/contratos">Contratos</a>.</p>
              } @else {
                <div class="flex flex-col gap-1">
                  @for (contrato of contratos(); track contrato.id) {
                    <mat-checkbox [checked]="contratosDoModelo().has(contrato.id)" (change)="marcarContrato(contrato.id, $event.checked)">
                      {{ contrato.nome }}
                    </mat-checkbox>
                  }
                </div>
              }
            </mat-tab>
            <mat-tab label="RSVP e Mensagens">
              <div class="campo w-full sm:w-80">
                <mat-label class="font-semibold mb-2 block">Modelo de mensagem</mat-label>
                <mat-form-field appearance="outline" class="w-full">
                  <mat-select aria-label="Modelo de mensagem" [value]="vinculo('Mensagem')" (valueChange)="definirVinculo('Mensagem', $event)">
                    <mat-option value="">Nenhum</mat-option>
                    @for (item of mensagens(); track item.id) {
                      <mat-option [value]="item.id">{{ item.nome }}</mat-option>
                    }
                  </mat-select>
                </mat-form-field>
              </div>
            </mat-tab>
          </mat-tab-group>
        </form>
      </mat-card-content>
    </mat-card>
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

import { NgTemplateOutlet } from '@angular/common';
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
import { DIALOG, DIALOG_LARGO, DIALOG_PEQUENO } from '../../shared/dialog';
import { exibirPrazo, prazoDeDias, prazoParaDias, UNIDADES_PRAZO, UnidadePrazo } from '../../shared/prazo-modelo';
import { ImportarTarefasModeloDialog } from './importar-tarefas-modelo.dialog';
import { SelecionarBibliotecaDialog, ItemBiblioteca } from './selecionar-biblioteca.dialog';
import { SelecionarServicosModeloDialog, ServicoEscolhido } from './selecionar-servicos-modelo.dialog';
import { MatTooltipModule } from '@angular/material/tooltip';

@Component({
  selector: 'app-modelo-evento-editor',
  imports: [MatCardModule, ReactiveFormsModule, RouterLink, MatButtonModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatTabsModule, MatIconModule, CampoDinheiroComponent, NgTemplateOutlet, MatTooltipModule],
  template: `
    <mat-card class="cardWithShadow">
      <div class="p-6 flex flex-wrap items-center justify-between gap-4">
        <div class="flex items-center gap-2">
          <a mat-icon-button routerLink="/modelos-evento" aria-label="Voltar para modelos de evento" matTooltip="Voltar para modelos de evento"><mat-icon>arrow_back</mat-icon></a>
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
          <ng-template #vinculosTpl let-tipo="tipo" let-titulo="titulo" let-singular="singular" let-itens="itens">
            <div class="flex flex-col gap-3 pt-4">
              <div class="flex justify-end"><button mat-stroked-button type="button" (click)="adicionarVinculos(tipo, titulo, itens)"><mat-icon>add</mat-icon> Adicionar {{ titulo }}</button></div>
              @for (item of vinculados(tipo, itens); track item.id) {
                <div class="flex items-center justify-between gap-2 border border-border rounded px-4 py-2">
                  <span>{{ item.nome }}</span>
                  <button mat-icon-button type="button" [attr.aria-label]="'Remover ' + singular" [matTooltip]="'Remover ' + singular" (click)="removerVinculo(tipo, item.id)"><mat-icon>close</mat-icon></button>
                </div>
              } @empty {
                <p class="text-sm text-muted">Nenhum modelo de {{ singular }} vinculado.</p>
              }
            </div>
          </ng-template>
          <mat-tab-group>
            <mat-tab label="Checklist">
              <div formArrayName="servicos" class="flex flex-col gap-4">
                <div class="flex justify-end pt-4"><button mat-stroked-button type="button" (click)="adicionarServicos()"><mat-icon>add</mat-icon> Adicionar serviços</button></div>
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
                            <button mat-icon-button type="button" aria-label="Remover item" matTooltip="Remover item" (click)="removerItem(i, j)"><mat-icon>close</mat-icon></button>
                          </div>
                        }
                      </div>
                      <div class="flex items-center gap-1 mt-2">
                        <button mat-stroked-button type="button" (click)="adicionarItem(i)"><mat-icon>add</mat-icon> Item</button>
                        <button mat-icon-button type="button" aria-label="Remover serviço" matTooltip="Remover serviço" (click)="removerServico(i)"><mat-icon>delete</mat-icon></button>
                      </div>
                    </mat-card-content>
                  </mat-card>
                }
              </div>
            </mat-tab>
            <mat-tab label="Tarefas">
              <div formArrayName="tarefas" class="flex flex-col gap-4">
                <div class="flex justify-end pt-4"><button mat-stroked-button type="button" (click)="adicionarTarefa()"><mat-icon>add</mat-icon> Adicionar tarefa</button></div>
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
                        <button mat-icon-button type="button" aria-label="Remover tarefa" matTooltip="Remover tarefa" (click)="removerTarefa(i)"><mat-icon>delete</mat-icon></button>
                      </div>
                      <p class="text-sm text-muted mt-2">{{ textoPrazo(i) }}</p>
                    </mat-card-content>
                  </mat-card>
                }
              </div>
            </mat-tab>
            <mat-tab label="Briefings">
              <ng-container [ngTemplateOutlet]="vinculosTpl" [ngTemplateOutletContext]="{ tipo: 'Briefing', titulo: 'briefings', singular: 'briefing', itens: briefings() }" />
            </mat-tab>
            <mat-tab label="Roteiros">
              <ng-container [ngTemplateOutlet]="vinculosTpl" [ngTemplateOutletContext]="{ tipo: 'Roteiro', titulo: 'roteiros', singular: 'roteiro', itens: roteiros() }" />
            </mat-tab>
            <mat-tab label="Inspirações">
              <ng-container [ngTemplateOutlet]="vinculosTpl" [ngTemplateOutletContext]="{ tipo: 'Inspiracao', titulo: 'inspirações', singular: 'inspiração', itens: inspiracoes() }" />
            </mat-tab>
            <mat-tab label="RSVP e Mensagens">
              <ng-container [ngTemplateOutlet]="vinculosTpl" [ngTemplateOutletContext]="{ tipo: 'Mensagem', titulo: 'mensagens', singular: 'mensagem', itens: mensagens() }" />
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
  private readonly vinculosMap = signal<Record<string, string[]>>({});
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
        const mapa: Record<string, string[]> = {};
        for (const vinculo of modelo.vinculos) {
          (mapa[vinculo.tipo] ??= []).push(vinculo.bibliotecaId);
        }
        this.vinculosMap.set(mapa);
      },
      error: (erro: unknown) => this.toast.erro(mensagemDeErro(erro)),
    });
  }

  protected vinculos(tipo: string): string[] {
    return this.vinculosMap()[tipo] ?? [];
  }

  protected vinculados(tipo: string, itens: ItemBiblioteca[]): ItemBiblioteca[] {
    const ids = this.vinculos(tipo);
    return itens.filter((item) => ids.includes(item.id));
  }

  protected adicionarVinculos(tipo: string, titulo: string, itens: ItemBiblioteca[]): void {
    const atuais = this.vinculos(tipo);
    this.dialog.open(SelecionarBibliotecaDialog, {
      ...DIALOG,
      data: { titulo, itens, jaVinculados: atuais },
    }).afterClosed().subscribe((novos?: string[]) => {
      if (novos?.length) {
        this.definirVinculos(tipo, [...new Set([...atuais, ...novos])]);
      }
    });
  }

  protected removerVinculo(tipo: string, id: string): void {
    this.definirVinculos(tipo, this.vinculos(tipo).filter((atual) => atual !== id));
  }

  protected definirVinculos(tipo: string, ids: string[]): void {
    this.vinculosMap.update((mapa) => {
      const novo = { ...mapa };
      if (ids.length > 0) {
        novo[tipo] = ids;
      } else {
        delete novo[tipo];
      }
      return novo;
    });
  }

  protected adicionarServicos(): void {
    const jaAdicionados = (this.servicos.getRawValue() as { nome: string }[]).map((servico) => servico.nome);
    this.dialog.open(SelecionarServicosModeloDialog, {
      ...DIALOG,
      data: { jaAdicionados },
    }).afterClosed().subscribe((escolhidos?: ServicoEscolhido[]) => {
      for (const servico of escolhidos ?? []) {
        this.servicos.push(this.novoServico(servico.nome, servico.valorEstimado));
      }
    });
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

  protected salvar(): void {
    const valor = this.form.getRawValue() as {
      nome: string | null;
      tipo: string | null;
      permissoes: Record<string, boolean>;
      servicos: { nome: string; valorEstimado: number | string | null; itens: { tipo: string; texto: string }[] }[];
      tarefas: { titulo: string; grupo: string | null; quantidade: number | string | null; unidade: UnidadePrazo }[];
    };
    const vinculos = Object.entries(this.vinculosMap()).flatMap(([tipo, ids]) => ids.map((bibliotecaId) => ({ tipo, bibliotecaId })));
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
      next: () => this.toast.sucesso('Modelo salvo.'),
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

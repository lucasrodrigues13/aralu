import { Component, inject, OnInit, signal } from '@angular/core';
import { FormArray, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
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
import { DIALOG } from '../../shared/dialog';

@Component({
  selector: 'app-modelo-evento-editor',
  imports: [
    ReactiveFormsModule, RouterLink, MatButtonModule, MatCheckboxModule, MatFormFieldModule, MatInputModule,
    MatSelectModule, MatTabsModule, MatIconModule, CampoDinheiroComponent,
  ],
  template: `
    <a mat-button routerLink="/modelos-evento">Voltar</a>
    <header class="gd-cabecalho">
      <div>
        <h1>Editar modelo</h1>
        <p>Configure checklist, tarefas e vínculos.</p>
      </div>
      <div class="acoes">
        <button mat-stroked-button type="button" (click)="clonar()"><mat-icon>content_copy</mat-icon> Clonar</button>
        <button mat-stroked-button type="button" (click)="excluir()"><mat-icon>delete</mat-icon> Excluir</button>
        <button mat-flat-button type="button" (click)="salvar()">Salvar</button>
      </div>
    </header>
    <form class="formulario gd-painel-form" [formGroup]="form">
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
                  <mat-form-field class="curto" appearance="outline"><mat-label>Dias antes</mat-label><input matInput type="number" formControlName="diasAntes" /></mat-form-field>
                  <button mat-icon-button type="button" (click)="removerTarefa(i)"><mat-icon>delete</mat-icon></button>
                </div>
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
        <mat-tab label="Permissões">
          <div class="aba" formGroupName="permissoes">
            <mat-checkbox formControlName="gerais">Gerais</mat-checkbox>
            <mat-checkbox formControlName="planejamento">Planejamento</mat-checkbox>
            <mat-checkbox formControlName="tarefas">Tarefas</mat-checkbox>
            <mat-checkbox formControlName="servicosFornecedores">Serviços e fornecedores</mat-checkbox>
            <mat-checkbox formControlName="convites">Convites</mat-checkbox>
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
      grid-template-columns: minmax(0, 1fr) 220px auto;
      width: 100%;
      max-width: 100%;
      min-width: 0;
    }
    :host .linha-tarefa > * { min-width: 0; }
    :host .linha-tarefa mat-form-field,
    :host .linha-tarefa .curto {
      width: 100%;
      min-width: 0;
      max-width: 100%;
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
  protected readonly briefings = signal<Briefing[]>([]);
  protected readonly roteiros = signal<Roteiro[]>([]);
  protected readonly inspiracoes = signal<Inspiracao[]>([]);
  protected readonly mensagens = signal<MensagemModelo[]>([]);
  private readonly vinculosMap = signal<Record<string, string>>({});
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
          this.tarefas.push(this.fb.group({
            titulo: [tarefa.titulo, Validators.required],
            diasAntes: [tarefa.diasAntes],
          }));
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
    this.tarefas.push(this.fb.group({ titulo: ['', Validators.required], diasAntes: [null as number | null] }));
  }

  protected removerTarefa(indice: number): void {
    this.tarefas.removeAt(indice);
  }

  protected salvar(): void {
    const valor = this.form.getRawValue() as {
      nome: string | null;
      tipo: string | null;
      permissoes: Record<string, boolean>;
      servicos: { nome: string; valorEstimado: number | string | null; itens: { tipo: string; texto: string }[] }[];
      tarefas: { titulo: string; diasAntes: number | string | null }[];
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
      tarefas: (valor.tarefas ?? []).map((tarefa) => ({
        titulo: tarefa.titulo,
        diasAntes: tarefa.diasAntes === '' || tarefa.diasAntes == null ? null : Number(tarefa.diasAntes),
      })),
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
      ...DIALOG,
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
}

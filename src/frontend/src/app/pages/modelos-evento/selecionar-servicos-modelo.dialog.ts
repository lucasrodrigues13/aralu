import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { mensagemDeErro } from '../../core/mensagem-erro';
import { NegocioClient, ServicoConta } from '../../core/negocio.client';
import { CampoDinheiroComponent } from '../../shared/campo-dinheiro';
import { FecharModal } from '../../shared/fechar-modal';

export interface SelecionarServicosDados {
  /** Nomes já presentes no checklist do modelo; ficam desabilitados. */
  jaAdicionados: string[];
}

export interface ServicoEscolhido {
  servicoContaId: string;
  nome: string;
  valorEstimado: number | null;
}

/** Escolhe vários serviços do cadastro de uma vez e já informa o valor estimado de cada um. */
@Component({
  selector: 'app-selecionar-servicos-modelo',
  imports: [FecharModal, ReactiveFormsModule, MatDialogModule, MatButtonModule, MatCheckboxModule, MatFormFieldModule, MatInputModule, MatIconModule, CampoDinheiroComponent],
  template: `
    <h2 mat-dialog-title>Adicionar serviços <app-fechar-modal /></h2>
    <p class="text-muted text-sm px-6 -mt-2 mb-4">Marque os serviços do seu cadastro e, se quiser, já informe o valor estimado de cada um.</p>
    <mat-dialog-content>
      <mat-form-field appearance="outline" class="w-full">
        <mat-icon matIconPrefix>search</mat-icon>
        <input matInput aria-label="Buscar serviço" placeholder="Buscar serviço" [value]="busca()" (input)="buscar($event)" />
      </mat-form-field>

      @if (erro()) {
        <p class="text-error text-sm">{{ erro() }}</p>
      } @else if (carregando()) {
        <p class="text-muted text-sm">Carregando serviços…</p>
      } @else if (catalogo().length === 0) {
        <p class="text-muted text-sm">Nenhum serviço cadastrado ainda. Cadastre em Serviços para usá-los aqui.</p>
      } @else {
        <div class="flex items-center justify-between mb-2">
          <button mat-button type="button" (click)="marcarVisiveis()">Marcar todos os visíveis</button>
          <span class="text-sm text-muted">{{ marcados().size }} selecionado(s)</span>
        </div>
        <ul class="lista divide-y divide-border">
          @for (servico of visiveis(); track servico.id) {
            <li class="py-2">
              <div class="linha">
                <mat-checkbox
                  [checked]="marcados().has(servico.id)"
                  [disabled]="jaAdicionado(servico)"
                  (change)="alternar(servico, $event.checked)"
                >
                  {{ servico.nome }}
                  @if (jaAdicionado(servico)) { <span class="text-xs text-muted"> · já está no checklist</span> }
                </mat-checkbox>
                @if (marcados().has(servico.id)) {
                  <app-campo-dinheiro class="valor" rotulo="Valor estimado" [formControl]="valorDe(servico.id)" />
                }
              </div>
            </li>
          } @empty {
            <li class="py-4 text-sm text-muted">Nenhum serviço encontrado.</li>
          }
        </ul>
      }
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-stroked-button type="button" (click)="ref.close()">Cancelar</button>
      <button mat-flat-button type="button" [disabled]="marcados().size === 0" (click)="confirmar()">
        Adicionar{{ marcados().size ? ' (' + marcados().size + ')' : '' }}
      </button>
    </mat-dialog-actions>
  `,
  styles: `
    .lista { list-style: none; padding: 0; margin: 0; }
    .linha { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 8px 16px; }
    .valor { width: 200px; max-width: 100%; }
  `,
})
export class SelecionarServicosModeloDialog implements OnInit {
  private readonly negocio = inject(NegocioClient);
  protected readonly dados = inject<SelecionarServicosDados>(MAT_DIALOG_DATA);
  protected readonly ref = inject(MatDialogRef<SelecionarServicosModeloDialog, ServicoEscolhido[]>);

  protected readonly catalogo = signal<ServicoConta[]>([]);
  protected readonly carregando = signal(true);
  protected readonly erro = signal('');
  protected readonly busca = signal('');
  protected readonly marcados = signal<ReadonlySet<string>>(new Set());
  private readonly valores = new Map<string, FormControl<number | null>>();
  private readonly existentes = new Set(this.dados.jaAdicionados.map(normalizar));

  protected readonly visiveis = computed(() => {
    const termo = normalizar(this.busca());
    return this.catalogo().filter((item) => !termo || normalizar(item.nome).includes(termo));
  });

  ngOnInit(): void {
    this.negocio.servicosConta().subscribe({
      next: (lista) => {
        this.catalogo.set([...lista].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR')));
        this.carregando.set(false);
      },
      error: (erro: unknown) => {
        this.erro.set(mensagemDeErro(erro));
        this.carregando.set(false);
      },
    });
  }

  protected buscar(evento: Event): void {
    this.busca.set((evento.target as HTMLInputElement).value);
  }

  protected jaAdicionado(servico: ServicoConta): boolean {
    return this.existentes.has(normalizar(servico.nome));
  }

  protected valorDe(id: string): FormControl<number | null> {
    let controle = this.valores.get(id);
    if (!controle) {
      controle = new FormControl<number | null>(null);
      this.valores.set(id, controle);
    }
    return controle;
  }

  protected alternar(servico: ServicoConta, marcado: boolean): void {
    this.marcados.update((atual) => {
      const novo = new Set(atual);
      if (marcado) {
        novo.add(servico.id);
      } else {
        novo.delete(servico.id);
      }
      return novo;
    });
  }

  protected marcarVisiveis(): void {
    this.marcados.update((atual) => {
      const novo = new Set(atual);
      for (const servico of this.visiveis()) {
        if (!this.jaAdicionado(servico)) {
          novo.add(servico.id);
        }
      }
      return novo;
    });
  }

  protected confirmar(): void {
    const marcados = this.marcados();
    this.ref.close(
      this.catalogo()
        .filter((servico) => marcados.has(servico.id))
        .map((servico) => ({ servicoContaId: servico.id, nome: servico.nome, valorEstimado: this.valorDe(servico.id).value })),
    );
  }
}

function normalizar(texto: string): string {
  return texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}

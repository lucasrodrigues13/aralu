import { Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
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
import { mensagemDeErro } from '../../core/mensagem-erro';
import { ModeloOrcamentoFunil, NegocioClient, Oportunidade, OrcamentoFunil } from '../../core/negocio.client';
import { ToastService } from '../../core/toast.service';
import { ConfirmaDialog } from '../../shared/confirma-dialog';
import { CampoDinheiroComponent } from '../../shared/campo-dinheiro';
import { DIALOG, DIALOG_PEQUENO } from '../../shared/dialog';
import { GdDataPipe } from '../../shared/gd-data.pipe';
import { linkProposta, SELO_PROPOSTA, whatsappProposta } from '../../shared/proposta';

@Component({
  selector: 'app-orcamento-funil-dialog',
  imports: [ReactiveFormsModule, MatDialogModule, MatButtonModule, MatFormFieldModule, MatInputModule, MatSelectModule, CampoDinheiroComponent],
  template: `
    <h2 mat-dialog-title>{{ dados ? 'Editar orçamento' : 'Novo orçamento' }}</h2>
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
          <mat-form-field appearance="outline" class="w-full"><textarea [attr.aria-label]="'Conteúdo'" matInput rows="8" formControlName="conteudo"></textarea></mat-form-field>
        </div>
        <app-campo-dinheiro rotulo="Valor" formControlName="valor" />
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-stroked-button type="button" (click)="ref.close()">Cancelar</button>
      <button mat-flat-button type="button" (click)="salvar()">Salvar</button>
    </mat-dialog-actions>
  `,
})
export class OrcamentoFunilDialog implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly negocio = inject(NegocioClient);
  private readonly toast = inject(ToastService);
  protected readonly dados = inject<OrcamentoFunil | null>(MAT_DIALOG_DATA);
  protected readonly ref = inject(MatDialogRef<OrcamentoFunilDialog, boolean>);
  protected readonly oportunidades = signal<Oportunidade[]>([]);
  protected readonly modelos = signal<ModeloOrcamentoFunil[]>([]);
  protected readonly form = this.fb.nonNullable.group({
    oportunidadeId: [this.dados?.oportunidadeId ?? '', Validators.required],
    modeloId: [this.dados?.modeloId ?? null as string | null],
    conteudo: [this.dados?.conteudo ?? '', Validators.required],
    valor: [this.dados?.valor ?? null as number | null],
  });

  ngOnInit(): void {
    this.negocio.oportunidades().subscribe({ next: (lista) => this.oportunidades.set(lista) });
    this.negocio.modelosOrcamentoFunil().subscribe({ next: (lista) => this.modelos.set(lista) });
  }

  protected aplicarModelo(id: string | null): void {
    const modelo = this.modelos().find((m) => m.id === id);
    if (!modelo) return;
    const opp = this.oportunidades().find((o) => o.id === this.form.controls.oportunidadeId.value);
    this.form.controls.conteudo.setValue(modelo.texto.replace(/#nome_oportunidade/gi, opp?.nome ?? ''));
  }

  protected salvar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const valor = this.form.getRawValue();
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

/** Link da proposta: copiar ou mandar pelo WhatsApp (SPEC-031 §6.6, item 2). */
@Component({
  selector: 'app-enviar-proposta-dialog',
  imports: [MatDialogModule, MatButtonModule, MatFormFieldModule, MatInputModule, MatIconModule, GdDataPipe],
  template: `
    <h2 mat-dialog-title>Enviar proposta</h2>
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
      <div class="flex flex-wrap gap-2">
        <button mat-stroked-button type="button" (click)="copiar()"><mat-icon>content_copy</mat-icon> Copiar link</button>
        <a mat-flat-button [href]="whatsapp()" target="_blank" rel="noopener"><mat-icon>chat</mat-icon> Enviar pelo WhatsApp</a>
      </div>
      <p class="text-xs text-muted mt-4">O envio por e-mail chega quando o canal de e-mail estiver pronto.</p>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-stroked-button type="button" (click)="ref.close()">Fechar</button>
    </mat-dialog-actions>
  `,
})
export class EnviarPropostaDialog implements OnInit {
  private readonly negocio = inject(NegocioClient);
  private readonly toast = inject(ToastService);
  protected readonly dados = inject<OrcamentoFunil>(MAT_DIALOG_DATA);
  protected readonly ref = inject(MatDialogRef<EnviarPropostaDialog>);
  protected readonly link = linkProposta(this.dados.tokenLink ?? '');
  protected readonly contato = signal<{ nome: string; telefone: string | null } | null>(null);

  ngOnInit(): void {
    this.negocio.oportunidade(this.dados.oportunidadeId).subscribe({
      next: (o) => this.contato.set(o.contatos[0] ?? null),
      error: () => this.contato.set(null),
    });
  }

  protected whatsapp(): string {
    const c = this.contato();
    return whatsappProposta(c?.telefone, c?.nome, this.link);
  }

  protected copiar(): void {
    void navigator.clipboard.writeText(this.link).then(
      () => this.toast.sucesso('Link copiado.'),
      () => this.toast.erro('Não deu para copiar. Selecione o link e copie.'),
    );
  }
}

@Component({
  selector: 'app-orcamentos-funil',
  imports: [MatButtonToggleModule, MatCardModule, MatButtonModule, MatFormFieldModule, MatInputModule, MatIconModule, MatTableModule, MatCheckboxModule, MatTooltipModule, GdDataPipe],
  template: `
    <mat-card class="cardWithShadow">
      <div class="p-6 flex flex-wrap items-center justify-between gap-4">
      <div><mat-card-title class="mb-0">Orçamentos</mat-card-title><mat-card-subtitle>Orçamentos comerciais do funil.</mat-card-subtitle></div>
      <button mat-flat-button type="button" (click)="abrir()"><mat-icon>add</mat-icon> Novo orçamento</button>
    </div>
      <mat-card-content class="border-t border-border">
      <div class="flex flex-wrap items-end justify-between gap-4 mb-6">
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
      @if (lista().length === 0) {
        <p class="text-center text-muted py-10">Não há orçamento nesta aba.</p>
      } @else {
        <table mat-table class="min-w-full" [dataSource]="lista()">
          <ng-container matColumnDef="oportunidade">
            <th mat-header-cell *matHeaderCellDef>Oportunidade</th>
            <td mat-cell *matCellDef="let item">{{ item.oportunidadeNome }}</td>
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
                <button mat-icon-button type="button" matTooltip="Editar" (click)="abrir(item)"><mat-icon>edit</mat-icon></button>
                <button mat-icon-button type="button" matTooltip="Enviar proposta" (click)="enviar(item)"><mat-icon>send</mat-icon></button>
                <button mat-icon-button type="button" matTooltip="Registrar resposta" (click)="responder(item)"><mat-icon>mark_email_read</mat-icon></button>
                <button mat-icon-button type="button" matTooltip="Cancelar" (click)="cancelar(item)"><mat-icon>cancel</mat-icon></button>
                <button mat-icon-button type="button" matTooltip="Excluir" (click)="excluir(item)"><mat-icon>delete</mat-icon></button>
              } @else if (item.situacao === 'Respondido' && item.tokenLink) {
                <button mat-icon-button type="button" matTooltip="Link da proposta" (click)="mostrarLink(item)"><mat-icon>link</mat-icon></button>
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

  /** Gera o link e abre as opções de envio (SPEC-031 §6.6). */
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
    this.negocio.responderOrcamentoFunil(item.id).subscribe({
      next: () => { this.toast.sucesso('Resposta registrada.'); this.carregar(); },
      error: (erro: unknown) => this.toast.erro(mensagemDeErro(erro)),
    });
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
      data: { titulo: 'Excluir orçamento', texto: 'Confirma a exclusão?', confirmar: 'Excluir' },
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

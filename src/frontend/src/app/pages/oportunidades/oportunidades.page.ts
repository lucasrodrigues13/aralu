import { Component, inject, OnInit, signal } from '@angular/core';
import { FormArray, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule, MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { AuthService } from '../../core/auth.service';
import { mensagemDeErro } from '../../core/mensagem-erro';
import {
  ESTAGIOS_FUNIL,
  ModeloServicoFunil,
  NegocioClient,
  Oportunidade,
  TIPOS,
} from '../../core/negocio.client';
import { ToastService } from '../../core/toast.service';
import { CampoDataComponent } from '../../shared/campo-data';
import { CampoDinheiroComponent } from '../../shared/campo-dinheiro';
import { ConfirmaDialog } from '../../shared/confirma-dialog';
import { deDataParaIso, deIsoParaData } from '../../shared/data';
import { DIALOG, DIALOG_PEQUENO } from '../../shared/dialog';
import { GdDinheiroPipe } from '../../shared/gd-dinheiro.pipe';
import { grupoLocal, localPedido, LocalCamposComponent } from '../../shared/local-campos';

@Component({
  selector: 'app-oportunidade-dialog',
  imports: [ReactiveFormsModule, MatDialogModule, MatButtonModule, MatFormFieldModule, MatInputModule, MatSelectModule, CampoDataComponent, CampoDinheiroComponent, LocalCamposComponent],
  template: `
    <h2 mat-dialog-title>{{ dados ? 'Editar oportunidade' : 'Nova oportunidade' }}</h2>
    <mat-dialog-content>
      <form class="grid grid-cols-1 gap-4" [formGroup]="form">
        <h3>Sobre a oportunidade</h3>
        <div class="campo">
          <mat-label class="font-semibold mb-2 block">Nome</mat-label>
          <mat-form-field appearance="outline" class="w-full"><input [attr.aria-label]="'Nome'" matInput formControlName="nome" /></mat-form-field>
        </div>
        <div class="campo">
          <mat-label class="font-semibold mb-2 block">Estágio</mat-label>
          <mat-form-field appearance="outline" class="w-full">
          <mat-select [attr.aria-label]="'Estágio'" formControlName="estagio">
            @for (e of estagios; track e) { <mat-option [value]="e">{{ e }}</mat-option> }
          </mat-select>
        </mat-form-field>
        </div>
        <div class="campo">
          <mat-label class="font-semibold mb-2 block">Fonte</mat-label>
          <mat-form-field appearance="outline" class="w-full"><input [attr.aria-label]="'Fonte'" matInput formControlName="fonte" /></mat-form-field>
        </div>
        <app-campo-dinheiro rotulo="Valor da proposta" formControlName="valorProposta" />
        <div class="campo">
          <mat-label class="font-semibold mb-2 block">Responsável</mat-label>
          <mat-form-field appearance="outline" class="w-full"><input [attr.aria-label]="'Responsável'" matInput formControlName="responsavel" /></mat-form-field>
        </div>
        <div class="campo">
          <mat-label class="font-semibold mb-2 block">Serviço/produto</mat-label>
          <mat-form-field appearance="outline" class="w-full">
          <mat-select [attr.aria-label]="'Serviço/produto'" formControlName="modeloServicoFunilId">
            <mat-option [value]="null">Texto livre</mat-option>
            @for (s of servicos(); track s.id) { <mat-option [value]="s.id">{{ s.nome }}</mat-option> }
          </mat-select>
        </mat-form-field>
        </div>
        <div class="campo">
          <mat-label class="font-semibold mb-2 block">Serviço (texto)</mat-label>
          <mat-form-field appearance="outline" class="w-full"><input [attr.aria-label]="'Serviço (texto)'" matInput formControlName="servicoProduto" /></mat-form-field>
        </div>
        @if (form.controls.estagio.value === 'Descartado') {
          <div class="campo">
            <mat-label class="font-semibold mb-2 block">Motivo do descarte</mat-label>
            <mat-form-field appearance="outline" class="w-full"><input [attr.aria-label]="'Motivo do descarte'" matInput formControlName="motivoDescarte" /></mat-form-field>
          </div>
        }
        <h3>Sobre o evento</h3>
        <div class="campo">
          <mat-label class="font-semibold mb-2 block">Tipo</mat-label>
          <mat-form-field appearance="outline" class="w-full">
          <mat-select [attr.aria-label]="'Tipo'" formControlName="tipoEvento">
            <mat-option [value]="null">—</mat-option>
            @for (t of tipos; track t.valor) { <mat-option [value]="t.valor">{{ t.rotulo }}</mat-option> }
          </mat-select>
        </mat-form-field>
        </div>
        <app-campo-data formControlName="dataPrevista" rotulo="Data prevista" />
        <div class="campo">
          <mat-label class="font-semibold mb-2 block">Convidados</mat-label>
          <mat-form-field appearance="outline" class="w-full"><input [attr.aria-label]="'Convidados'" matInput type="number" formControlName="quantidadeConvidados" /></mat-form-field>
        </div>
        <div class="campo">
          <mat-label class="font-semibold mb-2 block">Horários</mat-label>
          <mat-form-field appearance="outline" class="w-full"><input [attr.aria-label]="'Horários'" matInput formControlName="horarios" placeholder="hh:mm" /></mat-form-field>
        </div>
        <h3>Cerimônia</h3>
        <app-local-campos [grupo]="form.controls.cerimonia" />
        <h3>Recepção</h3>
        <app-local-campos [grupo]="form.controls.recepcao" />
        <h3>Contatos</h3>
        <div formArrayName="contatos">
          @for (c of contatos.controls; track $index; let i = $index) {
            <div [formGroupName]="i" class="contato">
              <div class="campo">
                <mat-label class="font-semibold mb-2 block">Nome</mat-label>
                <mat-form-field appearance="outline" class="w-full"><input [attr.aria-label]="'Nome'" matInput formControlName="nome" /></mat-form-field>
              </div>
              <div class="campo">
                <mat-label class="font-semibold mb-2 block">Telefone</mat-label>
                <mat-form-field appearance="outline" class="w-full"><input [attr.aria-label]="'Telefone'" matInput formControlName="telefone" /></mat-form-field>
              </div>
              <div class="campo">
                <mat-label class="font-semibold mb-2 block">E-mail</mat-label>
                <mat-form-field appearance="outline" class="w-full"><input [attr.aria-label]="'E-mail'" matInput formControlName="email" /></mat-form-field>
              </div>
            </div>
          }
        </div>
        <button mat-stroked-button type="button" (click)="addContato()">+ Contato</button>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-stroked-button type="button" (click)="ref.close()">Cancelar</button>
      <button mat-flat-button type="button" (click)="salvar()">Salvar</button>
    </mat-dialog-actions>
  `,
  styles: `
    h3 { margin: 12px 0 4px; font-size: 0.95rem; }
    .contato { display: grid; gap: 8px; }
  `,
})
export class OportunidadeDialog implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly negocio = inject(NegocioClient);
  private readonly toast = inject(ToastService);
  protected readonly dados = inject<Oportunidade | null>(MAT_DIALOG_DATA);
  protected readonly ref = inject(MatDialogRef<OportunidadeDialog, boolean>);
  protected readonly estagios = ESTAGIOS_FUNIL;
  protected readonly tipos = TIPOS;
  protected readonly servicos = signal<ModeloServicoFunil[]>([]);
  protected readonly form = this.fb.nonNullable.group({
    nome: [this.dados?.nome ?? '', Validators.required],
    estagio: [this.dados?.estagio ?? 'Contato inicial', Validators.required],
    fonte: [this.dados?.fonte ?? ''],
    valorProposta: this.fb.control<number | null>(this.dados?.valorProposta ?? null),
    responsavel: [this.dados?.responsavel ?? ''],
    modeloServicoFunilId: [this.dados?.modeloServicoFunilId ?? null as string | null],
    servicoProduto: [this.dados?.servicoProduto ?? ''],
    motivoDescarte: [this.dados?.motivoDescarte ?? ''],
    tipoEvento: [this.dados?.tipoEvento ?? null as string | null],
    dataPrevista: this.fb.control<Date | null>(deIsoParaData(this.dados?.dataPrevista)),
    quantidadeConvidados: [this.dados?.quantidadeConvidados ?? null as number | null],
    horarios: [this.dados?.horarios ?? ''],
    cerimonia: grupoLocal(this.fb, {
      nome: this.dados?.localCerimonia,
      endereco: this.dados?.enderecoCerimonia,
      cep: this.dados?.cepCerimonia,
      pais: this.dados?.paisCerimonia,
      numero: this.dados?.numeroCerimonia,
      bairro: this.dados?.bairroCerimonia,
      estado: this.dados?.uf,
      cidade: this.dados?.cidade,
    }),
    recepcao: grupoLocal(this.fb, {
      nome: this.dados?.localRecepcao,
      endereco: this.dados?.enderecoRecepcao,
      cep: this.dados?.cepRecepcao,
      pais: this.dados?.paisRecepcao,
      numero: this.dados?.numeroRecepcao,
      bairro: this.dados?.bairroRecepcao,
      estado: this.dados?.estadoRecepcao,
      cidade: this.dados?.cidadeRecepcao,
    }),
    contatos: this.fb.array(
      (this.dados?.contatos?.length ? this.dados.contatos : [{ nome: '', telefone: '', email: '' }]).map((c) =>
        this.fb.nonNullable.group({
          nome: [c.nome ?? '', Validators.required],
          telefone: [c.telefone ?? ''],
          email: [c.email ?? ''],
        }),
      ),
    ),
  });

  protected get contatos(): FormArray {
    return this.form.controls.contatos;
  }

  ngOnInit(): void {
    this.negocio.modelosServicoFunil().subscribe({
      next: (lista) => this.servicos.set(lista),
      error: (erro: unknown) => this.toast.erro(mensagemDeErro(erro)),
    });
  }

  protected addContato(): void {
    this.contatos.push(this.fb.nonNullable.group({ nome: ['', Validators.required], telefone: [''], email: [''] }));
  }

  protected salvar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.toast.erro('Confira nome, estágio e contato.');
      return;
    }
    const v = this.form.getRawValue();
    const dataIso = deDataParaIso(v.dataPrevista);
    const cerimonia = localPedido(v.cerimonia);
    const recepcao = localPedido(v.recepcao);
    const gravar = () => {
      const pedido = {
        nome: v.nome,
        estagio: v.estagio,
        fonte: v.fonte,
        valorProposta: v.valorProposta,
        responsavel: v.responsavel,
        modeloServicoFunilId: v.modeloServicoFunilId,
        servicoProduto: v.servicoProduto,
        motivoDescarte: v.motivoDescarte,
        tipoEvento: v.tipoEvento,
        dataPrevista: dataIso,
        quantidadeConvidados: v.quantidadeConvidados,
        horarios: v.horarios?.trim() || null,
        localCerimonia: cerimonia.nome,
        enderecoCerimonia: cerimonia.endereco,
        cepCerimonia: cerimonia.cep,
        paisCerimonia: cerimonia.pais,
        numeroCerimonia: cerimonia.numero,
        bairroCerimonia: cerimonia.bairro,
        uf: cerimonia.estado,
        cidade: cerimonia.cidade,
        localRecepcao: recepcao.nome,
        enderecoRecepcao: recepcao.endereco,
        cepRecepcao: recepcao.cep,
        paisRecepcao: recepcao.pais,
        numeroRecepcao: recepcao.numero,
        bairroRecepcao: recepcao.bairro,
        estadoRecepcao: recepcao.estado,
        cidadeRecepcao: recepcao.cidade,
        contatos: v.contatos,
      };
      const req = this.dados
        ? this.negocio.atualizarOportunidade(this.dados.id, pedido)
        : this.negocio.criarOportunidade(pedido);
      req.subscribe({
        next: () => {
          this.toast.sucesso('Oportunidade salva.');
          this.ref.close(true);
        },
        error: (erro: unknown) => this.toast.erro(mensagemDeErro(erro)),
      });
    };
    if (dataIso) {
      this.negocio.checarDataOportunidade(dataIso).subscribe({
        next: (checagem) => {
          if (checagem.temCompromisso) {
            this.toast.erro('Já há compromisso na agenda nesta data. Você pode gravar mesmo assim.');
          }
          gravar();
        },
        error: () => gravar(),
      });
      return;
    }
    gravar();
  }
}

@Component({
  selector: 'app-oportunidades',
  imports: [MatCardModule, ReactiveFormsModule, MatButtonModule, MatFormFieldModule, MatInputModule, MatIconModule, MatSelectModule, CampoDataComponent, GdDinheiroPipe],
  template: `
    <mat-card class="cardWithShadow">
      <div class="p-6 flex flex-wrap items-center justify-between gap-4">
      <div>
        <mat-card-title class="mb-0">Oportunidades</mat-card-title>
        <mat-card-subtitle>Quadro do funil de vendas da conta.</mat-card-subtitle>
      </div>
      <div class="acoes-topo">
        <button mat-stroked-button type="button" (click)="copiarLinkLead()">Link do lead</button>
        <button mat-stroked-button type="button" (click)="exportar()">Exportar</button>
        <button mat-flat-button type="button" (click)="abrir()"><mat-icon>add</mat-icon> Adicionar</button>
      </div>
    </div>
      <mat-card-content class="border-t border-border">
      <form class="flex flex-wrap items-end gap-4 mb-6" [formGroup]="filtros" (ngSubmit)="carregar()">
        <div class="campo w-full sm:w-64">
          <mat-label class="font-semibold mb-2 block">Buscar</mat-label>
          <mat-form-field appearance="outline" class="w-full">
          <mat-icon matIconPrefix>search</mat-icon>
          <input matInput aria-label="Buscar" formControlName="nome" placeholder="Buscar por nome" />
        </mat-form-field>
        </div>
        <div class="campo w-full sm:w-48">
          <mat-label class="font-semibold mb-2 block">Responsável</mat-label>
          <mat-form-field appearance="outline" subscriptSizing="dynamic" class="w-full">
          <input [attr.aria-label]="'Responsável'" matInput formControlName="responsavel" />
        </mat-form-field>
        </div>
        <div class="campo w-full sm:w-48">
          <mat-label class="font-semibold mb-2 block">Tipo de evento</mat-label>
          <mat-form-field appearance="outline" subscriptSizing="dynamic" class="w-full">
          <mat-select [attr.aria-label]="'Tipo de evento'" formControlName="tipoEvento">
            <mat-option [value]="''">Todos</mat-option>
            @for (t of tipos; track t.valor) { <mat-option [value]="t.valor">{{ t.rotulo }}</mat-option> }
          </mat-select>
        </mat-form-field>
        </div>
        <app-campo-data class="w-full sm:w-40" formControlName="dataDe" rotulo="Data de" />
        <app-campo-data class="w-full sm:w-40" formControlName="dataAte" rotulo="Data até" />
        <button mat-flat-button type="submit">Filtrar</button>
      </form>
      <div class="quadro">
        @for (estagio of estagios; track estagio) {
          <div class="coluna">
            <header>
              <strong>{{ estagio }}</strong>
              <span>{{ resumo(estagio).qtd }} · {{ resumo(estagio).valor | gdDinheiro }}</span>
            </header>
            @for (item of daColuna(estagio); track item.id) {
              <article>
                <strong>{{ item.nome }}</strong>
                <span class="block text-xs text-muted">{{ (item.valorProposta ?? 0) | gdDinheiro }}</span>
                <div class="flex flex-wrap items-center justify-end gap-2">
                  <button mat-icon-button type="button" (click)="abrir(item)"><mat-icon>edit</mat-icon></button>
                  <button mat-icon-button type="button" (click)="mover(item)"><mat-icon>swap_horiz</mat-icon></button>
                  <button mat-icon-button type="button" (click)="excluir(item)"><mat-icon>delete</mat-icon></button>
                </div>
              </article>
            }
          </div>
        }
      </div>
    </mat-card-content>
    </mat-card>
  `,
  styles: `
    .acoes-topo { display: flex; gap: 8px; flex-wrap: wrap; }
    .filtros { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
    .filtros app-campo-data { display: block; }
    .quadro { display: grid; grid-template-columns: repeat(4, minmax(180px, 1fr)); gap: 12px; overflow-x: auto; }
    .coluna { background: var(--mat-card-elevated-container-color); border: 1px solid var(--mat-sys-outline-variant); border-radius: 8px; padding: 10px; min-height: 240px; }
    .coluna header { display: flex; flex-direction: column; gap: 2px; margin-bottom: 8px; }
    article { border: 1px solid var(--mat-sys-outline-variant); border-radius: 8px; padding: 8px; margin-bottom: 8px; }
  `,
})
export class OportunidadesPage implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly negocio = inject(NegocioClient);
  private readonly dialog = inject(MatDialog);
  private readonly toast = inject(ToastService);
  private readonly auth = inject(AuthService);
  protected readonly estagios = ESTAGIOS_FUNIL;
  protected readonly tipos = TIPOS;
  protected readonly lista = signal<Oportunidade[]>([]);
  protected readonly filtros = this.fb.nonNullable.group({
    nome: [''],
    responsavel: [''],
    tipoEvento: [''],
    dataDe: this.fb.control<Date | null>(null),
    dataAte: this.fb.control<Date | null>(null),
  });

  ngOnInit(): void {
    this.carregar();
  }

  protected daColuna(estagio: string): Oportunidade[] {
    return this.lista().filter((item) => item.estagio === estagio);
  }

  protected resumo(estagio: string): { qtd: number; valor: number } {
    const itens = this.daColuna(estagio);
    return { qtd: itens.length, valor: itens.reduce((acc, item) => acc + (item.valorProposta ?? 0), 0) };
  }

  protected abrir(item?: Oportunidade): void {
    if (item) {
      this.negocio.oportunidade(item.id).subscribe({
        next: (detalhe) =>
          this.dialog.open(OportunidadeDialog, { ...DIALOG, data: detalhe }).afterClosed().subscribe((ok) => ok && this.carregar()),
        error: (erro: unknown) => this.toast.erro(mensagemDeErro(erro)),
      });
      return;
    }
    this.dialog.open(OportunidadeDialog, { ...DIALOG, data: null }).afterClosed().subscribe((ok) => ok && this.carregar());
  }

  protected mover(item: Oportunidade): void {
    const atual = this.estagios.indexOf(item.estagio);
    const proximo = this.estagios[(atual + 1) % this.estagios.length];
    let motivo: string | undefined;
    if (proximo === 'Descartado') {
      motivo = prompt('Motivo do descarte') ?? undefined;
      if (!motivo?.trim()) {
        this.toast.erro('Informe o motivo do descarte.');
        return;
      }
    }
    this.negocio.moverOportunidade(item.id, { estagio: proximo, motivoDescarte: motivo }).subscribe({
      next: () => {
        this.toast.sucesso('Estágio atualizado.');
        this.carregar();
      },
      error: (erro: unknown) => this.toast.erro(mensagemDeErro(erro)),
    });
  }

  protected excluir(item: Oportunidade): void {
    this.dialog.open(ConfirmaDialog, {
      ...DIALOG_PEQUENO,
      data: { titulo: 'Excluir oportunidade', texto: `Confirma a exclusão de "${item.nome}"?`, confirmar: 'Excluir' },
    }).afterClosed().subscribe((confirmou) => {
      if (!confirmou) return;
      this.negocio.excluirOportunidade(item.id).subscribe({
        next: () => {
          this.toast.sucesso('Oportunidade excluída.');
          this.carregar();
        },
        error: (erro: unknown) => this.toast.erro(mensagemDeErro(erro)),
      });
    });
  }

  protected exportar(): void {
    this.negocio.exportarOportunidades(this.filtroAtual()).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'oportunidades.csv';
        a.click();
        URL.revokeObjectURL(url);
      },
      error: (erro: unknown) => this.toast.erro(mensagemDeErro(erro)),
    });
  }

  protected copiarLinkLead(): void {
    const contaId = this.contaDoToken();
    if (!contaId) {
      this.toast.erro('Não foi possível montar o link.');
      return;
    }
    const url = `${location.origin}/lead/${contaId}`;
    void navigator.clipboard.writeText(url).then(
      () => this.toast.sucesso('Link do formulário público copiado.'),
      () => this.toast.erro(url),
    );
  }

  protected carregar(): void {
    this.negocio.oportunidades(this.filtroAtual()).subscribe({
      next: (lista) => this.lista.set(lista),
      error: (erro: unknown) => this.toast.erro(mensagemDeErro(erro)),
    });
  }

  private filtroAtual(): Record<string, string | undefined> {
    const v = this.filtros.getRawValue();
    return {
      nome: v.nome || undefined,
      responsavel: v.responsavel || undefined,
      tipoEvento: v.tipoEvento || undefined,
      dataDe: deDataParaIso(v.dataDe) ?? undefined,
      dataAte: deDataParaIso(v.dataAte) ?? undefined,
    };
  }

  private contaDoToken(): string | null {
    const token = this.auth.token();
    if (!token) return null;
    try {
      const payload = JSON.parse(atob(token.split('.')[1] ?? '')) as { sub?: string };
      return payload.sub ?? null;
    } catch {
      return null;
    }
  }
}

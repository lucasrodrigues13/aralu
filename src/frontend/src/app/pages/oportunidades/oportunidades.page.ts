import { Component, computed, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { debounceTime } from 'rxjs';
import { FormArray, FormBuilder, FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CdkDrag, CdkDragDrop, CdkDropList, CdkDropListGroup } from '@angular/cdk/drag-drop';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule, MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatMenuModule } from '@angular/material/menu';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AuthService } from '../../core/auth.service';
import { mensagemDeErro } from '../../core/mensagem-erro';
import {
  Cliente,
  ContatoRepetido,
  EstagioFunil,
  ORIGENS_FUNIL,
  ModeloServicoFunil,
  NegocioClient,
  Oportunidade,
  TIPOS,
} from '../../core/negocio.client';
import { ToastService } from '../../core/toast.service';
import { CampoDataComponent } from '../../shared/campo-data';
import { CampoHoraComponent } from '../../shared/campo-hora';
import { BriefingLeadDialog } from './briefing-lead.dialog';
import { horaParaApi } from '../../shared/mascaras';
import { CampoDinheiroComponent } from '../../shared/campo-dinheiro';
import { ConfirmaDialog } from '../../shared/confirma-dialog';
import { deDataParaIso, deIsoParaData } from '../../shared/data';
import { DIALOG, DIALOG_PEQUENO } from '../../shared/dialog';
import { GdDataPipe } from '../../shared/gd-data.pipe';
import { GdDinheiroPipe } from '../../shared/gd-dinheiro.pipe';
import { grupoLocal, localPedido, LocalCamposComponent } from '../../shared/local-campos';
import { SELO_PROPOSTA } from '../../shared/proposta';
import { STATUS } from '../../shared/status';
import { ClienteFormDialog } from '../clientes/cliente-form.dialog';
import { EstagiosFunilDialog } from './estagios-funil.dialog';

@Component({
  selector: 'app-oportunidade-dialog',
  imports: [ReactiveFormsModule, MatDialogModule, MatButtonModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatIconModule, CampoDataComponent, CampoHoraComponent, CampoDinheiroComponent, LocalCamposComponent],
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
            @for (e of estagios(); track e.id) { <mat-option [value]="e.id">{{ e.nome }}</mat-option> }
          </mat-select>
        </mat-form-field>
        </div>
        <div class="campo">
          <mat-label class="font-semibold mb-2 block">Origem</mat-label>
          <mat-form-field appearance="outline" class="w-full">
            <mat-select aria-label="Origem" formControlName="fonte">
              <mat-option [value]="''">—</mat-option>
              @for (o of origens; track o) { <mat-option [value]="o">{{ o }}</mat-option> }
            </mat-select>
          </mat-form-field>
        </div>
        @if (form.controls.fonte.value === 'Outro') {
          <div class="campo">
            <mat-label class="font-semibold mb-2 block">De onde veio?</mat-label>
            <mat-form-field appearance="outline" class="w-full"><input aria-label="De onde veio" matInput formControlName="fonteOutro" placeholder="Ex.: TikTok, panfleto" /></mat-form-field>
          </div>
        }
        <app-campo-dinheiro rotulo="Valor da proposta" formControlName="valorProposta" />
        <div class="grid grid-cols-2 gap-4">
          <app-campo-data formControlName="retornarEm" rotulo="Retornar em" />
          <div class="campo">
            <mat-label class="font-semibold mb-2 block">Hora (opcional)</mat-label>
            <mat-form-field appearance="outline" class="w-full"><input aria-label="Hora do retorno" matInput type="time" formControlName="retornarHora" /></mat-form-field>
          </div>
        </div>
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
        @if (ehDescarte()) {
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
        <app-campo-hora rotulo="Horário do convite" formControlName="horaConvite" />
        <app-campo-hora rotulo="Horário da cerimônia" formControlName="horaCerimonia" />
        <app-campo-hora rotulo="Horário da recepção" formControlName="horaRecepcao" />
        <app-campo-hora rotulo="Horário da festa" formControlName="horaFesta" />
        <h3>Cerimônia</h3>
        <app-local-campos [grupo]="form.controls.cerimonia" />
        <h3>Recepção</h3>
        <app-local-campos [grupo]="form.controls.recepcao" />
        <h3>Contatos</h3>
        @if (repetidos().length) {
          <div class="aviso-repetido bg-light-warning" role="status">
            <mat-icon class="text-warning">warning</mat-icon>
            <div>
              @for (r of repetidos(); track r.tipo + r.id) {
                <p>
                  {{ r.tipo === 'cliente' ? 'Esse contato já é cliente:' : 'Esse contato já está no funil:' }}
                  <a href="#" (click)="irPara($event, r)">{{ r.nome }}</a>{{ r.estagio ? ', em ' + r.estagio : '' }}.
                </p>
              }
              <p class="text-xs text-muted">Você pode salvar mesmo assim.</p>
            </div>
          </div>
        }
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
    .aviso-repetido { display: flex; gap: 10px; align-items: flex-start; border-radius: 10px; padding: 10px 12px; margin-bottom: 8px; font-size: 0.875rem; }
    .aviso-repetido p { margin: 0 0 4px; }
    .aviso-repetido a { text-decoration: underline; font-weight: 600; color: inherit; }
  `,
})
export class OportunidadeDialog implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly negocio = inject(NegocioClient);
  private readonly toast = inject(ToastService);
  protected readonly dados = inject<Oportunidade | null>(MAT_DIALOG_DATA);
  protected readonly ref = inject(MatDialogRef<OportunidadeDialog, boolean>);
  protected readonly tipos = TIPOS;
  protected readonly servicos = signal<ModeloServicoFunil[]>([]);
  protected readonly estagios = signal<EstagioFunil[]>([]);
  protected readonly origens = ORIGENS_FUNIL;
  protected readonly repetidos = signal<ContatoRepetido[]>([]);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  protected readonly form = this.fb.nonNullable.group({
    nome: [this.dados?.nome ?? '', Validators.required],
    estagio: [this.dados?.estagioId ?? '', Validators.required],
    fonte: [this.dados?.fonte ?? ''],
    fonteOutro: [this.dados?.fonteOutro ?? ''],
    retornarEm: this.fb.control<Date | null>(deIsoParaData(this.dados?.retornarEm)),
    retornarHora: [(this.dados?.retornarHora ?? '').slice(0, 5)],
    valorProposta: this.fb.control<number | null>(this.dados?.valorProposta ?? null),
    responsavel: [this.dados?.responsavel ?? ''],
    modeloServicoFunilId: [this.dados?.modeloServicoFunilId ?? null as string | null],
    servicoProduto: [this.dados?.servicoProduto ?? ''],
    motivoDescarte: [this.dados?.motivoDescarte ?? ''],
    tipoEvento: [this.dados?.tipoEvento ?? null as string | null],
    dataPrevista: this.fb.control<Date | null>(deIsoParaData(this.dados?.dataPrevista)),
    quantidadeConvidados: [this.dados?.quantidadeConvidados ?? null as number | null],
    horaConvite: [(this.dados?.horaConvite ?? '').slice(0, 5)],
    horaCerimonia: [(this.dados?.horaCerimonia ?? '').slice(0, 5)],
    horaRecepcao: [(this.dados?.horaRecepcao ?? '').slice(0, 5)],
    horaFesta: [(this.dados?.horaFesta ?? '').slice(0, 5)],
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
    this.vigiarContatoRepetido();
    this.negocio.estagiosFunil().subscribe({
      next: (lista) => {
        this.estagios.set(lista);
        if (!this.form.controls.estagio.value) {
          this.form.controls.estagio.setValue(lista.find((e) => e.tipo === 'Aberto')?.id ?? '');
        }
      },
      error: (erro: unknown) => this.toast.erro(mensagemDeErro(erro)),
    });
  }

  /** Avisa (sem bloquear) quando telefone ou e-mail já existe na conta (SPEC-031 §6.5). */
  private vigiarContatoRepetido(): void {
    this.contatos.valueChanges
      .pipe(debounceTime(500), takeUntilDestroyed(this.destroyRef))
      .subscribe((lista: { telefone?: string; email?: string }[]) => {
        const telefones = lista.map((c) => (c.telefone ?? '').trim()).filter((t) => t.replace(/D/g, '').length >= 8);
        const emails = lista.map((c) => (c.email ?? '').trim()).filter((e) => e.includes('@'));
        if (!telefones.length && !emails.length) {
          this.repetidos.set([]);
          return;
        }
        this.negocio.contatoRepetido(telefones, emails, this.dados?.id).subscribe({
          next: (achados) => this.repetidos.set(achados),
          error: () => this.repetidos.set([]),
        });
      });
  }

  protected irPara(evento: Event, r: ContatoRepetido): void {
    evento.preventDefault();
    this.ref.close();
    if (r.tipo === 'cliente') {
      void this.router.navigate(['/clientes']);
    } else {
      void this.router.navigate(['/oportunidades'], { queryParams: { abrir: r.id } });
    }
  }

  protected ehDescarte(): boolean {
    return this.estagios().find((e) => e.id === this.form.controls.estagio.value)?.tipo === 'Descartado';
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
    if (this.form.controls.fonte.value === 'Outro' && !this.form.controls.fonteOutro.value.trim()) {
      this.toast.erro('Conte de onde veio o contato.');
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
        fonte: v.fonte || null,
        fonteOutro: v.fonte === 'Outro' ? v.fonteOutro.trim() : null,
        retornarEm: deDataParaIso(v.retornarEm),
        retornarHora: v.retornarEm && v.retornarHora ? v.retornarHora : null,
        valorProposta: v.valorProposta,
        responsavel: v.responsavel,
        modeloServicoFunilId: v.modeloServicoFunilId,
        servicoProduto: v.servicoProduto,
        motivoDescarte: v.motivoDescarte,
        tipoEvento: v.tipoEvento,
        dataPrevista: dataIso,
        quantidadeConvidados: v.quantidadeConvidados,
        horarios: null,
        horaConvite: horaParaApi(v.horaConvite),
        horaCerimonia: horaParaApi(v.horaCerimonia),
        horaRecepcao: horaParaApi(v.horaRecepcao),
        horaFesta: horaParaApi(v.horaFesta),
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


/** Pede o motivo do descarte (SPEC-020 §8). */
@Component({
  selector: 'app-descarte-dialog',
  imports: [ReactiveFormsModule, MatDialogModule, MatButtonModule, MatFormFieldModule, MatInputModule],
  template: `
    <h2 mat-dialog-title>Descartar oportunidade</h2>
    <mat-dialog-content>
      <p class="text-sm text-muted mb-4">{{ dados.nome }} sai do funil ativo. O motivo vai para o relatório de descartes.</p>
      @if (dados.sugestao) {
        <p class="text-sm mb-4">O lead recusou a proposta. Confira o motivo antes de descartar.</p>
      }
      <div class="campo">
        <mat-label class="font-semibold mb-2 block">Motivo do descarte</mat-label>
        <mat-form-field appearance="outline" class="w-full">
          <input matInput aria-label="Motivo do descarte" [formControl]="motivo" placeholder="Ex.: preço, data ocupada, desistiu" />
        </mat-form-field>
      </div>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-stroked-button type="button" (click)="ref.close()">Cancelar</button>
      <button mat-flat-button type="button" (click)="confirmar()">Descartar</button>
    </mat-dialog-actions>
  `,
})
export class DescarteDialog {
  /** `sugestao`: motivo que o lead deu ao recusar a proposta (SPEC-031 §6.6, item 7). */
  protected readonly dados = inject<{ nome: string; sugestao?: string | null }>(MAT_DIALOG_DATA);
  protected readonly ref = inject(MatDialogRef<DescarteDialog, string>);
  protected readonly motivo = new FormControl(this.dados.sugestao ?? '', { nonNullable: true, validators: Validators.required });

  protected confirmar(): void {
    const texto = this.motivo.value.trim();
    if (!texto) {
      this.motivo.markAsTouched();
      return;
    }
    this.ref.close(texto);
  }
}

export interface DadosRetorno {
  nome: string;
  data: string | null;
  hora: string | null;
  /** "retornei": a dona acabou de falar com o lead e escolhe o próximo retorno. */
  modo: 'marcar' | 'retornei';
}

/** Resultado: nova data, ou nulo para ficar sem retorno. Fechar sem escolher devolve undefined. */
export type ResultadoRetorno = { data: string; hora: string | null } | null;

/** Marca, muda ou limpa a data de retorno do lead (SPEC-031 §6.3). */
@Component({
  selector: 'app-retorno-dialog',
  imports: [ReactiveFormsModule, MatDialogModule, MatButtonModule, MatFormFieldModule, MatInputModule, CampoDataComponent],
  template: `
    <h2 mat-dialog-title>{{ dados.modo === 'retornei' ? 'Próximo retorno' : 'Retornar em' }}</h2>
    <mat-dialog-content>
      <p class="text-sm text-muted mb-4">
        {{ dados.modo === 'retornei' ? 'Quando você vai falar de novo com ' + dados.nome + '?' : 'Quando você quer voltar a falar com ' + dados.nome + '?' }}
      </p>
      <div class="grid grid-cols-2 gap-4">
        <app-campo-data [formControl]="data" rotulo="Data" />
        <div class="campo">
          <mat-label class="font-semibold mb-2 block">Hora (opcional)</mat-label>
          <mat-form-field appearance="outline" class="w-full"><input aria-label="Hora do retorno" matInput type="time" [formControl]="hora" /></mat-form-field>
        </div>
      </div>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-stroked-button type="button" (click)="ref.close()">Cancelar</button>
      @if (dados.modo === 'retornei' || dados.data) {
        <button mat-button type="button" (click)="ref.close(null)">{{ dados.modo === 'retornei' ? 'Sem próximo retorno' : 'Sem retorno' }}</button>
      }
      <button mat-flat-button type="button" (click)="salvar()">Salvar</button>
    </mat-dialog-actions>
  `,
})
export class RetornoDialog {
  protected readonly dados = inject<DadosRetorno>(MAT_DIALOG_DATA);
  protected readonly ref = inject(MatDialogRef<RetornoDialog, ResultadoRetorno>);
  protected readonly data = new FormControl<Date | null>(this.dados.modo === 'retornei' ? null : deIsoParaData(this.dados.data));
  protected readonly hora = new FormControl(this.dados.modo === 'retornei' ? '' : (this.dados.hora ?? '').slice(0, 5), { nonNullable: true });

  protected salvar(): void {
    const iso = deDataParaIso(this.data.value);
    if (!iso) {
      this.data.markAsTouched();
      return;
    }
    this.ref.close({ data: iso, hora: this.hora.value || null });
  }
}

const DIAS_CURTOS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];

function dataLocal(iso: string): Date {
  const [ano, mes, dia] = iso.slice(0, 10).split('-').map(Number);
  return new Date(ano, mes - 1, dia);
}

/** Retorno vencido, de hoje ou futuro, pela data local. */
export function situacaoRetorno(iso: string, agora: Date = new Date()): 'atrasado' | 'hoje' | 'futuro' {
  const data = dataLocal(iso).getTime();
  const hoje = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate()).getTime();
  return data < hoje ? 'atrasado' : data === hoje ? 'hoje' : 'futuro';
}

/** "sex, 20/11" ou "sex, 20/11 às 14:30". */
export function textoRetorno(iso: string, hora: string | null): string {
  const d = dataLocal(iso);
  const dia = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
  return `${DIAS_CURTOS[d.getDay()]}, ${dia}${hora ? ' às ' + hora.slice(0, 5) : ''}`;
}

/** Origem para mostrar: o item, ou o texto livre quando é "Outro". */
export function textoOrigem(fonte: string | null, outro: string | null): string | null {
  return fonte === 'Outro' && outro ? outro : fonte;
}

/** Ícone do estágio: fixos têm o seu; abertos seguem a posição no funil. */
export function iconeEstagio(estagio: Pick<EstagioFunil, 'nome' | 'tipo'>, indice: number): string {
  if (estagio.tipo === 'Contratado') return 'handshake';
  if (estagio.tipo === 'Descartado') return 'block';
  if (estagio.nome.toLocaleLowerCase('pt-BR').includes('orçamento')) return 'request_quote';
  return indice === 0 ? 'forum' : 'flag';
}

/**
 * Ação rápida do pé do cartão: o próximo estágio aberto, ou "Virar cliente"
 * no último aberto e em Contratado. Descartado não tem ação.
 */
export function acaoRapida(
  estagios: EstagioFunil[],
  estagioId: string,
): { tipo: 'avancar'; destino: EstagioFunil } | { tipo: 'cliente' } | null {
  const atual = estagios.find((e) => e.id === estagioId);
  if (!atual || atual.tipo === 'Descartado') return null;
  if (atual.tipo === 'Contratado') return { tipo: 'cliente' };
  const abertos = estagios.filter((e) => e.tipo === 'Aberto');
  const proximo = abertos[abertos.indexOf(atual) + 1];
  return proximo ? { tipo: 'avancar', destino: proximo } : { tipo: 'cliente' };
}

const ROTULO_TIPO: Record<string, string> = Object.fromEntries(TIPOS.map((t) => [t.valor, t.rotulo]));

/** Dias inteiros desde a data ISO até agora (nunca negativo). */
export function diasDesde(iso: string, agora: Date = new Date()): number {
  const inicio = new Date(iso);
  const ms = agora.getTime() - inicio.getTime();
  return Math.max(0, Math.floor(ms / 86_400_000));
}

/** "hoje", "há 1 dia", "há N dias". */
export function textoDias(dias: number): string {
  if (dias === 0) return 'hoje';
  return dias === 1 ? 'há 1 dia' : `há ${dias} dias`;
}

/** Quadro de oportunidades (SPEC-020 v2 e SPEC-031): leads em cartões pelos estágios da conta. */
@Component({
  selector: 'app-oportunidades',
  imports: [
    MatCardModule, ReactiveFormsModule, MatButtonModule, MatFormFieldModule, MatInputModule, MatIconModule,
    MatSelectModule, MatMenuModule, MatTooltipModule, RouterLink, CampoDataComponent, GdDinheiroPipe, GdDataPipe,
    CdkDropListGroup, CdkDropList, CdkDrag,
  ],
  template: `
    <mat-card class="cardWithShadow">
      <div class="p-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <mat-card-title class="mb-0">Oportunidades</mat-card-title>
          <mat-card-subtitle>
            {{ emAberto().qtd }} {{ emAberto().qtd === 1 ? 'lead em aberto' : 'leads em aberto' }}
            · {{ emAberto().valor | gdDinheiro }} em negociação
          </mat-card-subtitle>
        </div>
        <div class="flex flex-wrap gap-2">
          <button mat-stroked-button type="button" (click)="gerenciarEstagios()"><mat-icon>view_column</mat-icon> Gerenciar estágios</button>
          <button mat-stroked-button type="button" (click)="copiarLinkLead()"><mat-icon>link</mat-icon> Link do lead</button>
          <button mat-stroked-button type="button" (click)="exportar()"><mat-icon>download</mat-icon> Exportar</button>
          <button mat-flat-button type="button" (click)="abrir()"><mat-icon>add</mat-icon> Nova oportunidade</button>
        </div>
      </div>
    </mat-card>

    <div class="totais mb-6">
      @for (estagio of estagios(); track estagio.id; let i = $index) {
        <a class="block no-underline" [href]="'#' + ancora(estagio)" (click)="rolar($event, estagio)">
          <mat-card class="shadow-none text-center mb-0! h-full card-hover" [class]="'bg-light-' + estagio.cor">
            <mat-card-content>
              <mat-icon [class]="'text-' + estagio.cor">{{ icone(estagio, i) }}</mat-icon>
              <h4 class="text-sm font-semibold mt-2!" [class]="'text-' + estagio.cor">{{ estagio.nome }}</h4>
              <h6 class="text-xl font-semibold mt-2!" [class]="'text-' + estagio.cor">{{ resumo(estagio).qtd }}</h6>
              <span class="block text-xs mt-1" [class]="'text-' + estagio.cor">{{ resumo(estagio).valor | gdDinheiro }}</span>
            </mat-card-content>
          </mat-card>
        </a>
      }
    </div>

    <mat-card class="cardWithShadow">
      <mat-card-content>
        <form class="flex flex-wrap items-end gap-4" [formGroup]="filtros" (ngSubmit)="carregar()">
          <div class="campo w-full sm:w-64">
            <mat-label class="font-semibold mb-2 block">Buscar</mat-label>
            <mat-form-field appearance="outline" subscriptSizing="dynamic" class="w-full">
              <mat-icon matIconPrefix>search</mat-icon>
              <input matInput aria-label="Buscar" formControlName="nome" placeholder="Nome do lead" />
            </mat-form-field>
          </div>
          <div class="campo w-full sm:w-48">
            <mat-label class="font-semibold mb-2 block">Tipo de evento</mat-label>
            <mat-form-field appearance="outline" subscriptSizing="dynamic" class="w-full">
              <mat-select aria-label="Tipo de evento" formControlName="tipoEvento">
                <mat-option [value]="''">Todos</mat-option>
                @for (t of tipos; track t.valor) { <mat-option [value]="t.valor">{{ t.rotulo }}</mat-option> }
              </mat-select>
            </mat-form-field>
          </div>
          <app-campo-data class="w-full sm:w-40" formControlName="dataDe" rotulo="Evento de" />
          <app-campo-data class="w-full sm:w-40" formControlName="dataAte" rotulo="Evento até" />
          <div class="campo w-full sm:w-48">
            <mat-label class="font-semibold mb-2 block">Responsável</mat-label>
            <mat-form-field appearance="outline" subscriptSizing="dynamic" class="w-full">
              <input matInput aria-label="Responsável" formControlName="responsavel" />
            </mat-form-field>
          </div>
          <div class="flex gap-2">
            <button mat-flat-button type="submit">Filtrar</button>
            @if (temFiltro()) {
              <button mat-button type="button" (click)="limpar()">Limpar</button>
            }
          </div>
        </form>
      </mat-card-content>
    </mat-card>

    @if (!toque) {
      <p class="dica text-xs text-muted mb-2"><mat-icon>pan_tool</mat-icon> Arraste o cartão para outra coluna para mudar o estágio.</p>
    }
    <div class="quadro" cdkDropListGroup>
      @for (estagio of estagios(); track estagio.id; let i = $index) {
        <section class="coluna" [id]="ancora(estagio)" [style.--cor-estagio]="'var(--color-' + estagio.cor + ')'"
          cdkDropList [cdkDropListData]="estagio" (cdkDropListDropped)="soltar($event)">
          <header class="mb-4">
            <div class="flex items-center gap-2">
              <mat-icon [class]="'text-' + estagio.cor">{{ icone(estagio, i) }}</mat-icon>
              <h3 class="text-base font-semibold">{{ estagio.nome }}</h3>
              <span class="contador ml-auto" [class]="'bg-light-' + estagio.cor + ' text-' + estagio.cor">{{ resumo(estagio).qtd }}</span>
            </div>
            <span class="block text-sm text-muted mt-1">{{ resumo(estagio).valor | gdDinheiro }} no total</span>
          </header>

          @for (item of daColuna(estagio); track item.id) {
            <article class="lead" cdkDrag [cdkDragData]="item" [cdkDragDisabled]="toque"
              (click)="abrir(item)" (keydown.enter)="abrir(item)" tabindex="0" [attr.aria-label]="'Abrir ' + item.nome">
              <div class="flex items-start justify-between gap-2">
                <h4 class="text-sm font-semibold leading-snug">{{ item.nome }}</h4>
                <button mat-icon-button type="button" class="menu-lead" aria-label="Ações do lead"
                  [matMenuTriggerFor]="menu" (click)="$event.stopPropagation()">
                  <mat-icon>more_vert</mat-icon>
                </button>
                <mat-menu #menu="matMenu">
                  <button mat-menu-item type="button" (click)="abrir(item)"><mat-icon>edit</mat-icon> Editar</button>
                  <button mat-menu-item type="button" (click)="briefing(item)"><mat-icon>quiz</mat-icon> Briefing</button>
                  @for (destino of estagios(); track destino.id; let j = $index) {
                    @if (destino.id !== item.estagioId) {
                      <button mat-menu-item type="button" (click)="mover(item, destino)">
                        <mat-icon>{{ icone(destino, j) }}</mat-icon> Mover para {{ destino.nome }}
                      </button>
                    }
                  }
                  @if (item.tipoEstagio === 'Aberto') {
                    <button mat-menu-item type="button" (click)="marcarRetorno(item, 'marcar')"><mat-icon>event</mat-icon> {{ item.retornarEm ? 'Mudar retorno' : 'Marcar retorno' }}</button>
                  }
                  @if (!item.clienteId) {
                    <button mat-menu-item type="button" (click)="virarCliente(item)"><mat-icon>person_add</mat-icon> Virar cliente</button>
                  }
                  @if (auth.podeExcluirDoFunil(item.criadoPor)) {
                    <button mat-menu-item type="button" (click)="excluir(item)"><mat-icon class="text-error">delete</mat-icon> Excluir</button>
                  }
                </mat-menu>
              </div>

              <span class="block text-lg font-semibold mt-1" [class.text-muted]="item.valorProposta == null">
                {{ item.valorProposta == null ? 'Sem valor' : (item.valorProposta | gdDinheiro) }}
              </span>
              @if (item.contatoRepetido) {
                <span class="mt-2" [class]="status.alerta" matTooltip="Telefone ou e-mail igual ao de outro lead ou cliente da conta"><mat-icon class="selo">content_copy</mat-icon> Contato repetido</span>
              }
              @if (item.proposta; as p) {
                <span class="mt-2 ml-1" [class]="seloProposta[p.situacao].classe"
                  [matTooltip]="p.abertaEm ? 'Aberta em ' + (p.abertaEm | gdData) : 'O lead ainda não abriu o link'">
                  <mat-icon class="selo">{{ seloProposta[p.situacao].icone }}</mat-icon>
                  {{ p.situacao === 'Aberta' && p.abertaEm ? 'Aberta em ' + (p.abertaEm | gdData) : seloProposta[p.situacao].texto }}
                </span>
              }

              <ul class="detalhes mt-3">
                @if (item.tipoEvento || item.dataPrevista) {
                  <li>
                    <mat-icon>celebration</mat-icon>
                    <span>{{ tipo(item.tipoEvento) }}{{ item.tipoEvento && item.dataPrevista ? ' · ' : '' }}{{ item.dataPrevista ? (item.dataPrevista | gdData) : '' }}</span>
                  </li>
                }
                @if (item.quantidadeConvidados) {
                  <li><mat-icon>groups</mat-icon><span>{{ item.quantidadeConvidados }} convidados</span></li>
                }
                @if (item.contatos[0]; as contato) {
                  <li>
                    <mat-icon>person</mat-icon>
                    <span class="truncate">{{ contato.nome }}{{ contato.telefone ? ' · ' + contato.telefone : '' }}</span>
                    @if (whatsapp(contato.telefone); as link) {
                      <a class="whats" [href]="link" target="_blank" rel="noopener" matTooltip="Abrir no WhatsApp"
                        aria-label="Abrir no WhatsApp" (click)="$event.stopPropagation()"><mat-icon>chat</mat-icon></a>
                    }
                  </li>
                }
                @if (origem(item); as o) {
                  <li><mat-icon>campaign</mat-icon><span class="truncate">{{ o }}</span></li>
                }
                @if (item.tipoEstagio === 'Aberto' && item.retornarEm) {
                  @let sit = retorno(item.retornarEm);
                  <li class="linha-retorno" [class.text-error]="sit === 'atrasado'" [class.text-warning]="sit === 'hoje'">
                    <mat-icon>event</mat-icon>
                    <span>retornar {{ textoRetorno(item.retornarEm, item.retornarHora) }}</span>
                    @if (sit !== 'futuro') {
                      <button mat-button type="button" class="retornei" (click)="$event.stopPropagation(); marcarRetorno(item, 'retornei')">Retornei</button>
                    }
                  </li>
                }
                @if (item.proposta?.mensagem && (item.proposta?.situacao === 'Duvidas' || item.proposta?.situacao === 'Recusada')) {
                  <li class="mensagem-lead" [class.text-warning]="item.proposta?.situacao === 'Duvidas'">
                    <mat-icon>{{ item.proposta?.situacao === 'Duvidas' ? 'help' : 'chat_bubble' }}</mat-icon>
                    <span>"{{ item.proposta?.mensagem }}"</span>
                  </li>
                }
                @if (item.proposta?.situacao === 'Recusada' && item.tipoEstagio === 'Aberto') {
                  <li class="linha-retorno text-error">
                    <mat-icon>thumb_down</mat-icon>
                    <span>Recusou a proposta</span>
                    <button mat-button type="button" class="retornei" (click)="$event.stopPropagation(); descartarRecusa(item)">Descartar</button>
                  </li>
                }
                @if (item.tipoEstagio === 'Descartado' && item.motivoDescarte) {
                  <li class="text-error"><mat-icon>info</mat-icon><span>{{ item.motivoDescarte }}</span></li>
                }
              </ul>

              <footer class="flex flex-wrap items-center justify-between gap-2 mt-3 pt-3">
                <span class="text-xs text-muted" [matTooltip]="'Entrou em ' + item.estagio + ' em ' + (item.entradaNoEstagioEm | gdData)">
                  <mat-icon class="relogio">schedule</mat-icon> {{ diasNoEstagio(item) }}
                </span>
                @if (item.clienteId) {
                  <a [class]="status.sucesso" routerLink="/clientes" (click)="$event.stopPropagation()">
                    <mat-icon class="selo">verified</mat-icon> Cliente
                  </a>
                } @else {
                  @switch (acao(item)?.tipo) {
                    @case ('avancar') {
                      <button mat-button type="button" class="acao-lead" (click)="$event.stopPropagation(); avancar(item)">
                        {{ proximo(item)?.nome }} <mat-icon iconPositionEnd>arrow_forward</mat-icon>
                      </button>
                    }
                    @case ('cliente') {
                      <button mat-flat-button type="button" class="acao-lead" (click)="$event.stopPropagation(); virarCliente(item)">
                        <mat-icon>person_add</mat-icon> Virar cliente
                      </button>
                    }
                  }
                }
              </footer>
            </article>
          } @empty {
            <p class="vazio text-sm text-muted text-center">Nenhum lead nesta etapa.</p>
          }
        </section>
      }
    </div>
  `,
  styles: `
    .totais { display: grid; gap: 24px; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); }
    .dica { display: flex; align-items: center; gap: 4px; }
    .dica .mat-icon { font-size: 14px; width: 14px; height: 14px; }
    .quadro { display: grid; gap: 24px; align-items: start; grid-template-columns: minmax(0, 1fr); }
    @media (min-width: 768px) {
      .quadro { align-items: stretch; grid-template-columns: none; grid-auto-flow: column; grid-auto-columns: minmax(260px, 1fr); overflow-x: auto; padding-bottom: 8px; }
    }
    .coluna {
      background: var(--mat-card-elevated-container-color, var(--color-light));
      border: 1px solid var(--color-border);
      border-top: 3px solid var(--cor-estagio);
      border-radius: 12px;
      padding: 16px;
      min-height: 200px;
      transition: outline-color 0.15s ease, background-color 0.15s ease;
      outline: 2px dashed transparent;
      outline-offset: -2px;
    }
    .coluna.cdk-drop-list-dragging { outline-color: var(--cor-estagio); }
    .coluna.cdk-drop-list-dragging .vazio { display: none; }
    .contador { border-radius: 999px; padding: 0 8px; font-size: 0.75rem; font-weight: 600; line-height: 20px; }
    .lead {
      background: var(--mat-sys-surface);
      border: 1px solid var(--color-border);
      border-left: 3px solid var(--cor-estagio);
      border-radius: 10px;
      padding: 12px 12px 10px 14px;
      margin-bottom: 12px;
      cursor: pointer;
      transition: box-shadow 0.15s ease, transform 0.15s ease;
    }
    .lead:hover, .lead:focus-visible { box-shadow: 0 6px 18px rgb(0 0 0 / 0.08); transform: translateY(-1px); outline: none; }
    .lead.cdk-drag-preview { box-shadow: 0 12px 28px rgb(0 0 0 / 0.18); transform: rotate(2deg); }
    .lead.cdk-drag-placeholder { opacity: 0.35; }
    .cdk-drag-animating { transition: transform 200ms ease; }
    .lead h4 { margin: 0; padding-top: 6px; overflow-wrap: anywhere; }
    .menu-lead { margin: -6px -8px 0 0; flex: none; }
    .detalhes { list-style: none; margin: 0; padding: 0; display: grid; gap: 6px; }
    .detalhes li { display: flex; align-items: center; gap: 8px; font-size: 0.8125rem; min-width: 0; }
    .detalhes li > .mat-icon { font-size: 16px; width: 16px; height: 16px; flex: none; opacity: 0.7; }
    .whats { margin-left: auto; display: inline-flex; color: var(--color-success); }
    .whats .mat-icon { font-size: 18px; width: 18px; height: 18px; }
    .lead footer { border-top: 1px dashed var(--color-border); }
    .relogio, .selo { font-size: 14px; width: 14px; height: 14px; vertical-align: -2px; }
    a[routerLink] { text-decoration: none; }
    .acao-lead { min-height: 32px; height: 32px; font-size: 0.8125rem; }
    .detalhes li.linha-retorno { flex-wrap: wrap; row-gap: 2px; }
    .retornei { margin-left: auto; min-height: 26px; height: 26px; padding: 0 8px; font-size: 0.75rem; flex: none; }
    .detalhes li.mensagem-lead { align-items: flex-start; font-style: italic; }
    .detalhes li.mensagem-lead span { overflow-wrap: anywhere; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
    .vazio { border: 1px dashed var(--color-border); border-radius: 10px; padding: 24px 12px; margin: 0; }
  `,
})
export class OportunidadesPage implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly negocio = inject(NegocioClient);
  protected readonly auth = inject(AuthService);
  private readonly dialog = inject(MatDialog);
  private readonly toast = inject(ToastService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  protected readonly tipos = TIPOS;
  protected readonly status = STATUS;
  protected readonly seloProposta = SELO_PROPOSTA;
  protected readonly textoRetorno = textoRetorno;
  /** No celular o cartão não arrasta: o caminho é o menu "Mover para…". */
  protected readonly toque = typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches;
  protected readonly estagios = signal<EstagioFunil[]>([]);
  protected readonly lista = signal<Oportunidade[]>([]);
  protected readonly filtros = this.fb.nonNullable.group({
    nome: [''],
    responsavel: [''],
    tipoEvento: [''],
    dataDe: this.fb.control<Date | null>(null),
    dataAte: this.fb.control<Date | null>(null),
  });

  /** Leads ainda em negociação: todos os estágios abertos. */
  protected readonly emAberto = computed(() => {
    const abertos = this.lista().filter((i) => i.tipoEstagio === 'Aberto');
    return { qtd: abertos.length, valor: abertos.reduce((acc, i) => acc + (i.valorProposta ?? 0), 0) };
  });

  ngOnInit(): void {
    this.carregarEstagios();
    this.carregar();
    // "?abrir=id" abre o lead (link do aviso de contato repetido e do card da Hoje).
    this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      const id = params.get('abrir');
      if (!id) return;
      void this.router.navigate([], { queryParams: { abrir: null }, queryParamsHandling: 'merge', replaceUrl: true });
      this.abrirPorId(id);
    });
  }

  protected origem(item: Oportunidade): string | null {
    return textoOrigem(item.fonte, item.fonteOutro);
  }

  protected retorno(iso: string) {
    return situacaoRetorno(iso);
  }

  protected marcarRetorno(item: Oportunidade, modo: DadosRetorno['modo']): void {
    const data: DadosRetorno = { nome: item.nome, data: item.retornarEm, hora: item.retornarHora, modo };
    this.dialog.open(RetornoDialog, { ...DIALOG_PEQUENO, data }).afterClosed().subscribe((r?: ResultadoRetorno) => {
      if (r === undefined) return;
      this.negocio.marcarRetornoOportunidade(item.id, r?.data ?? null, r?.hora ?? null).subscribe({
        next: (atualizado) => {
          this.lista.update((l) => l.map((i) => (i.id === atualizado.id ? { ...atualizado, proposta: atualizado.proposta ?? i.proposta } : i)));
          this.toast.sucesso(r ? `Retorno marcado: ${textoRetorno(r.data, r.hora)}.` : 'Sem retorno marcado.');
        },
        error: (erro: unknown) => this.toast.erro(mensagemDeErro(erro)),
      });
    });
  }

  protected icone(estagio: EstagioFunil, indice: number): string {
    return iconeEstagio(estagio, indice);
  }

  protected ancora(estagio: EstagioFunil): string {
    return 'estagio-' + estagio.id;
  }

  protected tipo(valor: string | null): string {
    return valor ? (ROTULO_TIPO[valor] ?? valor) : '';
  }

  protected diasNoEstagio(item: Oportunidade): string {
    return textoDias(diasDesde(item.entradaNoEstagioEm));
  }

  protected acao(item: Oportunidade) {
    return acaoRapida(this.estagios(), item.estagioId);
  }

  protected proximo(item: Oportunidade): EstagioFunil | null {
    const acao = this.acao(item);
    return acao?.tipo === 'avancar' ? acao.destino : null;
  }

  protected avancar(item: Oportunidade): void {
    const destino = this.proximo(item);
    if (destino) this.mover(item, destino);
  }

  protected whatsapp(telefone: string | null): string | null {
    const digitos = (telefone ?? '').replace(/\D/g, '');
    if (digitos.length < 10) return null;
    return `https://wa.me/${digitos.length <= 11 ? '55' + digitos : digitos}`;
  }

  protected daColuna(estagio: EstagioFunil): Oportunidade[] {
    return this.lista().filter((item) => item.estagioId === estagio.id);
  }

  protected resumo(estagio: EstagioFunil): { qtd: number; valor: number } {
    const itens = this.daColuna(estagio);
    return { qtd: itens.length, valor: itens.reduce((acc, item) => acc + (item.valorProposta ?? 0), 0) };
  }

  protected rolar(evento: Event, estagio: EstagioFunil): void {
    evento.preventDefault();
    document.getElementById(this.ancora(estagio))?.scrollIntoView({ behavior: 'smooth', block: 'start', inline: 'center' });
  }

  protected temFiltro(): boolean {
    const v = this.filtros.getRawValue();
    return !!(v.nome || v.responsavel || v.tipoEvento || v.dataDe || v.dataAte);
  }

  protected limpar(): void {
    this.filtros.reset();
    this.carregar();
  }

  protected gerenciarEstagios(): void {
    this.negocio.estagiosFunil().subscribe({
      next: (atuais) =>
        this.dialog.open(EstagiosFunilDialog, { ...DIALOG, data: atuais }).afterClosed().subscribe((ok) => {
          if (!ok) return;
          this.carregarEstagios();
          this.carregar();
        }),
      error: (erro: unknown) => this.toast.erro(mensagemDeErro(erro)),
    });
  }

  protected briefing(item: Oportunidade): void {
    this.dialog.open(BriefingLeadDialog, { ...DIALOG, data: { id: item.id, nome: item.nome } });
  }

  protected abrir(item?: Oportunidade): void {
    if (item) {
      this.abrirPorId(item.id);
      return;
    }
    this.dialog.open(OportunidadeDialog, { ...DIALOG, data: null }).afterClosed().subscribe((ok) => ok && this.carregar());
  }

  private abrirPorId(id: string): void {
    this.negocio.oportunidade(id).subscribe({
      next: (detalhe) =>
        this.dialog.open(OportunidadeDialog, { ...DIALOG, data: detalhe }).afterClosed().subscribe((ok) => ok && this.carregar()),
      error: (erro: unknown) => this.toast.erro(mensagemDeErro(erro)),
    });
  }

  /** Soltar o cartão noutra coluna (SPEC-031 §6.2). */
  protected soltar(evento: CdkDragDrop<EstagioFunil>): void {
    if (evento.previousContainer === evento.container) return;
    this.mover(evento.item.data as Oportunidade, evento.container.data);
  }

  /** "Não vou seguir": sugere o descarte com o motivo do lead; só descarta se a dona confirmar. */
  protected descartarRecusa(item: Oportunidade): void {
    const destino = this.estagios().find((e) => e.tipo === 'Descartado');
    if (destino) this.mover(item, destino, item.proposta?.mensagem ?? 'Recusou a proposta');
  }

  protected mover(item: Oportunidade, destino: EstagioFunil, sugestao?: string): void {
    if (destino.tipo === 'Descartado') {
      const data = { nome: item.nome, sugestao: sugestao ?? null };
      this.dialog.open(DescarteDialog, { ...DIALOG_PEQUENO, data }).afterClosed().subscribe((motivo?: string) => {
        if (motivo) this.gravarMovimento(item, destino, motivo);
      });
      return;
    }
    this.gravarMovimento(item, destino);
  }

  /**
   * Fim do funil: abre o cadastro de cliente já preenchido com o contato do lead.
   * Ao salvar, o lead fica ligado ao cliente e vai para Contratado.
   */
  protected virarCliente(item: Oportunidade): void {
    const contato = item.contatos[0];
    const telefone = (contato?.telefone ?? '').replace(/\D/g, '');
    const inicial: Partial<Cliente> = {
      nome: contato?.nome ?? item.nome,
      email: contato?.email ?? '',
      celular: telefone.length > 11 && telefone.startsWith('55') ? telefone.slice(2) : telefone,
      observacao: `Veio do funil: ${item.nome}${item.fonte ? ` (origem: ${item.fonte})` : ''}.`,
      cidade: item.cidade ?? undefined,
      estado: item.uf ?? undefined,
    };
    this.dialog.open(ClienteFormDialog, { ...DIALOG, data: inicial }).afterClosed().subscribe((cliente?: Cliente) => {
      if (!cliente) return;
      this.negocio.vincularClienteOportunidade(item.id, cliente.id).subscribe({
        next: () => {
          this.toast.sucesso(`${cliente.nome} agora é cliente. O lead foi para Contratado.`);
          this.carregar();
        },
        error: (erro: unknown) => this.toast.erro(mensagemDeErro(erro)),
      });
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

  private carregarEstagios(): void {
    this.negocio.estagiosFunil().subscribe({
      next: (lista) => this.estagios.set(lista),
      error: (erro: unknown) => this.toast.erro(mensagemDeErro(erro)),
    });
  }

  /** Move já na tela; se a gravação falhar, o cartão volta para a coluna anterior. */
  private gravarMovimento(item: Oportunidade, destino: EstagioFunil, motivoDescarte?: string): void {
    const anterior = this.lista();
    this.lista.set(
      anterior.map((i) =>
        i.id === item.id
          ? { ...i, estagioId: destino.id, estagio: destino.nome, tipoEstagio: destino.tipo, entradaNoEstagioEm: new Date().toISOString(), motivoDescarte: motivoDescarte ?? null }
          : i,
      ),
    );
    this.negocio.moverOportunidade(item.id, { estagio: destino.id, motivoDescarte }).subscribe({
      next: (atualizado) => {
        this.lista.update((l) => l.map((i) => (i.id === atualizado.id ? { ...i, ...atualizado, contatos: i.contatos, proposta: atualizado.proposta ?? i.proposta } : i)));
        this.toast.sucesso(`${item.nome} foi para ${destino.nome}.`);
      },
      error: (erro: unknown) => {
        this.lista.set(anterior);
        this.toast.erro(`Não deu para mover ${item.nome}. ${mensagemDeErro(erro)}`);
      },
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

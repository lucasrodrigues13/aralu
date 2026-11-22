import { HttpBackend, HttpClient } from '@angular/common/http';
import { Component, computed, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormArray, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MAT_DIALOG_DATA, MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTabsModule } from '@angular/material/tabs';
import { mensagemDeErro } from '../../core/mensagem-erro';
import { Fornecedor, NegocioClient, ServicoConta } from '../../core/negocio.client';
import { ToastService } from '../../core/toast.service';
import { CampoDinheiroComponent } from '../../shared/campo-dinheiro';
import { DIALOG_LARGO, DIALOG_PEQUENO } from '../../shared/dialog';
import { NOVO_SERVICO, incluirServico, marcarServico, normalizarBusca, servicoCombina } from './busca-servico';
import { NovoServicoDialog } from './novo-servico.dialog';
import { MascaraDirective } from '../../shared/mascara.directive';
import { TipoMascara, aplicarMascara } from '../../shared/mascaras';
import { MatTooltipModule } from '@angular/material/tooltip';

interface BancoBrasil {
  ispb: string;
  name: string | null;
  code: number | null;
  fullName: string | null;
}

const TIPOS_CONTA = ['Corrente', 'Pagamento', 'Poupança'];
const TIPOS_PIX = [
  { valor: 'Cpf', rotulo: 'CPF' },
  { valor: 'Cnpj', rotulo: 'CNPJ' },
  { valor: 'Email', rotulo: 'E-mail' },
  { valor: 'Telefone', rotulo: 'Telefone celular' },
  { valor: 'Aleatoria', rotulo: 'Chave aleatória' },
];

export const DIALOG_FORNECEDOR = DIALOG_LARGO;

@Component({
  selector: 'app-fornecedor-form-dialog',
  imports: [ReactiveFormsModule, MatDialogModule, MatButtonModule, MatCheckboxModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatTabsModule, MatIconModule, MascaraDirective, CampoDinheiroComponent, MatTooltipModule],
  template: `
    <h2 mat-dialog-title>{{ dados ? 'Editar fornecedor' : 'Novo fornecedor' }}</h2>
    <mat-dialog-content>
      <form class="grid grid-cols-1 gap-4" [formGroup]="form">
        <mat-tab-group dynamicHeight>
          <mat-tab label="Dados">
            <div class="aba">
              <div class="grade">
                <div class="campo">
                  <mat-label class="font-semibold mb-2 block">Nome</mat-label>
                  <mat-form-field appearance="outline" class="w-full"><input [attr.aria-label]="'Nome'" matInput formControlName="nome" /></mat-form-field>
                </div>
                <div class="campo">
                  <mat-label class="font-semibold mb-2 block">Serviços</mat-label>
                  <mat-form-field appearance="outline" class="w-full">
                  <mat-select [attr.aria-label]="'Serviços'" formControlName="servicoContaIds" multiple (openedChange)="aoAbrirServicos($event, buscaServico)" (selectionChange)="aoMudarServicos($event.value)">
                    <mat-option class="opcao-busca" disabled>
                      <input
                        #buscaServico
                        class="input-busca"
                        placeholder="Buscar serviço"
                        aria-label="Buscar serviço"
                        [value]="termoServico()"
                        (input)="filtrarServico($event)"
                        (keydown)="$event.stopPropagation()"
                        (click)="$event.stopPropagation()"
                      />
                    </mat-option>
                    @for (servico of servicos(); track servico.id) {
                      <mat-option [value]="servico.id" [class.oculta]="!servicoCombina(servico, termoServico())">{{ servico.nome }}</mat-option>
                    }
                    @if (nenhumServico()) {
                      <mat-option disabled>Nenhum serviço encontrado</mat-option>
                    }
                    <mat-option [value]="novoServico">Cadastrar novo serviço</mat-option>
                  </mat-select>
                </mat-form-field>
                </div>
                <div class="campo">
                  <mat-label class="font-semibold mb-2 block">Razão social</mat-label>
                  <mat-form-field appearance="outline" class="w-full"><input [attr.aria-label]="'Razão social'" matInput formControlName="razaoSocial" /></mat-form-field>
                </div>
                <div class="campo">
                  <mat-label class="font-semibold mb-2 block">Responsável</mat-label>
                  <mat-form-field appearance="outline" class="w-full"><input [attr.aria-label]="'Responsável'" matInput formControlName="nomeResponsavel" /></mat-form-field>
                </div>
                <div class="campo">
                  <mat-label class="font-semibold mb-2 block">CNPJ</mat-label>
                  <mat-form-field appearance="outline" class="w-full"><input [attr.aria-label]="'CNPJ'" matInput formControlName="cnpj" gdMascara="cnpj" /></mat-form-field>
                </div>
                <div class="campo">
                  <mat-label class="font-semibold mb-2 block">CPF</mat-label>
                  <mat-form-field appearance="outline" class="w-full"><input [attr.aria-label]="'CPF'" matInput formControlName="cpf" gdMascara="cpf" /></mat-form-field>
                </div>
                <app-campo-dinheiro rotulo="Preço de" formControlName="precoDe" />
                <app-campo-dinheiro rotulo="Preço até" formControlName="precoAte" />
              </div>
              <div class="lista" formArrayName="telefones">
                @for (tel of telefones.controls; track $index; let i = $index) {
                  <div class="linha" [formGroupName]="i">
                    <div class="campo">
                      <mat-label class="font-semibold mb-2 block">DDI</mat-label>
                      <mat-form-field appearance="outline" class="w-full"><input [attr.aria-label]="'DDI'" matInput formControlName="ddi" /></mat-form-field>
                    </div>
                    <div class="campo">
                      <mat-label class="font-semibold mb-2 block">Telefone</mat-label>
                      <mat-form-field appearance="outline" class="w-full"><input [attr.aria-label]="'Telefone'" matInput formControlName="numero" gdMascara="celular" /></mat-form-field>
                    </div>
                    <mat-checkbox formControlName="movel">Móvel</mat-checkbox>
                    <button mat-icon-button type="button" aria-label="Remover telefone" matTooltip="Remover telefone" (click)="removerTelefone(i)"><mat-icon>close</mat-icon></button>
                  </div>
                }
                <button mat-stroked-button type="button" class="acao" (click)="adicionarTelefone()">Adicionar telefone</button>
              </div>
              <div class="lista" formArrayName="emails">
                @for (email of emails.controls; track $index; let i = $index) {
                  <div class="linha email" [formGroupName]="i">
                    <div class="campo">
                      <mat-label class="font-semibold mb-2 block">E-mail</mat-label>
                      <mat-form-field appearance="outline" class="w-full"><input [attr.aria-label]="'E-mail'" matInput formControlName="endereco" /></mat-form-field>
                    </div>
                    <button mat-icon-button type="button" aria-label="Remover e-mail" matTooltip="Remover e-mail" (click)="removerEmail(i)"><mat-icon>close</mat-icon></button>
                  </div>
                }
                <button mat-stroked-button type="button" class="acao" (click)="adicionarEmail()">Adicionar e-mail</button>
              </div>
            </div>
          </mat-tab>
          <mat-tab label="Redes sociais">
            <div class="aba">
              <div class="grade">
                <div class="campo">
                  <mat-label class="font-semibold mb-2 block">Site</mat-label>
                  <mat-form-field appearance="outline" class="w-full"><input [attr.aria-label]="'Site'" matInput formControlName="site" /></mat-form-field>
                </div>
                <div class="campo">
                  <mat-label class="font-semibold mb-2 block">Facebook</mat-label>
                  <mat-form-field appearance="outline" class="w-full"><input [attr.aria-label]="'Facebook'" matInput formControlName="facebook" /></mat-form-field>
                </div>
                <div class="campo">
                  <mat-label class="font-semibold mb-2 block">Instagram</mat-label>
                  <mat-form-field appearance="outline" class="w-full"><input [attr.aria-label]="'Instagram'" matInput formControlName="instagram" /></mat-form-field>
                </div>
                <div class="campo">
                  <mat-label class="font-semibold mb-2 block">Youtube</mat-label>
                  <mat-form-field appearance="outline" class="w-full"><input [attr.aria-label]="'Youtube'" matInput formControlName="youtube" /></mat-form-field>
                </div>
                <div class="campo">
                  <mat-label class="font-semibold mb-2 block">Pinterest</mat-label>
                  <mat-form-field appearance="outline" class="w-full"><input [attr.aria-label]="'Pinterest'" matInput formControlName="pinterest" /></mat-form-field>
                </div>
              </div>
            </div>
          </mat-tab>
          <mat-tab label="Endereço">
            <div class="aba">
              <div class="grade">
                <div class="campo">
                  <mat-label class="font-semibold mb-2 block">CEP</mat-label>
                  <mat-form-field appearance="outline" class="w-full"><input [attr.aria-label]="'CEP'" matInput formControlName="cep" gdMascara="cep" (blur)="completarCep()" /></mat-form-field>
                </div>
                <div class="campo">
                  <mat-label class="font-semibold mb-2 block">País</mat-label>
                  <mat-form-field appearance="outline" class="w-full"><input [attr.aria-label]="'País'" matInput formControlName="pais" /></mat-form-field>
                </div>
                <div class="campo">
                  <mat-label class="font-semibold mb-2 block">Endereço</mat-label>
                  <mat-form-field appearance="outline" class="w-full"><input [attr.aria-label]="'Endereço'" matInput formControlName="endereco" /></mat-form-field>
                </div>
                <div class="campo">
                  <mat-label class="font-semibold mb-2 block">Número</mat-label>
                  <mat-form-field appearance="outline" class="w-full"><input [attr.aria-label]="'Número'" matInput formControlName="numero" /></mat-form-field>
                </div>
                <div class="campo">
                  <mat-label class="font-semibold mb-2 block">Estado</mat-label>
                  <mat-form-field appearance="outline" class="w-full"><input [attr.aria-label]="'Estado'" matInput formControlName="estado" /></mat-form-field>
                </div>
                <div class="campo">
                  <mat-label class="font-semibold mb-2 block">Cidade</mat-label>
                  <mat-form-field appearance="outline" class="w-full"><input [attr.aria-label]="'Cidade'" matInput formControlName="cidade" /></mat-form-field>
                </div>
                <div class="campo">
                  <mat-label class="font-semibold mb-2 block">Bairro</mat-label>
                  <mat-form-field appearance="outline" class="w-full"><input [attr.aria-label]="'Bairro'" matInput formControlName="bairro" /></mat-form-field>
                </div>
                <div class="campo">
                  <mat-label class="font-semibold mb-2 block">Complemento</mat-label>
                  <mat-form-field appearance="outline" class="w-full"><input [attr.aria-label]="'Complemento'" matInput formControlName="complemento" /></mat-form-field>
                </div>
              </div>
            </div>
          </mat-tab>
          <mat-tab label="Dados bancários">
            <div class="aba">
              <div class="grade">
                <div class="campo">
                  <mat-label class="font-semibold mb-2 block">Banco</mat-label>
                  <mat-form-field appearance="outline" class="w-full">
                  <mat-select [attr.aria-label]="'Banco'" formControlName="banco" (openedChange)="aoAbrirBancos($event, buscaBanco)">
                    <mat-option class="opcao-busca" disabled>
                      <input
                        #buscaBanco
                        class="input-busca"
                        placeholder="Buscar banco"
                        [value]="termoBanco()"
                        (input)="filtrarBanco($event)"
                        (keydown)="$event.stopPropagation()"
                        (click)="$event.stopPropagation()"
                      />
                    </mat-option>
                    @if (carregandoBancos()) {
                      <mat-option disabled>Carregando bancos…</mat-option>
                    } @else if (bancosFiltrados().length === 0) {
                      <mat-option disabled>Nenhum banco encontrado</mat-option>
                    } @else {
                      @for (banco of bancosFiltrados(); track banco.ispb) {
                        <mat-option [value]="rotuloBanco(banco)">{{ rotuloBanco(banco) }}</mat-option>
                      }
                    }
                  </mat-select>
                </mat-form-field>
                </div>
                <div class="campo">
                  <mat-label class="font-semibold mb-2 block">Agência</mat-label>
                  <mat-form-field appearance="outline" class="w-full">
                  <input [attr.aria-label]="'Agência'" matInput formControlName="agencia" gdMascara="agencia" placeholder="0000-0" />
                </mat-form-field>
                </div>
                <div class="campo">
                  <mat-label class="font-semibold mb-2 block">Conta</mat-label>
                  <mat-form-field appearance="outline" class="w-full">
                  <input [attr.aria-label]="'Conta'" matInput formControlName="contaBancaria" gdMascara="conta" placeholder="00000000-0" />
                </mat-form-field>
                </div>
                <div class="campo">
                  <mat-label class="font-semibold mb-2 block">Titular</mat-label>
                  <mat-form-field appearance="outline" class="w-full"><input [attr.aria-label]="'Titular'" matInput formControlName="titularConta" /></mat-form-field>
                </div>
                <div class="campo">
                  <mat-label class="font-semibold mb-2 block">Tipo de conta</mat-label>
                  <mat-form-field appearance="outline" class="w-full">
                  <mat-select [attr.aria-label]="'Tipo de conta'" formControlName="tipoConta">
                    <mat-option value="">Selecione</mat-option>
                    @for (tipo of opcoesTipoConta(); track tipo) {
                      <mat-option [value]="tipo">{{ tipo }}</mat-option>
                    }
                  </mat-select>
                </mat-form-field>
                </div>
                <div class="campo">
                  <mat-label class="font-semibold mb-2 block">CPF ou CNPJ</mat-label>
                  <mat-form-field appearance="outline" class="w-full">
                  <input [attr.aria-label]="'CPF ou CNPJ'" matInput formControlName="documentosBancarios" gdMascara="documento" (input)="aoDigitarDocumento()" />
                </mat-form-field>
                </div>
                <div class="campo">
                  <mat-label class="font-semibold mb-2 block">Tipo Chave Pix</mat-label>
                  <mat-form-field appearance="outline" class="w-full">
                  <mat-select [attr.aria-label]="'Tipo Chave Pix'" formControlName="pixTipo">
                    <mat-option value="">Selecione</mat-option>
                    @if (pixTipoAvulso(); as avulso) {
                      <mat-option [value]="avulso">{{ avulso }}</mat-option>
                    }
                    @for (tipo of tiposPix; track tipo.valor) {
                      <mat-option [value]="tipo.valor">{{ tipo.rotulo }}</mat-option>
                    }
                  </mat-select>
                </mat-form-field>
                </div>
                <div class="campo">
                  <mat-label class="font-semibold mb-2 block">Chave Pix</mat-label>
                  <mat-form-field appearance="outline" class="w-full">
                  @if (pixDocumento()) {
                    <input [attr.aria-label]="'Chave Pix'" matInput formControlName="pixChave" />
                  } @else if (mascaraPix(); as mascara) {
                    <input matInput formControlName="pixChave" [gdMascara]="mascara" />
                  } @else {
                    <input matInput formControlName="pixChave" maxlength="77" />
                  }
                </mat-form-field>
                </div>
              </div>
            </div>
          </mat-tab>
          <mat-tab label="Orçamentos">
            <div class="aba" formArrayName="orcamentos">
              @for (orc of orcamentos.controls; track $index; let i = $index) {
                <div class="linha orcamento" [formGroupName]="i">
                  <div class="campo">
                    <mat-label class="font-semibold mb-2 block">Título</mat-label>
                    <mat-form-field appearance="outline" class="w-full"><input [attr.aria-label]="'Título'" matInput formControlName="titulo" /></mat-form-field>
                  </div>
                  <div class="campo">
                    <mat-label class="font-semibold mb-2 block">Link</mat-label>
                    <mat-form-field appearance="outline" class="w-full"><input [attr.aria-label]="'Link'" matInput formControlName="link" /></mat-form-field>
                  </div>
                  <mat-checkbox formControlName="visivelClientes">Visível</mat-checkbox>
                  <button mat-icon-button type="button" aria-label="Remover orçamento" matTooltip="Remover orçamento" (click)="removerOrcamento(i)"><mat-icon>close</mat-icon></button>
                </div>
              }
              <button mat-stroked-button type="button" class="acao" (click)="adicionarOrcamento()">Adicionar orçamento</button>
            </div>
          </mat-tab>
          <mat-tab label="Diferencial">
            <div class="aba">
              <div class="campo full">
                <mat-label class="font-semibold mb-2 block">Diferencial</mat-label>
                <mat-form-field appearance="outline" class="w-full"><textarea [attr.aria-label]="'Diferencial'" matInput rows="4" formControlName="diferencial"></textarea></mat-form-field>
              </div>
              <mat-checkbox formControlName="diferencialVisivelCliente">Visível ao cliente</mat-checkbox>
            </div>
          </mat-tab>
          <mat-tab label="Inf. gerais">
            <div class="aba">
              <div class="campo full">
                <mat-label class="font-semibold mb-2 block">Informações gerais</mat-label>
                <mat-form-field appearance="outline" class="w-full"><textarea [attr.aria-label]="'Informações gerais'" matInput rows="4" formControlName="informacoesGerais"></textarea></mat-form-field>
              </div>
            </div>
          </mat-tab>
          <mat-tab label="Portfólio">
            <div class="aba">
              <div class="campo full">
                <mat-label class="font-semibold mb-2 block">Portfólio</mat-label>
                <mat-form-field appearance="outline" class="w-full"><textarea [attr.aria-label]="'Portfólio'" matInput rows="4" formControlName="portfolio"></textarea></mat-form-field>
              </div>
            </div>
          </mat-tab>
        </mat-tab-group>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-stroked-button type="button" (click)="ref.close()">Cancelar</button>
      <button mat-flat-button type="button" (click)="salvar()">Salvar</button>
    </mat-dialog-actions>
  `,
  styles: `
    :host {
      display: flex;
      flex-direction: column;
      min-height: 0;
      max-height: 90vh;
      overflow: hidden;
    }
    .aba { padding: 12px 0 4px; display: flex; flex-direction: column; gap: 12px; }
    .grade {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 4px 16px;
      align-items: start;
    }
    .lista { display: flex; flex-direction: column; gap: 8px; }
    .linha {
      display: grid;
      grid-template-columns: 120px minmax(0, 1fr) auto auto;
      gap: 8px 12px;
      align-items: center;
    }
    .linha.email { grid-template-columns: minmax(0, 1fr) auto; }
    .linha.orcamento { grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) auto auto; }
    :host ::ng-deep .oculta { display: none; }
    .acao { align-self: flex-start; justify-self: start; }
    .full { width: 100%; }
    @media (max-width: 720px) {
      .grade,
      .linha,
      .linha.email,
      .linha.orcamento { grid-template-columns: 1fr; }
    }
  `,
})
export class FornecedorFormDialog implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly negocio = inject(NegocioClient);
  private readonly dialog = inject(MatDialog);
  private readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly http = new HttpClient(inject(HttpBackend));
  protected readonly dados = inject<Fornecedor | null>(MAT_DIALOG_DATA);
  protected readonly ref = inject(MatDialogRef<FornecedorFormDialog, boolean>);
  protected readonly servicos = signal<ServicoConta[]>([]);
  protected readonly termoServico = signal('');
  protected readonly novoServico = NOVO_SERVICO;
  protected readonly servicoCombina = servicoCombina;
  protected readonly nenhumServico = computed(() => {
    const lista = this.servicos();
    return lista.length > 0 && !lista.some((servico) => servicoCombina(servico, this.termoServico()));
  });
  protected readonly bancos = signal<BancoBrasil[]>([]);
  protected readonly termoBanco = signal('');
  protected readonly carregandoBancos = signal(true);
  protected readonly tiposPix = TIPOS_PIX;
  private tipoPixAtual = '';

  protected readonly form = this.fb.group({
    nome: [this.dados?.nome ?? '', Validators.required],
    servicoContaIds: [this.dados?.servicoContaIds ?? [] as string[], Validators.required],
    razaoSocial: [this.dados?.razaoSocial ?? ''],
    cnpj: [aplicarMascara(this.dados?.cnpj ?? '', 'cnpj')],
    cpf: [aplicarMascara(this.dados?.cpf ?? '', 'cpf')],
    nomeResponsavel: [this.dados?.nomeResponsavel ?? ''],
    precoDe: [this.dados?.precoDe ?? null as number | null],
    precoAte: [this.dados?.precoAte ?? null as number | null],
    site: [this.dados?.site ?? ''],
    facebook: [this.dados?.facebook ?? ''],
    instagram: [this.dados?.instagram ?? ''],
    youtube: [this.dados?.youtube ?? ''],
    pinterest: [this.dados?.pinterest ?? ''],
    pais: [this.dados?.pais ?? ''],
    cep: [aplicarMascara(this.dados?.cep ?? '', 'cep')],
    endereco: [this.dados?.endereco ?? ''],
    numero: [this.dados?.numero ?? ''],
    estado: [this.dados?.estado ?? ''],
    cidade: [this.dados?.cidade ?? ''],
    bairro: [this.dados?.bairro ?? ''],
    complemento: [this.dados?.complemento ?? ''],
    banco: [this.dados?.banco ?? ''],
    agencia: [aplicarMascara(this.dados?.agencia ?? '', 'agencia')],
    contaBancaria: [aplicarMascara(this.dados?.contaBancaria ?? '', 'conta')],
    titularConta: [this.dados?.titularConta ?? ''],
    tipoConta: [normalizarTipoConta(this.dados?.tipoConta)],
    documentosBancarios: [aplicarMascara(this.dados?.documentosBancarios ?? '', 'documento')],
    pixTipo: [normalizarPix(this.dados?.pixTipo)],
    pixChave: [this.dados?.pixChave ?? ''],
    diferencial: [this.dados?.diferencial ?? ''],
    diferencialVisivelCliente: [this.dados?.diferencialVisivelCliente ?? false],
    informacoesGerais: [this.dados?.informacoesGerais ?? ''],
    portfolio: [this.dados?.portfolio ?? ''],
    telefones: this.fb.array([]),
    emails: this.fb.array([]),
    orcamentos: this.fb.array([]),
  });

  protected get telefones(): FormArray {
    return this.form.get('telefones') as FormArray;
  }

  protected get emails(): FormArray {
    return this.form.get('emails') as FormArray;
  }

  protected get orcamentos(): FormArray {
    return this.form.get('orcamentos') as FormArray;
  }

  ngOnInit(): void {
    this.sincronizarPix(false);
    this.form.controls.pixTipo.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => this.sincronizarPix(true));
    this.negocio.servicosConta().subscribe({
      next: (lista) => this.servicos.set(lista),
      error: () => this.servicos.set([]),
    });
    this.http.get<BancoBrasil[]>('https://brasilapi.com.br/api/banks/v1').subscribe({
      next: (lista) => {
        this.bancos.set([...lista].sort(compararBancos));
        this.carregandoBancos.set(false);
      },
      error: () => {
        this.carregandoBancos.set(false);
        this.toast.erro('Não foi possível carregar a lista de bancos.');
      },
    });
    for (const tel of this.dados?.telefones ?? []) {
      this.telefones.push(this.fb.group({
        responsavel: [tel.responsavel ?? ''],
        ddi: [tel.ddi ?? '55'],
        numero: [aplicarMascara(tel.numero, 'celular')],
        movel: [tel.movel],
      }));
    }
    for (const email of this.dados?.emails ?? []) {
      this.emails.push(this.fb.group({ endereco: [email.endereco] }));
    }
    for (const orc of this.dados?.orcamentos ?? []) {
      this.orcamentos.push(this.fb.group({
        titulo: [orc.titulo],
        link: [orc.link ?? ''],
        visivelClientes: [orc.visivelClientes],
      }));
    }
  }

  protected filtrarServico(evento: Event): void {
    this.termoServico.set((evento.target as HTMLInputElement).value);
  }

  protected aoAbrirServicos(aberto: boolean, campo: HTMLInputElement): void {
    if (!aberto) {
      return;
    }
    this.termoServico.set('');
    campo.value = '';
    setTimeout(() => campo.focus());
  }

  protected aoMudarServicos(valor: string[]): void {
    if (!valor.includes(NOVO_SERVICO)) {
      return;
    }
    this.form.controls.servicoContaIds.setValue(valor.filter((id) => id !== NOVO_SERVICO));
    this.dialog.open(NovoServicoDialog, DIALOG_PEQUENO).afterClosed().subscribe((criados?: ServicoConta[]) => {
      if (!criados?.length) {
        return;
      }
      this.servicos.update((lista) => criados.reduce(incluirServico, lista));
      const controle = this.form.controls.servicoContaIds;
      controle.setValue(criados.reduce((ids, servico) => marcarServico(ids, servico.id), controle.value ?? []));
    });
  }

  protected opcoesTipoConta(): string[] {
    const atual = this.form.controls.tipoConta.value ?? '';
    if (atual && !TIPOS_CONTA.includes(atual)) {
      return [atual, ...TIPOS_CONTA];
    }
    return TIPOS_CONTA;
  }

  protected bancosFiltrados(): BancoBrasil[] {
    const termo = normalizarBusca(this.termoBanco());
    const lista = this.bancos();
    if (!termo) {
      return lista;
    }
    return lista.filter((banco) => {
      const rotulo = normalizarBusca(this.rotuloBanco(banco));
      const codigo = banco.code == null ? '' : String(banco.code);
      return rotulo.includes(termo) || codigo.includes(termo) || banco.ispb.includes(termo);
    });
  }

  protected rotuloBanco(banco: BancoBrasil): string {
    const nome = banco.fullName?.trim() || banco.name?.trim() || 'Banco';
    if (banco.code == null) {
      return nome;
    }
    return `${String(banco.code).padStart(3, '0')} — ${nome}`;
  }

  protected filtrarBanco(evento: Event): void {
    this.termoBanco.set((evento.target as HTMLInputElement).value);
  }

  protected aoAbrirBancos(aberto: boolean, campo: HTMLInputElement): void {
    if (!aberto) {
      return;
    }
    this.termoBanco.set('');
    campo.value = '';
    setTimeout(() => campo.focus());
  }

  protected pixTipoAvulso(): string | null {
    const atual = this.form.controls.pixTipo.value ?? '';
    if (atual && !TIPOS_PIX.some((tipo) => tipo.valor === atual)) {
      return atual;
    }
    return null;
  }

  protected pixDocumento(): boolean {
    const tipo = this.form.controls.pixTipo.value;
    return tipo === 'Cpf' || tipo === 'Cnpj';
  }

  protected mascaraPix(): TipoMascara | null {
    return mascaraDoPix(this.form.controls.pixTipo.value);
  }

  protected aoDigitarDocumento(): void {
    setTimeout(() => {
      if (this.pixDocumento()) {
        this.form.controls.pixChave.setValue(this.form.controls.documentosBancarios.value ?? '', { emitEvent: false });
      }
    });
  }

  protected adicionarTelefone(): void {
    this.telefones.push(this.fb.group({ responsavel: [''], ddi: ['55'], numero: [''], movel: [true] }));
  }

  protected removerTelefone(i: number): void {
    this.telefones.removeAt(i);
  }

  protected adicionarEmail(): void {
    this.emails.push(this.fb.group({ endereco: [''] }));
  }

  protected removerEmail(i: number): void {
    this.emails.removeAt(i);
  }

  protected adicionarOrcamento(): void {
    this.orcamentos.push(this.fb.group({ titulo: [''], link: [''], visivelClientes: [false] }));
  }

  protected removerOrcamento(i: number): void {
    this.orcamentos.removeAt(i);
  }

  protected completarCep(): void {
    const digitos = (this.form.controls.cep.value ?? '').replace(/\D/g, '');
    if (digitos.length !== 8) {
      return;
    }
    this.negocio.cep(digitos).subscribe({
      next: (endereco) => this.form.patchValue({
        pais: endereco.pais || 'Brasil',
        endereco: endereco.endereco,
        estado: endereco.estado,
        cidade: endereco.cidade,
        bairro: endereco.bairro,
      }),
      error: () => undefined,
    });
  }

  protected salvar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.toast.erro('Informe o nome e ao menos um serviço.');
      return;
    }
    const valor = this.form.getRawValue() as Record<string, unknown> & {
      cnpj: string | null;
      cpf: string | null;
      precoDe: number | string | null;
      precoAte: number | string | null;
      telefones: { numero?: string }[];
      emails: { endereco?: string }[];
      orcamentos: { titulo?: string }[];
    };
    const pedido = {
      ...valor,
      cnpj: valor.cnpj || null,
      cpf: valor.cpf || null,
      precoDe: typeof valor.precoDe === 'number' ? valor.precoDe : null,
      precoAte: typeof valor.precoAte === 'number' ? valor.precoAte : null,
      telefones: (valor.telefones ?? []).filter((t) => t.numero),
      emails: (valor.emails ?? []).filter((e) => e.endereco),
      orcamentos: (valor.orcamentos ?? []).filter((o) => o.titulo),
    };
    const req = this.dados
      ? this.negocio.atualizarFornecedor(this.dados.id, pedido)
      : this.negocio.criarFornecedor(pedido);
    req.subscribe({
      next: () => {
        this.toast.sucesso('Fornecedor salvo.');
        this.ref.close(true);
      },
      error: (erro: unknown) => this.toast.erro(mensagemDeErro(erro)),
    });
  }

  private sincronizarPix(limpar: boolean): void {
    const tipo = this.form.controls.pixTipo.value ?? '';
    const chave = this.form.controls.pixChave;
    if (tipo === 'Cpf' || tipo === 'Cnpj') {
      chave.disable({ emitEvent: false });
      chave.setValue(this.form.controls.documentosBancarios.value ?? '', { emitEvent: false });
    } else {
      const bloqueada = chave.disabled;
      chave.enable({ emitEvent: false });
      if (limpar && (bloqueada || this.tipoPixAtual !== tipo)) {
        chave.setValue('', { emitEvent: false });
      } else {
        const mascara = mascaraDoPix(tipo);
        if (mascara) {
          chave.setValue(aplicarMascara(chave.value ?? '', mascara), { emitEvent: false });
        }
      }
    }
    this.tipoPixAtual = tipo;
  }
}

function mascaraDoPix(tipo: string | null | undefined): TipoMascara | null {
  if (tipo === 'Telefone') {
    return 'pixTelefone';
  }
  if (tipo === 'Aleatoria') {
    return 'pixAleatoria';
  }
  return null;
}

function normalizarTipoConta(valor: string | null | undefined): string {
  const texto = (valor ?? '').trim();
  const chave = texto.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '');
  if (chave.startsWith('corr')) {
    return 'Corrente';
  }
  if (chave.startsWith('pag')) {
    return 'Pagamento';
  }
  if (chave.startsWith('poup')) {
    return 'Poupança';
  }
  return texto;
}

function normalizarPix(valor: string | null | undefined): string {
  const texto = (valor ?? '').trim().toLowerCase();
  if (!texto) {
    return '';
  }
  if (texto.includes('cnpj')) {
    return 'Cnpj';
  }
  if (texto === 'cpf' || texto.includes('cpf')) {
    return 'Cpf';
  }
  if (texto.includes('mail')) {
    return 'Email';
  }
  if (texto.includes('tel') || texto.includes('cel') || texto.includes('fone')) {
    return 'Telefone';
  }
  if (texto.includes('aleat') || texto.includes('evp')) {
    return 'Aleatoria';
  }
  return (valor ?? '').trim();
}

function compararBancos(a: BancoBrasil, b: BancoBrasil): number {
  if (a.code == null && b.code == null) {
    return (a.fullName || a.name || '').localeCompare(b.fullName || b.name || '', 'pt');
  }
  if (a.code == null) {
    return 1;
  }
  if (b.code == null) {
    return -1;
  }
  return a.code - b.code || (a.fullName || '').localeCompare(b.fullName || '', 'pt');
}

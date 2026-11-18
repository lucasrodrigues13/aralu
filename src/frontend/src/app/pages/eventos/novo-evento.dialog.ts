import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { Router } from '@angular/router';
import { mensagemDeErro } from '../../core/mensagem-erro';
import { Cliente, Modelo, NegocioClient, TIPOS } from '../../core/negocio.client';
import { ToastService } from '../../core/toast.service';
import { CampoDataComponent } from '../../shared/campo-data';
import { CampoHoraComponent } from '../../shared/campo-hora';
import { deDataParaIso } from '../../shared/data';
import { MascaraDirective } from '../../shared/mascara.directive';
import { horaParaApi, soDigitos } from '../../shared/mascaras';

const ICONES: Record<string, string> = {
  Casamento: 'favorite',
  QuinzeAnos: 'auto_awesome',
  Aniversario: 'cake',
  Corporativo: 'business_center',
  Formatura: 'school',
};

/** Valor do autocomplete que pede o cadastro de um cliente novo. */
const NOVO_CLIENTE = '__novo__';

/** Criação curta do evento num modal só (SPEC-008 v2, 6.1). */
@Component({
  selector: 'app-novo-evento',
  imports: [
    ReactiveFormsModule, MatDialogModule, MatButtonModule, MatFormFieldModule, MatInputModule,
    MatIconModule, MatAutocompleteModule, CampoDataComponent, CampoHoraComponent, MascaraDirective,
  ],
  template: `
    <h2 mat-dialog-title>Novo evento</h2>
    <p class="gd-dialog-descricao">Só o tipo e o nome são obrigatórios. O resto pode ficar para depois.</p>
    <mat-dialog-content>
      <form id="novo-evento-form" class="gd-campos duas" [formGroup]="form" (ngSubmit)="criar()">
        <fieldset class="inteiro gd-grupo-opcoes">
          <legend class="gd-rotulo">Tipo do evento <span class="gd-obrigatorio">*</span></legend>
          <div class="gd-opcoes">
            @for (opcao of tipos; track opcao.valor) {
              <button
                type="button"
                class="gd-opcao"
                [class.ativa]="tipo() === opcao.valor"
                [attr.aria-pressed]="tipo() === opcao.valor"
                (click)="escolherTipo(opcao.valor)"
              >
                <mat-icon>{{ icone(opcao.valor) }}</mat-icon>
                <span>{{ opcao.rotulo }}</span>
              </button>
            }
          </div>
        </fieldset>

        @if (tipo()) {
          <fieldset class="inteiro gd-grupo-opcoes">
            <legend class="gd-rotulo">Pacote</legend>
            <div class="gd-opcoes largas">
              @for (modelo of modelosDoTipo(); track modelo.id) {
                <button
                  type="button"
                  class="gd-opcao"
                  [class.ativa]="modeloId() === modelo.id"
                  [attr.aria-pressed]="modeloId() === modelo.id"
                  (click)="modeloId.set(modelo.id)"
                >
                  <strong>{{ modelo.nome }}</strong>
                  <span class="gd-sub">{{ contagem(modelo) }}</span>
                </button>
              }
              <button
                type="button"
                class="gd-opcao"
                [class.ativa]="modeloId() === ''"
                [attr.aria-pressed]="modeloId() === ''"
                (click)="modeloId.set('')"
              >
                <strong>Começar vazio</strong>
                <span class="gd-sub">Sem tarefas nem serviços</span>
              </button>
            </div>
            @if (modelosDoTipo().length === 0) {
              <p class="gd-apoio">Crie modelos em Modelos de evento para já começar com tarefas e serviços.</p>
            }
          </fieldset>

          @if (tipo() === 'Casamento') {
            <mat-form-field><mat-label>Nome da noiva</mat-label><input matInput formControlName="primeiroNome" required /></mat-form-field>
            <mat-form-field><mat-label>Nome do noivo</mat-label><input matInput formControlName="segundoNome" required /></mat-form-field>
          } @else {
            <mat-form-field class="inteiro"><mat-label>{{ rotuloNome() }}</mat-label><input matInput formControlName="primeiroNome" required /></mat-form-field>
          }
          <app-campo-data rotulo="Data" formControlName="data" />
          <app-campo-hora rotulo="Horário" formControlName="hora" />
          <mat-form-field><mat-label>Convidados estimados</mat-label><input matInput type="number" min="0" formControlName="convidados" /></mat-form-field>
          <mat-form-field><mat-label>Local</mat-label><input matInput formControlName="local" placeholder="Nome do espaço" /></mat-form-field>

          <mat-form-field class="inteiro">
            <mat-label>Cliente</mat-label>
            <input
              matInput
              formControlName="buscaCliente"
              [matAutocomplete]="listaClientes"
              placeholder="Busque pelo nome ou deixe em branco"
            />
            <mat-autocomplete #listaClientes="matAutocomplete" (optionSelected)="escolherCliente($event.option.value)">
              @for (cliente of clientesFiltrados(); track cliente.id) {
                <mat-option [value]="cliente.id">{{ cliente.nome }} <span class="gd-sub">· {{ cliente.celular }}</span></mat-option>
              }
              <mat-option [value]="novoCliente">
                <mat-icon>person_add</mat-icon> Cadastrar novo{{ busca() ? ': ' + busca() : '' }}
              </mat-option>
            </mat-autocomplete>
            @if (clienteEscolhido(); as cliente) {
              <mat-hint>Vinculado: {{ cliente.nome }}</mat-hint>
            }
          </mat-form-field>
          @if (cadastrandoCliente()) {
            <mat-form-field><mat-label>Nome do cliente</mat-label><input matInput formControlName="clienteNome" required /></mat-form-field>
            <mat-form-field>
              <mat-label>WhatsApp</mat-label>
              <input matInput formControlName="clienteWhatsApp" gdMascara="celular" inputmode="tel" placeholder="(00) 00000-0000" required />
            </mat-form-field>
          }
        }
      </form>
    </mat-dialog-content>
    <mat-dialog-actions>
      <button mat-button class="gd-secundario" type="button" mat-dialog-close>Cancelar</button>
      <button mat-flat-button type="submit" form="novo-evento-form" [disabled]="!tipo() || salvando()">Criar evento</button>
    </mat-dialog-actions>
  `,
})
export class NovoEventoDialog implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly negocio = inject(NegocioClient);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  private readonly ref = inject(MatDialogRef<NovoEventoDialog, string>);
  protected readonly tipos = TIPOS;
  protected readonly novoCliente = NOVO_CLIENTE;
  protected readonly tipo = signal('');
  protected readonly modeloId = signal('');
  protected readonly modelos = signal<Modelo[]>([]);
  protected readonly clientes = signal<Cliente[]>([]);
  protected readonly clienteEscolhido = signal<Cliente | null>(null);
  protected readonly cadastrandoCliente = signal(false);
  protected readonly busca = signal('');
  protected readonly salvando = signal(false);
  protected readonly modelosDoTipo = computed(() => this.modelos().filter((modelo) => modelo.tipo === this.tipo()));
  protected readonly clientesFiltrados = computed(() => {
    const termo = normalizar(this.busca());
    return this.clientes().filter((cliente) => !termo || normalizar(cliente.nome).includes(termo)).slice(0, 8);
  });
  protected readonly rotuloNome = computed(() => (this.tipo() === 'Corporativo' || this.tipo() === 'Formatura' ? 'Nome do evento' : 'Nome'));

  protected readonly form = this.fb.nonNullable.group({
    primeiroNome: '',
    segundoNome: '',
    data: this.fb.control<Date | null>(null),
    hora: '',
    convidados: '',
    local: '',
    buscaCliente: '',
    clienteNome: '',
    clienteWhatsApp: '',
  });

  ngOnInit(): void {
    this.negocio.modelos().subscribe({
      next: (lista) => this.modelos.set(lista),
      error: (erro: unknown) => this.toast.erro(mensagemDeErro(erro)),
    });
    this.negocio.clientes().subscribe({ next: (lista) => this.clientes.set(lista), error: () => this.clientes.set([]) });
    this.form.controls.buscaCliente.valueChanges.subscribe((valor) => {
      // Ao escolher uma opção o campo recebe o id; o texto exibido é tratado em escolherCliente.
      if (valor === NOVO_CLIENTE || this.clientes().some((cliente) => cliente.id === valor)) return;
      this.busca.set(valor);
      if (this.clienteEscolhido() && valor !== this.clienteEscolhido()!.nome) this.clienteEscolhido.set(null);
    });
  }

  protected icone(tipo: string): string {
    return ICONES[tipo] ?? 'event';
  }

  protected contagem(modelo: Modelo): string {
    const tarefas = modelo.tarefas.length;
    const servicos = modelo.servicos.length;
    return `${tarefas} ${tarefas === 1 ? 'tarefa' : 'tarefas'} · ${servicos} ${servicos === 1 ? 'serviço' : 'serviços'}`;
  }

  protected escolherTipo(tipo: string): void {
    this.tipo.set(tipo);
    const doTipo = this.modelos().filter((modelo) => modelo.tipo === tipo);
    this.modeloId.set(doTipo.length === 1 ? doTipo[0].id : '');
  }

  protected escolherCliente(valor: string): void {
    if (valor === NOVO_CLIENTE) {
      this.cadastrandoCliente.set(true);
      this.clienteEscolhido.set(null);
      this.form.patchValue({ clienteNome: this.busca(), buscaCliente: '' }, { emitEvent: false });
      return;
    }
    const cliente = this.clientes().find((item) => item.id === valor) ?? null;
    this.cadastrandoCliente.set(false);
    this.clienteEscolhido.set(cliente);
    this.form.controls.buscaCliente.setValue(cliente?.nome ?? '', { emitEvent: false });
  }

  protected criar(): void {
    const valor = this.form.getRawValue();
    if (!this.tipo()) {
      this.toast.erro('Escolha o tipo do evento.');
      return;
    }
    if (!valor.primeiroNome.trim() || (this.tipo() === 'Casamento' && !valor.segundoNome.trim())) {
      this.form.markAllAsTouched();
      this.toast.erro(this.tipo() === 'Casamento' ? 'Informe os dois nomes.' : 'Informe o nome.');
      return;
    }
    if (this.cadastrandoCliente() && (!valor.clienteNome.trim() || soDigitos(valor.clienteWhatsApp).length < 10)) {
      this.form.markAllAsTouched();
      this.toast.erro('Informe o nome e o WhatsApp com DDD do cliente.');
      return;
    }
    const convidados = valor.convidados === '' ? null : Number(valor.convidados);
    const pedido = {
      tipo: this.tipo(),
      modeloId: this.modeloId() || null,
      primeiroNome: valor.primeiroNome,
      segundoNome: this.tipo() === 'Casamento' ? valor.segundoNome : null,
      data: deDataParaIso(valor.data),
      hora: horaParaApi(valor.hora),
      convidadosEstimados: Number.isFinite(convidados) ? convidados : null,
      local: valor.local || null,
      clienteId: this.clienteEscolhido()?.id ?? null,
      clienteNovo: this.cadastrandoCliente() ? { nome: valor.clienteNome, whatsApp: valor.clienteWhatsApp } : null,
    };
    this.salvando.set(true);
    this.negocio.criarEvento(pedido).subscribe({
      next: (evento) => {
        this.toast.sucesso('Evento criado.');
        this.ref.close(evento.id);
        void this.router.navigate(['/eventos', evento.id]);
      },
      error: (erro: unknown) => {
        this.salvando.set(false);
        this.toast.erro(mensagemDeErro(erro));
      },
    });
  }
}

function normalizar(texto: string): string {
  return texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}

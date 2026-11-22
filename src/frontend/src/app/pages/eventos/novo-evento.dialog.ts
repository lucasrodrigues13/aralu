import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MatChipsModule } from '@angular/material/chips';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { Router } from '@angular/router';
import { mensagemDeErro } from '../../core/mensagem-erro';
import { Cliente, NegocioClient, TIPOS } from '../../core/negocio.client';
import { ToastService } from '../../core/toast.service';
import { CampoDataComponent } from '../../shared/campo-data';
import { CampoHoraComponent } from '../../shared/campo-hora';
import { deDataParaIso } from '../../shared/data';
import { clientesParaNovoEvento, vinculoDoCliente } from './clientes-do-novo-evento';
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
  imports: [MatChipsModule, ReactiveFormsModule, MatDialogModule, MatButtonModule, MatFormFieldModule, MatInputModule, MatIconModule, MatAutocompleteModule, CampoDataComponent, CampoHoraComponent, MascaraDirective],
  template: `
    <h2 mat-dialog-title>Novo evento</h2>
    <p class="text-muted text-sm px-6 -mt-2 mb-4">Só o tipo e o nome são obrigatórios. O resto pode ficar para depois.</p>
    <mat-dialog-content>
      <form id="novo-evento-form" class="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4" [formGroup]="form" (ngSubmit)="criar()">
        <div class="sm:col-span-2">
          <mat-label class="font-semibold mb-2 block">Tipo do evento <span class="text-error">*</span></mat-label>
          <mat-chip-listbox [value]="tipo()" (change)="$event.value && escolherTipo($event.value)" aria-label="Tipo do evento">
            @for (opcao of tipos; track opcao.valor) {
              <mat-chip-option class="text-sm" [value]="opcao.valor">
                <mat-icon matChipAvatar>{{ icone(opcao.valor) }}</mat-icon>
                {{ opcao.rotulo }}
              </mat-chip-option>
            }
          </mat-chip-listbox>
        </div>

        @if (tipo()) {
          <div class="campo sm:col-span-2">
            <mat-label class="font-semibold mb-2 block">{{ rotuloNome() }} <span class="text-error">*</span></mat-label>
            <mat-form-field appearance="outline" class="w-full"><input [attr.aria-label]="rotuloNome()" matInput formControlName="primeiroNome" required /></mat-form-field>
          </div>
          <app-campo-data rotulo="Data" formControlName="data" />
          <app-campo-hora rotulo="Horário" formControlName="hora" />
          <div class="campo">
            <mat-label class="font-semibold mb-2 block">Convidados estimados</mat-label>
            <mat-form-field appearance="outline" class="w-full"><input [attr.aria-label]="'Convidados estimados'" matInput type="number" min="0" formControlName="convidados" /></mat-form-field>
          </div>
          <div class="campo">
            <mat-label class="font-semibold mb-2 block">Local da cerimônia</mat-label>
            <mat-form-field appearance="outline" class="w-full"><input [attr.aria-label]="'Local da cerimônia'" matInput formControlName="localCerimonia" placeholder="Nome do espaço" /></mat-form-field>
          </div>
          <div class="campo">
            <mat-label class="font-semibold mb-2 block">Local da recepção</mat-label>
            <mat-form-field appearance="outline" class="w-full"><input [attr.aria-label]="'Local da recepção'" matInput formControlName="localRecepcao" placeholder="Nome do espaço" /></mat-form-field>
          </div>

          <div class="campo sm:col-span-2">
            <mat-label class="font-semibold mb-2 block">Cliente</mat-label>
            <mat-form-field appearance="outline" class="w-full">
            <input [attr.aria-label]="'Cliente'"
              matInput
              formControlName="buscaCliente"
              [matAutocomplete]="listaClientes"
              placeholder="Busque pelo nome ou deixe em branco"
            />
            <mat-autocomplete #listaClientes="matAutocomplete" (optionSelected)="escolherCliente($event.option.value)">
              @for (cliente of clientesFiltrados(); track cliente.id) {
                <mat-option [value]="cliente.id">{{ cliente.nome }} <span class="block text-xs text-muted">· {{ cliente.celular }}@if (vinculo(cliente); as evento) { · já está em {{ evento }}}</span></mat-option>
              }
              <mat-option [value]="novoCliente">
                <mat-icon>person_add</mat-icon> Cadastrar novo{{ busca() ? ': ' + busca() : '' }}
              </mat-option>
            </mat-autocomplete>
            @if (clienteEscolhido(); as cliente) {
              <mat-hint>Vinculado: {{ cliente.nome }}</mat-hint>
            }
          </mat-form-field>
          </div>
          @if (cadastrandoCliente()) {
            <div class="campo">
              <mat-label class="font-semibold mb-2 block">Nome do cliente</mat-label>
              <mat-form-field appearance="outline" class="w-full"><input [attr.aria-label]="'Nome do cliente'" matInput formControlName="clienteNome" required /></mat-form-field>
            </div>
            <div class="campo">
              <mat-label class="font-semibold mb-2 block">WhatsApp</mat-label>
              <mat-form-field appearance="outline" class="w-full">
              <input [attr.aria-label]="'WhatsApp'" matInput formControlName="clienteWhatsApp" gdMascara="celular" inputmode="tel" placeholder="(00) 00000-0000" required />
            </mat-form-field>
            </div>
          }
        }
      </form>
    </mat-dialog-content>
    <mat-dialog-actions>
      <button mat-stroked-button type="button" mat-dialog-close>Cancelar</button>
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
  protected readonly clientes = signal<Cliente[]>([]);
  protected readonly clienteEscolhido = signal<Cliente | null>(null);
  protected readonly cadastrandoCliente = signal(false);
  protected readonly busca = signal('');
  protected readonly salvando = signal(false);
  protected readonly clientesFiltrados = computed(() => clientesParaNovoEvento(this.clientes(), this.busca()));
  protected readonly rotuloNome = computed(() => 'Nome do evento');

  protected readonly form = this.fb.nonNullable.group({
    primeiroNome: '',
    data: this.fb.control<Date | null>(null),
    hora: '',
    convidados: '',
    localCerimonia: '',
    localRecepcao: '',
    buscaCliente: '',
    clienteNome: '',
    clienteWhatsApp: '',
  });

  ngOnInit(): void {
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

  protected vinculo(cliente: Cliente): string {
    return vinculoDoCliente(cliente);
  }

  protected escolherTipo(tipo: string): void {
    this.tipo.set(tipo);
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
    if (!valor.primeiroNome.trim()) {
      this.form.markAllAsTouched();
      this.toast.erro('Informe o nome.');
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
      primeiroNome: valor.primeiroNome,
      segundoNome: null,
      data: deDataParaIso(valor.data),
      hora: horaParaApi(valor.hora),
      convidadosEstimados: Number.isFinite(convidados) ? convidados : null,
      cerimonia: { nome: valor.localCerimonia.trim() || null },
      recepcao: { nome: valor.localRecepcao.trim() || null },
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

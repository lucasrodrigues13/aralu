import { Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTabsModule } from '@angular/material/tabs';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { mensagemDeErro } from '../../core/mensagem-erro';
import { Modelo, NegocioClient } from '../../core/negocio.client';
import { ToastService } from '../../core/toast.service';
import { CampoDataComponent } from '../../shared/campo-data';
import { CampoDinheiroComponent } from '../../shared/campo-dinheiro';
import { CampoHoraComponent } from '../../shared/campo-hora';
import { deDataParaIso, deIsoParaData } from '../../shared/data';
import { grupoLocal, localPedido, LocalCamposComponent } from '../../shared/local-campos';
import { aplicarMascara, horaParaApi } from '../../shared/mascaras';

export interface EventoFormDados {
  id?: string;
}

@Component({
  selector: 'app-evento-form',
  imports: [
    ReactiveFormsModule, MatButtonModule, MatFormFieldModule, MatInputModule,
    MatSelectModule, MatCheckboxModule, MatTabsModule, MatDialogModule, CampoDataComponent, CampoHoraComponent,
    CampoDinheiroComponent, LocalCamposComponent,
  ],
  template: `
    <h2 mat-dialog-title>{{ editando() ? 'Editar evento' : 'Novo evento' }}</h2>
    <p class="gd-dialog-descricao">
      {{ editando() ? 'Informações, detalhes e locais do evento.' : 'Escolha o modelo e preencha o essencial. O resto fica para depois.' }}
    </p>
    <mat-dialog-content>
      <form id="evento-form" [formGroup]="formulario" (ngSubmit)="salvar()">
        @if (editando()) {
          <mat-tab-group>
            <mat-tab label="Informações gerais">
              <div class="gd-campos duas">
                <label class="gd-arquivo inteiro">Foto
                  <input type="file" accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp" (change)="escolherFoto($event)" />
                </label>
                @if (tipo() === 'Casamento') {
                  <mat-form-field><mat-label>Nome da noiva</mat-label><input matInput formControlName="primeiroNome" /></mat-form-field>
                  <mat-form-field><mat-label>Nome do noivo</mat-label><input matInput formControlName="segundoNome" /></mat-form-field>
                } @else {
                  <mat-form-field class="inteiro"><mat-label>Nome</mat-label><input matInput formControlName="primeiroNome" /></mat-form-field>
                }
                <app-campo-data rotulo="Data" formControlName="data" />
                <app-campo-hora rotulo="Horário do convite" formControlName="hora" />
                <app-campo-dinheiro rotulo="Orçamento" formControlName="orcamentoEstimado" />
                <mat-form-field><mat-label>Convidados estimados</mat-label><input matInput type="number" min="0" formControlName="convidadosEstimados" /></mat-form-field>
                <mat-form-field><mat-label>URL do site</mat-label><input matInput [value]="urlSite()" readonly /></mat-form-field>
                <mat-form-field><mat-label>Senha do site</mat-label><input matInput formControlName="senhaSite" /></mat-form-field>
                <mat-form-field class="inteiro"><mat-label>Tags</mat-label><input matInput formControlName="tags" placeholder="Assessoria completa" /></mat-form-field>
                <div class="inteiro gd-marcacoes">
                  <mat-checkbox formControlName="notificarAssessor">Notificar assessor(a)</mat-checkbox>
                  <mat-checkbox formControlName="notificarAssistentes">Notificar assistentes</mat-checkbox>
                  <mat-checkbox formControlName="notificarClientes">Notificar clientes</mat-checkbox>
                  <mat-checkbox formControlName="salvarNaAgenda">Salvar na agenda</mat-checkbox>
                </div>
                @if (formulario.controls.salvarNaAgenda.value) { <p class="gd-apoio inteiro">O vínculo com o Google fica vazio.</p> }
              </div>
            </mat-tab>
            <mat-tab label="Detalhes">
              <div class="gd-campos duas">
                <app-campo-hora rotulo="Tempo de festa" formControlName="tempoFesta" />
                <app-campo-hora rotulo="Início da cerimônia" formControlName="inicioCerimonia" />
                <app-campo-hora rotulo="Início da recepção" formControlName="inicioRecepcao" />
                <mat-form-field><mat-label>Padrinhos</mat-label><input matInput type="number" min="0" formControlName="quantidadePadrinhos" /></mat-form-field>
                <mat-form-field><mat-label>Damas e pajens</mat-label><input matInput type="number" min="0" formControlName="quantidadeDamas" /></mat-form-field>
              </div>
            </mat-tab>
            <mat-tab label="Cerimônia">
              <app-local-campos [grupo]="formulario.controls.cerimonia" />
            </mat-tab>
            <mat-tab label="Recepção">
              <app-local-campos [grupo]="formulario.controls.recepcao" />
            </mat-tab>
          </mat-tab-group>
        } @else {
          <div class="gd-campos duas">
            <mat-form-field class="inteiro">
              <mat-label>Modelo de evento</mat-label>
              <mat-select [value]="modeloId()" (valueChange)="escolherModelo($event)" placeholder="Escolha o modelo">
                @for (modelo of modelos(); track modelo.id) {
                  <mat-option [value]="modelo.id">{{ modelo.nome }}</mat-option>
                }
              </mat-select>
            </mat-form-field>
            @if (modeloId()) {
              @if (tipo() === 'Casamento') {
                <mat-form-field><mat-label>Nome da noiva</mat-label><input matInput formControlName="primeiroNome" /></mat-form-field>
                <mat-form-field><mat-label>Nome do noivo</mat-label><input matInput formControlName="segundoNome" /></mat-form-field>
              } @else {
                <mat-form-field class="inteiro"><mat-label>Nome</mat-label><input matInput formControlName="primeiroNome" /></mat-form-field>
              }
              <app-campo-data rotulo="Data" formControlName="data" />
              <app-campo-hora rotulo="Horário do convite" formControlName="hora" />
              <app-campo-dinheiro rotulo="Orçamento" formControlName="orcamentoEstimado" />
              <mat-form-field><mat-label>Convidados estimados</mat-label><input matInput type="number" min="0" formControlName="convidadosEstimados" /></mat-form-field>
              <div class="inteiro"><app-local-campos titulo="Local da cerimônia" [grupo]="formulario.controls.cerimonia" /></div>
              <div class="inteiro"><app-local-campos titulo="Local da recepção" [grupo]="formulario.controls.recepcao" /></div>
              <mat-form-field class="inteiro"><mat-label>Tags</mat-label><input matInput formControlName="tags" placeholder="Assessoria completa" /></mat-form-field>
              <label class="gd-arquivo inteiro">Foto
                <input type="file" accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp" (change)="escolherFoto($event)" />
              </label>
              <div class="inteiro gd-marcacoes">
                <mat-checkbox formControlName="notificarAssessor">Notificar assessor(a)</mat-checkbox>
                <mat-checkbox formControlName="notificarAssistentes">Notificar assistentes</mat-checkbox>
                <mat-checkbox formControlName="notificarClientes">Notificar clientes</mat-checkbox>
                <mat-checkbox formControlName="salvarNaAgenda">Salvar na agenda</mat-checkbox>
              </div>
              @if (formulario.controls.salvarNaAgenda.value) { <p class="gd-apoio inteiro">O vínculo com o Google fica vazio.</p> }
            }
          </div>
        }
      </form>
    </mat-dialog-content>
    <mat-dialog-actions>
      <button mat-button type="button" mat-dialog-close>Cancelar</button>
      <button mat-flat-button type="submit" form="evento-form" [disabled]="!editando() && !modeloId()">
        {{ editando() ? 'Salvar evento' : 'Criar evento' }}
      </button>
    </mat-dialog-actions>
  `,
})
/** Modal de novo evento e de edição do evento (todo cadastro abre em modal). */
export class EventoFormPage implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly negocio = inject(NegocioClient);
  private readonly router = inject(Router);
  private readonly dadosDialogo = inject<EventoFormDados | null>(MAT_DIALOG_DATA, { optional: true });
  private readonly dialogRef = inject(MatDialogRef<EventoFormPage, string>);
  private readonly toast = inject(ToastService);
  protected readonly modelos = signal<Modelo[]>([]);
  protected readonly modeloId = signal('');
  protected readonly tipo = signal('');
  protected readonly editando = signal(false);
  protected readonly urlSite = signal('');
  private foto: File | null = null;
  protected id = '';

  protected readonly formulario = this.fb.group({
    primeiroNome: '',
    segundoNome: '',
    data: this.fb.control<Date | null>(null),
    hora: '',
    orcamentoEstimado: this.fb.control<number | null>(null),
    convidadosEstimados: '',
    tags: '',
    senhaSite: '',
    notificarAssessor: true,
    notificarAssistentes: true,
    notificarClientes: true,
    salvarNaAgenda: false,
    tempoFesta: '',
    inicioCerimonia: '',
    inicioRecepcao: '',
    quantidadePadrinhos: '',
    quantidadeDamas: '',
    cerimonia: grupoLocal(this.fb),
    recepcao: grupoLocal(this.fb),
  });

  ngOnInit(): void {
    this.id = this.dadosDialogo?.id ?? '';
    this.editando.set(!!this.id);
    this.negocio.modelos().subscribe({
      next: (modelos) => this.modelos.set(modelos),
      error: (erro: unknown) => this.toast.erro(mensagemDeErro(erro)),
    });
    if (this.id) {
      this.negocio.evento(this.id).subscribe({
        next: (evento) => {
          this.tipo.set(evento.tipo);
          this.urlSite.set(evento.urlSite ?? '');
          this.formulario.patchValue({
            primeiroNome: evento.primeiroNome ?? '',
            segundoNome: evento.segundoNome ?? '',
            data: deIsoParaData(evento.data),
            hora: (evento.hora ?? '').slice(0, 5),
            orcamentoEstimado: evento.orcamentoEstimado,
            convidadosEstimados: evento.convidadosEstimados?.toString() ?? '',
            tags: evento.tags.join(', '),
            senhaSite: evento.senhaSite ?? '',
            notificarAssessor: evento.notificarAssessor,
            notificarAssistentes: evento.notificarAssistentes,
            notificarClientes: evento.notificarClientes,
            salvarNaAgenda: evento.salvarNaAgenda,
            tempoFesta: (evento.tempoFesta ?? '').slice(0, 5),
            inicioCerimonia: (evento.inicioCerimonia ?? '').slice(0, 5),
            inicioRecepcao: (evento.inicioRecepcao ?? '').slice(0, 5),
            quantidadePadrinhos: evento.quantidadePadrinhos?.toString() ?? '',
            quantidadeDamas: evento.quantidadeDamas?.toString() ?? '',
            cerimonia: this.localParaGrupo(evento.cerimonia),
            recepcao: this.localParaGrupo(evento.recepcao),
          });
        },
        error: (erro: unknown) => this.toast.erro(mensagemDeErro(erro)),
      });
    }
  }

  protected escolherModelo(id: string): void {
    this.modeloId.set(id);
    const modelo = this.modelos().find((item) => item.id === id);
    this.tipo.set(modelo?.tipo ?? '');
  }

  protected escolherFoto(evento: Event): void {
    const entrada = evento.target as HTMLInputElement;
    this.foto = entrada.files?.[0] ?? null;
  }

  protected salvar(): void {
    const pedido = this.pedido();
    const destino = this.editando()
      ? this.negocio.atualizarEvento(this.id, pedido)
      : this.negocio.criarEvento({ ...pedido, modeloId: this.modeloId() });
    destino.subscribe({
      next: (evento) => {
        const seguir = () => {
          this.toast.sucesso(this.editando() ? 'Evento atualizado.' : 'Evento criado.');
          this.dialogRef.close(evento.id);
          if (!this.editando()) {
            void this.router.navigate(['/eventos', evento.id]);
          }
        };
        if (!this.foto) {
          seguir();
          return;
        }
        this.negocio.imagemEvento(evento.id, this.foto).subscribe({
          next: seguir,
          error: (erro: unknown) => {
            this.toast.erro(mensagemDeErro(erro));
            seguir();
          },
        });
      },
      error: (erro: unknown) => this.toast.erro(mensagemDeErro(erro)),
    });
  }

  private pedido() {
    const valor = this.formulario.getRawValue();
    return {
      primeiroNome: valor.primeiroNome ?? '',
      segundoNome: valor.segundoNome ?? '',
      data: deDataParaIso(valor.data),
      hora: horaParaApi(valor.hora),
      orcamentoEstimado: valor.orcamentoEstimado,
      convidadosEstimados: this.numero(valor.convidadosEstimados ?? ''),
      tags: (valor.tags ?? '').split(',').map((item) => item.trim()).filter(Boolean),
      senhaSite: valor.senhaSite ?? '',
      notificarAssessor: !!valor.notificarAssessor,
      notificarAssistentes: !!valor.notificarAssistentes,
      notificarClientes: !!valor.notificarClientes,
      salvarNaAgenda: !!valor.salvarNaAgenda,
      tempoFesta: horaParaApi(valor.tempoFesta),
      inicioCerimonia: horaParaApi(valor.inicioCerimonia),
      inicioRecepcao: horaParaApi(valor.inicioRecepcao),
      quantidadePadrinhos: this.numero(valor.quantidadePadrinhos ?? ''),
      quantidadeDamas: this.numero(valor.quantidadeDamas ?? ''),
      cerimonia: localPedido(valor.cerimonia),
      recepcao: localPedido(valor.recepcao),
      cadastrarCliente: false,
    };
  }

  private localParaGrupo(local: { nome: string | null; pais: string | null; cep: string | null; endereco: string | null; numero: string | null; estado: string | null; cidade: string | null; bairro: string | null }) {
    return {
      nome: local.nome ?? '',
      pais: local.pais ?? '',
      cep: aplicarMascara(local.cep ?? '', 'cep'),
      endereco: local.endereco ?? '',
      numero: local.numero ?? '',
      estado: local.estado ?? '',
      cidade: local.cidade ?? '',
      bairro: local.bairro ?? '',
    };
  }

  private numero(valor: string): number | null {
    if (valor === '') {
      return null;
    }
    const numero = Number(valor);
    return Number.isFinite(numero) ? numero : null;
  }
}

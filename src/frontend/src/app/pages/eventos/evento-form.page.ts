import { Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTabsModule } from '@angular/material/tabs';
import { MatDialog, MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { mensagemDeErro } from '../../core/mensagem-erro';
import { AssistentesClient, Assistente } from '../../core/assistentes.client';
import { AuthService } from '../../core/auth.service';
import { NegocioClient } from '../../core/negocio.client';
import { ToastService } from '../../core/toast.service';
import { CampoDataComponent } from '../../shared/campo-data';
import { CampoDinheiroComponent } from '../../shared/campo-dinheiro';
import { CampoHoraComponent } from '../../shared/campo-hora';
import { deDataParaIso, deIsoParaData } from '../../shared/data';
import { DIALOG_PEQUENO } from '../../shared/dialog';
import { grupoLocal, localPedido, LocalCamposComponent } from '../../shared/local-campos';
import { aplicarMascara, horaParaApi } from '../../shared/mascaras';
import { MoverPrazosDialog } from './mover-prazos.dialog';

export interface EventoFormDados {
  id?: string;
}

@Component({
  selector: 'app-evento-form',
  imports: [ReactiveFormsModule, MatButtonModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatCheckboxModule, MatTabsModule, MatDialogModule, CampoDataComponent, CampoHoraComponent, CampoDinheiroComponent, LocalCamposComponent],
  template: `
    <h2 mat-dialog-title>Editar evento</h2>
    <p class="text-muted text-sm px-6 -mt-2 mb-4">Informações, detalhes e locais do evento.</p>
    <mat-dialog-content>
      <form id="evento-form" [formGroup]="formulario" (ngSubmit)="salvar()">
          <mat-tab-group>
            <mat-tab label="Informações gerais">
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
                <label class="arquivo flex flex-col gap-2 font-semibold sm:col-span-2">Foto
                  <input type="file" accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp" (change)="escolherFoto($event)" />
                </label>
                @if (tipo() === 'Casamento') {
                  <div class="campo">
                    <mat-label class="font-semibold mb-2 block">Nome da noiva</mat-label>
                    <mat-form-field appearance="outline" class="w-full"><input [attr.aria-label]="'Nome da noiva'" matInput formControlName="primeiroNome" /></mat-form-field>
                  </div>
                  <div class="campo">
                    <mat-label class="font-semibold mb-2 block">Nome do noivo</mat-label>
                    <mat-form-field appearance="outline" class="w-full"><input [attr.aria-label]="'Nome do noivo'" matInput formControlName="segundoNome" /></mat-form-field>
                  </div>
                } @else {
                  <div class="campo sm:col-span-2">
                    <mat-label class="font-semibold mb-2 block">Nome</mat-label>
                    <mat-form-field appearance="outline" class="w-full"><input [attr.aria-label]="'Nome'" matInput formControlName="primeiroNome" /></mat-form-field>
                  </div>
                }
                <app-campo-data rotulo="Data" formControlName="data" />
                <app-campo-hora rotulo="Horário do convite" formControlName="hora" />
                <app-campo-dinheiro rotulo="Orçamento" formControlName="orcamentoEstimado" />
                <div class="campo">
                  <mat-label class="font-semibold mb-2 block">Convidados estimados</mat-label>
                  <mat-form-field appearance="outline" class="w-full"><input [attr.aria-label]="'Convidados estimados'" matInput type="number" min="0" formControlName="convidadosEstimados" /></mat-form-field>
                </div>
                <div class="campo">
                  <mat-label class="font-semibold mb-2 block">URL do site</mat-label>
                  <mat-form-field appearance="outline" class="w-full"><input [attr.aria-label]="'URL do site'" matInput [value]="urlSite()" readonly /></mat-form-field>
                </div>
                <div class="campo">
                  <mat-label class="font-semibold mb-2 block">Senha do site</mat-label>
                  <mat-form-field appearance="outline" class="w-full"><input [attr.aria-label]="'Senha do site'" matInput formControlName="senhaSite" /></mat-form-field>
                </div>
                @if (!auth.ehAssistente() && assistentesAtivas().length > 0) {
                  <div class="campo sm:col-span-2">
                    <mat-label class="font-semibold mb-2 block">Assistentes do evento</mat-label>
                    <mat-form-field appearance="outline" class="w-full">
                      <mat-select [attr.aria-label]="'Assistentes do evento'" multiple [value]="assistentesDoEvento() ?? []" (valueChange)="assistentesDoEvento.set($event)">
                        @for (assistente of assistentesAtivas(); track assistente.id) { <mat-option [value]="assistente.id">{{ assistente.nome }}</mat-option> }
                      </mat-select>
                    </mat-form-field>
                  </div>
                }
                <div class="campo sm:col-span-2">
                  <mat-label class="font-semibold mb-2 block">Tags</mat-label>
                  <mat-form-field appearance="outline" class="w-full"><input [attr.aria-label]="'Tags'" matInput formControlName="tags" placeholder="Assessoria completa" /></mat-form-field>
                </div>
                <div class="sm:col-span-2 flex flex-wrap gap-x-4 gap-y-1">
                  <mat-checkbox formControlName="notificarAssessor">Notificar assessor(a)</mat-checkbox>
                  <mat-checkbox formControlName="notificarAssistentes">Notificar assistentes</mat-checkbox>
                  <mat-checkbox formControlName="notificarClientes">Notificar clientes</mat-checkbox>
                  <mat-checkbox formControlName="salvarNaAgenda">Salvar na agenda</mat-checkbox>
                </div>
                @if (formulario.controls.salvarNaAgenda.value) { <p class="text-muted sm:col-span-2">O vínculo com o Google fica vazio.</p> }
              </div>
            </mat-tab>
            <mat-tab label="Detalhes">
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
                <app-campo-hora rotulo="Tempo de festa" formControlName="tempoFesta" />
                <app-campo-hora rotulo="Início da cerimônia" formControlName="inicioCerimonia" />
                <app-campo-hora rotulo="Início da recepção" formControlName="inicioRecepcao" />
                <div class="campo">
                  <mat-label class="font-semibold mb-2 block">Padrinhos</mat-label>
                  <mat-form-field appearance="outline" class="w-full"><input [attr.aria-label]="'Padrinhos'" matInput type="number" min="0" formControlName="quantidadePadrinhos" /></mat-form-field>
                </div>
                <div class="campo">
                  <mat-label class="font-semibold mb-2 block">Damas e pajens</mat-label>
                  <mat-form-field appearance="outline" class="w-full"><input [attr.aria-label]="'Damas e pajens'" matInput type="number" min="0" formControlName="quantidadeDamas" /></mat-form-field>
                </div>
              </div>
            </mat-tab>
            <mat-tab label="Cerimônia">
              <app-local-campos [grupo]="formulario.controls.cerimonia" />
            </mat-tab>
            <mat-tab label="Recepção">
              <app-local-campos [grupo]="formulario.controls.recepcao" />
            </mat-tab>
          </mat-tab-group>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions>
      <button mat-stroked-button type="button" mat-dialog-close>Cancelar</button>
      <button mat-flat-button type="submit" form="evento-form">Salvar evento</button>
    </mat-dialog-actions>
  `,
})
/** Modal de edição do evento. A criação curta fica em NovoEventoDialog (SPEC-008 v2). */
export class EventoFormPage implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly negocio = inject(NegocioClient);
  private readonly dadosDialogo = inject<EventoFormDados | null>(MAT_DIALOG_DATA, { optional: true });
  private readonly dialogRef = inject(MatDialogRef<EventoFormPage, string>);
  private readonly toast = inject(ToastService);
  private readonly dialog = inject(MatDialog);
  private readonly assistentes = inject(AssistentesClient);
  protected readonly auth = inject(AuthService);
  protected readonly assistentesAtivas = signal<Assistente[]>([]);
  protected readonly assistentesDoEvento = signal<string[] | null>(null);
  protected readonly tipo = signal('');
  protected readonly urlSite = signal('');
  private foto: File | null = null;
  protected id = '';
  private dataOriginal: string | null = null;

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
    if (this.id && !this.auth.ehAssistente()) {
      this.assistentes.ativas().subscribe({ next: (lista) => this.assistentesAtivas.set(lista), error: () => undefined });
      this.assistentes.doEvento(this.id).subscribe({ next: (r) => this.assistentesDoEvento.set(r.assistentes), error: () => undefined });
    }
    if (this.id) {
      this.negocio.evento(this.id).subscribe({
        next: (evento) => {
          this.tipo.set(evento.tipo);
          this.urlSite.set(evento.urlSite ?? '');
          this.dataOriginal = evento.data ? evento.data.slice(0, 10) : null;
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

  protected escolherFoto(evento: Event): void {
    const entrada = evento.target as HTMLInputElement;
    this.foto = entrada.files?.[0] ?? null;
  }

  protected salvar(): void {
    const dataNova = deDataParaIso(this.formulario.controls.data.value);
    const dataMudou = this.dataOriginal != null && dataNova != null && this.dataOriginal !== dataNova;
    if (!dataMudou) {
      this.gravar(null);
      return;
    }

    this.negocio.tarefasDoEvento(this.id).subscribe({
      next: (tarefas) => {
        // SPEC-012 §6.6: também conta tarefa sem prazo que tenha item aberto com prazo.
        const afetadas = tarefas.some(
          (t) => t.situacao !== 'Concluida' && (!!t.prazo || t.checklist.some((item) => !!item.prazo && !item.feito && !item.cancelado)),
        );
        if (!afetadas) {
          this.gravar(null);
          return;
        }
        this.dialog.open(MoverPrazosDialog, { ...DIALOG_PEQUENO }).afterClosed().subscribe((mover) => {
          if (mover === undefined) {
            return;
          }
          this.gravar(!!mover);
        });
      },
      error: (erro: unknown) => this.toast.erro(mensagemDeErro(erro)),
    });
  }

  private gravar(moverPrazos: boolean | null): void {
    const pedido = { ...this.pedido(), moverPrazos };
    this.negocio.atualizarEvento(this.id, pedido).subscribe({
      next: (evento) => {
        const fechar = () => {
          this.toast.sucesso('Evento atualizado.');
          this.dialogRef.close(evento.id);
        };
        // SPEC-032 §6.4: só a dona escolhe as assistentes do evento.
        const seguir = () => {
          const escolhidas = this.assistentesDoEvento();
          if (this.auth.ehAssistente() || escolhidas === null) {
            fechar();
            return;
          }
          this.assistentes.definirDoEvento(evento.id, escolhidas).subscribe({
            next: fechar,
            error: (erro: unknown) => {
              this.toast.erro(mensagemDeErro(erro));
              fechar();
            },
          });
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

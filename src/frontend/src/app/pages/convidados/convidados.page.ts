import { Component, inject, OnInit, signal, TemplateRef, viewChild } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { mensagemDeErro } from '../../core/mensagem-erro';
import { ToastService } from '../../core/toast.service';
import { DIALOG, DIALOG_PEQUENO } from '../../shared/dialog';
import { ConfirmaDialog } from '../../shared/confirma-dialog';
import { MascaraDirective } from '../../shared/mascara.directive';
import { ListaConvites, NegocioClient } from '../../core/negocio.client';
import { EventoAbasComponent } from '../eventos/evento-abas.component';

@Component({
  selector: 'app-convidados',
  imports: [
    ReactiveFormsModule, MatButtonModule, MatFormFieldModule, MatInputModule, EventoAbasComponent,
    MatSelectModule, MatCheckboxModule, MatIconModule, MatDialogModule, MascaraDirective,
  ],
  template: `
    @if (!eventoId()) {
      <header class="gd-cabecalho">
        <div>
          <h1>Convidados</h1>
          <p>A lista fica dentro do evento.</p>
        </div>
      </header>
    } @else {
      <app-evento-abas [eventoId]="eventoId()" />
      <header class="gd-cabecalho">
        <div>
          <h1>Convites e convidados</h1>
          <p>Lista do evento e o RSVP de cada convite.</p>
        </div>
        <div class="gd-cabecalho-acoes">
          <button mat-stroked-button type="button" (click)="baixarPlanilha()"><mat-icon>download</mat-icon> Planilha padrão</button>
          <button mat-stroked-button type="button" (click)="arquivo.click()"><mat-icon>upload</mat-icon> Importar</button>
          <input #arquivo type="file" accept=".xlsx,.xls" hidden (change)="importar($event)" />
          <button mat-flat-button type="button" (click)="abrirConvite()"><mat-icon>add</mat-icon> Novo convite</button>
        </div>
      </header>

      @if (lista(); as dados) {
        <section class="gd-numeros">
          @for (item of dados.porSituacao; track item.rotulo) {
            <div class="gd-numero">
              <span>{{ item.rotulo }}</span>
              <span class="gd-icone"><mat-icon>{{ iconeSituacao(item.rotulo) }}</mat-icon></span>
              <strong>{{ item.quantidade }}</strong>
            </div>
          }
        </section>
      }

      <section class="gd-painel">
        <div class="gd-barra">
          <div class="gd-abas">
            <button type="button" [class.ativa]="visao() === 'convite'" (click)="visao.set('convite')">Por convite</button>
            <button type="button" [class.ativa]="visao() === 'convidado'" (click)="visao.set('convidado')">Por convidado</button>
          </div>
          <form class="gd-filtros" [formGroup]="filtro" (ngSubmit)="carregar()">
            <mat-form-field class="gd-busca">
              <mat-icon matIconPrefix>search</mat-icon>
              <input matInput formControlName="nome" placeholder="Buscar convite" />
            </mat-form-field>
            <mat-form-field>
              <mat-select formControlName="situacao" placeholder="Situação">
                <mat-option value="">Todas</mat-option>
                <mat-option value="Pendente">Pendente</mat-option>
                <mat-option value="Confirmado">Confirmado</mat-option>
                <mat-option value="NaoComparecera">Não comparecerá</mat-option>
              </mat-select>
            </mat-form-field>
            <mat-form-field><input matInput formControlName="telefone" gdMascara="celular" placeholder="Telefone" /></mat-form-field>
            <mat-form-field><input matInput formControlName="observacao" placeholder="Observação" /></mat-form-field>
            <mat-checkbox formControlName="somenteConfirmados">Só confirmados</mat-checkbox>
            <button mat-stroked-button type="submit">Filtrar</button>
          </form>
        </div>

        @if (lista(); as dados) {
          @if (dados.convites.length === 0) {
            <div class="gd-vazio">
              <mat-icon>mail</mat-icon>
              <strong>Nenhum convite</strong>
              Crie o primeiro convite ou importe a planilha.
            </div>
          } @else if (visao() === 'convite') {
            <div class="gd-tabela-rolagem">
              <table class="gd-grade">
                <thead>
                  <tr>
                    <th>Convite</th>
                    <th>Telefone</th>
                    <th>Convidados</th>
                    <th class="gd-acoes">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  @for (item of dados.convites; track item.id) {
                    <tr>
                      <td>
                        <strong>{{ item.nome }}</strong>
                        <span class="gd-sub">{{ item.grupo }} @if (item.acessada) { · acessada } @if (item.respondida) { · respondida }</span>
                      </td>
                      <td>{{ item.telefone || '—' }}</td>
                      <td>
                        <ul class="gd-lista gd-lista-densa">
                          @for (pessoa of item.convidados; track pessoa.id) {
                            <li>
                              <span>{{ pessoa.nome }}</span>
                              <span class="gd-status" [class]="classeSituacao(pessoa.situacaoTela)">{{ pessoa.situacaoTela }}</span>
                              @if (pessoa.principal) { <span class="gd-status neutro">Principal</span> }
                              @if (pessoa.celular && !pessoa.principal) {
                                <button mat-button type="button" class="gd-pequeno" (click)="principal(item.id, pessoa.id)">Usar este telefone</button>
                              }
                              <button mat-icon-button type="button" aria-label="Excluir convidado" (click)="excluirConvidado(pessoa.id)"><mat-icon>delete</mat-icon></button>
                            </li>
                          }
                        </ul>
                      </td>
                      <td class="gd-acoes">
                        <button mat-icon-button type="button" aria-label="Copiar link de RSVP" (click)="copiar(item.token)"><mat-icon>link</mat-icon></button>
                        <button mat-icon-button type="button" aria-label="Baixar QR Code" (click)="baixarQr(item.id)"><mat-icon>qr_code_2</mat-icon></button>
                        <button mat-icon-button type="button" aria-label="Enviar pelo WhatsApp" (click)="whatsapp(item.id)"><mat-icon>chat</mat-icon></button>
                        <button mat-icon-button type="button" aria-label="Editar" (click)="semEdicao()"><mat-icon>edit</mat-icon></button>
                        <button mat-icon-button type="button" aria-label="Excluir" (click)="semExclusao('convite')"><mat-icon>delete</mat-icon></button>
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          } @else {
            <div class="gd-tabela-rolagem">
              <table class="gd-grade">
                <thead>
                  <tr><th>Convidado</th><th>Convite</th><th>Situação</th><th>Mesa</th></tr>
                </thead>
                <tbody>
                  @for (item of dados.convites; track item.id) {
                    @for (pessoa of item.convidados; track pessoa.id) {
                      <tr>
                        <td><strong>{{ pessoa.nome }}</strong></td>
                        <td>{{ item.nome }}</td>
                        <td><span class="gd-status" [class]="classeSituacao(pessoa.situacaoTela)">{{ pessoa.situacaoTela }}</span></td>
                        <td>{{ pessoa.mesa || '—' }}</td>
                      </tr>
                    }
                  }
                </tbody>
              </table>
            </div>
          }
        }
      </section>

      <div class="gd-grade-cartoes">
        @if (lista(); as dados) {
          <section class="gd-painel">
            <h2>Totais</h2>
            <p>Por faixa etária e por custo.</p>
            <ul class="gd-lista">
              @for (item of dados.porFaixa; track item.rotulo) { <li><span class="gd-crescer">{{ item.rotulo }}</span><strong>{{ item.quantidade }}</strong></li> }
              @for (item of dados.porCusto; track item.rotulo) { <li><span class="gd-crescer">{{ item.rotulo }}</span><strong>{{ item.quantidade }}</strong></li> }
            </ul>
          </section>
        }
        <section class="gd-painel">
          <h2>Transfer do evento</h2>
          <p>Locais de saída do transporte, um por linha.</p>
          <div class="gd-campos">
            <mat-checkbox [checked]="transferAtivo()" (change)="transferAtivo.set($event.checked)">Transfer ativo</mat-checkbox>
            <mat-form-field><mat-label>Locais</mat-label><textarea matInput rows="3" [value]="locaisTexto()" (input)="locaisTexto.set(texto($event))"></textarea></mat-form-field>
            <div class="gd-campos-acoes"><button mat-stroked-button type="button" (click)="salvarTransfer()">Salvar transfer</button></div>
          </div>
        </section>
        <section class="gd-painel">
          <h2>Grupos</h2>
          <p>Grupos da conta, usados nos convites.</p>
          <div class="gd-campos">
            <div class="gd-chips">
              @for (grupo of grupos(); track grupo.id) { <span class="gd-status neutro">{{ grupo.nome }}</span> }
            </div>
            <mat-form-field><mat-label>Novo grupo</mat-label><input matInput [value]="grupoNome()" (input)="grupoNome.set(texto($event))" /></mat-form-field>
            <div class="gd-campos-acoes"><button mat-stroked-button type="button" (click)="criarGrupo()">Criar grupo</button></div>
          </div>
        </section>
      </div>
    }

    <ng-template #modalConvite>
      <h2 mat-dialog-title>Novo convite</h2>
      <p class="gd-dialog-descricao">O convite reúne a família; o telefone fica no convite.</p>
      <mat-dialog-content>
        <form id="convite-form" class="gd-campos duas" [formGroup]="convite" (ngSubmit)="criarConvite()">
          <mat-form-field class="inteiro"><mat-label>Nome do convite</mat-label><input matInput formControlName="nome" placeholder="Ex.: Joana e família" /></mat-form-field>
          <mat-form-field>
            <mat-label>Grupo</mat-label>
            <mat-select formControlName="grupoId">
              <mat-option value="">Nenhum</mat-option>
              @for (grupo of grupos(); track grupo.id) { <mat-option [value]="grupo.id">{{ grupo.nome }}</mat-option> }
            </mat-select>
          </mat-form-field>
          <mat-form-field><mat-label>Observação</mat-label><input matInput formControlName="observacao" /></mat-form-field>
          <mat-form-field class="inteiro"><mat-label>Nome do convidado</mat-label><input matInput formControlName="convidado" /></mat-form-field>
          <mat-form-field><mat-label>DDI</mat-label><input matInput formControlName="ddi" /></mat-form-field>
          <mat-form-field><mat-label>Celular</mat-label><input matInput formControlName="celular" gdMascara="celular" /></mat-form-field>
          @if (transferAtivo()) {
            <mat-checkbox class="inteiro" formControlName="usaTransfer">Usa transfer</mat-checkbox>
            @if (convite.controls.usaTransfer.value) {
              <mat-form-field class="inteiro">
                <mat-label>Origem</mat-label>
                <mat-select formControlName="localOrigem">
                  @for (local of locais(); track local) { <mat-option [value]="local">{{ local }}</mat-option> }
                </mat-select>
              </mat-form-field>
            }
          }
        </form>
      </mat-dialog-content>
      <mat-dialog-actions>
        <button mat-button type="button" mat-dialog-close>Cancelar</button>
        <button mat-flat-button type="submit" form="convite-form">Salvar convite</button>
      </mat-dialog-actions>
    </ng-template>
  `,
})
export class ConvidadosPage implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly negocio = inject(NegocioClient);
  private readonly rota = inject(ActivatedRoute);
  private readonly toast = inject(ToastService);
  protected readonly lista = signal<ListaConvites | null>(null);
  protected readonly grupos = signal<{ id: string; nome: string }[]>([]);
  protected readonly locais = signal<string[]>([]);
  protected readonly visao = signal('convite');
  protected readonly eventoId = signal('');
  protected readonly transferAtivo = signal(false);
  protected readonly locaisTexto = signal('');
  protected readonly grupoNome = signal('');
  private readonly modalConvite = viewChild.required<TemplateRef<unknown>>('modalConvite');
  private refConvite: MatDialogRef<unknown> | null = null;
  private readonly dialog = inject(MatDialog);
  protected readonly filtro = this.fb.nonNullable.group({
    nome: '', situacao: '', telefone: '', observacao: '', somenteConfirmados: false,
  });
  protected readonly convite = this.fb.nonNullable.group({
    nome: '', grupoId: '', observacao: '', convidado: '', ddi: '+55', celular: '', usaTransfer: false, localOrigem: '',
  });

  ngOnInit(): void {
    const id = this.rota.snapshot.paramMap.get('id') ?? '';
    this.eventoId.set(id);
    if (!id) {
      return;
    }
    this.negocio.evento(id).subscribe({
      next: (evento) => {
        this.transferAtivo.set(evento.transferAtivo);
        this.locais.set(evento.locaisTransfer);
        this.locaisTexto.set(evento.locaisTransfer.join('\n'));
      },
      error: (erro: unknown) => this.toast.erro(mensagemDeErro(erro)),
    });
    this.negocio.grupos().subscribe({ next: (grupos) => this.grupos.set(grupos) });
    this.carregar();
  }

  protected texto(evento: Event): string {
    return (evento.target as HTMLInputElement | HTMLTextAreaElement).value;
  }

  protected carregar(): void {
    const valor = this.filtro.getRawValue();
    this.negocio.convites(this.eventoId(), {
      nome: valor.nome,
      situacao: valor.situacao,
      telefone: valor.telefone,
      observacao: valor.observacao,
      somenteConfirmados: valor.somenteConfirmados ? 'true' : '',
    }).subscribe({
      next: (lista) => this.lista.set(lista),
      error: (erro: unknown) => this.toast.erro(mensagemDeErro(erro)),
    });
  }

  protected salvarTransfer(): void {
    const locais = this.locaisTexto().split('\n').map((item) => item.trim()).filter(Boolean);
    this.negocio.transfer(this.eventoId(), this.transferAtivo(), locais).subscribe({
      next: (evento) => {
        this.locais.set(evento.locaisTransfer);
        this.toast.sucesso('Transfer salvo.');
      },
      error: (erro: unknown) => this.toast.erro(mensagemDeErro(erro)),
    });
  }

  protected criarGrupo(): void {
    this.negocio.criarGrupo(this.grupoNome()).subscribe({
      next: (grupo) => {
        this.grupos.update((lista) => [...lista, grupo]);
        this.grupoNome.set('');
        this.toast.sucesso('Grupo criado.');
      },
      error: (erro: unknown) => this.toast.erro(mensagemDeErro(erro)),
    });
  }

  protected abrirConvite(): void {
    this.convite.reset({ ddi: '+55', usaTransfer: false });
    this.refConvite = this.dialog.open(this.modalConvite(), DIALOG);
  }

  protected iconeSituacao(rotulo: string): string {
    const texto = rotulo.toLowerCase();
    if (texto.startsWith('confirm')) return 'check_circle';
    if (texto.startsWith('não') || texto.startsWith('nao')) return 'cancel';
    return 'schedule';
  }

  protected classeSituacao(situacao: string): string {
    const texto = (situacao ?? '').toLowerCase();
    if (texto.startsWith('confirm')) return 'gd-status ok';
    if (texto.startsWith('não') || texto.startsWith('nao') || texto.startsWith('cancel')) return 'gd-status erro';
    return 'gd-status alerta';
  }

  protected criarConvite(): void {
    const valor = this.convite.getRawValue();
    this.negocio.criarConvite(this.eventoId(), {
      nome: valor.nome,
      grupoId: valor.grupoId || null,
      observacao: valor.observacao,
      usaTransfer: valor.usaTransfer,
      localOrigem: valor.localOrigem,
      principal: valor.celular ? 0 : null,
      convidados: [{
        nome: valor.convidado,
        ddi: valor.ddi,
        celular: valor.celular,
        situacao: 'Pendente',
      }],
    }).subscribe({
      next: () => {
        this.convite.reset({ ddi: '+55', usaTransfer: false });
        this.refConvite?.close();
        this.toast.sucesso('Convite criado.');
        this.carregar();
      },
      error: (erro: unknown) => this.toast.erro(mensagemDeErro(erro)),
    });
  }

  protected principal(conviteId: string, convidadoId: string): void {
    this.negocio.definirPrincipal(conviteId, convidadoId).subscribe({
      next: () => {
        this.toast.sucesso('Telefone principal atualizado.');
        this.carregar();
      },
      error: (erro: unknown) => this.toast.erro(mensagemDeErro(erro)),
    });
  }

  protected copiar(token: string): void {
    const link = `${location.origin}/rsvp/${token}`;
    void navigator.clipboard.writeText(link);
    this.toast.sucesso('Link copiado.');
  }

  protected baixarQr(id: string): void {
    this.negocio.qr(id).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'convite.png';
        link.click();
        URL.revokeObjectURL(url);
      },
      error: (erro: unknown) => this.toast.erro(mensagemDeErro(erro)),
    });
  }

  protected whatsapp(id: string): void {
    this.negocio.whatsapp(id).subscribe({
      next: (resposta) => {
        if (!resposta.url) {
          this.toast.erro('O convite não tem telefone de principal.');
          return;
        }
        window.open(resposta.url, '_blank', 'noopener');
      },
      error: (erro: unknown) => this.toast.erro(mensagemDeErro(erro)),
    });
  }

  protected excluirConvidado(id: string): void {
    this.dialog.open(ConfirmaDialog, {
      ...DIALOG_PEQUENO,
      data: { titulo: 'Excluir convidado', texto: 'Confirma a exclusão deste convidado?', confirmar: 'Excluir' },
    }).afterClosed().subscribe((confirmou) => {
      if (!confirmou) {
        return;
      }
      this.negocio.removerConvidado(id).subscribe({
        next: () => {
          this.toast.sucesso('Convidado excluído.');
          this.carregar();
        },
        error: (erro: unknown) => this.toast.erro(mensagemDeErro(erro)),
      });
    });
  }

  protected semEdicao(): void {
    this.toast.erro('A edição do convite ainda não está disponível neste fluxo.');
  }

  protected semExclusao(tipo: string): void {
    this.dialog.open(ConfirmaDialog, {
      ...DIALOG_PEQUENO,
      data: { titulo: 'Excluir', texto: `Confirma a exclusão deste ${tipo}?`, confirmar: 'Excluir' },
    }).afterClosed().subscribe((confirmou) => {
      if (confirmou) {
        this.toast.erro('A exclusão ainda não está disponível neste fluxo.');
      }
    });
  }

  protected baixarPlanilha(): void {
    this.negocio.planilha(this.eventoId()).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'convidados.xlsx';
        link.click();
        URL.revokeObjectURL(url);
      },
      error: (erro: unknown) => this.toast.erro(mensagemDeErro(erro)),
    });
  }

  protected importar(evento: Event): void {
    const arquivo = (evento.target as HTMLInputElement).files?.[0];
    if (!arquivo) {
      return;
    }
    this.negocio.importar(this.eventoId(), arquivo).subscribe({
      next: () => {
        this.toast.sucesso('Planilha importada.');
        this.carregar();
      },
      error: (erro: unknown) => this.toast.erro(mensagemDeErro(erro)),
    });
  }
}

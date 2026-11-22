import { Component, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { mensagemDeErro } from '../../core/mensagem-erro';
import { NegocioClient } from '../../core/negocio.client';
import { ToastService } from '../../core/toast.service';

/** Exemplo mostrado no modal; o mesmo formato está na aba "Exemplo" do modelo (SPEC-059). */
export const EXEMPLO_PLANILHA = [
  { convite: 'Família Souza', ddi: '+55', telefone: '11999990000', convidado: 'Maria Souza' },
  { convite: 'Família Souza', ddi: '', telefone: '', convidado: 'João Souza' },
  { convite: 'Família Souza', ddi: '', telefone: '', convidado: 'Pedro Souza' },
  { convite: 'Ana Lima', ddi: '+55', telefone: '21988887777', convidado: 'Ana Lima' },
];

/** Instruções da planilha de convidados, com o download do modelo dentro do modal (SPEC-059). */
@Component({
  selector: 'app-planilha-instrucoes-dialog',
  imports: [MatDialogModule, MatButtonModule, MatIconModule],
  template: `
    <h2 mat-dialog-title>Planilha de convidados</h2>
    <mat-dialog-content class="text-sm">
      <p class="mt-0">Use a planilha para cadastrar vários convites de uma vez. Baixe o modelo, preencha a aba <strong>Convidados</strong> e use <strong>Importar</strong>.</p>
      <ol class="pl-5 grid gap-2">
        <li><strong>Uma linha por convidado.</strong> Quem recebe junto (a família, por exemplo) fica em linhas seguidas com o <strong>mesmo nome do convite</strong>, escrito igual em todas.</li>
        <li><strong>Telefone:</strong> o primeiro convidado de cada convite precisa de DDI e telefone, e é para ele que o convite vai. Nos demais, o telefone é opcional.</li>
        <li><strong>Obrigatórios:</strong> nome do convite e nome do convidado em todas as linhas.</li>
        <li><strong>Observação do convite:</strong> preencha na primeira linha do convite.</li>
        <li><strong>Opcionais:</strong> gênero (Masculino, Feminino, Não binário), faixa etária (Adulto, Adolescente, Criança, Criança de colo, Idoso), custo (Inteira, Meia, Gratuita), situação (Pendente, Confirmado, Não comparecerá) e mesa.</li>
        <li>Não mude nem reordene o cabeçalho. A aba <strong>Exemplo</strong> do modelo é só referência e não é importada.</li>
      </ol>
      <p class="font-semibold mb-2">Exemplo: dois convites, um com três convidados</p>
      <div class="relative overflow-auto">
        <table class="tabela" aria-label="Exemplo de preenchimento">
          <thead><tr><th>Nome do convite *</th><th>DDI</th><th>Telefone</th><th>Nome dos convidados *</th></tr></thead>
          <tbody>
            @for (linha of exemplo; track $index) {
              <tr><td>{{ linha.convite }}</td><td>{{ linha.ddi || '—' }}</td><td>{{ linha.telefone || '—' }}</td><td>{{ linha.convidado }}</td></tr>
            }
          </tbody>
        </table>
      </div>
      <p class="text-muted mb-0">Se alguma linha tiver erro, nada é importado e a mensagem diz o número da linha.</p>
    </mat-dialog-content>
    <mat-dialog-actions>
      <button mat-stroked-button type="button" mat-dialog-close>Fechar</button>
      <button mat-flat-button type="button" [disabled]="baixando()" (click)="baixar()"><mat-icon>download</mat-icon> Download do modelo</button>
    </mat-dialog-actions>
  `,
})
export class PlanilhaInstrucoesDialog {
  private readonly eventoId = inject<string>(MAT_DIALOG_DATA);
  private readonly negocio = inject(NegocioClient);
  private readonly toast = inject(ToastService);
  protected readonly exemplo = EXEMPLO_PLANILHA;
  protected readonly baixando = signal(false);

  protected baixar(): void {
    this.baixando.set(true);
    this.negocio.planilha(this.eventoId).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'convidados.xlsx';
        link.click();
        URL.revokeObjectURL(url);
        this.baixando.set(false);
      },
      error: (erro: unknown) => {
        this.baixando.set(false);
        this.toast.erro(mensagemDeErro(erro));
      },
    });
  }
}

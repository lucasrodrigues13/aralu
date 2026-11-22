import { Component, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { Observable } from 'rxjs';
import { mensagemDeErro } from '../core/mensagem-erro';
import { ToastService } from '../core/toast.service';

/** O modal só sabe baixar: a organizadora e o link do cliente passam cada um a sua chamada. */
export interface PlanilhaInstrucoesDados {
  baixar: () => Observable<Blob>;
}

/** Exemplo mostrado no modal; são as mesmas linhas que já vêm preenchidas no modelo (SPEC-059). */
export const EXEMPLO_PLANILHA = [
  { convite: 'Família Souza (exemplo)', ddi: '+55', telefone: '11999990000', convidado: 'Maria Souza', principal: 'Sim', genero: 'Feminino', faixa: 'Adulto' },
  { convite: 'Família Souza (exemplo)', ddi: '', telefone: '', convidado: 'João Souza', principal: 'Não', genero: 'Masculino', faixa: 'Adulto' },
  { convite: 'Família Souza (exemplo)', ddi: '', telefone: '', convidado: 'Pedro Souza', principal: 'Não', genero: 'Masculino', faixa: 'Criança' },
  { convite: 'Ana Lima (exemplo)', ddi: '+55', telefone: '21988887777', convidado: 'Ana Lima', principal: 'Sim', genero: 'Feminino', faixa: 'Adulto' },
];

/** Instruções da planilha de convidados, com o download do modelo dentro do modal (SPEC-059), nas duas telas. */
@Component({
  selector: 'app-planilha-instrucoes-dialog',
  imports: [MatDialogModule, MatButtonModule, MatIconModule],
  template: `
    <h2 mat-dialog-title>Planilha de convidados</h2>
    <mat-dialog-content class="text-sm">
      <p class="mt-0">Use a planilha para cadastrar vários convites de uma vez. Baixe o modelo, preencha a aba <strong>Convidados</strong> e use <strong>Importar</strong>.</p>
      <p class="rounded p-3 bg-light-warning text-warning" data-teste="apagar-exemplos"><strong>O modelo já vem com dois convites de exemplo</strong> (destacados em amarelo, com "(exemplo)" no nome do convite). <strong>Apague essas linhas antes de importar</strong>; se ficarem, a importação é recusada.</p>
      <ol class="pl-5 grid gap-2">
        <li><strong>Uma linha por convidado.</strong> Quem recebe junto (a família, por exemplo) fica em linhas seguidas com o <strong>mesmo nome do convite</strong>, escrito igual em todas.</li>
        <li><strong>Convidado principal:</strong> em cada convite, marque <strong>Sim</strong> em um convidado, e só um: ele recebe as comunicações e precisa de DDI e telefone. Nos demais, deixe <strong>Não</strong>; o telefone deles é opcional.</li>
        <li><strong>Obrigatórios:</strong> nome do convite e nome do convidado em todas as linhas.</li>
        <li><strong>Observação do convite:</strong> preencha na primeira linha do convite.</li>
        <li><strong>Opcionais:</strong> gênero (Masculino ou Feminino), faixa etária (Adulto, Adolescente, Criança, Criança de colo ou Idoso) e situação (Pendente, Confirmado ou Não comparecerá). Nessas colunas, escolha na lista da célula.</li>
        <li><strong>Mesa e custo</strong> não vão na planilha: defina depois, na tela do convite. Planilhas antigas com essas colunas ainda são aceitas, mas elas são ignoradas.</li>
        <li>Não mude o cabeçalho. Só a aba <strong>Convidados</strong> é importada; a aba <strong>Instruções</strong> repete estas orientações.</li>
      </ol>
      <p class="font-semibold mb-2">Exemplo que vem no modelo: dois convites, um com três convidados</p>
      <div class="relative">
        <table class="tabela" aria-label="Exemplo de preenchimento">
          <thead><tr><th>Nome do convite *</th><th>DDI</th><th>Telefone</th><th>Nome dos convidados *</th><th>Principal *</th><th>Gênero</th><th>Faixa etária</th></tr></thead>
          <tbody>
            @for (linha of exemplo; track $index) {
              <tr><td>{{ linha.convite }}</td><td>{{ linha.ddi || '—' }}</td><td>{{ linha.telefone || '—' }}</td><td>{{ linha.convidado }}</td><td>{{ linha.principal }}</td><td>{{ linha.genero }}</td><td>{{ linha.faixa }}</td></tr>
            }
          </tbody>
        </table>
      </div>
      <p class="text-muted mb-0">A importação é verificada em segundo plano. Se alguma linha tiver erro, nada é importado e a lista de importações mostra todos os erros, com o número da linha.</p>
    </mat-dialog-content>
    <mat-dialog-actions>
      <button mat-stroked-button type="button" mat-dialog-close>Fechar</button>
      <button mat-flat-button type="button" [disabled]="baixando()" (click)="baixar()"><mat-icon>download</mat-icon> Download do modelo</button>
    </mat-dialog-actions>
  `,
})
export class PlanilhaInstrucoesDialog {
  private readonly dados = inject<PlanilhaInstrucoesDados>(MAT_DIALOG_DATA);
  private readonly toast = inject(ToastService);
  protected readonly exemplo = EXEMPLO_PLANILHA;
  protected readonly baixando = signal(false);

  protected baixar(): void {
    this.baixando.set(true);
    this.dados.baixar().subscribe({
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

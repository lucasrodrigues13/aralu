import { Component, inject, OnInit, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { mensagemDeErro } from '../../core/mensagem-erro';
import { NegocioClient } from '../../core/negocio.client';
import { ToastService } from '../../core/toast.service';

/** Configurações → Propostas (só o Dono, SPEC-064 §6.1): validade padrão das propostas, em dias. */
@Component({
  selector: 'app-configuracoes-propostas',
  imports: [ReactiveFormsModule, MatCardModule, MatButtonModule, MatFormFieldModule, MatInputModule],
  template: `
    <mat-card class="cardWithShadow">
      <div class="p-6">
        <mat-card-title class="mb-0">Propostas</mat-card-title>
        <mat-card-subtitle>Por quanto tempo a proposta enviada ao lead vale.</mat-card-subtitle>
      </div>
      <mat-card-content class="border-t border-border pt-6">
        @if (carregado()) {
          <form (ngSubmit)="salvar()" class="max-w-md">
            <div class="campo">
              <mat-label class="font-semibold mb-2 block">Validade padrão</mat-label>
              <mat-form-field appearance="outline" class="w-full">
                <input matInput type="number" min="1" max="180" aria-label="Validade padrão em dias" [formControl]="dias" />
                <span matTextSuffix>dias</span>
              </mat-form-field>
            </div>
            <p class="text-sm text-muted mb-4">
              De 1 a 180 dias corridos. A proposta vale até o fim do último dia. Ao enviar, dá para mudar só naquela proposta.
              Mudar aqui vale para os próximos envios; proposta já enviada mantém a data dela.
            </p>
            <button mat-flat-button type="submit" [disabled]="dias.invalid || salvando()">Salvar</button>
          </form>
        } @else {
          <p class="text-xs text-muted">Carregando…</p>
        }
      </mat-card-content>
    </mat-card>
  `,
})
export class ConfiguracoesPropostasPage implements OnInit {
  private readonly negocio = inject(NegocioClient);
  private readonly toast = inject(ToastService);
  protected readonly carregado = signal(false);
  protected readonly salvando = signal(false);
  protected readonly dias = new FormControl<number>(30, {
    nonNullable: true,
    validators: [Validators.required, Validators.min(1), Validators.max(180), Validators.pattern(/^\d+$/)],
  });

  ngOnInit(): void {
    this.negocio.configuracaoPropostas().subscribe({
      next: (c) => {
        this.dias.setValue(c.validadeDias);
        this.carregado.set(true);
      },
      error: (erro: unknown) => this.toast.erro(mensagemDeErro(erro)),
    });
  }

  protected salvar(): void {
    if (this.dias.invalid) {
      this.toast.erro('A validade da proposta vai de 1 a 180 dias.');
      return;
    }
    this.salvando.set(true);
    this.negocio.salvarConfiguracaoPropostas(Number(this.dias.value)).subscribe({
      next: (c) => {
        this.salvando.set(false);
        this.dias.setValue(c.validadeDias);
        this.toast.sucesso('Validade salva.');
      },
      error: (erro: unknown) => {
        this.salvando.set(false);
        this.toast.erro(mensagemDeErro(erro));
      },
    });
  }
}

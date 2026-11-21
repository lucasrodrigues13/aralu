import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ATRASO_CARREGANDO_MS, CarregandoService } from './carregando.service';

describe('CarregandoService', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('não mostra o overlay em pedido rápido', () => {
    const servico = TestBed.inject(CarregandoService);
    servico.iniciar();
    vi.advanceTimersByTime(ATRASO_CARREGANDO_MS - 10);
    servico.concluir();
    vi.advanceTimersByTime(ATRASO_CARREGANDO_MS);
    expect(servico.visivel()).toBe(false);
  });

  it('mostra após o atraso e some quando o último pedido termina', () => {
    const servico = TestBed.inject(CarregandoService);
    servico.iniciar();
    servico.iniciar();
    vi.advanceTimersByTime(ATRASO_CARREGANDO_MS + 10);
    expect(servico.visivel()).toBe(true);
    servico.concluir();
    expect(servico.visivel()).toBe(true);
    servico.concluir();
    expect(servico.visivel()).toBe(false);
  });
});

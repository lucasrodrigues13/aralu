import { camposDoTipo } from './campos-por-tipo';

describe('campos por tipo de evento (card #67)', () => {
  it('casamento pede cerimônia, recepção e padrinhos', () => {
    const campos = camposDoTipo('Casamento');
    expect(campos.doisLocais).toBe(true);
    expect([campos.rotuloPrimeiroLocal, campos.rotuloLocal]).toEqual(['Cerimônia', 'Recepção']);
    expect(campos.padrinhosEDamas).toBe(true);
  });

  it('15 anos, aniversário e corporativo têm um local só e sem padrinhos', () => {
    for (const tipo of ['QuinzeAnos', 'Aniversario', 'Corporativo']) {
      const campos = camposDoTipo(tipo);
      expect(campos.doisLocais).toBe(false);
      expect(campos.rotuloLocal).toBe('Local do evento');
      expect(campos.padrinhosEDamas).toBe(false);
    }
  });

  it('formatura tem colação e festa', () => {
    const campos = camposDoTipo('Formatura');
    expect([campos.rotuloPrimeiroLocal, campos.rotuloLocal]).toEqual(['Colação', 'Festa']);
    expect(campos.padrinhosEDamas).toBe(false);
  });

  it('sem tipo mostra tudo', () => {
    expect(camposDoTipo(null).doisLocais).toBe(true);
    expect(camposDoTipo('Outro').rotuloNome).toBe('Nome do evento');
  });
});

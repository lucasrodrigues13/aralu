/**
 * Campos que cada tipo de evento pede (card #67). Usado na criação e na edição do evento e no lead
 * das Oportunidades, para não pedir o que o tipo não tem (ex.: aniversário acontece num lugar só).
 *
 * Os dois locais continuam sendo `cerimonia` e `recepcao` no banco. Tipo com um local só usa a
 * recepção, que é o local que o resumo do evento mostra primeiro.
 */
export interface CamposDoTipo {
  /** Rótulo do nome (que vira o nome do evento) fora do Casamento, que pede noiva e noivo. */
  rotuloNome: string;
  /** Pede o primeiro local (`cerimonia`)? Quando não, só o local principal (`recepcao`). */
  doisLocais: boolean;
  rotuloPrimeiroLocal: string;
  rotuloLocal: string;
  rotuloInicioPrimeiro: string;
  rotuloInicio: string;
  padrinhosEDamas: boolean;
}

const UM_LOCAL = {
  doisLocais: false,
  rotuloPrimeiroLocal: '',
  rotuloLocal: 'Local do evento',
  rotuloInicioPrimeiro: '',
  rotuloInicio: 'Início da festa',
  padrinhosEDamas: false,
};

const CAMPOS: Record<string, CamposDoTipo> = {
  Casamento: {
    rotuloNome: 'Nome do evento',
    doisLocais: true,
    rotuloPrimeiroLocal: 'Cerimônia',
    rotuloLocal: 'Recepção',
    rotuloInicioPrimeiro: 'Início da cerimônia',
    rotuloInicio: 'Início da recepção',
    padrinhosEDamas: true,
  },
  QuinzeAnos: { ...UM_LOCAL, rotuloNome: 'Nome da debutante' },
  Aniversario: { ...UM_LOCAL, rotuloNome: 'Nome do aniversariante' },
  Corporativo: { ...UM_LOCAL, rotuloNome: 'Nome da empresa', rotuloInicio: 'Início do evento' },
  Formatura: {
    rotuloNome: 'Turma ou formando',
    doisLocais: true,
    rotuloPrimeiroLocal: 'Colação',
    rotuloLocal: 'Festa',
    rotuloInicioPrimeiro: 'Início da colação',
    rotuloInicio: 'Início da festa',
    padrinhosEDamas: false,
  },
};

/** Tipo ainda não escolhido (ou desconhecido) mostra tudo, como antes. */
const TUDO: CamposDoTipo = { ...CAMPOS['Casamento'], rotuloNome: 'Nome do evento' };

export function camposDoTipo(tipo: string | null | undefined): CamposDoTipo {
  return (tipo && CAMPOS[tipo]) || TUDO;
}

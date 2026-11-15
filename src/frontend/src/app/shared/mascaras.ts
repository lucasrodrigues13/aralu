export type TipoMascara =
  | 'cpf'
  | 'cnpj'
  | 'celular'
  | 'telefone'
  | 'cep'
  | 'documento'
  | 'dinheiro'
  | 'agencia'
  | 'conta'
  | 'pixTelefone'
  | 'pixAleatoria';

export function soDigitos(valor: string): string {
  return valor.replace(/\D/g, '');
}

export function aplicarMascara(valor: string, tipo: TipoMascara): string {
  if (tipo === 'pixAleatoria') {
    return mascararChaveAleatoria(valor);
  }

  const digitos = soDigitos(valor);

  switch (tipo) {
    case 'cpf':
      return mascarar(digitos.slice(0, 11), [3, 6, 9], ['.', '.', '-']);
    case 'cnpj':
      return mascarar(digitos.slice(0, 14), [2, 5, 8, 12], ['.', '.', '/', '-']);
    case 'celular':
      return mascararTelefone(digitos.slice(0, 11), true);
    case 'telefone':
      return mascararTelefone(digitos.slice(0, 10), false);
    case 'cep':
      return mascarar(digitos.slice(0, 8), [5], ['-']);
    case 'documento':
      return digitos.length > 11
        ? aplicarMascara(digitos, 'cnpj')
        : aplicarMascara(digitos, 'cpf');
    case 'dinheiro':
      return aplicarDinheiro(digitos);
    case 'agencia':
      return mascararAgencia(digitos);
    case 'conta':
      return mascararConta(digitos, valor.includes('-'));
    case 'pixTelefone':
      return mascararPixTelefone(digitos);
    default:
      return valor;
  }
}

/** Máscara de reais: milhar com ponto e duas casas separadas por vírgula. A digitação entra pelos centavos. */
export function aplicarDinheiro(valor: string): string {
  const bruto = soDigitos(valor);
  if (!bruto) {
    return '';
  }

  const digitos = bruto.replace(/^0+(?=\d)/, '');
  const padded = digitos.padStart(3, '0');
  const centavos = padded.slice(-2);
  const inteiro = padded.slice(0, -2).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${inteiro},${centavos}`;
}

export function numeroParaDinheiro(valor: number | null | undefined): string {
  if (valor === null || valor === undefined || Number.isNaN(Number(valor))) {
    return '';
  }

  const negativo = valor < 0;
  const centavos = Math.round(Math.abs(Number(valor)) * 100);
  const texto = aplicarDinheiro(String(centavos));
  return texto ? `${negativo ? '-' : ''}${texto}` : '';
}

export function dinheiroParaNumero(valor: string | number | null | undefined): number | null {
  if (valor === null || valor === undefined || valor === '') {
    return null;
  }

  if (typeof valor === 'number') {
    return Number.isFinite(valor) ? valor : null;
  }

  const negativo = valor.trim().startsWith('-');
  const digitos = soDigitos(valor);
  if (!digitos) {
    return null;
  }

  const numero = Number(digitos) / 100;
  return Number.isFinite(numero) ? (negativo ? -numero : numero) : null;
}

/** Hora em 24h, `HH:mm`. Dígito inicial acima de 2 vira hora de um algarismo. */
export function aplicarHora(valor: string): string {
  const digitos = valor.replace(/\D/g, '').slice(0, 4);
  if (!digitos) {
    return '';
  }

  let horas: string;
  let resto: string;
  if (Number(digitos[0]) > 2) {
    horas = `0${digitos[0]}`;
    resto = digitos.slice(1, 3);
  } else {
    horas = digitos.slice(0, 2);
    resto = digitos.slice(2, 4);
    if (horas.length === 2 && Number(horas) > 23) {
      horas = '23';
    }
  }

  let minutos = resto;
  if (minutos.length >= 1 && Number(minutos[0]) > 5) {
    minutos = `5${minutos.slice(1, 2)}`;
  }

  return minutos ? `${horas}:${minutos}` : horas;
}

export function horaParaApi(valor: string | null | undefined): string | null {
  const texto = aplicarHora(valor ?? '');
  return /^\d{2}:\d{2}$/.test(texto) ? `${texto}:00` : null;
}

export function formatarHora24(valor: string | null | undefined): string {
  if (!valor) {
    return '';
  }

  const texto = aplicarHora(valor);
  return /^\d{2}:\d{2}$/.test(texto) ? texto : valor;
}

function mascarar(digitos: string, cortes: number[], separadores: string[]): string {
  let resultado = '';
  let cursor = 0;

  for (let i = 0; i < digitos.length; i++) {
    if (cursor < cortes.length && i === cortes[cursor]) {
      resultado += separadores[cursor];
      cursor += 1;
    }
    resultado += digitos[i];
  }

  return resultado;
}

/** Agência: 4 dígitos e, se houver, o dígito verificador (`0000-0`). */
function mascararAgencia(digitos: string): string {
  const d = digitos.slice(0, 5);
  if (d.length <= 4) {
    return d;
  }
  return `${d.slice(0, 4)}-${d.slice(4)}`;
}

/**
 * Conta: até 12 dígitos e o verificador no final.
 * O hífen só entra a partir do 9º dígito, para não pular enquanto a conta curta é digitada.
 */
function mascararConta(digitos: string, tinhaHifen: boolean): string {
  const d = digitos.slice(0, 13);
  if (d.length <= 1) {
    return d;
  }
  if (tinhaHifen || d.length > 8) {
    return `${d.slice(0, -1)}-${d.slice(-1)}`;
  }
  return d;
}

/** Telefone Pix no padrão E.164 exibido como `+55 (00) 00000-0000`. */
function mascararPixTelefone(digitos: string): string {
  let d = digitos;
  if ((d.length === 12 || d.length === 13) && d.startsWith('55')) {
    d = d.slice(2);
  }
  d = d.slice(0, 11);
  if (!d) {
    return '';
  }
  if (d.length <= 2) {
    return `+55 (${d}`;
  }
  const ddd = d.slice(0, 2);
  const resto = d.slice(2);
  if (resto.length <= 5) {
    return `+55 (${ddd}) ${resto}`;
  }
  return `+55 (${ddd}) ${resto.slice(0, 5)}-${resto.slice(5)}`;
}

/** Chave aleatória: UUID da RFC 4122, com hífens. */
function mascararChaveAleatoria(valor: string): string {
  const hex = valor.replace(/[^0-9a-fA-F]/g, '').slice(0, 32).toLowerCase();
  const cortes = new Set([8, 12, 16, 20]);
  let resultado = '';
  for (let i = 0; i < hex.length; i++) {
    if (cortes.has(i)) {
      resultado += '-';
    }
    resultado += hex[i];
  }
  return resultado;
}

function mascararTelefone(digitos: string, celular: boolean): string {
  if (!digitos) {
    return '';
  }

  if (digitos.length <= 2) {
    return `(${digitos}`;
  }

  const ddd = digitos.slice(0, 2);
  const resto = digitos.slice(2);

  if (!celular) {
    if (resto.length <= 4) {
      return `(${ddd}) ${resto}`;
    }
    return `(${ddd}) ${resto.slice(0, 4)}-${resto.slice(4)}`;
  }

  if (resto.length <= 5) {
    return `(${ddd}) ${resto}`;
  }

  return `(${ddd}) ${resto.slice(0, 5)}-${resto.slice(5)}`;
}

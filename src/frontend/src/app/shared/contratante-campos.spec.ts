import { FormBuilder } from '@angular/forms';
import { faltaParaContrato } from '../core/negocio.client';
import { contratantePedido, grupoContratante, preencherContratante } from './contratante-campos';

describe('dados do contratante', () => {
  const completo = {
    nome: 'Maria da Silva',
    documento: '52998224725',
    estadoCivil: 'Solteiro(a)',
    nacionalidade: 'Brasileira',
    email: 'maria@exemplo.com',
    celular: '11977776666',
    cep: '01001-000',
    endereco: 'Praça da Sé',
    numero: '1',
    bairro: 'Sé',
    cidade: 'São Paulo',
    estado: 'SP',
  };

  it('diz o que falta para gerar o contrato', () => {
    expect(faltaParaContrato(completo)).toEqual([]);
    expect(faltaParaContrato({ ...completo, documento: null, numero: ' ' })).toEqual(['CPF/CNPJ', 'número']);
    expect(faltaParaContrato(null).length).toBe(12);
  });

  it('nascimento, profissão, complemento e país não são exigidos', () => {
    expect(faltaParaContrato({ ...completo, nascimento: null, profissao: null, complemento: null, pais: null })).toEqual([]);
  });

  it('preenche com máscara e devolve o pedido com texto vazio como nulo', () => {
    const grupo = grupoContratante(new FormBuilder());
    preencherContratante(grupo, { ...completo, nascimento: '1990-05-01' });

    expect(grupo.controls.documento.value).toBe('529.982.247-25');
    expect(grupo.controls.nascimento.value?.getFullYear()).toBe(1990);

    const pedido = contratantePedido(grupo);
    expect(pedido.nascimento).toBe('1990-05-01');
    expect(pedido.profissao).toBeNull();
    expect(pedido.estadoCivil).toBe('Solteiro(a)');
  });
});

using Project.Domain.Eventos;
using Project.Domain.Funil;

namespace Project.Application.Negocio;

/// <summary>
/// Evento criado a partir de um lead contratado (card #66): o que o pedido não trouxe vem da
/// oportunidade. O que o pedido trouxe (o modal deixa conferir e ajustar) sempre vale.
/// </summary>
public static class EventoDaOportunidade
{
    /// <summary>Tipos que acontecem num lugar só: o local fica na recepção (card #67).</summary>
    public static bool UmLocal(TipoEvento tipo) =>
        tipo is TipoEvento.QuinzeAnos or TipoEvento.Aniversario or TipoEvento.Corporativo;

    public static void Completar(Evento evento, Oportunidade origem)
    {
        evento.Data ??= origem.DataPrevista;
        evento.Hora ??= origem.HoraConvite;
        evento.ConvidadosEstimados ??= origem.QuantidadeConvidados;

        var cerimonia = new LocalEvento
        {
            Nome = origem.LocalCerimonia,
            Pais = origem.PaisCerimonia,
            Cep = origem.CepCerimonia,
            Endereco = origem.EnderecoCerimonia,
            Numero = origem.NumeroCerimonia,
            Bairro = origem.BairroCerimonia,
            Estado = origem.Uf,
            Cidade = origem.Cidade,
        };
        var recepcao = new LocalEvento
        {
            Nome = origem.LocalRecepcao,
            Pais = origem.PaisRecepcao,
            Cep = origem.CepRecepcao,
            Endereco = origem.EnderecoRecepcao,
            Numero = origem.NumeroRecepcao,
            Bairro = origem.BairroRecepcao,
            Estado = origem.EstadoRecepcao,
            Cidade = origem.CidadeRecepcao,
        };

        if (UmLocal(evento.Tipo))
        {
            // Lead antigo com só a cerimônia preenchida: ela vira o local do evento.
            Completar(evento.Recepcao, Vazio(recepcao) ? cerimonia : recepcao);
            evento.InicioRecepcao ??= origem.HoraFesta ?? origem.HoraRecepcao ?? origem.HoraCerimonia;
            return;
        }

        Completar(evento.Cerimonia, cerimonia);
        Completar(evento.Recepcao, recepcao);
        evento.InicioCerimonia ??= origem.HoraCerimonia;
        evento.InicioRecepcao ??= origem.HoraRecepcao;
        if (evento.Tipo == TipoEvento.Casamento)
        {
            evento.QuantidadePadrinhos ??= origem.QuantidadePadrinhos;
            evento.QuantidadeDamas ??= origem.QuantidadeDamas;
        }
    }

    private static void Completar(LocalEvento destino, LocalEvento origem)
    {
        destino.Nome ??= origem.Nome;
        destino.Pais ??= origem.Pais;
        destino.Cep ??= origem.Cep;
        destino.Endereco ??= origem.Endereco;
        destino.Numero ??= origem.Numero;
        destino.Bairro ??= origem.Bairro;
        destino.Estado ??= origem.Estado;
        destino.Cidade ??= origem.Cidade;
    }

    private static bool Vazio(LocalEvento local) =>
        string.IsNullOrWhiteSpace(local.Nome) && string.IsNullOrWhiteSpace(local.Endereco) && string.IsNullOrWhiteSpace(local.Cep);
}

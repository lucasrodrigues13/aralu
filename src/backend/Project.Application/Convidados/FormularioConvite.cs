using Project.Application.Comum;
using Project.Domain.Convidados;

namespace Project.Application.Convidados;

/// <summary>Convidado no formulário de convite: com <paramref name="Id"/> atualiza o existente; sem, inclui um novo (Pendente).</summary>
public sealed record ConvidadoDoFormulario(Guid? Id, string? Nome, string? Ddi, string? Celular);

/// <summary>
/// Formulário único de convite (SPEC-059), igual para a organizadora e para o link do cliente, ao criar e ao editar.
/// <paramref name="Observacao"/> só vale para a organizadora; no link do cliente é ignorada.
/// <paramref name="ExcecaoPrazoRsvp"/> nulo mantém a marcação como está.
/// </summary>
public sealed record FormularioConvitePedido(
    string? Nome,
    string? Email,
    IReadOnlyList<ConvidadoDoFormulario>? Convidados,
    bool? ExcecaoPrazoRsvp = null,
    string? Observacao = null);

/// <summary>Regras do formulário de convite (SPEC-059), aplicadas pelos dois caminhos.</summary>
public static class FormularioConvite
{
    public sealed record Validado(string Nome, string? Email);

    /// <summary>Convidados que saíram do convite e os que entraram, para o chamador gravar.</summary>
    public sealed record Aplicacao(IReadOnlyList<Convidado> Removidos, IReadOnlyList<Convidado> Incluidos);

    public static Resultado<Validado> Validar(FormularioConvitePedido pedido)
    {
        var nome = Domain.Comum.Texto.Limpo(pedido.Nome);
        if (nome is null)
        {
            return Resultado<Validado>.Erro(Codigos.Validacao, "Informe o nome do convite.");
        }

        if (pedido.Convidados is null || pedido.Convidados.Count == 0)
        {
            return Resultado<Validado>.Erro(Codigos.Validacao, "Inclua ao menos um convidado.");
        }

        if (pedido.Convidados.Any(item => Domain.Comum.Texto.Vazio(item.Nome)))
        {
            return Resultado<Validado>.Erro(Codigos.Validacao, "Informe o nome completo de cada convidado.");
        }

        if (!ConviteRegras.TemTelefone(pedido.Convidados[0].Celular))
        {
            return Resultado<Validado>.Erro(Codigos.Validacao, "Informe o telefone do primeiro convidado.");
        }

        var email = Domain.Comum.Texto.Limpo(pedido.Email);
        if (email is not null && !ConviteRegras.EmailValido(email))
        {
            return Resultado<Validado>.Erro(Codigos.Validacao, "Informe um e-mail válido.");
        }

        return Resultado<Validado>.Sucesso(new Validado(nome, email));
    }

    /// <summary>
    /// Aplica o formulário já validado ao convite (novo ou existente). Devolve os convidados que saíram do convite
    /// e os que entraram (para o chamador gravar) ou falha se algum <c>Id</c> não é deste convite.
    /// O principal continua o mesmo se ficou com telefone; senão, o primeiro convidado assume.
    /// </summary>
    public static Resultado<Aplicacao> Aplicar(Convite convite, Validado validado, FormularioConvitePedido pedido)
    {
        var ids = pedido.Convidados!.Where(item => item.Id is not null).Select(item => item.Id!.Value).ToHashSet();
        if (ids.Any(id => convite.Convidados.All(existente => existente.Id != id)))
        {
            return Resultado<Aplicacao>.Erro(Codigos.Indisponivel, "Indisponível.");
        }

        convite.Nome = validado.Nome;
        convite.Email = validado.Email;
        if (pedido.ExcecaoPrazoRsvp is bool excecao)
        {
            convite.ExcecaoPrazoRsvp = excecao;
        }

        var removidos = convite.Convidados.Where(item => !ids.Contains(item.Id)).ToArray();
        foreach (var removido in removidos)
        {
            convite.Convidados.Remove(removido);
        }

        var incluidos = new List<Convidado>();
        var ordem = new List<Convidado>();
        foreach (var item in pedido.Convidados!)
        {
            var convidado = item.Id is Guid id
                ? convite.Convidados.First(existente => existente.Id == id)
                : new Convidado { Id = Guid.NewGuid(), ConviteId = convite.Id };
            convidado.Nome = Domain.Comum.Texto.Limpo(item.Nome)!;
            convidado.Celular = Domain.Comum.Texto.Limpo(item.Celular);
            convidado.Ddi = convidado.Celular is null ? null : Domain.Comum.Texto.Limpo(item.Ddi);
            if (item.Id is null)
            {
                convite.Convidados.Add(convidado);
                incluidos.Add(convidado);
            }

            ordem.Add(convidado);
        }

        var atual = ordem.FirstOrDefault(item => item.Id == convite.PrincipalId);
        convite.PrincipalId = ConviteRegras.TemTelefone(atual?.Celular) ? atual!.Id : ordem[0].Id;
        return Resultado<Aplicacao>.Sucesso(new Aplicacao(removidos, incluidos));
    }
}

using Project.Domain.Equipe;

namespace Project.Api.Conta;

/// <summary>
/// Módulo e ação de cada rota da API (SPEC-062 §9). GET é ver, DELETE é excluir, o resto é editar.
/// Rota sem módulo (perfil, painel, arquivos, CEP) não depende de grupo.
/// </summary>
public static class PermissaoPorRota
{
    private const string Prefixo = "/api/v1/";

    public static (Modulo Modulo, AcaoModulo Acao)? De(string metodo, string caminho)
    {
        if (!caminho.StartsWith(Prefixo, StringComparison.OrdinalIgnoreCase))
        {
            return null;
        }

        var partes = caminho[Prefixo.Length..].ToLowerInvariant().Split('/', StringSplitOptions.RemoveEmptyEntries);
        if (partes.Length == 0 || ModuloDe(partes) is not Modulo modulo)
        {
            return null;
        }

        var acao = metodo.ToUpperInvariant() switch
        {
            "GET" or "HEAD" => AcaoModulo.Ver,
            "DELETE" => AcaoModulo.Excluir,
            _ => AcaoModulo.Editar,
        };
        return (modulo, acao);
    }

    private static Modulo? ModuloDe(string[] p)
    {
        var raiz = p[0];
        var sub = p.Length > 2 ? p[2] : null;
        return raiz switch
        {
            "clientes" => Modulo.Clientes,
            "agenda" => Modulo.Agenda,
            "convites" or "convidados" or "envio-convites" or "prazo-rsvp" or "presencas" or "qr" => Modulo.Convidados,
            "tarefas" => Modulo.Tarefas,
            "oportunidades" or "estagios-funil" or "relatorios-funil" or "tarefas-funil" or "leads-rsvp" => Modulo.Funil,
            "orcamentos-funil" or "contratos-funil" when p.Contains("parcelas") || p.Contains("recebimentos") => Modulo.Financeiro,
            "orcamentos-funil" or "contratos-funil" or "modelos-orcamento-funil" => Modulo.OrcamentosContratos,
            "fornecedores" or "servicos-conta" => Modulo.Fornecedores,
            "modelos" or "modelos-briefing" or "modelos-roteiro" or "modelos-cronograma" or "modelos-inspiracoes" => Modulo.Modelos,
            "eventos" => sub switch
            {
                "clientes" => Modulo.Clientes,
                "budget" or "dinheiro" => Modulo.Financeiro,
                "convites" or "envio-convites" or "prazo-rsvp" or "presencas" => Modulo.Convidados,
                "tarefas" => Modulo.Tarefas,
                "servicos" => Modulo.Fornecedores,
                "aplicar-modelo" or "salvar-como-modelo" => Modulo.Modelos,
                _ => Modulo.Eventos,
            },
            _ => null,
        };
    }

    public static string Nome(Modulo modulo) => modulo == Modulo.OrcamentosContratos ? "Orçamentos e contratos" : modulo.ToString();

    public static string Verbo(AcaoModulo acao) => acao switch
    {
        AcaoModulo.Ver => "ver",
        AcaoModulo.Editar => "editar",
        _ => "excluir",
    };
}

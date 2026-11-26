using Project.Domain.Comum;
namespace Project.Domain.Equipe;

/// <summary>Módulos com permissão por grupo (SPEC-062 §9). A lista vive no código.</summary>
public enum Modulo
{
    Clientes,
    Eventos,
    Convidados,
    Tarefas,
    Agenda,
    Funil,
    OrcamentosContratos,
    Financeiro,
    Fornecedores,
    Modelos,
}

/// <summary>Ação sobre um módulo: ver, editar ou excluir (níveis independentes; editar/excluir exigem ver).</summary>
public enum AcaoModulo
{
    Ver,
    Editar,
    Excluir,
}

/// <summary>Grupo de acesso da conta (SPEC-062 §9, RF-113).</summary>
public sealed class GrupoAcesso : ITemConta
{
    public const int NomeMaximo = 60;

    public Guid Id { get; set; }

    public Guid ContaId { get; set; }

    public string Nome { get; set; } = "";

    /// <summary>Falso: o membro só vê os eventos em que está atribuído.</summary>
    public bool VeTodosEventos { get; set; } = true;

    /// <summary>Grupo criado com a conta (Organizadores ou Assistentes). Pode ser editado ou apagado.</summary>
    public bool Padrao { get; set; }

    public List<PermissaoGrupo> Permissoes { get; set; } = [];

    public bool Permite(Modulo modulo, AcaoModulo acao) =>
        Permissoes.FirstOrDefault(item => item.Modulo == modulo) is { } permissao && permissao.Permite(acao);
}

public sealed class PermissaoGrupo : ITemConta
{
    public Guid Id { get; set; }

    public Guid ContaId { get; set; }

    public Guid GrupoId { get; set; }

    public Modulo Modulo { get; set; }

    public bool Ver { get; set; }

    public bool Editar { get; set; }

    public bool Excluir { get; set; }

    /// <summary>Editar ou excluir sem ver não vale (§9).</summary>
    public bool Permite(AcaoModulo acao) => Ver && acao switch
    {
        AcaoModulo.Ver => true,
        AcaoModulo.Editar => Editar,
        AcaoModulo.Excluir => Excluir,
        _ => false,
    };
}

/// <summary>Os dois grupos com que toda conta nasce (SPEC-062 §9).</summary>
public static class GruposPadrao
{
    public const string Organizadores = "Organizadores";
    public const string Assistentes = "Assistentes";

    private static readonly Modulo[] DaAssistente = [Modulo.Eventos, Modulo.Convidados, Modulo.Tarefas, Modulo.Agenda];

    public static IReadOnlyList<GrupoAcesso> Criar(Guid contaId)
    {
        var organizadores = new GrupoAcesso { Id = Guid.NewGuid(), ContaId = contaId, Nome = Organizadores, VeTodosEventos = true, Padrao = true };
        var assistentes = new GrupoAcesso { Id = Guid.NewGuid(), ContaId = contaId, Nome = Assistentes, VeTodosEventos = false, Padrao = true };
        foreach (var modulo in Enum.GetValues<Modulo>())
        {
            organizadores.Permissoes.Add(Permissao(organizadores, modulo, true, true, true));
            var daAssistente = DaAssistente.Contains(modulo);
            assistentes.Permissoes.Add(Permissao(assistentes, modulo, daAssistente, daAssistente, false));
        }

        return [organizadores, assistentes];
    }

    private static PermissaoGrupo Permissao(GrupoAcesso grupo, Modulo modulo, bool ver, bool editar, bool excluir) => new()
    {
        Id = Guid.NewGuid(),
        ContaId = grupo.ContaId,
        GrupoId = grupo.Id,
        Modulo = modulo,
        Ver = ver,
        Editar = editar,
        Excluir = excluir,
    };
}

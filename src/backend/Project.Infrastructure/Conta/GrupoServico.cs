using Microsoft.EntityFrameworkCore;
using Project.Application.Comum;
using Project.Domain.Equipe;
using Project.Infrastructure.Persistencia;

namespace Project.Infrastructure.Conta;

public sealed record PermissaoLeitura(string Modulo, bool Ver, bool Editar, bool Excluir);

public sealed record GrupoLeitura(Guid Id, string Nome, bool VeTodosEventos, bool Padrao, int Membros, IReadOnlyList<PermissaoLeitura> Permissoes);

public sealed record GrupoPedido(string? Nome, bool? VeTodosEventos, IReadOnlyList<PermissaoLeitura>? Permissoes);

/// <summary>Grupos de acesso da conta (SPEC-062 §9, RF-113). Só o Dono usa.</summary>
public sealed class GrupoServico(AppDbContext banco)
{
    public const string ErroComMembros = "grupo_com_membros";

    public async Task<IReadOnlyList<GrupoLeitura>> ListarAsync(Guid contaId, CancellationToken ct)
    {
        var grupos = await banco.Grupos.AsNoTracking().Include(item => item.Permissoes)
            .Where(item => item.ContaId == contaId)
            .OrderBy(item => item.Nome)
            .ToListAsync(ct);
        var contagem = await ContagemAsync(contaId, ct);
        return grupos.Select(grupo => Ler(grupo, contagem.GetValueOrDefault(grupo.Id))).ToList();
    }

    public async Task<Resultado<GrupoLeitura>> CriarAsync(Guid contaId, GrupoPedido pedido, CancellationToken ct)
    {
        var grupo = new GrupoAcesso { Id = Guid.NewGuid(), ContaId = contaId };
        var falha = await AplicarAsync(contaId, grupo, pedido, ct);
        if (falha is not null)
        {
            return Resultado<GrupoLeitura>.Erro(falha.Codigo, falha.Mensagem);
        }

        banco.Grupos.Add(grupo);
        await banco.SaveChangesAsync(ct);
        return Resultado<GrupoLeitura>.Sucesso(Ler(grupo, 0));
    }

    public async Task<Resultado<GrupoLeitura>> AtualizarAsync(Guid contaId, Guid id, GrupoPedido pedido, CancellationToken ct)
    {
        var grupo = await banco.Grupos.Include(item => item.Permissoes).FirstOrDefaultAsync(item => item.Id == id && item.ContaId == contaId, ct);
        if (grupo is null)
        {
            return Resultado<GrupoLeitura>.Erro(Codigos.Indisponivel, "Grupo não encontrado.");
        }

        var falha = await AplicarAsync(contaId, grupo, pedido, ct);
        if (falha is not null)
        {
            return Resultado<GrupoLeitura>.Erro(falha.Codigo, falha.Mensagem);
        }

        await banco.SaveChangesAsync(ct);
        var contagem = await ContagemAsync(contaId, ct);
        return Resultado<GrupoLeitura>.Sucesso(Ler(grupo, contagem.GetValueOrDefault(grupo.Id)));
    }

    public async Task<Resultado<bool>> ExcluirAsync(Guid contaId, Guid id, CancellationToken ct)
    {
        var grupo = await banco.Grupos.FirstOrDefaultAsync(item => item.Id == id && item.ContaId == contaId, ct);
        if (grupo is null)
        {
            return Resultado<bool>.Erro(Codigos.Indisponivel, "Grupo não encontrado.");
        }

        var membros = await banco.Membros.CountAsync(item => item.GrupoId == id && item.Situacao != SituacaoMembro.Removida, ct);
        if (membros > 0)
        {
            return Resultado<bool>.Erro(ErroComMembros, membros == 1
                ? "Mova o membro deste grupo antes de apagá-lo."
                : $"Mova os {membros} membros deste grupo antes de apagá-lo.");
        }

        banco.Grupos.Remove(grupo);
        await banco.SaveChangesAsync(ct);
        return Resultado<bool>.Sucesso(true);
    }

    private async Task<Falha?> AplicarAsync(Guid contaId, GrupoAcesso grupo, GrupoPedido pedido, CancellationToken ct)
    {
        var nome = Domain.Comum.Texto.Limpo(pedido.Nome);
        if (nome is null || nome.Length > GrupoAcesso.NomeMaximo)
        {
            return new Falha(Codigos.Validacao, $"Informe o nome do grupo (até {GrupoAcesso.NomeMaximo} caracteres).");
        }

        var repetido = await banco.Grupos.AnyAsync(item => item.ContaId == contaId && item.Id != grupo.Id && item.Nome == nome, ct);
        if (repetido)
        {
            return new Falha(Codigos.Validacao, "Já existe um grupo com este nome.");
        }

        var pedidas = new Dictionary<Modulo, PermissaoLeitura>();
        foreach (var item in pedido.Permissoes ?? [])
        {
            if (!Enum.TryParse<Modulo>(item.Modulo, ignoreCase: true, out var modulo) || !Enum.IsDefined(modulo))
            {
                return new Falha(Codigos.Validacao, $"Módulo desconhecido: {item.Modulo}.");
            }

            if (!item.Ver && (item.Editar || item.Excluir))
            {
                return new Falha(Codigos.Validacao, "Editar ou excluir exige a permissão de ver.");
            }

            pedidas[modulo] = item;
        }

        grupo.Nome = nome;
        grupo.VeTodosEventos = pedido.VeTodosEventos ?? grupo.VeTodosEventos;
        foreach (var modulo in Enum.GetValues<Modulo>())
        {
            var permissao = grupo.Permissoes.FirstOrDefault(item => item.Modulo == modulo);
            if (permissao is null)
            {
                permissao = new PermissaoGrupo { Id = Guid.NewGuid(), ContaId = contaId, GrupoId = grupo.Id, Modulo = modulo };
                grupo.Permissoes.Add(permissao);
            }

            var pedida = pedidas.GetValueOrDefault(modulo);
            permissao.Ver = pedida?.Ver ?? false;
            permissao.Editar = pedida?.Editar ?? false;
            permissao.Excluir = pedida?.Excluir ?? false;
        }

        return null;
    }

    private Task<Dictionary<Guid, int>> ContagemAsync(Guid contaId, CancellationToken ct) =>
        banco.Membros.AsNoTracking()
            .Where(item => item.ContaId == contaId && item.GrupoId != null && item.Situacao != SituacaoMembro.Removida)
            .GroupBy(item => item.GrupoId!.Value)
            .ToDictionaryAsync(grupo => grupo.Key, grupo => grupo.Count(), ct);

    private static GrupoLeitura Ler(GrupoAcesso grupo, int membros) => new(
        grupo.Id,
        grupo.Nome,
        grupo.VeTodosEventos,
        grupo.Padrao,
        membros,
        Enum.GetValues<Modulo>()
            .Select(modulo => grupo.Permissoes.FirstOrDefault(item => item.Modulo == modulo) is { } p
                ? new PermissaoLeitura(modulo.ToString(), p.Ver, p.Editar, p.Excluir)
                : new PermissaoLeitura(modulo.ToString(), false, false, false))
            .ToList());
}

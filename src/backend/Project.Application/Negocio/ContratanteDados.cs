using Project.Application.Comum;
using Project.Domain.Funil;

namespace Project.Application.Negocio;

/// <summary>
/// Dados do contratante (quem assina o contrato) na oportunidade e na tela de aceite da proposta (SPEC-049).
/// O documento é o campo único CPF/CNPJ, sem máscara.
/// </summary>
public sealed record ContratanteDados(
    string? Nome,
    string? Documento,
    DateOnly? Nascimento,
    string? Profissao,
    string? EstadoCivil,
    string? Nacionalidade,
    string? Email,
    string? Celular,
    string? Cep,
    string? Endereco,
    string? Numero,
    string? Bairro,
    string? Cidade,
    string? Estado,
    string? Complemento,
    string? Pais);

public static class ContratanteRegras
{
    public const string Justificativa = "Para fechar, preencha mais dados para gerar o contrato.";

    /// <summary>Limpa os textos e valida documento, e-mail, nascimento, estado civil e CEP. Nada é obrigatório aqui.</summary>
    public static Resultado<ContratanteDados> Normalizar(ContratanteDados pedido, DateOnly hoje)
    {
        var documento = Documentos.CpfOuCnpj(pedido.Documento);
        if (documento == "")
        {
            return Resultado<ContratanteDados>.Erro(Codigos.Validacao, "Informe um CPF ou CNPJ válido.");
        }

        var email = Domain.Comum.Texto.Limpo(pedido.Email);
        if (email is not null && !Domain.Comum.Texto.EmailValido(email))
        {
            return Resultado<ContratanteDados>.Erro(Codigos.Validacao, "Informe um e-mail válido para o contratante.");
        }

        if (pedido.Nascimento is DateOnly nascimento && nascimento > hoje)
        {
            return Resultado<ContratanteDados>.Erro(Codigos.Validacao, "A data de nascimento não pode ser futura.");
        }

        var estadoCivil = Domain.Comum.Texto.Limpo(pedido.EstadoCivil);
        if (estadoCivil is not null)
        {
            estadoCivil = EstadosCivis.Item(estadoCivil);
            if (estadoCivil is null)
            {
                return Resultado<ContratanteDados>.Erro(Codigos.Validacao, "Escolha o estado civil na lista.");
            }
        }

        var cep = Mascaras.Cep(pedido.Cep);
        if (cep == "")
        {
            return Resultado<ContratanteDados>.Erro(Codigos.Validacao, "O CEP deve ter 8 dígitos.");
        }

        return Resultado<ContratanteDados>.Sucesso(new ContratanteDados(
            Domain.Comum.Texto.Limpo(pedido.Nome),
            documento,
            pedido.Nascimento,
            Domain.Comum.Texto.Limpo(pedido.Profissao),
            estadoCivil,
            Domain.Comum.Texto.Limpo(pedido.Nacionalidade),
            email,
            Domain.Comum.Texto.Limpo(pedido.Celular),
            cep,
            Domain.Comum.Texto.Limpo(pedido.Endereco),
            Domain.Comum.Texto.Limpo(pedido.Numero),
            Domain.Comum.Texto.Limpo(pedido.Bairro),
            Domain.Comum.Texto.Limpo(pedido.Cidade),
            Domain.Comum.Texto.Limpo(pedido.Estado),
            Domain.Comum.Texto.Limpo(pedido.Complemento),
            Domain.Comum.Texto.Limpo(pedido.Pais)));
    }

    /// <summary>
    /// O que falta para gerar o contrato: nome, CPF/CNPJ, estado civil, nacionalidade, e-mail, celular e endereço
    /// completo (CEP, endereço, número, bairro, cidade e estado). Nascimento, profissão, complemento e país são opcionais.
    /// </summary>
    public static IReadOnlyList<string> Faltando(ContratanteDados dados)
    {
        var faltam = new List<string>();
        void Exige(string? valor, string rotulo)
        {
            if (string.IsNullOrWhiteSpace(valor))
            {
                faltam.Add(rotulo);
            }
        }

        Exige(dados.Nome, "nome completo");
        Exige(dados.Documento, "CPF/CNPJ");
        Exige(dados.EstadoCivil, "estado civil");
        Exige(dados.Nacionalidade, "nacionalidade");
        Exige(dados.Email, "e-mail");
        Exige(dados.Celular, "celular");
        Exige(dados.Cep, "CEP");
        Exige(dados.Endereco, "endereço");
        Exige(dados.Numero, "número");
        Exige(dados.Bairro, "bairro");
        Exige(dados.Cidade, "cidade");
        Exige(dados.Estado, "estado");
        return faltam;
    }

    public static ContratanteDados Ler(Oportunidade item) =>
        new(
            item.ContratanteNome,
            item.ContratanteDocumento,
            item.ContratanteNascimento,
            item.ContratanteProfissao,
            item.ContratanteEstadoCivil,
            item.ContratanteNacionalidade,
            item.ContratanteEmail,
            item.ContratanteCelular,
            item.ContratanteCep,
            item.ContratanteEndereco,
            item.ContratanteNumero,
            item.ContratanteBairro,
            item.ContratanteCidade,
            item.ContratanteEstado,
            item.ContratanteComplemento,
            item.ContratantePais);

    /// <summary>Grava os dados já normalizados. Lead descartado não guarda os dados sensíveis.</summary>
    public static void Aplicar(Oportunidade item, ContratanteDados dados)
    {
        item.ContratanteNome = dados.Nome;
        item.ContratanteDocumento = dados.Documento;
        item.ContratanteNascimento = dados.Nascimento;
        item.ContratanteProfissao = dados.Profissao;
        item.ContratanteEstadoCivil = dados.EstadoCivil;
        item.ContratanteNacionalidade = dados.Nacionalidade;
        item.ContratanteEmail = dados.Email;
        item.ContratanteCelular = dados.Celular;
        item.ContratanteCep = dados.Cep;
        item.ContratanteEndereco = dados.Endereco;
        item.ContratanteNumero = dados.Numero;
        item.ContratanteBairro = dados.Bairro;
        item.ContratanteCidade = dados.Cidade;
        item.ContratanteEstado = dados.Estado;
        item.ContratanteComplemento = dados.Complemento;
        item.ContratantePais = dados.Pais;
        if (item.EstagioFunil?.Tipo == TipoEstagioFunil.Descartado)
        {
            item.LimparDadosSensiveis();
        }
    }
}

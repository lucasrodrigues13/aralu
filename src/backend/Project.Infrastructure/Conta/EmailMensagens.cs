using Project.Application.Negocio;

namespace Project.Infrastructure.Conta;

/// <summary>
/// Texto de cada e-mail que o sistema envia, num lugar só, para revisar a voz da marca
/// (docs/marca/regras-de-design.md §7 e §9): frase curta, com o dado, sem alarme e sem emoji.
/// </summary>
public static class EmailMensagens
{
    public static EmailConteudo ConfirmacaoDeEmail(string email, string link) => new(
        Assunto: "Confirme seu e-mail na Aralu",
        Previa: "Falta um passo para entrar na Aralu: confirmar este e-mail.",
        Titulo: "Confirme seu e-mail",
        Paragrafos:
        [
            $"Recebemos o cadastro de {email} na Aralu.",
            "Para entrar, confirme que este e-mail é seu.",
        ],
        Botao: new EmailBotao("Confirmar e-mail", link),
        Nota: "O link vale por 24 horas. Se você não criou uma conta na Aralu, ignore este e-mail.",
        Motivo: "Você recebeu este e-mail porque este endereço foi usado num cadastro na Aralu.");

    public static EmailConteudo RedefinicaoDeSenha(string email, string link) => new(
        Assunto: "Redefina sua senha da Aralu",
        Previa: "Use o link para criar uma nova senha. Ele vale por 1 hora.",
        Titulo: "Redefina sua senha",
        Paragrafos:
        [
            $"Recebemos um pedido para redefinir a senha da conta {email}.",
        ],
        Botao: new EmailBotao("Criar nova senha", link),
        Nota: "O link vale por 1 hora. Se não foi você, ignore este e-mail: sua senha continua a mesma.",
        Motivo: "Você recebeu este e-mail porque alguém pediu para redefinir a senha desta conta na Aralu.");

    public static EmailConteudo CodigoDeRedefinicao(string email, string codigo) => new(
        Assunto: "Código para redefinir sua senha da Aralu",
        Previa: "Use o código deste e-mail para criar uma nova senha.",
        Titulo: "Código para redefinir sua senha",
        Paragrafos:
        [
            $"Recebemos um pedido para redefinir a senha da conta {email}.",
            $"Código: {codigo}",
        ],
        Nota: "Se não foi você, ignore este e-mail: sua senha continua a mesma.",
        Motivo: "Você recebeu este e-mail porque alguém pediu para redefinir a senha desta conta na Aralu.");

    /// <param name="assessoria">Nome da empresa da conta; sem nome, "uma assessoria".</param>
    public static EmailConteudo ConviteParaEquipe(string nome, string assessoria, string link) => new(
        Assunto: $"Convite de {assessoria} para a equipe na Aralu",
        Previa: $"Crie sua senha para acompanhar os eventos de {assessoria}. O link vale por 7 dias.",
        Titulo: $"Convite para a equipe de {assessoria}",
        Paragrafos:
        [
            $"Olá, {nome}.",
            $"{assessoria} adicionou você à equipe na Aralu, onde ficam as tarefas, os fornecedores e os pagamentos dos eventos.",
            "Para entrar, crie sua senha.",
        ],
        Botao: new EmailBotao("Criar senha", link),
        Nota: "O link vale por 7 dias. Se você não esperava este convite, ignore este e-mail.",
        Motivo: $"Você recebeu este e-mail porque {assessoria} cadastrou este endereço na equipe dentro da Aralu.");
}

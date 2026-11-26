using System.Globalization;
using Project.Application.Negocio;

namespace Project.Infrastructure.Assinaturas;

/// <summary>
/// E-mails da assinatura (SPEC-062 §6 e §7). Texto provisório: a redação final é a pendência 3 da spec.
/// Mesma voz de <see cref="Conta.EmailMensagens"/>: frase curta, com o dado, sem alarme.
/// </summary>
public static class EmailsAssinatura
{
    private static readonly CultureInfo Br = CultureInfo.GetCultureInfo("pt-BR");

    private const string Motivo = "Você recebeu este e-mail porque é responsável por uma conta na Aralu.";

    public static EmailConteudo TrialAcabando(int diasRestantes, DateOnly ultimoDia, string link) => new(
        Assunto: diasRestantes <= 1 ? "Hoje é o último dia do seu teste na Aralu" : $"Faltam {diasRestantes} dias do seu teste na Aralu",
        Previa: $"O teste vai até {Data(ultimoDia)}. Assine para continuar usando a plataforma.",
        Titulo: diasRestantes <= 1 ? "Último dia do teste" : $"Faltam {diasRestantes} dias do teste",
        Paragrafos:
        [
            $"Seu teste grátis vai até {Data(ultimoDia)}.",
            "Assinando agora, a primeira cobrança vence só no último dia do teste: você não perde os dias que faltam.",
            "Se não assinar, a conta fica bloqueada depois do teste. Nenhum dado é apagado.",
        ],
        Botao: new EmailBotao("Assinar", link),
        Motivo: Motivo);

    public static EmailConteudo PagamentoConfirmado(decimal valor, DateOnly? proximoVencimento, string link) => new(
        Assunto: "Pagamento confirmado na Aralu",
        Previa: $"Recebemos {Dinheiro(valor)}. Sua conta está ativa.",
        Titulo: "Pagamento confirmado",
        Paragrafos:
        [
            $"Recebemos o pagamento de {Dinheiro(valor)}. Sua conta está ativa.",
            proximoVencimento is DateOnly proximo ? $"A próxima cobrança vence em {Data(proximo)}." : "Você vê as faturas em Configurações → Assinatura.",
        ],
        Botao: new EmailBotao("Ver assinatura", link),
        Motivo: Motivo);

    public static EmailConteudo PagamentoEmAtraso(DateOnly vencimento, DateOnly bloqueiaEm, string link) => new(
        Assunto: "Pagamento da Aralu em aberto",
        Previa: $"A fatura venceu em {Data(vencimento)}. A conta segue liberada até {Data(bloqueiaEm.AddDays(-1))}.",
        Titulo: "Pagamento em aberto",
        Paragrafos:
        [
            $"A fatura que venceu em {Data(vencimento)} ainda não foi paga.",
            $"A conta segue liberada até {Data(bloqueiaEm.AddDays(-1))}. Em {Data(bloqueiaEm)}, ela fica bloqueada até o pagamento.",
        ],
        Botao: new EmailBotao("Pagar fatura", link),
        Motivo: Motivo);

    public static EmailConteudo DescontoAcabando(DateOnly fim, decimal valorCheio, string link) => new(
        Assunto: "Seu desconto na Aralu termina em 7 dias",
        Previa: $"Depois de {Data(fim)}, a mensalidade volta a {Dinheiro(valorCheio)}.",
        Titulo: "Desconto terminando",
        Paragrafos:
        [
            $"O desconto da sua assinatura vale até {Data(fim)}.",
            $"A primeira cobrança depois dessa data volta ao valor do plano: {Dinheiro(valorCheio)}.",
        ],
        Botao: new EmailBotao("Ver assinatura", link),
        Motivo: Motivo);

    private static string Data(DateOnly data) => data.ToString("dd/MM/yyyy", Br);

    private static string Dinheiro(decimal valor) => valor.ToString("C", Br);
}

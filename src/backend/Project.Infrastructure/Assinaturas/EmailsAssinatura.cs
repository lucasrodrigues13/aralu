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

    public static EmailConteudo UpgradeConfirmado(string plano, decimal valorPago, decimal mensalidade, DateOnly? proximoVencimento, string link) => new(
        Assunto: $"Sua conta agora está no plano {plano}",
        Previa: $"Recebemos {Dinheiro(valorPago)} do upgrade. Os recursos do plano {plano} já estão liberados.",
        Titulo: $"Bem-vindo ao plano {plano}",
        Paragrafos:
        [
            $"Recebemos o pagamento de {Dinheiro(valorPago)}, a diferença proporcional aos dias que faltavam do período pago.",
            proximoVencimento is DateOnly proximo
                ? $"A próxima mensalidade vence em {Data(proximo)}, no valor de {Dinheiro(mensalidade)}."
                : $"As próximas mensalidades serão de {Dinheiro(mensalidade)}.",
        ],
        Botao: new EmailBotao("Ver assinatura", link),
        Motivo: Motivo);

    public static EmailConteudo DowngradeAgendado(string plano, DateOnly aplicaEm, decimal mensalidade, string link) => new(
        Assunto: $"Mudança para o plano {plano} agendada",
        Previa: $"Seu plano atual continua até {Data(aplicaEm.AddDays(-1))}. O plano {plano} começa em {Data(aplicaEm)}.",
        Titulo: "Mudança de plano agendada",
        Paragrafos:
        [
            $"Seu plano atual continua até {Data(aplicaEm.AddDays(-1))}. A partir de {Data(aplicaEm)}, a conta passa ao plano {plano}, com mensalidade de {Dinheiro(mensalidade)}.",
            "Mudou de ideia? Em Configurações → Assinatura, clique em \"Manter plano atual\" antes dessa data.",
        ],
        Botao: new EmailBotao("Ver assinatura", link),
        Motivo: Motivo);

    public static EmailConteudo DowngradeAplicado(string plano, decimal mensalidade, string link) => new(
        Assunto: $"Sua conta agora está no plano {plano}",
        Previa: $"A mudança de plano agendada foi aplicada. Mensalidade de {Dinheiro(mensalidade)}.",
        Titulo: $"Plano {plano} ativo",
        Paragrafos:
        [
            $"A mudança agendada foi aplicada: sua conta está no plano {plano}, com mensalidade de {Dinheiro(mensalidade)}.",
            "Os dados dos recursos que o plano não inclui continuam guardados. Para voltar a usá-los, faça upgrade em Configurações → Assinatura.",
        ],
        Botao: new EmailBotao("Ver assinatura", link),
        Motivo: Motivo);

    private static string Data(DateOnly data) => data.ToString("dd/MM/yyyy", Br);

    private static string Dinheiro(decimal valor) => valor.ToString("C", Br);
}

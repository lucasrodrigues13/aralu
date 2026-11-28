namespace Project.Application.Negocio;

/// <summary>
/// Conteúdo de um e-mail do sistema. O layout (logo, cartão, botão, rodapé) é aplicado no envio,
/// seguindo docs/marca/regras-de-design.md §9. Cada texto é puro: o modelo escapa o HTML.
/// </summary>
/// <param name="Assunto">Assunto curto, com o dado ("Confirme seu e-mail na Aralu").</param>
/// <param name="Previa">Frase que aparece na lista da caixa de entrada, ao lado do assunto.</param>
/// <param name="Titulo">Título do cartão, sem ponto final.</param>
/// <param name="Paragrafos">Uma ideia por parágrafo, com o dado concreto.</param>
/// <param name="Botao">Ação principal (opcional). O link também vai em texto, abaixo do botão.</param>
/// <param name="Nota">Texto pequeno depois do botão: validade do link, "se não foi você, ignore".</param>
/// <param name="Motivo">Rodapé: por que a pessoa recebeu este e-mail.</param>
public sealed record EmailConteudo(
    string Assunto,
    string Previa,
    string Titulo,
    IReadOnlyList<string> Paragrafos,
    EmailBotao? Botao = null,
    string? Nota = null,
    string? Motivo = null);

/// <summary>Botão de ação do e-mail: o texto começa com verbo ("Confirmar e-mail").</summary>
public sealed record EmailBotao(string Texto, string Url);

/// <summary>Envio de e-mail do sistema (HTML com o layout da marca + versão em texto puro).</summary>
public interface IEnvioEmail
{
    Task EnviarAsync(string email, EmailConteudo conteudo, CancellationToken ct);
}

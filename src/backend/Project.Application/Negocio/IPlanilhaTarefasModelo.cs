using Project.Application.Comum;
using Project.Domain.Eventos;

namespace Project.Application.Negocio;

public interface IPlanilhaTarefasModelo
{
    byte[] Modelo();

    /// <param name="aceitaData">Falso no modelo de evento (só prazo relativo); verdadeiro no evento.</param>
    Resultado<ResultadoLeituraTarefas> Ler(Stream arquivo, string? nomeArquivo, bool aceitaData);
}

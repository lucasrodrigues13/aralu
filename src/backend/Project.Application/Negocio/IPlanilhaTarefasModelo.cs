using Project.Application.Comum;
using Project.Domain.Eventos;

namespace Project.Application.Negocio;

public interface IPlanilhaTarefasModelo
{
    byte[] Modelo();

    Resultado<ResultadoLeituraTarefas> Ler(Stream arquivo, string? nomeArquivo);
}

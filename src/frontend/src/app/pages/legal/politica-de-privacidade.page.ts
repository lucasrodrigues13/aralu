import { Component } from '@angular/core';
import { PaginaPublica } from '../../shared/pagina-publica';
import { empresa } from './legal.dados';
import { ESTILOS_LEGAL } from './legal.estilos';

// PENDENTE (SPEC-068 D3): texto inicial, a revisar com apoio jurídico antes do lançamento.
// Mesmo texto de src/landing/src/pages/politica-de-privacidade.astro.
@Component({
  selector: 'app-politica-de-privacidade',
  imports: [PaginaPublica],
  styles: ESTILOS_LEGAL,
  template: `
    <app-pagina-publica titulo="Política de privacidade" [subtitulo]="'Em vigor desde ' + empresa.vigencia">
      <article class="prosa">
        <p>
          Esta política explica como {{ quem }} ("Aralu") trata dados pessoais, de acordo com a Lei Geral de Proteção de Dados (Lei 13.709/2018, LGPD).
        </p>

        <h2>1. Dois papéis diferentes</h2>
        <ul>
          <li><strong>Dados da sua conta.</strong> Para os dados de quem assina e usa a Aralu (cerimonialistas e equipe), a Aralu é a <strong>controladora</strong>: decide como e por que tratar.</li>
          <li><strong>Dados que você cadastra.</strong> Para os dados de clientes, convidados, fornecedores e equipe de apoio que a assessoria cadastra, a assessoria é a <strong>controladora</strong> e a Aralu é a <strong>operadora</strong>: trata esses dados só para prestar o serviço, seguindo as instruções da assessoria.</li>
        </ul>
        <p>
          Se você é cliente, convidado ou fornecedor de uma assessoria que usa a Aralu e quer exercer seus direitos, procure primeiro a assessoria. Se preferir, escreva para a Aralu, que encaminha o pedido.
        </p>

        <h2>2. Dados tratados e finalidades</h2>
        <div class="rolagem">
          <table>
            <thead>
              <tr><th>Dados</th><th>Para quê</th><th>Base legal</th></tr>
            </thead>
            <tbody>
              <tr><td>Nome, e-mail e senha (guardada de forma irreversível) de quem cria a conta e dos membros</td><td>Criar a conta, autenticar e enviar avisos do serviço</td><td>Execução de contrato</td></tr>
              <tr><td>Dados da assessoria: nome, logo, telefone, endereço, CPF ou CNPJ</td><td>Identificar a assessoria em propostas, contratos e links, e emitir a cobrança</td><td>Execução de contrato e obrigação legal</td></tr>
              <tr><td>Dados de pagamento: situação das cobranças e identificadores do Asaas</td><td>Cobrar a assinatura. Os dados do cartão ficam só no Asaas</td><td>Execução de contrato</td></tr>
              <tr><td>Registros de acesso: data, hora e endereço IP</td><td>Segurança, prevenção a fraude e cumprimento do Marco Civil da Internet</td><td>Obrigação legal e legítimo interesse</td></tr>
              <tr><td>Dados cadastrados pela assessoria: clientes, convidados, fornecedores, equipe de apoio, contratos e arquivos</td><td>Prestar o serviço à assessoria</td><td>Definida pela assessoria, que é a controladora</td></tr>
              <tr><td>Visitas a este site: página vista, origem da visita, tipo de aparelho e país, sem identificar a pessoa</td><td>Saber quais páginas são úteis</td><td>Legítimo interesse</td></tr>
            </tbody>
          </table>
        </div>
        <p>
          A Aralu não pede dados sensíveis. Se a assessoria registrar informações como restrição alimentar ou necessidade de acessibilidade de um convidado, deve fazê-lo com o consentimento da pessoa.
        </p>

        <h2>3. Cookies e medição de visitas</h2>
        <ul>
          <li>Este site não grava cookies e não usa ferramentas de publicidade ou rastreamento entre sites.</li>
          <li>A medição de visitas é feita em servidor próprio, sem cookie e sem guardar o endereço IP. Navegadores com "Não rastrear" ativado não são contados.</li>
          <li>Dentro do sistema, em app.aralu.com.br, são usados apenas cookies necessários para manter a sessão e proteger o acesso.</li>
        </ul>

        <h2>4. Com quem os dados são compartilhados</h2>
        <p>A Aralu não vende dados pessoais. Os dados passam apenas por fornecedores necessários ao serviço:</p>
        <ul>
          <li><strong>Hospedagem:</strong> servidores onde o sistema e o banco de dados funcionam.</li>
          <li><strong>Asaas:</strong> processamento das cobranças da assinatura.</li>
          <li><strong>Microsoft 365:</strong> envio dos e-mails do sistema.</li>
        </ul>
        <p>
          Alguns desses fornecedores podem tratar dados fora do Brasil. Nesses casos, a transferência segue as regras da LGPD para transferência internacional. Dados também podem ser entregues a autoridades quando houver ordem legal.
        </p>

        <h2>5. Por quanto tempo os dados ficam guardados</h2>
        <ul>
          <li>Enquanto a conta estiver ativa, os dados ficam disponíveis para a assessoria.</li>
          <li>Depois do cancelamento ou do fim do teste sem assinatura, os dados ficam guardados por até 6 meses, para o caso de a assessoria voltar, e depois são apagados ou anonimizados.</li>
          <li>Registros de acesso ficam guardados por 6 meses, como exige o Marco Civil da Internet.</li>
          <li>Dados de cobrança ficam guardados pelo prazo exigido pela legislação fiscal.</li>
          <li>A assessoria pode pedir a exclusão antes desses prazos, salvo o que a lei obriga a guardar.</li>
        </ul>

        <h2>6. Segurança</h2>
        <ul>
          <li>A conexão com o sistema é criptografada.</li>
          <li>Os dados de cada assessoria ficam separados dos dados das outras contas.</li>
          <li>Senhas e códigos de acesso são guardados de forma que não podem ser lidos.</li>
          <li>Links enviados a clientes, convidados e equipe de apoio só abrem com código enviado ao e-mail da pessoa, quando a função exige, e têm validade.</li>
          <li>Em caso de incidente que possa trazer risco relevante, a Aralu avisa as pessoas afetadas, as assessorias e a Autoridade Nacional de Proteção de Dados, nos prazos da lei.</li>
        </ul>

        <h2>7. Seus direitos</h2>
        <p>Você pode, a qualquer momento:</p>
        <ul>
          <li>confirmar se a Aralu trata seus dados e pedir acesso a eles;</li>
          <li>corrigir dados incompletos ou desatualizados;</li>
          <li>pedir a exclusão, a anonimização ou o bloqueio de dados desnecessários;</li>
          <li>pedir a portabilidade dos seus dados;</li>
          <li>saber com quem os dados foram compartilhados;</li>
          <li>revogar consentimento, quando o tratamento depender dele;</li>
          <li>reclamar à Autoridade Nacional de Proteção de Dados (ANPD).</li>
        </ul>
        <p>
          Para exercer esses direitos, escreva para <a [href]="'mailto:' + empresa.contato">{{ empresa.contato }}</a>. A resposta chega em até 15 dias.
        </p>

        <h2>8. Encarregado de dados</h2>
        <p>
          O contato do encarregado pelo tratamento de dados pessoais é <a [href]="'mailto:' + empresa.contato">{{ empresa.contato }}</a>.
        </p>

        <h2>9. Mudanças nesta política</h2>
        <p>
          Esta política pode mudar. Mudanças relevantes são avisadas por e-mail ou dentro do sistema antes de entrarem em vigor. A data no topo desta página mostra a versão atual.
        </p>
      </article>
    </app-pagina-publica>
  `,
})
export class PoliticaDePrivacidadePage {
  protected readonly empresa = empresa;
  protected readonly quem = empresa.razaoSocial
    ? `${empresa.razaoSocial}${empresa.cnpj ? `, CNPJ ${empresa.cnpj}` : ''}`
    : 'a empresa responsável pela plataforma Aralu';
}

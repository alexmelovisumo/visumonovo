import { Link } from 'react-router-dom'
import { ChevronLeft } from 'lucide-react'

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-8">
      <h2 className="text-lg font-bold text-slate-900 mb-3">{title}</h2>
      <div className="text-sm text-slate-600 leading-relaxed space-y-3">{children}</div>
    </section>
  )
}

export function PrivacyPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center gap-3">
          <Link to="/" className="text-slate-400 hover:text-slate-600 transition-colors">
            <ChevronLeft size={20} />
          </Link>
          <span className="font-bold text-primary-700 tracking-tight">Visumo</span>
          <span className="text-slate-300">|</span>
          <span className="text-sm font-medium text-slate-600">Política de Privacidade</span>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-12">
        <div className="bg-white rounded-2xl border border-slate-200 p-8">
          <h1 className="text-2xl font-extrabold text-slate-900 mb-1">Política de Privacidade</h1>
          <p className="text-xs text-slate-400 mb-8">
            Última atualização: março de 2026 · Conforme Lei Geral de Proteção de Dados (LGPD — Lei nº 13.709/2018)
          </p>

          <Section title="1. Quem somos">
            <p>
              A Visumo é controladora dos dados pessoais coletados nesta plataforma, operando um
              marketplace B2B para o setor de comunicação visual. Nosso contato para questões de
              privacidade é{' '}
              <a href="mailto:privacidade@visumo.com.br" className="text-primary-600 hover:underline">
                privacidade@visumo.com.br
              </a>.
            </p>
          </Section>

          <Section title="2. Dados que coletamos">
            <p>Coletamos os seguintes dados ao usar a plataforma:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Dados de cadastro:</strong> nome, e-mail, telefone, tipo de empresa, CPF/CNPJ (opcional)</li>
              <li><strong>Dados de perfil:</strong> foto, bio, localização (cidade/estado/coordenadas GPS), especialidades, links profissionais</li>
              <li><strong>Dados de uso:</strong> projetos publicados, propostas enviadas, mensagens trocadas, visualizações de perfil</li>
              <li><strong>Dados financeiros:</strong> histórico de assinaturas e planos contratados (dados de cartão são processados pelo PagBank)</li>
              <li><strong>Dados técnicos:</strong> endereço IP, tipo de navegador, dispositivo, cookies de sessão</li>
            </ul>
          </Section>

          <Section title="3. Como usamos seus dados">
            <p>Seus dados são usados para:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Operar e melhorar a plataforma</li>
              <li>Autenticar seu acesso e proteger sua conta</li>
              <li>Conectar empresas, profissionais e fornecedores relevantes</li>
              <li>Processar pagamentos e gerenciar assinaturas</li>
              <li>Enviar comunicações transacionais (confirmações, notificações de proposta etc.)</li>
              <li>Exibir seu perfil público para outros usuários da plataforma</li>
              <li>Cumprir obrigações legais e regulatórias</li>
            </ul>
          </Section>

          <Section title="4. Base legal (LGPD)">
            <p>Processamos seus dados com base nas seguintes hipóteses previstas na LGPD:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Execução de contrato</strong> (art. 7º, V): para operar a conta e os serviços contratados</li>
              <li><strong>Legítimo interesse</strong> (art. 7º, IX): para segurança da plataforma e melhoria dos serviços</li>
              <li><strong>Consentimento</strong> (art. 7º, I): para comunicações de marketing, quando aplicável</li>
              <li><strong>Cumprimento de obrigação legal</strong> (art. 7º, II): para retenção fiscal e compliance</li>
            </ul>
          </Section>

          <Section title="5. Compartilhamento de dados">
            <p>
              Não vendemos seus dados pessoais. Podemos compartilhá-los com:
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Supabase:</strong> infraestrutura de banco de dados e autenticação (servidor na região sa-east-1)</li>
              <li><strong>PagBank:</strong> processamento de pagamentos</li>
              <li><strong>Resend:</strong> envio de e-mails transacionais</li>
              <li><strong>Vercel:</strong> hospedagem do aplicativo</li>
              <li><strong>Autoridades:</strong> quando exigido por lei ou decisão judicial</li>
            </ul>
            <p>
              Todos os fornecedores são contratados com cláusulas de proteção de dados adequadas.
            </p>
          </Section>

          <Section title="6. Dados de localização">
            <p>
              A plataforma pode solicitar acesso à sua localização GPS para recursos como "Profissionais
              Próximos" e "Mapa de Projetos". Essa permissão é opcional e pode ser negada a qualquer
              momento nas configurações do navegador. As coordenadas coletadas são usadas exclusivamente
              para funcionalidades de geolocalização dentro da plataforma.
            </p>
          </Section>

          <Section title="7. Retenção de dados">
            <p>
              Mantemos seus dados enquanto sua conta estiver ativa. Após o encerramento, os dados são
              retidos por até 5 anos para cumprimento de obrigações legais (especialmente fiscais),
              exceto onde prazo maior for exigido por lei.
            </p>
          </Section>

          <Section title="8. Seus direitos (LGPD)">
            <p>Como titular de dados, você tem direito a:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Confirmar a existência de tratamento de seus dados</li>
              <li>Acessar os dados que temos sobre você</li>
              <li>Corrigir dados incompletos, inexatos ou desatualizados</li>
              <li>Solicitar anonimização, bloqueio ou eliminação de dados desnecessários</li>
              <li>Revogar o consentimento, quando aplicável</li>
              <li>Obter portabilidade dos seus dados</li>
              <li>Ser informado sobre o compartilhamento de dados com terceiros</li>
            </ul>
            <p>
              Para exercer esses direitos, envie solicitação para{' '}
              <a href="mailto:privacidade@visumo.com.br" className="text-primary-600 hover:underline">
                privacidade@visumo.com.br
              </a>. Responderemos em até 15 dias úteis.
            </p>
          </Section>

          <Section title="9. Segurança">
            <p>
              Adotamos medidas técnicas e organizacionais para proteger seus dados, incluindo: criptografia
              em trânsito (TLS), autenticação segura via Supabase Auth, controles de acesso por Row-Level
              Security no banco de dados e monitoramento de acessos suspeitos.
            </p>
          </Section>

          <Section title="10. Cookies">
            <p>
              Utilizamos cookies essenciais para manter sua sessão autenticada e preferências de interface.
              Não utilizamos cookies de rastreamento publicitário de terceiros.
            </p>
          </Section>

          <Section title="11. Alterações nesta política">
            <p>
              Podemos atualizar esta Política periodicamente. Notificaremos usuários com conta ativa
              sobre mudanças significativas por e-mail ou notificação na plataforma, com antecedência
              mínima de 15 dias.
            </p>
          </Section>

          <Section title="12. Contato e DPO">
            <p>
              Para questões sobre privacidade e proteção de dados, entre em contato com nosso
              Encarregado de Proteção de Dados (DPO) pelo e-mail{' '}
              <a href="mailto:privacidade@visumo.com.br" className="text-primary-600 hover:underline">
                privacidade@visumo.com.br
              </a>.
            </p>
          </Section>

          {/* Navigation */}
          <div className="border-t border-slate-100 pt-6 mt-4 flex flex-wrap gap-4 text-sm">
            <Link to="/termos" className="text-primary-600 hover:underline">
              Termos de Uso →
            </Link>
            <Link to="/" className="text-slate-400 hover:text-slate-600 ml-auto">
              Voltar ao início
            </Link>
          </div>
        </div>
      </main>
    </div>
  )
}

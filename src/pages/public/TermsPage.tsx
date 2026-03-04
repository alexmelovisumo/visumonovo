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

export function TermsPage() {
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
          <span className="text-sm font-medium text-slate-600">Termos de Uso</span>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-12">
        <div className="bg-white rounded-2xl border border-slate-200 p-8">
          <h1 className="text-2xl font-extrabold text-slate-900 mb-1">Termos de Uso</h1>
          <p className="text-xs text-slate-400 mb-8">Última atualização: março de 2026</p>

          <Section title="1. Aceitação dos Termos">
            <p>
              Ao acessar ou utilizar a plataforma Visumo, você concorda com estes Termos de Uso.
              Se você não concordar com alguma parte destes termos, não poderá usar nossos serviços.
            </p>
            <p>
              A Visumo reserva-se o direito de modificar estes termos a qualquer momento.
              Alterações entram em vigor após publicação nesta página, com a data de atualização revisada.
            </p>
          </Section>

          <Section title="2. Descrição do Serviço">
            <p>
              A Visumo é um marketplace B2B voltado ao setor de comunicação visual, conectando empresas
              contratantes, profissionais autônomos, empresas prestadoras de serviço e fornecedores de
              materiais e insumos.
            </p>
            <p>
              Os serviços incluem: publicação e busca de projetos, envio e recebimento de propostas,
              comunicação via chat, catálogo de produtos, gestão de assinaturas e perfil profissional.
            </p>
          </Section>

          <Section title="3. Cadastro e Conta">
            <p>
              Para usar a plataforma, é necessário criar uma conta com dados verdadeiros, completos e
              atualizados. Você é responsável por manter a confidencialidade de sua senha e por todas
              as atividades realizadas em sua conta.
            </p>
            <p>
              É permitido apenas um cadastro por pessoa física ou jurídica. Contas duplicadas ou criadas
              com dados falsos podem ser suspensas sem aviso prévio.
            </p>
          </Section>

          <Section title="4. Planos e Pagamentos">
            <p>
              A Visumo oferece planos gratuitos e pagos. Os planos pagos são cobrados de forma mensal
              ou anual, conforme a opção selecionada no momento da contratação.
            </p>
            <p>
              Os pagamentos são processados via PagBank. Ao contratar um plano pago, você autoriza a
              cobrança pelo período selecionado. O cancelamento pode ser solicitado a qualquer momento,
              mas não gera reembolso proporcional pelo período já pago, salvo conforme a Política de
              Reembolso vigente.
            </p>
            <p>
              Preços podem ser alterados com aviso prévio de 30 dias por e-mail para usuários com
              assinatura ativa.
            </p>
          </Section>

          <Section title="5. Responsabilidades do Usuário">
            <p>Você concorda em não:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Publicar conteúdo falso, enganoso, difamatório ou ilegal</li>
              <li>Realizar transações financeiras fora da plataforma para contornar taxas</li>
              <li>Usar a plataforma para spam, phishing ou qualquer atividade fraudulenta</li>
              <li>Tentar acessar sistemas ou contas de outros usuários sem autorização</li>
              <li>Revender ou sublicenciar o acesso à plataforma a terceiros</li>
            </ul>
          </Section>

          <Section title="6. Conteúdo do Usuário">
            <p>
              Ao publicar projetos, propostas, mensagens, imagens ou qualquer outro conteúdo na
              plataforma, você declara que possui os direitos necessários sobre esse conteúdo e
              concede à Visumo uma licença não exclusiva para armazená-lo, exibi-lo e processá-lo
              para fins de operação da plataforma.
            </p>
            <p>
              A Visumo não se responsabiliza pelo conteúdo publicado pelos usuários, podendo
              removê-lo caso viole estes termos ou a legislação aplicável.
            </p>
          </Section>

          <Section title="7. Limitação de Responsabilidade">
            <p>
              A Visumo atua como intermediária entre contratantes e prestadores de serviço, não sendo
              parte nos contratos firmados entre eles. Não nos responsabilizamos por: inadimplência,
              qualidade dos serviços prestados, divergências contratuais ou quaisquer danos decorrentes
              das negociações realizadas fora de nossa plataforma.
            </p>
            <p>
              Na máxima extensão permitida pela lei, nossa responsabilidade total por quaisquer danos
              fica limitada ao valor pago pelo usuário nos últimos 12 meses.
            </p>
          </Section>

          <Section title="8. Suspensão e Encerramento">
            <p>
              A Visumo pode suspender ou encerrar sua conta a qualquer momento, com ou sem aviso
              prévio, caso identifique violação destes termos, atividade fraudulenta ou comportamento
              prejudicial à comunidade.
            </p>
            <p>
              Você pode encerrar sua conta a qualquer momento acessando Configurações da Conta e
              utilizando a opção de desativar conta.
            </p>
          </Section>

          <Section title="9. Propriedade Intelectual">
            <p>
              O nome Visumo, logotipo, interface, código-fonte e demais elementos da plataforma são
              de propriedade exclusiva da Visumo e protegidos por lei. É proibida a reprodução,
              modificação ou distribuição sem autorização expressa.
            </p>
          </Section>

          <Section title="10. Lei Aplicável e Foro">
            <p>
              Estes termos são regidos pela legislação brasileira. Para dirimir quaisquer controvérsias,
              fica eleito o foro da comarca de São Paulo/SP, com renúncia a qualquer outro, por mais
              privilegiado que seja.
            </p>
          </Section>

          <Section title="11. Contato">
            <p>
              Dúvidas sobre estes Termos de Uso podem ser enviadas para{' '}
              <a href="mailto:contato@visumo.com.br" className="text-primary-600 hover:underline">
                contato@visumo.com.br
              </a>.
            </p>
          </Section>

          {/* Navigation */}
          <div className="border-t border-slate-100 pt-6 mt-4 flex flex-wrap gap-4 text-sm">
            <Link to="/privacidade" className="text-primary-600 hover:underline">
              Política de Privacidade →
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

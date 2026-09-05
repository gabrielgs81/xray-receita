import { useEffect, useMemo, useState } from 'react'
import { ArrowRight, BadgeDollarSign, Check, ChevronRight, CircleDollarSign, Landmark, LoaderCircle, LockKeyhole, MapPin, Radar, ShieldCheck, Sparkles, Target, TrendingUp, Users } from 'lucide-react'
import { RevenueQuiz } from './components/RevenueQuiz'
import { calculateRevenue } from './lib/calculations'
import { beginMarketResearch, completeSession, getPublicReport, saveProgress, startSession, storedSession, trackPageView } from './lib/supabase'
import { initialAnswers, type Answers, type MarketResearch, type RevenueReport, type Session } from './lib/types'

const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })

function App() {
  const [screen, setScreen] = useState<'home'|'quiz'|'loading'|'report'>('home')
  const [answers, setAnswers] = useState<Answers>(() => { try { return { ...initialAnswers, ...JSON.parse(localStorage.getItem('xray-receita-answers') || '{}') } } catch { return initialAnswers } })
  const [session, setSession] = useState<Session|null>(() => storedSession())
  const [remote, setRemote] = useState<{ answers: Answers; metrics: RevenueReport; market?: MarketResearch; researchStatus?: string }|null>(null)
  const report = useMemo(() => calculateRevenue(answers), [answers])

  useEffect(() => {
    void trackPageView()
    const slug = location.pathname.match(/^\/r\/([a-f0-9]{64})$/i)?.[1]
    if (slug) void getPublicReport(slug).then(data => {
      const saved = data?.report as { answers?: Answers; metrics?: RevenueReport } | undefined
      if (saved?.answers && saved.metrics) { setRemote({ answers: saved.answers, metrics: saved.metrics, market: data.market_research, researchStatus: data.research_status }); setScreen('report') }
    })
  }, [])
  useEffect(() => { localStorage.setItem('xray-receita-answers', JSON.stringify(answers)) }, [answers])
  useEffect(() => {
    const abandoned = () => { if (screen === 'quiz') void saveProgress(session, 0, answers, 'quiz_abandoned') }
    window.addEventListener('pagehide', abandoned)
    return () => window.removeEventListener('pagehide', abandoned)
  }, [answers, screen, session])

  const start = async () => {
    const created = await startSession()
    setSession(created); setScreen('quiz')
    void saveProgress(created, 0, answers, 'quiz_started')
  }
  const finish = async () => {
    setScreen('loading')
    const slug = await completeSession(session, answers, report)
    if (slug) {
      history.replaceState({}, '', `/r/${slug}`)
      const data = await getPublicReport(slug)
      const saved = data?.report as { answers?: Answers; metrics?: RevenueReport } | undefined
      if (saved?.answers && saved.metrics) setRemote({ answers: saved.answers, metrics: saved.metrics, market: data.market_research, researchStatus: data.research_status })
    }
    window.setTimeout(() => setScreen('report'), 1900)
  }

  if (screen === 'home') return <main className="landing">
    <header className="nav"><div className="brand"><Radar/><span>GYM X-RAY</span><em>RECEITA</em></div><button className="ghost" onClick={start}>Começar diagnóstico <ArrowRight/></button></header>
    <section className="hero-home"><div className="hero-copy"><span className="eyebrow"><Sparkles/> RAIO-X FINANCEIRO DA SUA ACADEMIA</span><h1>Descubra quanto sua academia está <mark>deixando de faturar.</mark></h1><p>Avance por uma trilha de missões rápidas, desbloqueie indicadores e transforme seus números em um plano para aumentar ticket, retenção e receita.</p><button className="primary" onClick={start}>Iniciar minha trilha de receita <ArrowRight/></button><small><ShieldCheck/> Diagnóstico confidencial · progresso salvo automaticamente</small></div>
    <div className="opportunity-card"><div className="live"><i/> SIMULAÇÃO DO RESULTADO</div><span>Potencial anual identificado</span><strong>+ R$ 184.320</strong><div className="mini-chart"><i/><i/><i/><i/><i/><i/></div><p><TrendingUp/> 3 alavancas de crescimento encontradas</p></div></section>
    <section className="proof"><p>Indicadores que você desbloqueia</p><div><article><CircleDollarSign/><strong>Ticket ideal</strong><span>Preço e mix de planos</span></article><article><Users/><strong>Receita perdida</strong><span>Churn e inadimplência</span></article><article><MapPin/><strong>Mercado local</strong><span>Preços e posicionamento</span></article><article><Target/><strong>Plano de ação</strong><span>O que fazer primeiro</span></article></div></section>
  </main>

  if (screen === 'loading') return <main className="loading"><div className="scan"><Radar/><i/></div><span>100 PONTOS CONQUISTADOS</span><h1>Estamos transformando sua jornada em um mapa de crescimento.</h1><div className="loading-list"><p><Check/> Ticket e mix de planos decodificados</p><p><Check/> Retenção e inadimplência analisadas</p><p className="active"><LoaderCircle/> Consolidando oportunidades</p></div></main>
  if (screen === 'report') return <Report answers={remote?.answers || answers} report={remote?.metrics || report} market={remote?.market} researchStatus={remote?.researchStatus}/>

  return <RevenueQuiz answers={answers} onChange={setAnswers} onExit={() => setScreen('home')} onCheckpoint={(stage, current, event) => saveProgress(session, stage, current, event)} onResearch={() => void beginMarketResearch(session)} onFinish={() => void finish()}/>
}

function Report({ answers, report, market, researchStatus }: { answers: Answers; report: RevenueReport; market?: MarketResearch; researchStatus?: string }) {
  const gap = Math.max(0, answers.revenueGoal - answers.totalRevenue)
  return <main className="report"><header className="report-nav"><div className="brand"><Radar/><span>GYM X-RAY</span><em>RECEITA</em></div><span>Diagnóstico de {answers.gymName}</span></header><section className="report-hero"><div><span className="eyebrow">OPORTUNIDADE ANUAL IDENTIFICADA</span><h1>Existe até <mark>{brl.format(report.annualOpportunity)}</mark> escondido na sua operação.</h1><p>Seu faturamento não depende apenas de colocar mais alunos para dentro. O maior ganho aparece na combinação entre preço, retenção e recuperação de receita.</p></div><div className="score"><span>EFICIÊNCIA DE RECEITA</span><strong>{report.score}</strong><small>de 100 pontos</small></div></section>
  <section className="report-body"><div className="metric-row"><article><span>FATURAMENTO ATUAL</span><strong>{brl.format(answers.totalRevenue)}</strong><small>por mês</small></article><ArrowRight/><article className="accent"><span>POTENCIAL MAPEADO</span><strong>{brl.format(report.projectedRevenue)}</strong><small>por mês</small></article><article className={gap ? 'alert':''}><span>DISTÂNCIA DA META</span><strong>{brl.format(gap)}</strong><small>{gap ? 'ainda precisa ser conquistado' : 'meta já alcançada'}</small></article></div>
  <h2>Onde a receita está escapando</h2><div className="levers"><article><BadgeDollarSign/><span>PREÇO E MIX</span><strong>+ {brl.format(report.monthlyPriceOpportunity)}/mês</strong><p>Ticket realizado de {brl.format(report.realizedTicket)} pode se aproximar de {brl.format(report.recommendedTicket)}.</p></article><article><Users/><span>RETENÇÃO</span><strong>+ {brl.format(report.monthlyRetentionOpportunity)}/mês</strong><p>Recuperando apenas 20% dos cancelamentos atuais.</p></article><article><ShieldCheck/><span>INADIMPLÊNCIA</span><strong>+ {brl.format(report.monthlyDefaultOpportunity)}/mês</strong><p>Estimativa conservadora de recuperação sobre a receita de planos.</p></article></div>
  <div className="verdict"><TrendingUp/><div><span>O NÚMERO QUE MUDA A DECISÃO</span><h2>Você pode reajustar seu ticket e perder até {report.churnTolerance} alunos sem reduzir a receita atual.</h2><p>Isso não é uma recomendação para perder alunos — é a margem financeira para executar uma transição de preço com segurança.</p></div></div>
  {researchStatus === 'completed' && market ? <section className="market-result"><div className="market-title"><MapPin/><div><span>PANORAMA REGIONAL</span><h2>Preços e posicionamento em {answers.neighborhood ? `${answers.neighborhood}, ` : ''}{answers.city}</h2><p>{market.summary}</p></div></div>{market.price_benchmark && <div className="benchmark"><article><span>MENOR PREÇO PÚBLICO</span><strong>{market.price_benchmark.minimum == null ? 'Não encontrado' : brl.format(market.price_benchmark.minimum)}</strong></article><article className="accent"><span>MEDIANA ENCONTRADA</span><strong>{market.price_benchmark.median == null ? 'Inconclusiva' : brl.format(market.price_benchmark.median)}</strong></article><article><span>MAIOR PREÇO PÚBLICO</span><strong>{market.price_benchmark.maximum == null ? 'Não encontrado' : brl.format(market.price_benchmark.maximum)}</strong></article></div>}<p className="market-interpretation">{market.price_benchmark?.interpretation}</p><div className="competitors">{market.competitors?.map(item => <article key={item.name}><div><strong>{item.name}</strong><span className={`pressure ${item.competitive_pressure}`}>pressão {item.competitive_pressure}</span></div><small>{[item.address,item.distance_estimate].filter(Boolean).join(' · ')}</small><p>{item.positioning || item.evidence}</p><footer><b>{item.public_monthly_price == null ? 'Preço não encontrado' : brl.format(item.public_monthly_price)}</b><em>Wellhub: {item.wellhub_status.replaceAll('_',' ')}</em></footer></article>)}</div><div className="wellhub-reading"><Landmark/><div><b>Leitura do Wellhub</b><p>{market.wellhub_reading}</p></div></div></section> : <section className="market-preview"><div><MapPin/><span>PESQUISA REGIONAL {researchStatus === 'failed' ? 'INCONCLUSIVA' : 'EM ANDAMENTO'}</span><h2>Preços e posicionamento em {answers.neighborhood ? `${answers.neighborhood}, ` : ''}{answers.city}</h2><p>{researchStatus === 'failed' ? 'Não encontramos evidências públicas suficientes nesta tentativa. O cálculo financeiro continua válido com os dados informados.' : 'Estamos verificando concorrentes, planos públicos e presença no Wellhub. Atualize este link em instantes para ver o panorama.'}</p></div><div className="radar-placeholder"><i/><i/><i/><i/><Radar/></div></section>}
  <section className="locked"><LockKeyhole/><div><span>PLANO COMPLETO DE CRESCIMENTO</span><h2>Seu roteiro para sair de {brl.format(answers.totalRevenue)} e buscar {brl.format(Math.max(answers.revenueGoal, report.projectedRevenue))}/mês</h2><ul><li><Check/> Faixa recomendada de reajuste</li><li><Check/> Nova arquitetura de planos</li><li><Check/> Scripts de comunicação para alunos</li><li><Check/> Plano de execução em 90 dias</li></ul></div><button className="primary">Quero liberar meu plano <ChevronRight/></button></section>
  <p className="method">Estimativas gerenciais baseadas nos dados informados. A pesquisa regional diferencia fatos públicos, inferências e informações não encontradas. O diagnóstico não substitui contabilidade ou consultoria financeira.</p></section></main>
}
export default App

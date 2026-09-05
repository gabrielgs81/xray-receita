import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, ArrowRight, BadgeDollarSign, Check, CircleDollarSign, Flame, Landmark, LockKeyhole, MapPin, Radar, Rocket, Sparkles, Target, Trophy, Users } from 'lucide-react'
import { calculateRevenue } from '../lib/calculations'
import type { Answers } from '../lib/types'
import { CityAutocomplete } from './CityAutocomplete'

const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })
const num = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 })
type NumberKey = { [K in keyof Answers]: Answers[K] extends number ? K : never }[keyof Answers]
type TextKey = { [K in keyof Answers]: Answers[K] extends string ? K : never }[keyof Answers]

const steps = [
  { id: 'model', stage: 0, phase: 'Perfil da operação' },
  { id: 'gym', stage: 0, phase: 'Perfil da operação' },
  { id: 'location', stage: 0, phase: 'Radar regional' },
  { id: 'radar_unlock', stage: 1, phase: 'Radar desbloqueado' },
  { id: 'students', stage: 1, phase: 'Pulso financeiro' },
  { id: 'revenue', stage: 1, phase: 'Pulso financeiro' },
  { id: 'ticket_unlock', stage: 2, phase: 'Indicador revelado' },
  { id: 'prices', stage: 2, phase: 'Arquitetura de planos' },
  { id: 'mix', stage: 2, phase: 'Arquitetura de planos' },
  { id: 'leaks', stage: 2, phase: 'Vazamentos de receita' },
  { id: 'wellhub', stage: 3, phase: 'Canais corporativos' },
  { id: 'wellhub_numbers', stage: 3, phase: 'Canais corporativos' },
  { id: 'movement', stage: 3, phase: 'Motor de crescimento' },
  { id: 'leads', stage: 4, phase: 'Motor de crescimento' },
  { id: 'goal', stage: 4, phase: 'Sua próxima meta' },
  { id: 'contact', stage: 5, phase: 'Liberar diagnóstico' },
] as const

const stageNames = ['Perfil', 'Financeiro', 'Planos', 'Crescimento', 'Meta', 'Resultado']

function RangeField({ label, name, value, min, max, step = 1, suffix = '', onChange }: { label: string; name: NumberKey; value: number; min: number; max: number; step?: number; suffix?: string; onChange: (key: NumberKey, value: number) => void }) {
  return <label className="game-range"><span>{label}<strong>{num.format(value)}{suffix}</strong></span><input type="range" name={name} min={min} max={max} step={step} value={value} onChange={e => onChange(name, Number(e.target.value))}/><div><small>{min}{suffix}</small><small>{max}{suffix}</small></div></label>
}

function MoneyField({ label, name, value, onChange, hint }: { label: string; name: NumberKey; value: number; onChange: (key: NumberKey, value: number) => void; hint?: string }) {
  return <label className="game-field"><span>{label}</span><div className="game-money"><b>R$</b><input inputMode="numeric" value={value || ''} onChange={e => onChange(name, Number(e.target.value.replace(/\D/g, '')))}/></div>{hint && <small>{hint}</small>}</label>
}

function Options({ values, selected, onSelect }: { values: Array<{ label: string; value: string; icon?: typeof Radar; detail?: string }>; selected: string; onSelect: (value: string) => void }) {
  return <div className="game-options">{values.map((option, index) => { const Icon = option.icon; return <button key={option.value} className={`game-option ${selected === option.value ? 'selected' : ''}`} style={{ animationDelay: `${index * 55}ms` }} onClick={() => onSelect(option.value)}>{Icon && <span className="option-icon"><Icon/></span>}<span><b>{option.label}</b>{option.detail && <small>{option.detail}</small>}</span><i>{selected === option.value ? <Check/> : <ArrowRight/>}</i></button> })}</div>
}

export function RevenueQuiz({ answers, onChange, onCheckpoint, onResearch, onFinish, onExit }: { answers: Answers; onChange: (answers: Answers) => void; onCheckpoint: (stage: number, answers: Answers, event: string) => Promise<void>; onResearch: () => void; onFinish: () => void; onExit: () => void }) {
  const [index, setIndex] = useState(() => Math.max(0, Math.min(steps.length - 1, Number(localStorage.getItem('xray-receita-step')) || 0)))
  const [error, setError] = useState('')
  const step = steps[index]
  const metrics = useMemo(() => calculateRevenue(answers), [answers])
  const points = Math.round((index / (steps.length - 1)) * 100)
  const streak = Math.max(1, Math.min(9, index + 1))
  useEffect(() => { localStorage.setItem('xray-receita-step', String(index)) }, [index])
  const setNumber = (key: NumberKey, value: number) => onChange({ ...answers, [key]: value })
  const setText = (key: TextKey, value: string) => onChange({ ...answers, [key]: value })

  const valid = () => {
    if (step.id === 'gym') return answers.gymName.trim().length > 1
    if (step.id === 'location') return !!answers.city.trim() && answers.state.trim().length === 2
    if (step.id === 'contact') return answers.ownerName.trim().length > 1 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(answers.email)
    return true
  }
  const advance = async (nextAnswers = answers) => {
    if (!valid()) { setError('Complete os campos destacados para avançar.'); return }
    setError('')
    await onCheckpoint(step.stage, nextAnswers, `question_${step.id}`)
    if (step.id === 'location') onResearch()
    if (index === steps.length - 1) { onFinish(); return }
    setIndex(index + 1); window.scrollTo({ top: 0, behavior: 'auto' })
  }
  const selectAndAdvance = (key: TextKey, value: string) => {
    const next = { ...answers, [key]: value }; onChange(next)
    window.setTimeout(() => void advance(next), 230)
  }

  return <main className="game-shell"><header className="game-header"><div className="game-top"><button className="game-back" onClick={() => index ? setIndex(index - 1) : onExit()}><ArrowLeft/> Voltar</button><div className="phase"><b>{step.phase}</b><span>{stageNames[step.stage]} · {points}%</span></div></div><div className="game-progress"><i style={{ width: `${Math.max(3, points)}%` }}/><span style={{ left: `${Math.max(3, points)}%` }}><Radar/></span></div><div className="game-stats"><span><Trophy/> {points} pontos de diagnóstico</span><span><Flame/> sequência {streak}</span></div></header>
  <section key={step.id} className="game-card">
    {step.id === 'model' && <><span className="game-eyebrow">MISSÃO 01 · CONHECER SUA OPERAÇÃO</span><h1>Qual modelo melhor representa sua academia?</h1><p>Isso calibra a comparação de preço e posicionamento.</p><Options selected={answers.model} onSelect={value => selectAndAdvance('model', value)} values={[{label:'Academia de bairro',value:'Academia de bairro',icon:Users,detail:'Volume, proximidade e recorrência'},{label:'Academia boutique / premium',value:'Academia boutique / premium',icon:Sparkles,detail:'Experiência e ticket elevado'},{label:'Estúdio personalizado',value:'Estúdio com atendimento personalizado',icon:Target,detail:'Atendimento próximo e especializado'},{label:'Academia de condomínio',value:'Academia de condomínio',icon:Landmark,detail:'Operação vinculada ao residencial'}]}/></>}
    {step.id === 'gym' && <><span className="game-eyebrow">IDENTIDADE MAPEADA · +6 PONTOS</span><h1>Qual é o nome da academia?</h1><p>Vamos personalizar as descobertas e entender a escala da operação.</p><label className="game-field hero-input"><span>Nome da academia</span><input autoFocus value={answers.gymName} onChange={e => setText('gymName', e.target.value)} placeholder="Ex.: Academia Movimento"/></label><RangeField label="Área útil aproximada" name="area" value={answers.area} min={50} max={3000} step={10} suffix=" m²" onChange={setNumber}/></>}
    {step.id === 'location' && <><span className="game-eyebrow">ATIVANDO O RADAR REGIONAL</span><h1>Onde sua academia compete?</h1><p>Quanto mais preciso o local, melhor será a busca por concorrentes, preços e Wellhub.</p><div className="game-grid"><CityAutocomplete city={answers.city} uf={answers.state} onInput={value=>onChange({...answers,city:value,state:''})} onSelect={(city,state)=>onChange({...answers,city,state})}/><label className="game-field"><span>Bairro</span><input value={answers.neighborhood} onChange={e => setText('neighborhood',e.target.value)}/></label><label className="game-field full"><span>Endereço aproximado</span><input value={answers.address} onChange={e => setText('address',e.target.value)} placeholder="Rua e número (opcional)"/></label></div></>}
    {step.id === 'radar_unlock' && <Unlock icon={MapPin} label="RADAR DE RECEITA DESBLOQUEADO" title={`A trilha de ${answers.gymName || 'sua academia'} está pronta.`} text={`Enquanto você avança, já começamos a investigar preços, posicionamento e presença no Wellhub em ${answers.city}.`} topics={['Comparativo regional ativado','Benchmark de preços liberado','Concorrentes entrando no radar']}/>} 
    {step.id === 'students' && <><span className="game-eyebrow">PULSO FINANCEIRO · +6 PONTOS</span><h1>Quantos alunos ativos pagam hoje?</h1><p>Essa é a base que transforma faturamento em ticket real.</p><RangeField label="Alunos ativos pagantes" name="activeStudents" value={answers.activeStudents} min={20} max={3000} step={10} onChange={setNumber}/><div className="micro-insight"><Users/><span><b>{num.format(answers.activeStudents)} relacionamentos ativos</b><small>Agora vamos descobrir quanto essa base realmente gera.</small></span></div></>}
    {step.id === 'revenue' && <><span className="game-eyebrow">ABRINDO O CAIXA DA OPERAÇÃO</span><h1>Quanto entra por mês?</h1><p>Use a média dos últimos três meses. Valores relacionados ficam juntos para a conta fechar.</p><div className="game-grid"><MoneyField label="Faturamento total" name="totalRevenue" value={answers.totalRevenue} onChange={setNumber}/><MoneyField label="Receita de mensalidades" name="membershipRevenue" value={answers.membershipRevenue} onChange={setNumber}/><MoneyField label="Outras receitas" name="otherRevenue" value={answers.otherRevenue} onChange={setNumber} hint="Personal, loja, avaliação etc."/></div></>}
    {step.id === 'ticket_unlock' && <Unlock icon={CircleDollarSign} label="PRIMEIRO INDICADOR REVELADO" title={`Seu ticket realizado é ${brl.format(metrics.realizedTicket)}.`} text="Não é o preço da tabela. É quanto cada aluno realmente entrega à receita de planos — e é aqui que os vazamentos começam a aparecer." topics={[`ARPU total: ${brl.format(metrics.totalArpu)}`,`${num.format(answers.activeStudents)} alunos analisados`,'Próxima missão: testar seus preços']}/>} 
    {step.id === 'prices' && <><span className="game-eyebrow">MISSÃO 03 · ARQUITETURA DE PREÇOS</span><h1>Qual é o preço de cada compromisso?</h1><p>Vamos converter todos os planos para uma base mensal comparável.</p><div className="game-grid"><MoneyField label="Plano mensal" name="monthlyPrice" value={answers.monthlyPrice} onChange={setNumber}/><MoneyField label="Trimestral · valor total" name="quarterlyPrice" value={answers.quarterlyPrice} onChange={setNumber}/><MoneyField label="Semestral · valor total" name="semiannualPrice" value={answers.semiannualPrice} onChange={setNumber}/><MoneyField label="Anual · valor total" name="annualPrice" value={answers.annualPrice} onChange={setNumber}/></div></>}
    {step.id === 'mix' && <><span className="game-eyebrow">DECODIFICANDO SUA BASE</span><h1>Como seus alunos se distribuem?</h1><p>Uma aproximação já permite revelar se os planos longos estão ajudando ou comprimindo o ticket.</p><div className="range-stack"><RangeField label="Mensal" name="monthlyMix" value={answers.monthlyMix} min={0} max={100} suffix="%" onChange={setNumber}/><RangeField label="Trimestral" name="quarterlyMix" value={answers.quarterlyMix} min={0} max={100} suffix="%" onChange={setNumber}/><RangeField label="Semestral" name="semiannualMix" value={answers.semiannualMix} min={0} max={100} suffix="%" onChange={setNumber}/><RangeField label="Anual" name="annualMix" value={answers.annualMix} min={0} max={100} suffix="%" onChange={setNumber}/></div></>}
    {step.id === 'leaks' && <><span className="game-eyebrow">CAÇANDO VAZAMENTOS · +7 PONTOS</span><h1>Quanto se perde antes do dinheiro chegar?</h1><p>Pequenos percentuais viram milhares de reais ao longo do ano.</p><RangeField label="Inadimplência estimada" name="defaultRate" value={answers.defaultRate} min={0} max={30} step={.5} suffix="%" onChange={setNumber}/><RangeField label="Taxa média de cartão" name="cardFee" value={answers.cardFee} min={0} max={12} step={.1} suffix="%" onChange={setNumber}/><div className="micro-insight warning"><BadgeDollarSign/><span><b>{brl.format(metrics.monthlyDefaultOpportunity * 12)} por ano pode ser recuperável</b><small>Estimativa conservadora; o diagnóstico final abre a conta.</small></span></div></>}
    {step.id === 'wellhub' && <><span className="game-eyebrow">CANAL CORPORATIVO DETECTADO</span><h1>Sua academia aceita Wellhub?</h1><p>A resposta muda a leitura de receita e concorrência regional.</p><div className="yes-no"><button className={answers.wellhub ? 'selected':''} onClick={() => { const next={...answers,wellhub:true};onChange(next);setTimeout(()=>void advance(next),230)}}><Landmark/><b>Sim, aceito</b><span>Quero analisar o canal</span><Check/></button><button className={!answers.wellhub ? 'selected':''} onClick={() => { const next={...answers,wellhub:false};onChange(next);setTimeout(()=>void advance(next),230)}}><Radar/><b>Não aceito</b><span>Quero comparar a oportunidade</span><Check/></button></div></>}
    {step.id === 'wellhub_numbers' && (answers.wellhub ? <><span className="game-eyebrow">EFICIÊNCIA DO WELLHUB</span><h1>Quanto esse canal produz?</h1><p>Usamos o dado do seu contrato; nenhuma pesquisa pública substitui esse valor.</p><RangeField label="Check-ins no mês" name="wellhubCheckins" value={answers.wellhubCheckins} min={0} max={5000} step={10} onChange={setNumber}/><MoneyField label="Receita mensal recebida" name="wellhubRevenue" value={answers.wellhubRevenue} onChange={setNumber}/>{answers.wellhubCheckins > 0 && <div className="micro-insight"><Landmark/><span><b>{brl.format(metrics.wellhubPerCheckin)} por check-in</b><small>Guardamos esse indicador para comparar eficiência.</small></span></div>}</> : <Unlock icon={Radar} label="OPORTUNIDADE NO RADAR" title="Vamos verificar o Wellhub sem presumir que ele é a resposta." text="O relatório compara presença dos concorrentes e deixa claro quando a adesão merece análise — ou quando pode pressionar sua margem." topics={['Presença regional','Pressão competitiva','Decisão baseada em evidência']}/>)}
    {step.id === 'movement' && <><span className="game-eyebrow">MISSÃO 04 · MOVIMENTO DA BASE</span><h1>Quem entra e quem escapa todo mês?</h1><p>Esses números revelam se seu crescimento é real ou se as vendas apenas repõem cancelamentos.</p><div className="range-stack"><RangeField label="Novos alunos" name="newStudents" value={answers.newStudents} min={0} max={300} onChange={setNumber}/><RangeField label="Cancelamentos" name="cancellations" value={answers.cancellations} min={0} max={300} onChange={setNumber}/></div><div className={`movement-score ${metrics.netGrowth < 0 ? 'danger':''}`}><span>SEU SALDO MENSAL</span><strong>{metrics.netGrowth >= 0 ? '+' : ''}{metrics.netGrowth} alunos</strong><small>Churn estimado: {num.format(metrics.churnRate*100)}%</small></div></>}
    {step.id === 'leads' && <><span className="game-eyebrow">FECHANDO O MOTOR DE CRESCIMENTO</span><h1>O comercial está alimentando a base?</h1><p>Vamos conectar procura, vendas e sua disposição para reajustar preço.</p><RangeField label="Leads recebidos por mês" name="monthlyLeads" value={answers.monthlyLeads} min={0} max={1000} step={5} onChange={setNumber}/><h3 className="mini-question">Quando foi o último reajuste?</h3><Options selected={answers.lastIncrease} onSelect={value => setText('lastIncrease',value)} values={[{label:'Nos últimos 6 meses',value:'Nos últimos 6 meses'},{label:'Entre 6 e 12 meses',value:'Entre 6 e 12 meses'},{label:'Mais de 12 meses',value:'Mais de 12 meses'},{label:'Nunca reajustei',value:'Nunca reajustei'}]}/></>}
    {step.id === 'goal' && <><span className="game-eyebrow">ÚLTIMA MISSÃO · DEFINIR O ALVO</span><h1>Qual faturamento faria diferença agora?</h1><p>Seu plano final mostrará a distância entre a operação atual e esse objetivo.</p><MoneyField label="Meta mensal de faturamento" name="revenueGoal" value={answers.revenueGoal} onChange={setNumber}/><div className="goal-path"><span>{brl.format(answers.totalRevenue)}<small>hoje</small></span><i/><Rocket/><i/><span>{brl.format(answers.revenueGoal)}<small>meta</small></span></div></>}
    {step.id === 'contact' && <><span className="game-eyebrow">100 PONTOS · DIAGNÓSTICO PRONTO</span><h1>Onde liberamos seu Raio-X?</h1><p>Seu e-mail será a chave de acesso ao resultado e ao panorama regional.</p><div className="game-grid"><label className="game-field"><span>Seu nome *</span><input value={answers.ownerName} onChange={e=>setText('ownerName',e.target.value)}/></label><label className="game-field"><span>E-mail *</span><input type="email" value={answers.email} onChange={e=>setText('email',e.target.value)}/></label><label className="game-field full"><span>WhatsApp</span><input value={answers.whatsapp} onChange={e=>setText('whatsapp',e.target.value)}/></label></div><div className="final-badge"><Trophy/><span><b>Jornada concluída</b><small>Você transformou sua operação em um diagnóstico mensurável.</small></span></div></>}
    {error && <p className="game-error">{error}</p>}
    {!['model','wellhub'].includes(step.id) && <button className="primary game-continue" onClick={() => void advance()}>{['radar_unlock','ticket_unlock','wellhub_numbers'].includes(step.id) ? 'Continuar minha trilha' : step.id === 'contact' ? 'Revelar meu potencial de receita' : 'Confirmar e avançar'} <ArrowRight/></button>}
    <footer className="game-save"><LockKeyhole/> progresso protegido e salvo automaticamente</footer>
  </section></main>
}

function Unlock({ icon: Icon, label, title, text, topics }: { icon: typeof Radar; label: string; title: string; text: string; topics: string[] }) {
  return <div className="unlock-game"><div className="unlock-orbit"><i/><i/><span><Icon/></span><Sparkles/></div><span className="game-eyebrow">{label}</span><h1>{title}</h1><p>{text}</p><div className="unlock-topics">{topics.map(topic=><span key={topic}><Check/>{topic}</span>)}</div></div>
}

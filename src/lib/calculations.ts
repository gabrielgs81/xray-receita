import type { Answers, RevenueReport } from './types'

const safe = (value: number) => Number.isFinite(value) ? Math.max(0, value) : 0

export function calculateRevenue(a: Answers): RevenueReport {
  const students = Math.max(1, safe(a.activeStudents))
  const realizedTicket = safe(a.membershipRevenue) / students
  const totalArpu = safe(a.totalRevenue) / students
  const mixTotal = Math.max(1, a.monthlyMix + a.quarterlyMix + a.semiannualMix + a.annualMix)
  const weightedListTicket = (safe(a.monthlyPrice) * a.monthlyMix + safe(a.quarterlyPrice / 3) * a.quarterlyMix + safe(a.semiannualPrice / 6) * a.semiannualMix + safe(a.annualPrice / 12) * a.annualMix) / mixTotal
  const recommendedTicket = Math.max(realizedTicket * 1.08, weightedListTicket * .98, a.monthlyPrice * .9)
  const monthlyPriceOpportunity = Math.max(0, recommendedTicket - realizedTicket) * students
  const churnRate = safe(a.cancellations) / students
  const monthlyRetentionOpportunity = Math.max(0, a.cancellations) * .2 * recommendedTicket
  const monthlyDefaultOpportunity = safe(a.membershipRevenue) * Math.min(.35, safe(a.defaultRate) / 100) * .45
  const monthlyOpportunity = monthlyPriceOpportunity + monthlyRetentionOpportunity + monthlyDefaultOpportunity
  const projectedRevenue = safe(a.totalRevenue) + monthlyOpportunity
  const annualOpportunity = monthlyOpportunity * 12
  const churnTolerance = recommendedTicket > 0 ? Math.floor(monthlyPriceOpportunity / recommendedTicket) : 0
  const wellhubPerCheckin = a.wellhubCheckins > 0 ? safe(a.wellhubRevenue) / a.wellhubCheckins : 0
  const leadConversion = a.monthlyLeads > 0 ? a.newStudents / a.monthlyLeads : 0
  const score = Math.round(Math.max(10, Math.min(96, 72 - churnRate * 280 - Math.min(18, a.defaultRate * 1.4) + Math.min(12, leadConversion * 45) + (a.totalRevenue >= a.revenueGoal ? 8 : 0))))
  return { realizedTicket, totalArpu, churnRate, netGrowth: a.newStudents - a.cancellations, recommendedTicket, monthlyPriceOpportunity, monthlyRetentionOpportunity, monthlyDefaultOpportunity, monthlyOpportunity, annualOpportunity, projectedRevenue, churnTolerance, wellhubPerCheckin, score }
}

export type Answers = {
  ownerName: string; gymName: string; email: string; whatsapp: string; address: string;
  neighborhood: string; city: string; state: string; model: string; area: number;
  activeStudents: number; totalRevenue: number; membershipRevenue: number; otherRevenue: number;
  monthlyPrice: number; quarterlyPrice: number; semiannualPrice: number; annualPrice: number;
  monthlyMix: number; quarterlyMix: number; semiannualMix: number; annualMix: number;
  defaultRate: number; cardFee: number; wellhub: boolean; wellhubCheckins: number;
  wellhubRevenue: number; newStudents: number; cancellations: number; monthlyLeads: number;
  lastIncrease: string; revenueGoal: number;
}

export type RevenueReport = {
  realizedTicket: number; totalArpu: number; churnRate: number; netGrowth: number;
  recommendedTicket: number; monthlyPriceOpportunity: number; monthlyRetentionOpportunity: number;
  monthlyDefaultOpportunity: number; monthlyOpportunity: number; annualOpportunity: number;
  projectedRevenue: number; churnTolerance: number; wellhubPerCheckin: number; score: number;
}

export type Session = { id: string; writeToken: string }

export const initialAnswers: Answers = {
  ownerName: '', gymName: '', email: '', whatsapp: '', address: '', neighborhood: '', city: '', state: '',
  model: 'Academia de bairro', area: 400, activeStudents: 300, totalRevenue: 45000,
  membershipRevenue: 39000, otherRevenue: 6000, monthlyPrice: 149, quarterlyPrice: 399,
  semiannualPrice: 749, annualPrice: 1390, monthlyMix: 55, quarterlyMix: 15,
  semiannualMix: 15, annualMix: 15, defaultRate: 4, cardFee: 3.5, wellhub: false,
  wellhubCheckins: 0, wellhubRevenue: 0, newStudents: 30, cancellations: 24,
  monthlyLeads: 100, lastIncrease: 'Mais de 12 meses', revenueGoal: 60000,
}

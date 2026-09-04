import { createClient } from '@supabase/supabase-js'
import type { Answers, RevenueReport, Session } from './types'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined
export const supabase = url && key ? createClient(url, key, { auth: { persistSession: false } }) : null
const storageKey = 'xray-receita-session'

export function storedSession(): Session | null { try { return JSON.parse(localStorage.getItem(storageKey) || 'null') as Session | null } catch { return null } }
export function rememberSession(session: Session) { localStorage.setItem(storageKey, JSON.stringify(session)) }
export async function trackPageView() { if (supabase) await supabase.rpc('xray_revenue_track_view', { p_path: location.pathname, p_referrer: document.referrer || null }) }
export async function startSession(): Promise<Session | null> {
  if (!supabase) return null
  const current = storedSession(); if (current) return current
  const { data, error } = await supabase.rpc('xray_revenue_start_session')
  if (error || !data?.[0]) return null
  const session = { id: data[0].session_id, writeToken: data[0].write_token }; rememberSession(session); return session
}
export async function saveProgress(session: Session | null, step: number, answers: Answers, eventName = 'step_completed') {
  if (supabase && session) await supabase.rpc('xray_revenue_save_progress', { p_session_id: session.id, p_write_token: session.writeToken, p_current_step: step, p_answers: answers, p_event_name: eventName })
}
export async function completeSession(session: Session | null, answers: Answers, report: RevenueReport) {
  if (!supabase || !session) return null
  const { data, error } = await supabase.rpc('xray_revenue_complete_session', { p_session_id: session.id, p_write_token: session.writeToken, p_answers: answers, p_report: { answers, metrics: report } })
  return error ? null : data as string
}
export async function getPublicReport(slug: string) {
  if (!supabase || !/^[a-f0-9]{64}$/i.test(slug)) return null
  const { data, error } = await supabase.rpc('xray_revenue_get_report', { p_public_slug: slug })
  return error ? null : data
}
export async function beginMarketResearch(session: Session | null) {
  if (supabase && session) await supabase.functions.invoke('xray-revenue-market-research', { body: { session_id: session.id, write_token: session.writeToken } })
}

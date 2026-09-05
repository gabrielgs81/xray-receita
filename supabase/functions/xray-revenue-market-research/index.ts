import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "@supabase/supabase-js";

const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS" };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json", "Cache-Control": "no-store" } });
const schema = {
  type: "object", additionalProperties: false,
  required: ["market", "competitors", "sources_checked"],
  properties: {
    market: { type: "object", additionalProperties: false, required: ["gyms_identified", "wellhub_confirmed", "without_wellhub_presence", "public_prices_found", "average_monthly_price", "median_monthly_price", "minimum_monthly_price", "maximum_monthly_price"], properties: {
      gyms_identified: { type: "integer" }, wellhub_confirmed: { type: "integer" }, without_wellhub_presence: { type: "integer" }, public_prices_found: { type: "integer" }, average_monthly_price: { type: ["number", "null"] }, median_monthly_price: { type: ["number", "null"] }, minimum_monthly_price: { type: ["number", "null"] }, maximum_monthly_price: { type: ["number", "null"] }
    }},
    competitors: { type: "array", maxItems: 15, items: { type: "object", additionalProperties: false, required: ["name", "address", "distance_km", "category", "public_monthly_price", "plans_found", "wellhub_status", "source_urls"], properties: {
      name: { type: "string" }, address: { type: ["string", "null"] }, distance_km: { type: ["number", "null"] }, category: { type: ["string", "null"] }, public_monthly_price: { type: ["number", "null"] }, plans_found: { type: "array", maxItems: 5, items: { type: "string" } }, wellhub_status: { type: "string", enum: ["presente", "sem_presenca_identificada", "nao_verificado"] }, source_urls: { type: "array", minItems: 1, maxItems: 5, items: { type: "string" } }
    }}},
    sources_checked: { type: "object", additionalProperties: false, required: ["maps", "wellhub", "pricing"], properties: { maps: { type: "boolean" }, wellhub: { type: "boolean" }, pricing: { type: "boolean" } } }
  }
};

function serviceKey() {
  const legacy = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"); if (legacy) return legacy;
  const keys = JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") || "{}") as Record<string,string>;
  return keys.default || Object.values(keys)[0];
}
async function hash(value: string) { const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)); return [...new Uint8Array(digest)].map(b => b.toString(16).padStart(2,"0")).join(""); }
function outputText(value: Record<string, unknown>) {
  if (typeof value.output_text === "string") return value.output_text;
  for (const item of Array.isArray(value.output) ? value.output : []) for (const part of Array.isArray((item as Record<string,unknown>).content) ? (item as Record<string,unknown>).content as unknown[] : []) if ((part as Record<string,unknown>).type === "output_text") return String((part as Record<string,unknown>).text);
  throw new Error("Resposta estruturada ausente.");
}
function sources(value: unknown, result = new Map<string,{title:string,url:string}>()) {
  if (Array.isArray(value)) value.forEach(v => sources(v,result));
  else if (value && typeof value === "object") { const row = value as Record<string,unknown>; if (typeof row.url === "string" && /^https?:\/\//.test(row.url)) result.set(row.url,{title:typeof row.title === "string" ? row.title : new URL(row.url).hostname,url:row.url}); Object.values(row).forEach(v => sources(v,result)); }
  return [...result.values()];
}
function median(values: number[]) { const middle = Math.floor(values.length / 2); return values.length % 2 ? values[middle] : (values[middle - 1] + values[middle]) / 2; }
function cleanResult(raw: Record<string,unknown>, searchedSources: Array<{title:string,url:string}>) {
  const allowed = new Set(searchedSources.map(source => source.url));
  const byHost = new Map<string,string>();
  searchedSources.forEach(source => { try { if (!byHost.has(new URL(source.url).hostname)) byHost.set(new URL(source.url).hostname, source.url); } catch { /* URL inválida é descartada */ } });
  const rows = Array.isArray(raw.competitors) ? raw.competitors as Record<string,unknown>[] : [];
  const competitors = rows.map(row => {
    const source_urls = [...new Set((Array.isArray(row.source_urls) ? row.source_urls : []).flatMap(item => { if (typeof item !== "string") return []; if (allowed.has(item)) return [item]; try { const matched = byHost.get(new URL(item).hostname); return matched ? [matched] : []; } catch { return []; } }))];
    const price = typeof row.public_monthly_price === "number" && row.public_monthly_price > 0 ? Math.round(row.public_monthly_price * 100) / 100 : null;
    return { name:String(row.name || "").trim(), address:typeof row.address === "string" && row.address.trim() ? row.address.trim() : null, distance_km:typeof row.distance_km === "number" && row.distance_km >= 0 ? Math.round(row.distance_km * 10) / 10 : null, category:typeof row.category === "string" && row.category.trim() ? row.category.trim() : null, public_monthly_price:price, plans_found:(Array.isArray(row.plans_found) ? row.plans_found : []).filter((item):item is string => typeof item === "string" && !!item.trim()).slice(0,5), wellhub_status:["presente","sem_presenca_identificada","nao_verificado"].includes(String(row.wellhub_status)) ? row.wellhub_status : "nao_verificado", source_urls };
  }).filter(row => row.name && row.source_urls.length).slice(0,15);
  const prices = competitors.map(row => row.public_monthly_price).filter((price):price is number => price != null).sort((a,b) => a-b);
  const checked = raw.sources_checked && typeof raw.sources_checked === "object" ? raw.sources_checked as Record<string,unknown> : {};
  return { market: { gyms_identified:competitors.length, wellhub_confirmed:competitors.filter(row => row.wellhub_status === "presente").length, without_wellhub_presence:competitors.filter(row => row.wellhub_status === "sem_presenca_identificada").length, public_prices_found:prices.length, average_monthly_price:prices.length ? Math.round(prices.reduce((sum,price) => sum + price,0) / prices.length * 100) / 100 : null, median_monthly_price:prices.length ? median(prices) : null, minimum_monthly_price:prices[0] ?? null, maximum_monthly_price:prices.at(-1) ?? null }, competitors, sources_checked:{ maps:checked.maps === true, wellhub:checked.wellhub === true, pricing:checked.pricing === true } };
}

Deno.serve(async req => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Método não permitido." }, 405);
  const url = Deno.env.get("SUPABASE_URL"), key = serviceKey(), openaiKey = Deno.env.get("OPENAI_API_KEY");
  if (!url || !key || !openaiKey) return json({ error: "Configuração interna indisponível." }, 500);
  const db = createClient(url, key, { auth: { persistSession: false } });
  try {
    const body = await req.json() as Record<string,unknown>, sessionId = String(body.session_id || ""), token = String(body.write_token || "");
    const { data: session } = await db.from("xray_revenue_sessions").select("id,write_token_hash,answers").eq("id",sessionId).maybeSingle();
    if (!session || await hash(token) !== session.write_token_hash) return json({ error: "Sessão não autorizada." }, 401);
    const a = session.answers as Record<string,unknown>, place = [a.address,a.neighborhood,a.city,a.state,"Brasil"].filter(Boolean).join(", ");
    if (!a.city || !a.state) return json({ error: "Localização incompleta." }, 422);
    const fingerprint = await hash(JSON.stringify({version:3,place,model:a.model}));
    const { data: previous } = await db.from("xray_revenue_market_research").select("status,request_fingerprint").eq("session_id",sessionId).maybeSingle();
    if (previous?.request_fingerprint === fingerprint && previous.status === "completed") return json({ status:"completed",reused:true });
    await db.from("xray_revenue_market_research").upsert({ session_id:sessionId,status:"processing",location_query:place,request_fingerprint:fingerprint,result:{},sources:[],model:"gpt-5.4-nano",started_at:new Date().toISOString(),updated_at:new Date().toISOString() },{onConflict:"session_id"});
    const prompt = `Faça uma pesquisa factual do mercado de academias em um raio aproximado de 3 km de ${place}, Brasil. O projeto é do tipo ${a.model || "academia"}.

Execute este checklist antes de responder:
1. MAPS E REGIÃO: pesquise resultados do Google Maps e busca local para identificar unidades físicas reais próximas. Confirme nome, endereço e, somente quando derivável da localização, distância aproximada. Remova duplicatas.
2. WELLHUB: para cada academia, pesquise no diretório/rede pública oficial do Wellhub e também o nome da academia + Wellhub. Use "presente" apenas com evidência pública positiva. Use "sem_presenca_identificada" somente após a busca específica não encontrar presença pública. Se a verificação não foi possível, use "nao_verificado".
3. PREÇOS: procure site oficial, checkout, página de planos ou canal oficial da academia. Registre apenas preço mensal ou equivalente mensal explicitamente público e atual. Não estime preços. Liste nomes de planos somente quando publicados.
4. FONTES: cada academia deve ter ao menos uma URL realmente consultada. Não invente URLs, nomes, preços, planos, endereços ou distâncias.

Retorne dados concisos, sem textos de consultoria. Números agregados devem usar somente preços públicos efetivamente encontrados. Responda em português do Brasil.`;
    const response = await fetch("https://api.openai.com/v1/responses",{method:"POST",headers:{Authorization:`Bearer ${openaiKey}`,"Content-Type":"application/json"},body:JSON.stringify({model:Deno.env.get("OPENAI_REVENUE_MODEL") || "gpt-5.4-nano",tools:[{type:"web_search",search_context_size:"high",user_location:{type:"approximate",country:"BR",city:String(a.city),region:String(a.state)}}],tool_choice:"required",include:["web_search_call.action.sources"],max_tool_calls:10,input:prompt,text:{format:{type:"json_schema",name:"gym_revenue_market",strict:true,schema}}})});
    const payload = await response.json() as Record<string,unknown>;
    if (!response.ok) throw new Error(String((payload.error as Record<string,unknown>|undefined)?.message || `OpenAI ${response.status}`));
    const foundSources = sources(payload);
    const result = cleanResult(JSON.parse(outputText(payload)) as Record<string,unknown>, foundSources);
    await db.from("xray_revenue_market_research").update({status:"completed",result,sources:foundSources,completed_at:new Date().toISOString(),updated_at:new Date().toISOString()}).eq("session_id",sessionId);
    return json({status:"completed"});
  } catch (error) { return json({error:error instanceof Error ? error.message.slice(0,500) : "Falha inesperada."},500); }
});

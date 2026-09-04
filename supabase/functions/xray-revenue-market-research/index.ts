import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "@supabase/supabase-js";

const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS" };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json", "Cache-Control": "no-store" } });
const schema = {
  type: "object", additionalProperties: false,
  required: ["summary", "price_benchmark", "competitors", "wellhub_reading", "recommendations", "limitations"],
  properties: {
    summary: { type: "string" },
    price_benchmark: { type: "object", additionalProperties: false, required: ["public_prices_found", "minimum", "median", "maximum", "interpretation"], properties: {
      public_prices_found: { type: "integer" }, minimum: { type: ["number", "null"] }, median: { type: ["number", "null"] }, maximum: { type: ["number", "null"] }, interpretation: { type: "string" }
    }},
    competitors: { type: "array", maxItems: 12, items: { type: "object", additionalProperties: false, required: ["name", "address", "distance_estimate", "positioning", "public_monthly_price", "plans_found", "wellhub_status", "competitive_pressure", "evidence", "source_urls"], properties: {
      name: { type: "string" }, address: { type: ["string", "null"] }, distance_estimate: { type: ["string", "null"] }, positioning: { type: ["string", "null"] }, public_monthly_price: { type: ["number", "null"] }, plans_found: { type: "array", items: { type: "string" } }, wellhub_status: { type: "string", enum: ["encontrado", "nao_encontrado", "inconclusivo"] }, competitive_pressure: { type: "string", enum: ["baixa", "media", "alta", "incerta"] }, evidence: { type: "string" }, source_urls: { type: "array", items: { type: "string" } }
    }}},
    wellhub_reading: { type: "string" }, recommendations: { type: "array", items: { type: "string" }, maxItems: 6 }, limitations: { type: "array", items: { type: "string" } }
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
    const fingerprint = await hash(JSON.stringify({place,model:a.model,price:a.monthlyPrice}));
    const { data: previous } = await db.from("xray_revenue_market_research").select("status,request_fingerprint").eq("session_id",sessionId).maybeSingle();
    if (previous?.request_fingerprint === fingerprint && previous.status === "completed") return json({ status:"completed",reused:true });
    await db.from("xray_revenue_market_research").upsert({ session_id:sessionId,status:"processing",location_query:place,request_fingerprint:fingerprint,result:{},sources:[],model:"gpt-5.4-nano",started_at:new Date().toISOString(),updated_at:new Date().toISOString() },{onConflict:"session_id"});
    const prompt = `Pesquise o mercado de academias em um raio aproximado de 3 km de ${place}. O cliente opera uma ${a.model || "academia"}, cobra R$ ${a.monthlyPrice || "não informado"} no plano mensal e tem ticket realizado ainda em apuração. Identifique concorrentes reais, preços e planos PUBLICAMENTE anunciados e presença pública no Wellhub. Compare posicionamento e pressão competitiva. Nunca invente preço, distância, plano ou presença no Wellhub: use null/inconclusivo quando não houver evidência. Diferencie claramente fatos e inferências. As URLs devem apontar às fontes consultadas. Responda em português do Brasil.`;
    const response = await fetch("https://api.openai.com/v1/responses",{method:"POST",headers:{Authorization:`Bearer ${openaiKey}`,"Content-Type":"application/json"},body:JSON.stringify({model:Deno.env.get("OPENAI_REVENUE_MODEL") || "gpt-5.4-nano",tools:[{type:"web_search",search_context_size:"medium",user_location:{type:"approximate",country:"BR",city:String(a.city),region:String(a.state)}}],tool_choice:"required",include:["web_search_call.action.sources"],max_tool_calls:6,input:prompt,text:{format:{type:"json_schema",name:"gym_revenue_market",strict:true,schema}}})});
    const payload = await response.json() as Record<string,unknown>;
    if (!response.ok) throw new Error(String((payload.error as Record<string,unknown>|undefined)?.message || `OpenAI ${response.status}`));
    const result = JSON.parse(outputText(payload));
    const foundSources = sources(payload);
    await db.from("xray_revenue_market_research").update({status:"completed",result,sources:foundSources,completed_at:new Date().toISOString(),updated_at:new Date().toISOString()}).eq("session_id",sessionId);
    return json({status:"completed"});
  } catch (error) { return json({error:error instanceof Error ? error.message.slice(0,500) : "Falha inesperada."},500); }
});

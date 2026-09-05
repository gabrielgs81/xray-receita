import { useEffect, useMemo, useState } from 'react'
import { Check, MapPin, Search } from 'lucide-react'

type City = { id: number; name: string; uf: string }
const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR')

export function CityAutocomplete({ city, uf, onInput, onSelect }: { city: string; uf: string; onInput: (value: string) => void; onSelect: (city: string, uf: string) => void }) {
  const [focused, setFocused] = useState(false)
  const [cities, setCities] = useState<City[]>([])
  useEffect(() => { void fetch('/brazil-cities.json').then(response => response.json()).then(setCities) }, [])
  const query = normalize(city.trim())
  const suggestions = useMemo(() => query.length < 2 ? [] : cities.filter(item => normalize(item.name).includes(query)).sort((a,b) => Number(!normalize(a.name).startsWith(query))-Number(!normalize(b.name).startsWith(query)) || a.name.localeCompare(b.name,'pt-BR')).slice(0,8), [cities, query])
  return <label className="game-field city-field"><span>Cidade *</span><div className="city-input"><Search/><input value={city} onFocus={()=>setFocused(true)} onBlur={()=>window.setTimeout(()=>setFocused(false),120)} onChange={e=>onInput(e.target.value)} placeholder="Digite sua cidade" autoComplete="off"/>{uf && <b>{uf}</b>}</div>{focused && query.length >= 2 && <div className="city-options">{suggestions.length ? suggestions.map(item=><button key={item.id} type="button" onMouseDown={e=>e.preventDefault()} onClick={()=>{onSelect(item.name,item.uf);setFocused(false)}}><MapPin/><span>{item.name}</span><small>{item.uf}</small>{city===item.name&&uf===item.uf&&<Check/>}</button>) : <p>Nenhum município encontrado.</p>}</div>}<small>{uf ? 'Estado preenchido automaticamente' : 'Digite ao menos 2 letras e selecione uma opção'}</small></label>
}

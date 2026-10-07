import { CATEGORIES } from './types'
import type { Category, Ingredient, Recipe } from './types'

const FORMAT = `Vastaa pelkällä JSON-objektilla tässä muodossa:
{"name": "Lihakeitto", "category": "liha", "minutes": 90, "servings": 4, "lastsTwoDays": true,
 "tags": ["keitto"], "ingredients": [{"name": "naudanliha", "amount": 500, "unit": "g", "note": null}],
 "instructions": "Vaiheittainen ohje lyhyinä kappaleina.", "sourceUrl": null}

Säännöt:
- Kirjoita kaikki suomeksi; käännä tarvittaessa.
- category: "liha" jos ruoassa on lihaa tai kanaa, "kala" jos kalaa tai äyriäisiä, muuten "kasvis".
- Ainesten nimet perusmuodossa ilman määrää (jauheliha, sipuli, ruokakerma), jotta kauppalista voi yhdistää ne.
- unit yksi näistä: g, kg, ml, dl, l, rkl, tl, kpl, prk, pss, tlk, nippu; muuten null. Muunna cup, oz ja muut metrisiksi.
- amount on numero tai null; tarkenteet ("ripaus", "maun mukaan") kenttään note.
- lastsTwoDays: true, jos ruoka sopii tehtäväksi tuplasatsina ja syötäväksi seuraavana päivänä (keitot, padat, laatikot, kastikkeet).
- minutes: valmistusaika yhteensä minuutteina, tai null jos sitä ei voi arvioida.
- tags: 0–4 lyhyttä tunnistetta, esimerkiksi nopea, arki, keitto, uuniruoka, pasta, lasten suosikki.`

/** Pyyntö, joka muuttaa liitetyn reseptitekstin (mistä tahansa lähteestä) sovelluksen muotoon. */
export const parsePrompt = (text: string): string =>
  `Muunna alla oleva resepti sovelluksen muotoon. Käytä vain tekstissä olevia aineksia ja vaiheita; älä keksi uusia. ` +
  `Jos tekstissä on reseptin verkko-osoite, laita se kenttään sourceUrl.\n\n${FORMAT}\n\n<resepti>\n${text.slice(0, 20000)}\n</resepti>`

/** Pyyntö, joka kirjoittaa uuden reseptin ruoan nimen tai toiveen perusteella. */
export const suggestPrompt = (wish: string): string =>
  `Kirjoita lapsiperheelle sopiva kotiruokaresepti tähän toiveeseen: "${wish.slice(0, 500)}". ` +
  `Käytä Suomen ruokakaupoista helposti saatavia aineksia, 4 annosta.\n\n${FORMAT}`

const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '')
const num = (v: unknown) => {
  const n = typeof v === 'string' ? Number(v.replace(',', '.')) : v
  return typeof n === 'number' && Number.isFinite(n) && n > 0 ? n : undefined
}

/**
 * Tarkistaa Clauden vastauksen ja muuttaa sen reseptiksi. Puuttuvat tai
 * väärän tyyppiset kentät korjataan oletuksiksi; ilman nimeä tai aineksia
 * palautetaan null.
 */
export const toRecipe = (raw: unknown, id: string, sourceName: string): Recipe | null => {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  const name = str(r.name)
  const ingredients: Ingredient[] = (Array.isArray(r.ingredients) ? r.ingredients : [])
    .map((i): Ingredient | null => {
      if (!i || typeof i !== 'object') return null
      const o = i as Record<string, unknown>
      const ingredient: Ingredient = { name: str(o.name) }
      if (!ingredient.name) return null
      const amount = num(o.amount)
      if (amount !== undefined) ingredient.amount = amount
      if (str(o.unit)) ingredient.unit = str(o.unit).toLowerCase()
      if (str(o.note)) ingredient.note = str(o.note)
      return ingredient
    })
    .filter((i): i is Ingredient => i !== null)
  if (!name || ingredients.length === 0) return null

  const category = CATEGORIES.includes(r.category as Category) ? (r.category as Category) : 'kasvis'
  const url = str(r.sourceUrl)
  const recipe: Recipe = {
    id,
    name,
    category,
    tags: (Array.isArray(r.tags) ? r.tags : []).map(str).filter(Boolean).slice(0, 6),
    servings: Math.round(num(r.servings) ?? 4),
    lastsTwoDays: r.lastsTwoDays === true,
    ingredients,
    instructions: str(r.instructions),
    source: url.startsWith('http') ? { name: sourceName, url } : { name: sourceName },
    isOwn: true,
  }
  const minutes = num(r.minutes)
  if (minutes !== undefined) recipe.minutes = Math.round(minutes)
  return recipe
}

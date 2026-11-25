import { randomizeWeek } from './randomize'
import type { Random } from './randomize'
import type { ShoppingItem } from './shopping'
import { DAYS, resolveSlots } from './types'
import type { Day, PlanSlot, Recipe, Rules, ShoppingTidy, TidyGroup, TidyItem, WeekPlan } from './types'

/*
 * Clauden avulla tehtävät suunnittelutoiminnot: kehotteet ja vastausten tarkistus.
 * Claude saa vain tekstin, jonka nämä funktiot kokoavat, ja sen vastaus tarkistetaan
 * aina ennen käyttöä: tuntemattomat ruoat ja säännöttömät tähdepäivät hylätään.
 */

const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '')
const strList = (v: unknown, max: number) => (Array.isArray(v) ? v.map(str).filter(Boolean).slice(0, max) : [])
const isDay = (v: unknown): v is Day => DAYS.includes(v as Day)

/** Ruokapooli tiiviinä listana: yksi ruoka per rivi. */
export const poolText = (recipes: readonly Recipe[]): string =>
  recipes
    .map(r =>
      [r.id, r.name, r.category, r.minutes !== undefined ? `${r.minutes} min` : '', r.lastsTwoDays ? 'riittää 2 pv' : '', r.tags.join(', ')]
        .join(' | '),
    )
    .join('\n')

const rulesText = (rules: Rules, history: readonly WeekPlan[], recipes: readonly Recipe[]): string => {
  const names = new Map(recipes.map(r => [r.id, r.name]))
  const recent = history
    .slice(0, rules.noRepeatWeeks)
    .flatMap(w => w.slots.map(s => s.recipeId))
    .filter((id): id is string => id !== null && names.has(id))
  const counts = Object.entries(rules.counts)
    .map(([c, n]) => `${c}: ${n === null ? 'ei väliä' : n}`)
    .join(', ')
  return [
    `- Suunniteltavat päivät: ${rules.days.join(', ')}`,
    `- Ruokatyyppien määrät syöntipäivinä (tähdepäivä lasketaan kokatun ruoan tyypiksi): ${counts}`,
    `- Tähdepäiviä: ${rules.leftoverDays}. Tähdepäivänä syödään edellisen päivän ruokaa, jonka pitää riittää 2 päiväksi.`,
    rules.weekdayMaxMinutes !== null ? `- Ma–pe valmistusaika enintään ${rules.weekdayMaxMinutes} min` : '',
    rules.avoidSameCategoryInRow ? '- Vältä samaa ruokatyyppiä kahtena peräkkäisenä kokkauspäivänä' : '',
    rules.excludeTags.length ? `- Älä valitse ruokia, joissa on tunniste: ${rules.excludeTags.join(', ')}` : '',
    rules.requireTags.length ? `- Valitse vain ruokia, joissa on tunnisteet: ${rules.requireTags.join(', ')}` : '',
    recent.length ? `- Vältä viime viikkojen ruokia: ${[...new Set(recent)].map(id => names.get(id)).join(', ')}` : '',
  ]
    .filter(Boolean)
    .join('\n')
}

/** Lukitut päivät ja niiden tähdepäivät, jotka pysyvät ennallaan. */
const keptDays = (plan: WeekPlan, recipes: readonly Recipe[]): Set<Day> => {
  const ids = new Set(recipes.map(r => r.id))
  return new Set(
    resolveSlots(plan.slots)
      .filter(s => s.eatenRecipeId && ids.has(s.eatenRecipeId) && plan.slots.find(x => x.day === s.cookedOn)?.isLocked)
      .map(s => s.day),
  )
}

export type WeekContext = {
  plan: WeekPlan
  recipes: readonly Recipe[]
  rules: Rules
  history: readonly WeekPlan[]
}

/** Pyyntö: kokoa viikko perheen toiveesta ruokapoolin ruoista. */
export const weekPrompt = (wish: string, { plan, recipes, rules, history }: WeekContext): string => {
  const kept = keptDays(plan, recipes)
  const resolved = resolveSlots(plan.slots)
  const names = new Map(recipes.map(r => [r.id, r.name]))
  const locked = resolved
    .filter(s => kept.has(s.day))
    .map(s => `- ${s.day}: ${s.isLeftover ? 'tähteet' : `${s.recipeId} (${names.get(s.recipeId!)})`}`)
    .join('\n')

  return `Olet lapsiperheen ruokalistan suunnittelija. Kokoa viikon päivälliset alla olevasta ruokapoolista perheen toiveen ja sääntöjen mukaan. Toive menee sääntöjen edelle, jos ne ovat ristiriidassa.

<toive>
${wish.slice(0, 2000) || 'Ei erityistoiveita.'}
</toive>

Säännöt:
${rulesText(rules, history, recipes)}
${locked ? `\nNämä päivät on lukittu, älä muuta niitä:\n${locked}\n` : ''}
Ruokapooli (id | nimi | tyyppi | aika | riittävyys | tunnisteet):
${poolText(recipes)}

Vastaa pelkällä JSON-objektilla:
{"days": [{"day": "ma", "recipeId": "perus-chili", "leftover": false}, {"day": "ti", "recipeId": null, "leftover": true}],
 "reason": "1–2 lausetta suomeksi siitä, miten toive huomioitiin."}

- Käytä vain ruokapoolin id-tunnisteita. Yksi ruoka korkeintaan kerran viikossa.
- Tähdepäivä: "recipeId": null ja "leftover": true; edellisen päivän ruoan pitää riittää 2 päiväksi.
- Päivät: ${rules.days.join(', ')}.`
}

export type WeekProposal = {
  slots: PlanSlot[]
  reason: string
  /** Päivät, jotka sovellus täytti itse, koska Clauden ehdotus ei kelvannut niille. */
  filledDays: Day[]
  warnings: string[]
}

/**
 * Tarkistaa Clauden viikkoehdotuksen. Tuntemattomat ruoat, toistot ja tähdepäivät
 * ilman edellisen päivän ruokaa hylätään, lukitut päivät säilyvät, ja tyhjiksi
 * jääneet päivät arvotaan säännöillä kuten Arvo viikko ‑painike tekee.
 */
export const parseWeek = (raw: unknown, ctx: WeekContext, random?: Random): WeekProposal => {
  const { plan, recipes, rules, history } = ctx
  const ids = new Set(recipes.map(r => r.id))
  const byId = new Map(recipes.map(r => [r.id, r]))
  const kept = keptDays(plan, recipes)
  const o = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
  const entries = new Map<Day, Record<string, unknown>>()
  for (const e of Array.isArray(o.days) ? o.days : []) {
    if (e && typeof e === 'object' && isDay((e as Record<string, unknown>).day)) {
      entries.set((e as Record<string, unknown>).day as Day, e as Record<string, unknown>)
    }
  }

  const slots = new Map<Day, PlanSlot>()
  const used = new Set<string>()
  for (const s of resolveSlots(plan.slots)) if (kept.has(s.day) && s.recipeId) used.add(s.recipeId)

  const fromClaude = new Set<Day>()
  for (const day of DAYS) {
    const current = plan.slots.find(s => s.day === day) ?? { day, recipeId: null, isLocked: false }
    if (kept.has(day) || !rules.days.includes(day)) {
      slots.set(day, current)
      continue
    }
    const empty: PlanSlot = { day, recipeId: null, isLocked: false, isLeftover: false }
    const entry = entries.get(day)
    const previous = DAYS.indexOf(day) > 0 ? slots.get(DAYS[DAYS.indexOf(day) - 1]!) : undefined
    const recipeId = str(entry?.recipeId)
    if (entry?.leftover === true && previous?.recipeId && !previous.isLeftover) {
      slots.set(day, { ...empty, isLeftover: true })
      fromClaude.add(day)
    } else if (recipeId && ids.has(recipeId) && !used.has(recipeId)) {
      used.add(recipeId)
      slots.set(day, { ...empty, recipeId })
      fromClaude.add(day)
    } else {
      slots.set(day, empty)
    }
  }

  // Claude ei voi valita tähdepäivälle ruokaa, joka ei riitä kahdeksi päiväksi.
  for (const day of DAYS) {
    const s = slots.get(day)!
    if (!s.isLeftover || kept.has(day)) continue
    const cook = slots.get(DAYS[DAYS.indexOf(day) - 1]!)
    if (!byId.get(cook?.recipeId ?? '')?.lastsTwoDays) {
      slots.set(day, { day, recipeId: null, isLocked: false, isLeftover: false })
      fromClaude.delete(day)
    }
  }

  // Tyhjät päivät arvotaan: Clauden valinnat lukitaan väliaikaisesti, jotta arvonta ei muuta niitä.
  const temp: WeekPlan = {
    ...plan,
    slots: DAYS.map(day => {
      const s = slots.get(day)!
      return fromClaude.has(day) && !s.isLeftover ? { ...s, isLocked: true } : s
    }),
  }
  const open = rules.days.filter(d => !kept.has(d) && !fromClaude.has(d))
  const filled = open.length > 0 ? randomizeWeek(temp, recipes, rules, history, random) : { slots: [], warnings: [] }
  const final = DAYS.map(day => {
    const s = filled.slots.find(x => x.day === day) ?? temp.slots.find(x => x.day === day)!
    return fromClaude.has(day) ? { ...s, isLocked: false } : s
  })

  return {
    slots: final,
    reason: str(o.reason).slice(0, 600),
    filledDays: open.filter(d => {
      const s = final.find(x => x.day === d)
      return Boolean(s?.recipeId || s?.isLeftover)
    }),
    warnings: filled.warnings,
  }
}

export type FridgeIdea = {
  /** Ruokapoolin ruoka, tai null kun Claude ehdottaa uutta ruokaa. */
  recipeId: string | null
  name: string
  uses: string[]
  missing: string[]
  why: string
}

/** Pyyntö: mitä kaapissa olevista aineksista voisi tehdä. */
export const fridgePrompt = (text: string, recipes: readonly Recipe[]): string =>
  `Perhe kertoo, mitä kaapissa ja jääkaapissa on. Ehdota 3–5 päivällistä, joilla nämä ainekset käytetään. Suosi ruokapoolin ruokia; voit ehdottaa myös uutta, helppoa kotiruokaa.

<kaapissa>
${text.slice(0, 2000)}
</kaapissa>

Ruokapooli (id | nimi | tyyppi | aika | riittävyys | tunnisteet):
${poolText(recipes)}

Vastaa pelkällä JSON-objektilla suomeksi:
{"ideas": [{"recipeId": "perus-pyttipannu", "name": "Pyttipannu", "uses": ["peruna", "kinkku"], "missing": ["punajuuri"], "why": "Käyttää keitetyt perunat."}]}
- recipeId on ruokapoolin id, tai null uudelle ruoalle.
- uses: kaapin ainekset, jotka ruoka käyttää. missing: mitä pitää vielä ostaa (tyhjä, jos ei mitään). Perustarvikkeita kuten suolaa ja öljyä ei tarvitse mainita.`

/** Tarkistaa jääkaappi-ideat: tuntematon ruoka muutetaan uudeksi ruoaksi. */
export const parseFridge = (raw: unknown, recipes: readonly Recipe[]): FridgeIdea[] => {
  const byId = new Map(recipes.map(r => [r.id, r]))
  const o = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
  return (Array.isArray(o.ideas) ? o.ideas : [])
    .map((i): FridgeIdea | null => {
      if (!i || typeof i !== 'object') return null
      const e = i as Record<string, unknown>
      const recipe = byId.get(str(e.recipeId))
      const name = str(e.name) || recipe?.name || ''
      if (!name) return null
      return {
        recipeId: recipe?.id ?? null,
        name: recipe?.name ?? name,
        uses: strList(e.uses, 12),
        missing: strList(e.missing, 12),
        why: str(e.why).slice(0, 300),
      }
    })
    .filter((i): i is FridgeIdea => i !== null)
    .slice(0, 5)
}

/** Kauppaosastot tavallisessa kulkujärjestyksessä. */
export const AISLES = [
  'Hedelmät ja vihannekset',
  'Leipä',
  'Liha ja kala',
  'Maito, juusto ja munat',
  'Kuivatuotteet ja pasta',
  'Säilykkeet ja kastikkeet',
  'Mausteet',
  'Pakasteet',
  'Muut',
]

/** Tunniste kauppalistan sisällöstä: järjestys pätee vain samaan listaan. */
export const tidyBasis = (items: readonly ShoppingItem[]): string => {
  const text = items
    .map(i => `${i.key}=${i.amount}`)
    .sort()
    .join('|')
  let hash = 0x811c9dc5
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193) >>> 0
  }
  return `${items.length}-${hash.toString(16)}`
}

/** Pyyntö: järjestä kauppalista osastoittain ja yhdistä samat ainekset. */
export const tidyPrompt = (items: readonly ShoppingItem[]): string =>
  `Järjestä kauppalista suomalaisen ruokakaupan osastoihin ja yhdistä rivit, jotka ovat sama aines eri nimellä (esim. "kananmuna" ja "kananmunaa", "tomaatti" ja "tomaatteja"). Älä yhdistä eri aineksia.

Osastot tässä järjestyksessä: ${AISLES.join(', ')}.

Lista (avain | nimi | määrä):
${items.map(i => `${i.key} | ${i.name} | ${i.amount || '-'}`).join('\n')}

Vastaa pelkällä JSON-objektilla:
{"groups": [{"aisle": "Hedelmät ja vihannekset", "items": [{"keys": ["sipuli"], "name": "sipuli", "amount": "5"}]}]}
- keys: listan avaimet täsmälleen kirjoitettuina; jokainen avain kerran.
- name: lyhyt nimi perusmuodossa. amount: yhdistetty määrä luettavassa muodossa, tai tyhjä.`

/**
 * Tarkistaa Clauden järjestämän listan: jokainen rivi on mukana täsmälleen kerran,
 * tuntemattomat avaimet jätetään pois ja unohtuneet rivit lisätään ryhmään "Muut".
 */
export const parseTidy = (raw: unknown, items: readonly ShoppingItem[]): ShoppingTidy => {
  const byKey = new Map(items.map(i => [i.key, i]))
  const seen = new Set<string>()
  const groups = new Map<string, TidyItem[]>()
  const o = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>

  for (const g of Array.isArray(o.groups) ? o.groups : []) {
    if (!g || typeof g !== 'object') continue
    const group = g as Record<string, unknown>
    const aisle = str(group.aisle) || 'Muut'
    for (const it of Array.isArray(group.items) ? group.items : []) {
      if (!it || typeof it !== 'object') continue
      const item = it as Record<string, unknown>
      const keys = strList(item.keys, 20).filter(k => byKey.has(k) && !seen.has(k))
      if (keys.length === 0) continue
      for (const k of keys) seen.add(k)
      const first = byKey.get(keys[0]!)!
      const amount =
        keys.length === 1 ? first.amount : str(item.amount) || keys.map(k => byKey.get(k)!.amount).filter(Boolean).join(' + ')
      groups.set(aisle, [...(groups.get(aisle) ?? []), { keys, name: str(item.name) || first.name, amount }])
    }
  }

  const rest = items.filter(i => !seen.has(i.key)).map(i => ({ keys: [i.key], name: i.name, amount: i.amount }))
  if (rest.length > 0) groups.set('Muut', [...(groups.get('Muut') ?? []), ...rest])

  const order = (aisle: string) => (AISLES.includes(aisle) ? AISLES.indexOf(aisle) : AISLES.length - 1.5)
  const sorted: TidyGroup[] = [...groups.entries()]
    .sort(([a], [b]) => order(a) - order(b))
    .map(([aisle, list]) => ({ aisle, items: list }))
  return { basis: tidyBasis(items), groups: sorted }
}

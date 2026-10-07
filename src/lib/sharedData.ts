import { SEED_RECIPES } from '../data/seedRecipes'
import { DEFAULT_RULES, emptyPlan, mondayOf } from './storage'
import type { AppData, Recipe, Rules, ShoppingExtra, WeekPlan } from './types'

/**
 * Yhteisen tallennuksen muoto. Tiedot on jaettu dokumentteihin sen mukaan, kuka niitä
 * muuttaa ja kuinka usein, jotta kahden puhelimen samanaikaiset muutokset eivät
 * kumoa toisiaan:
 *
 * - `household/settings`: säännöt, ruokailijat ja piilotetut perusreseptit
 * - `household/week`: viikon suunnitelma ja aiemmat viikot
 * - `household/shopping`: ostetuksi merkityt rivit (avain → true/false) ja muut ostokset
 * - `recipes/<id>`: omat ja tuodut reseptit sekä muokatut perusreseptit
 *
 * Perusreseptit tulevat sovelluksen mukana, joten niitä ei tallenneta erikseen.
 */
export const PATHS = {
  settings: 'household/settings',
  week: 'household/week',
  shopping: 'household/shopping',
  recipes: 'recipes',
} as const

export type SharedParts = {
  settings: { rules?: Partial<Rules>; household?: number; hiddenRecipeIds?: string[] } | null
  week: { plan?: WeekPlan; history?: WeekPlan[] } | null
  shopping: { checked?: Record<string, boolean>; extras?: ShoppingExtra[] } | null
  recipes: Map<string, Recipe>
}

const SEED_BY_ID = new Map(SEED_RECIPES.map(r => [r.id, r]))

/** Onko resepti sisällöltään sama kuin sovelluksen mukana tuleva perusresepti. */
const isSeed = (recipe: Recipe) => {
  const seed = SEED_BY_ID.get(recipe.id)
  return seed !== undefined && (seed === recipe || JSON.stringify(plain(seed)) === JSON.stringify(plain(recipe)))
}

/** Kokoaa sovelluksen tilan yhteisen tallennuksen dokumenteista. */
export const compose = (parts: SharedParts, now = new Date()): AppData => {
  const hidden = new Set(parts.settings?.hiddenRecipeIds ?? [])
  const seeds = SEED_RECIPES.filter(r => !hidden.has(r.id)).map(r => parts.recipes.get(r.id) ?? r)
  const custom = [...parts.recipes.values()].filter(r => !SEED_BY_ID.has(r.id) && !hidden.has(r.id))

  return {
    version: 1,
    recipes: [...seeds, ...custom],
    plan: parts.week?.plan ?? emptyPlan(mondayOf(now)),
    history: parts.week?.history ?? [],
    rules: {
      ...DEFAULT_RULES,
      ...parts.settings?.rules,
      counts: { ...DEFAULT_RULES.counts, ...parts.settings?.rules?.counts },
    },
    household: parts.settings?.household ?? 4,
    checked: Object.entries(parts.shopping?.checked ?? {})
      .filter(([, isChecked]) => isChecked)
      .map(([key]) => key),
    extras: parts.shopping?.extras ?? [],
  }
}

/** JSON ilman `undefined`-kenttiä, joita tallennus ei hyväksy. */
const plain = <T>(value: T): Record<string, unknown> => JSON.parse(JSON.stringify(value)) as Record<string, unknown>

export type Write =
  | { path: string; op: 'set'; data: Record<string, unknown> }
  | { path: string; op: 'merge'; data: Record<string, unknown>; fallback: Record<string, unknown> }
  | { path: string; op: 'delete' }

const sameList = (a: readonly string[], b: readonly string[]) =>
  a.length === b.length && [...a].sort().join('\n') === [...b].sort().join('\n')

/**
 * Laskee, mitkä dokumentit muutos koskee. Vain muuttuneet osat kirjoitetaan, ja
 * ostosmerkinnät yhdistetään rivikohtaisesti, jotta kaupassa kaksi ihmistä voi
 * rastia eri rivejä yhtä aikaa.
 */
export const diff = (prev: AppData, next: AppData): Write[] => {
  const writes: Write[] = []
  const hiddenOf = (d: AppData) => SEED_RECIPES.filter(s => !d.recipes.some(r => r.id === s.id)).map(s => s.id)
  const prevHidden = hiddenOf(prev)
  const nextHidden = hiddenOf(next)

  if (prev.rules !== next.rules || prev.household !== next.household || !sameList(prevHidden, nextHidden)) {
    writes.push({
      path: PATHS.settings,
      op: 'set',
      data: plain({ rules: next.rules, household: next.household, hiddenRecipeIds: nextHidden }),
    })
  }

  if (prev.plan !== next.plan || prev.history !== next.history) {
    writes.push({ path: PATHS.week, op: 'set', data: plain({ plan: next.plan, history: next.history }) })
  }

  if (prev.checked !== next.checked || prev.extras !== next.extras) {
    const fallback = plain({ checked: Object.fromEntries(next.checked.map(k => [k, true])), extras: next.extras })
    if (next.checked.length === 0 && prev.checked.length > 0) {
      // Kaikki merkinnät pois (uusi viikko tai "Poista merkinnät"): korvataan koko dokumentti.
      writes.push({ path: PATHS.shopping, op: 'set', data: fallback })
    } else {
      const changes: Record<string, boolean> = {}
      for (const k of next.checked) if (!prev.checked.includes(k)) changes[k] = true
      for (const k of prev.checked) if (!next.checked.includes(k)) changes[k] = false
      const data: Record<string, unknown> = {}
      if (Object.keys(changes).length > 0) data.checked = changes
      if (prev.extras !== next.extras) data.extras = plain(next.extras)
      if (Object.keys(data).length > 0) writes.push({ path: PATHS.shopping, op: 'merge', data, fallback })
    }
  }

  if (prev.recipes !== next.recipes) {
    const before = new Map(prev.recipes.map(r => [r.id, r]))
    const after = new Map(next.recipes.map(r => [r.id, r]))
    for (const id of new Set([...before.keys(), ...after.keys()])) {
      const n = after.get(id)
      const p = before.get(id)
      if (n === p) continue
      const path = `${PATHS.recipes}/${id}`
      const wasStored = p !== undefined && !isSeed(p)
      if (!n || isSeed(n)) {
        // Poistettu tai palautettu perusreseptiksi: tallennettu versio pois, jos sellainen on.
        if (wasStored) writes.push({ path, op: 'delete' })
      } else {
        writes.push({ path, op: 'set', data: plain(n) })
      }
    }
  }

  return writes
}

import type { Ingredient, Recipe, WeekPlan } from './types'

export type ShoppingItem = {
  /** Vakaa avain ostetuksi merkitsemistä varten: aineksen nimi pienillä. */
  key: string
  name: string
  /** Yhteenlasketut määrät yksiköittäin, esim. "500 g + 2 dl". */
  amount: string
  /** Ruoat, joihin ainesta tarvitaan. */
  usedIn: string[]
  /** Perustarvike, joka yleensä on jo kaapissa (suola, pippuri, öljy). */
  isPantry: boolean
}

/** Ainekset, joita ei osteta kaupasta. */
const SKIP = new Set(['vesi', 'water'])

/** Perustarvikkeet, jotka näytetään erikseen tarkistettaviksi. */
const PANTRY = new Set([
  'suola', 'mustapippuri', 'pippuri', 'sokeri', 'öljy', 'rypsiöljy', 'oliiviöljy', 'vehnäjauho',
  'salt', 'pepper', 'black pepper', 'olive oil', 'oil', 'sugar', 'flour',
])

/** Yksiköiden muunnos yhteiseen perusyksikköön, jotta "5 dl" ja "1 l" voidaan laskea yhteen. */
const UNIT_BASE: Record<string, { base: string; factor: number }> = {
  g: { base: 'g', factor: 1 },
  kg: { base: 'g', factor: 1000 },
  ml: { base: 'ml', factor: 1 },
  cl: { base: 'ml', factor: 10 },
  dl: { base: 'ml', factor: 100 },
  l: { base: 'ml', factor: 1000 },
}

const normalizeName = (name: string) => name.trim().toLowerCase().replace(/\s+/g, ' ')

const round = (value: number) => {
  if (value >= 100) return Math.round(value / 5) * 5
  if (value >= 10) return Math.round(value)
  return Math.round(value * 10) / 10
}

const formatNumber = (value: number) => String(round(value)).replace('.', ',')

/** Esittää perusyksikön määrän luettavassa muodossa (1500 g → 1,5 kg, 300 ml → 3 dl). */
const formatBase = (value: number, base: string): string => {
  if (base === 'g') return value >= 1000 ? `${formatNumber(value / 1000)} kg` : `${formatNumber(value)} g`
  if (base === 'ml') {
    if (value >= 1000) return `${formatNumber(value / 1000)} l`
    if (value >= 100) return `${formatNumber(value / 100)} dl`
    return `${formatNumber(value)} ml`
  }
  return `${formatNumber(value)} ${base}`.trim()
}

/** Kerätään valitun viikon ruokien ainekset yhteen, skaalattuna annosmäärään. */
export const buildShoppingList = (
  plan: WeekPlan,
  recipes: readonly Recipe[],
  household: number,
): ShoppingItem[] => {
  const byId = new Map(recipes.map(r => [r.id, r]))
  const items = new Map<
    string,
    { name: string; totals: Map<string, number>; notes: string[]; usedIn: Set<string> }
  >()

  for (const slot of plan.slots) {
    const recipe = slot.recipeId ? byId.get(slot.recipeId) : undefined
    if (!recipe) continue
    const scale = household / Math.max(1, recipe.servings)

    for (const ingredient of recipe.ingredients) {
      const key = normalizeName(ingredient.name)
      if (!key || SKIP.has(key)) continue
      const item = items.get(key) ?? { name: ingredient.name.trim(), totals: new Map(), notes: [], usedIn: new Set() }
      addAmount(item, ingredient, scale)
      item.usedIn.add(recipe.name)
      items.set(key, item)
    }
  }

  return [...items.entries()]
    .map(([key, item]) => ({
      key,
      name: item.name,
      amount: [
        ...[...item.totals.entries()].map(([unit, value]) => formatBase(value, unit)),
        ...item.notes,
      ].join(' + '),
      usedIn: [...item.usedIn],
      isPantry: PANTRY.has(key),
    }))
    .sort((a, b) => a.name.localeCompare(b.name, 'fi'))
}

const addAmount = (
  item: { totals: Map<string, number>; notes: string[] },
  ingredient: Ingredient,
  scale: number,
) => {
  if (ingredient.amount !== undefined && Number.isFinite(ingredient.amount)) {
    const unit = (ingredient.unit ?? '').trim().toLowerCase()
    const conversion = UNIT_BASE[unit]
    const base = conversion?.base ?? unit
    const value = ingredient.amount * scale * (conversion?.factor ?? 1)
    item.totals.set(base, (item.totals.get(base) ?? 0) + value)
  }
  if (ingredient.note && !item.notes.includes(ingredient.note)) {
    item.notes.push(ingredient.note)
  }
}

/** Kauppalista tekstinä jaettavaksi tai kopioitavaksi. */
export const shoppingText = (items: readonly ShoppingItem[], extras: readonly string[]): string =>
  [...items.map(i => `- ${i.name}${i.amount ? `: ${i.amount}` : ''}`), ...extras.map(e => `- ${e}`)].join('\n')

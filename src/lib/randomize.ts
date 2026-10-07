import { CATEGORIES, DAY_LABEL } from './types'
import type { Category, Day, PlanSlot, Recipe, Rules, WeekPlan } from './types'

export type Random = () => number

const WEEKDAYS: readonly Day[] = ['ma', 'ti', 'ke', 'to', 'pe']

export type RandomizeResult = {
  slots: PlanSlot[]
  /** Suomenkieliset huomautukset säännöistä, joita ei voitu täyttää. */
  warnings: string[]
}

const shuffle = <T>(items: readonly T[], random: Random): T[] => {
  const out = [...items]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[out[i], out[j]] = [out[j]!, out[i]!]
  }
  return out
}

const hasTag = (recipe: Recipe, tag: string) =>
  recipe.tags.some(t => t.toLowerCase() === tag.toLowerCase())

/** Ruoat, jotka sääntöjen tunnisteet ja aikaraja sallivat annetulle päivälle. */
export const allowedFor = (recipe: Recipe, day: Day, rules: Rules): boolean => {
  if (rules.excludeTags.some(tag => hasTag(recipe, tag))) return false
  if (!rules.requireTags.every(tag => hasTag(recipe, tag))) return false
  if (
    rules.weekdayMaxMinutes !== null &&
    WEEKDAYS.includes(day) &&
    recipe.minutes !== undefined &&
    recipe.minutes > rules.weekdayMaxMinutes
  ) {
    return false
  }
  return true
}

/** Kunkin tyypin tarve arvottaville päiville, kun lukitut päivät on jo huomioitu. */
const categoryNeeds = (
  rules: Rules,
  locked: PlanSlot[],
  byId: Map<string, Recipe>,
  open: number,
  warnings: string[],
  random: Random,
): (Category | null)[] => {
  const needs: (Category | null)[] = []

  for (const category of CATEGORIES) {
    const wanted = rules.counts[category]
    if (wanted === null) continue
    const already = locked.filter(s => s.recipeId && byId.get(s.recipeId)?.category === category).length
    for (let i = already; i < wanted; i++) needs.push(category)
  }

  if (needs.length > open) {
    warnings.push(
      `Säännöt pyytävät ${needs.length} ruokaa, mutta arvottavia päiviä on vain ${open}. Osa määristä jää täyttymättä.`,
    )
    needs.length = open
  }

  // Loput päivät saavat tyypin, jolle ei ole asetettu määrää, jotta asetetut
  // määrät pitävät täsmälleen. Jos kaikille on asetettu määrä, mikä tahansa käy.
  const free = CATEGORIES.filter(c => rules.counts[c] === null)
  while (needs.length < open) {
    needs.push(free.length > 0 ? free[Math.floor(random() * free.length)]! : null)
  }

  return needs
}

/** Järjestää tyypit päiville niin, ettei sama tyyppi toistu peräkkäin, jos mahdollista. */
const arrange = (
  needs: (Category | null)[],
  days: Day[],
  fixed: Map<Day, Category | undefined>,
  rules: Rules,
  random: Random,
): (Category | null)[] => {
  const order = rules.days
  const score = (assignment: (Category | null)[]) => {
    const byDay = new Map<Day, Category | null | undefined>()
    days.forEach((d, i) => byDay.set(d, assignment[i]))
    let clashes = 0
    for (let i = 1; i < order.length; i++) {
      const a = byDay.has(order[i - 1]!) ? byDay.get(order[i - 1]!) : fixed.get(order[i - 1]!)
      const b = byDay.has(order[i]!) ? byDay.get(order[i]!) : fixed.get(order[i]!)
      if (a && b && a === b) clashes++
    }
    return clashes
  }

  let best = shuffle(needs, random)
  if (!rules.avoidSameCategoryInRow) return best
  let bestScore = score(best)
  for (let attempt = 0; attempt < 200 && bestScore > 0; attempt++) {
    const candidate = shuffle(needs, random)
    const s = score(candidate)
    if (s < bestScore) {
      best = candidate
      bestScore = s
    }
  }
  return best
}

/**
 * Arpoo ruoat lukitsemattomille päiville sääntöjen mukaan.
 *
 * Järjestys: ensin päätetään kunkin päivän ruokatyyppi (määrät ja peräkkäisyys),
 * sitten valitaan tyypin sisältä ruoka, joka sopii päivälle eikä ole jo viikolla
 * tai edellisillä viikoilla. Jos sopivaa ei löydy, sääntöjä löysätään vaiheittain
 * ja siitä kerrotaan varoituksella.
 */
export const randomizeWeek = (
  plan: WeekPlan,
  recipes: readonly Recipe[],
  rules: Rules,
  history: readonly WeekPlan[],
  random: Random = Math.random,
): RandomizeResult => {
  const warnings: string[] = []
  const byId = new Map(recipes.map(r => [r.id, r]))
  const slots = rules.days.map(
    day => plan.slots.find(s => s.day === day) ?? { day, recipeId: null, isLocked: false },
  )
  const locked = slots.filter(s => s.isLocked && s.recipeId && byId.has(s.recipeId))
  const openSlots = slots.filter(s => !locked.includes(s))

  const recent = new Set(
    history.slice(0, rules.noRepeatWeeks).flatMap(w => w.slots.map(s => s.recipeId).filter(Boolean) as string[]),
  )
  const used = new Set(locked.map(s => s.recipeId!))

  const needs = categoryNeeds(rules, locked, byId, openSlots.length, warnings, random)
  const fixed = new Map(locked.map(s => [s.day, byId.get(s.recipeId!)?.category]))
  const arranged = arrange(needs, openSlots.map(s => s.day), fixed, rules, random)

  const picked = new Map<Day, string | null>()
  openSlots.forEach((slot, i) => {
    const category = arranged[i] ?? null
    const tiers: { label: string | null; ok: (r: Recipe) => boolean }[] = [
      { label: null, ok: r => allowedFor(r, slot.day, rules) && !recent.has(r.id) },
      { label: 'aiemmilta viikoilta', ok: r => allowedFor(r, slot.day, rules) },
      { label: 'sääntöjen ulkopuolelta', ok: () => true },
    ]
    for (const tier of tiers) {
      const pool = recipes.filter(r => (category === null || r.category === category) && !used.has(r.id) && tier.ok(r))
      if (pool.length === 0) continue
      const choice = pool[Math.floor(random() * pool.length)]!
      used.add(choice.id)
      picked.set(slot.day, choice.id)
      if (tier.label) {
        const what = category ? `${category}ruokia` : 'ruokia'
        warnings.push(`${DAY_LABEL[slot.day]}: sopivia ${what} ei riittänyt, joten valittiin ${tier.label}.`)
      }
      return
    }
    picked.set(slot.day, null)
    warnings.push(`${DAY_LABEL[slot.day]}: ruokapoolissa ei ole tarpeeksi ${category ? `${category}ruokia` : 'ruokia'}.`)
  })

  return {
    slots: slots.map(s => (picked.has(s.day) ? { ...s, recipeId: picked.get(s.day)! } : s)),
    warnings,
  }
}

import { CATEGORIES, DAYS, DAY_LABEL, resolveSlots } from './types'
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

/** Sallivatko sääntöjen tunnisteet ja aikaraja ruoan annetulle kokkauspäivälle. */
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

/** Arvottava kokonaisuus: yksi kokkauspäivä ja sitä seuraavat tähdepäivät. */
type Unit = { days: Day[]; category: Category | null }

const isNextDay = (a: Day, b: Day) => DAYS.indexOf(b) === DAYS.indexOf(a) + 1

/** Valitsee arvottavista päivistä tähdepäivät: päivä, jota edeltää arvottava kokkauspäivä. */
const buildUnits = (open: Day[], leftoverDays: number, random: Random, warnings: string[]): Unit[] => {
  const candidates = shuffle(
    open.filter((day, i) => i > 0 && isNextDay(open[i - 1]!, day)),
    random,
  )
  const leftovers = new Set<Day>()
  for (const day of candidates) {
    if (leftovers.size >= leftoverDays) break
    const previous = DAYS[DAYS.indexOf(day) - 1]!
    const next = DAYS[DAYS.indexOf(day) + 1]
    // Yksi tähdepäivä per kokkaus: ei ketjuja eikä tähdepäivää tähdepäivän jälkeen.
    if (leftovers.has(previous) || (next && leftovers.has(next))) continue
    leftovers.add(day)
  }
  if (leftovers.size < leftoverDays) {
    warnings.push(
      `Tähdepäiviä saatiin ${leftovers.size}/${leftoverDays}: tähdepäivä tarvitsee edelliseksi päiväksi arvottavan kokkauspäivän.`,
    )
  }

  const units: Unit[] = []
  for (const day of open) {
    if (leftovers.has(day)) units[units.length - 1]!.days.push(day)
    else units.push({ days: [day], category: null })
  }
  return units
}

/**
 * Antaa jokaiselle kokonaisuudelle ruokatyypin. Määrät lasketaan syöntipäivinä,
 * joten tuplasatsi kattaa kaksi päivää samaa tyyppiä. Paras monesta satunnaisesta
 * yrityksestä valitaan: ensin määrät täsmälleen, sitten vähiten samaa tyyppiä peräkkäin.
 */
const assignCategories = (
  units: Unit[],
  needs: Record<Category, number>,
  free: Category[],
  fixed: Map<Day, Category | undefined>,
  rules: Rules,
  random: Random,
): { units: Unit[]; missed: number } => {
  const score = (assigned: Unit[]) => {
    const byDay = new Map<Day, Category | null | undefined>(fixed)
    for (const u of assigned) for (const d of u.days) byDay.set(d, u.category)
    let clashes = 0
    for (let i = 1; i < rules.days.length; i++) {
      const a = byDay.get(rules.days[i - 1]!)
      const b = byDay.get(rules.days[i]!)
      const sameUnit = assigned.some(u => u.days.includes(rules.days[i - 1]!) && u.days.includes(rules.days[i]!))
      if (a && b && a === b && !sameUnit && isNextDay(rules.days[i - 1]!, rules.days[i]!)) clashes++
    }
    return clashes
  }

  let best: { units: Unit[]; missed: number; clashes: number } | null = null
  for (let attempt = 0; attempt < 300; attempt++) {
    const left = { ...needs }
    let missed = 0
    const order = shuffle(units.map((_, i) => i), random)
    const result = units.map(u => ({ ...u }))
    // Isommat kokonaisuudet ensin, jotta tuplasatsille löytyy tyyppi, jota on jäljellä tarpeeksi.
    order.sort((a, b) => units[b]!.days.length - units[a]!.days.length)
    for (const i of order) {
      const size = units[i]!.days.length
      const fits = CATEGORIES.filter(c => left[c] >= size)
      const some = CATEGORIES.filter(c => left[c] > 0)
      let category: Category | null
      if (fits.length > 0) category = fits[Math.floor(random() * fits.length)]!
      else if (free.length > 0) category = free[Math.floor(random() * free.length)]!
      else if (some.length > 0) category = some[Math.floor(random() * some.length)]!
      else category = null
      // Tyyppi, jolle on asetettu määrä, ei saa ylittyä: ylitys lasketaan virheeksi.
      if (category && !free.includes(category)) {
        const used = Math.min(size, left[category])
        missed += size - used
        left[category] -= used
      }
      result[i]!.category = category
    }
    missed += CATEGORIES.reduce((sum, c) => sum + left[c], 0)
    const clashes = rules.avoidSameCategoryInRow ? score(result) : 0
    if (!best || missed < best.missed || (missed === best.missed && clashes < best.clashes)) {
      best = { units: result, missed, clashes }
    }
    if (best.missed === 0 && best.clashes === 0) break
  }
  return { units: best!.units, missed: best!.missed }
}

/**
 * Arpoo ruoat lukitsemattomille päiville sääntöjen mukaan.
 *
 * Järjestys: valitaan tähdepäivät, päätetään kunkin kokkauksen ruokatyyppi
 * (määrät ja peräkkäisyys), sitten valitaan tyypin sisältä ruoka, joka sopii
 * kokkauspäivälle eikä ole jo viikolla tai edellisillä viikoilla. Tuplasatsiin
 * valitaan ruoka, joka riittää kahdeksi päiväksi. Jos sopivaa ei löydy, sääntöjä
 * löysätään vaiheittain ja siitä kerrotaan varoituksella.
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

  // Lukitut päivät ja niiden tähdepäivät pysyvät. Muut tyhjennetään arvontaa varten.
  const resolved = resolveSlots(plan.slots)
  const isKept = (slot: PlanSlot) => {
    const r = resolved.find(x => x.day === slot.day)
    if (!r?.eatenRecipeId || !byId.has(r.eatenRecipeId)) return false
    const cook = plan.slots.find(s => s.day === r.cookedOn)
    return Boolean(cook?.isLocked)
  }
  const kept = slots.filter(isKept)
  const open = slots.filter(s => !kept.includes(s)).map(s => s.day)

  const fixed = new Map<Day, Category | undefined>(
    kept.map(s => [s.day, byId.get(resolved.find(x => x.day === s.day)!.eatenRecipeId!)?.category]),
  )

  const needs = Object.fromEntries(
    CATEGORIES.map(c => {
      const wanted = rules.counts[c]
      const already = [...fixed.values()].filter(v => v === c).length
      return [c, wanted === null ? 0 : Math.max(0, wanted - already)]
    }),
  ) as Record<Category, number>
  const totalNeeds = CATEGORIES.reduce((sum, c) => sum + needs[c], 0)
  if (totalNeeds > open.length) {
    warnings.push(
      `Säännöt pyytävät ${totalNeeds} ruokapäivää, mutta arvottavia päiviä on vain ${open.length}. Osa määristä jää täyttymättä.`,
    )
  }
  const free = CATEGORIES.filter(c => rules.counts[c] === null)
  const keptLeftovers = kept.filter(s => resolved.find(x => x.day === s.day)?.isLeftover).length
  const units = buildUnits(open, Math.max(0, rules.leftoverDays - keptLeftovers), random, warnings)
  const { units: assigned } = assignCategories(units, needs, free, fixed, rules, random)

  const recent = new Set(
    history
      .slice(0, rules.noRepeatWeeks)
      .flatMap(w => w.slots.map(s => s.recipeId).filter(Boolean) as string[]),
  )
  const used = new Set(kept.map(s => resolved.find(x => x.day === s.day)!.eatenRecipeId!))

  const picked = new Map<Day, PlanSlot>()
  for (const unit of assigned) {
    const [cookDay, ...leftoverDays] = unit.days as [Day, ...Day[]]
    const isBatch = leftoverDays.length > 0
    const inCategory = (r: Recipe) => unit.category === null || r.category === unit.category
    const tiers: { label: string | null; ok: (r: Recipe) => boolean }[] = [
      { label: null, ok: r => allowedFor(r, cookDay, rules) && !recent.has(r.id) && (!isBatch || r.lastsTwoDays === true) },
      ...(isBatch
        ? [{ label: 'ruoka, jota ei ole merkitty riittämään kahdeksi päiväksi', ok: (r: Recipe) => allowedFor(r, cookDay, rules) && !recent.has(r.id) }]
        : []),
      { label: 'aiemmilta viikoilta', ok: r => allowedFor(r, cookDay, rules) },
      { label: 'sääntöjen ulkopuolelta', ok: () => true },
    ]

    let choice: Recipe | undefined
    for (const tier of tiers) {
      const pool = recipes.filter(r => inCategory(r) && !used.has(r.id) && tier.ok(r))
      if (pool.length === 0) continue
      choice = pool[Math.floor(random() * pool.length)]!
      if (tier.label) {
        const what = unit.category ? `${unit.category}ruokia` : 'ruokia'
        warnings.push(`${DAY_LABEL[cookDay]}: sopivia ${what} ei riittänyt, joten valittiin ${tier.label}.`)
      }
      break
    }
    if (!choice) {
      warnings.push(
        `${DAY_LABEL[cookDay]}: ruokapoolissa ei ole tarpeeksi ${unit.category ? `${unit.category}ruokia` : 'ruokia'}.`,
      )
    } else {
      used.add(choice.id)
    }
    picked.set(cookDay, { day: cookDay, recipeId: choice?.id ?? null, isLocked: false, isLeftover: false })
    for (const day of leftoverDays) {
      picked.set(day, { day, recipeId: null, isLocked: false, isLeftover: choice !== undefined })
    }
  }

  return {
    slots: slots.map(s => picked.get(s.day) ?? s),
    warnings,
  }
}

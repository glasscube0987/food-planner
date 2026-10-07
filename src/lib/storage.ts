import { SEED_RECIPES } from '../data/seedRecipes'
import { DAYS } from './types'
import type { AppData, Rules, WeekPlan } from './types'

const KEY = 'ruokalista:v1'

/** Viikon maanantai muodossa YYYY-MM-DD paikallisen ajan mukaan. */
export const mondayOf = (date: Date): string => {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const shift = (d.getDay() + 6) % 7
  d.setDate(d.getDate() - shift)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export const addWeeks = (weekStart: string, weeks: number): string => {
  const [y, m, d] = weekStart.split('-').map(Number)
  return mondayOf(new Date(y!, m! - 1, d! + weeks * 7))
}

export const emptyPlan = (weekStart: string): WeekPlan => ({
  weekStart,
  slots: DAYS.map(day => ({ day, recipeId: null, isLocked: false })),
})

export const DEFAULT_RULES: Rules = {
  days: [...DAYS],
  counts: { liha: 3, kala: 2, kasvis: 2 },
  weekdayMaxMinutes: null,
  avoidSameCategoryInRow: true,
  noRepeatWeeks: 2,
  excludeTags: [],
  requireTags: [],
}

export const initialData = (now = new Date()): AppData => ({
  version: 1,
  recipes: SEED_RECIPES,
  plan: emptyPlan(mondayOf(now)),
  history: [],
  rules: DEFAULT_RULES,
  household: 4,
  checked: [],
  extras: [],
})

/** Tarkistaa, että tuotu tai tallennettu data on oikean muotoista, ja täydentää puuttuvat kentät. */
export const normalize = (raw: unknown): AppData => {
  const base = initialData()
  if (!raw || typeof raw !== 'object') return base
  const data = raw as Partial<AppData>
  if (data.version !== 1 || !Array.isArray(data.recipes)) return base
  return {
    ...base,
    ...data,
    rules: { ...DEFAULT_RULES, ...data.rules, counts: { ...DEFAULT_RULES.counts, ...data.rules?.counts } },
    plan: data.plan ?? base.plan,
    history: data.history ?? [],
    checked: data.checked ?? [],
    extras: data.extras ?? [],
  }
}

export const load = (): AppData => {
  try {
    const text = localStorage.getItem(KEY)
    return text ? normalize(JSON.parse(text)) : initialData()
  } catch {
    return initialData()
  }
}

export const save = (data: AppData) => {
  try {
    localStorage.setItem(KEY, JSON.stringify(data))
  } catch {
    // Tallennus voi epäonnistua yksityisessä selausikkunassa; sovellus toimii silti istunnon ajan.
  }
}

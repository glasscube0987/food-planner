import { describe, expect, it } from 'vitest'

import { SEED_RECIPES } from '../data/seedRecipes'
import { categorize, mealToRecipe } from './mealdb'
import { parseIngredientLine } from './parse'
import { randomizeWeek } from './randomize'
import { buildShoppingList } from './shopping'
import { DEFAULT_RULES, addWeeks, emptyPlan, mondayOf, normalize } from './storage'
import type { Recipe, Rules, WeekPlan } from './types'

/** Toistettava satunnaislukugeneraattori testeihin. */
const seeded = (seed: number) => () => {
  seed = (seed * 1664525 + 1013904223) % 2 ** 32
  return seed / 2 ** 32
}

const countBy = (plan: { recipeId: string | null }[], recipes: Recipe[]) => {
  const byId = new Map(recipes.map(r => [r.id, r]))
  const counts = { liha: 0, kala: 0, kasvis: 0 }
  for (const s of plan) if (s.recipeId) counts[byId.get(s.recipeId)!.category]++
  return counts
}

describe('parseIngredientLine', () => {
  it('erottaa määrän, yksikön ja nimen', () => {
    expect(parseIngredientLine('400 g jauheliha')).toEqual({ name: 'jauheliha', amount: 400, unit: 'g' })
    expect(parseIngredientLine('2,5 dl vehnäjauho')).toEqual({ name: 'vehnäjauho', amount: 2.5, unit: 'dl' })
    expect(parseIngredientLine('1/2 sipuli')).toEqual({ name: 'sipuli', amount: 0.5 })
    expect(parseIngredientLine('2 valkosipulinkynsi')).toEqual({ name: 'valkosipulinkynsi', amount: 2 })
    expect(parseIngredientLine('suola')).toEqual({ name: 'suola' })
    expect(parseIngredientLine('  ')).toBeNull()
  })

  it('jäsentää kaikki perusreseptien ainekset nimellisesti', () => {
    for (const r of SEED_RECIPES) {
      expect(r.ingredients.length).toBeGreaterThan(0)
      for (const i of r.ingredients) expect(i.name).not.toMatch(/^\d/)
    }
  })
})

describe('randomizeWeek', () => {
  const plan = emptyPlan('2026-10-05')

  it('noudattaa liha/kala/kasvis-määriä täsmälleen', () => {
    for (let seed = 1; seed < 30; seed++) {
      const { slots, warnings } = randomizeWeek(plan, SEED_RECIPES, DEFAULT_RULES, [], seeded(seed))
      expect(warnings).toEqual([])
      expect(countBy(slots, SEED_RECIPES)).toEqual({ liha: 3, kala: 2, kasvis: 2 })
      expect(new Set(slots.map(s => s.recipeId)).size).toBe(7)
    }
  })

  it('välttää saman tyypin peräkkäisinä päivinä', () => {
    const byId = new Map(SEED_RECIPES.map(r => [r.id, r]))
    for (let seed = 1; seed < 30; seed++) {
      const { slots } = randomizeWeek(plan, SEED_RECIPES, DEFAULT_RULES, [], seeded(seed))
      for (let i = 1; i < slots.length; i++) {
        expect(byId.get(slots[i]!.recipeId!)!.category).not.toBe(byId.get(slots[i - 1]!.recipeId!)!.category)
      }
    }
  })

  it('jättää lukitut päivät ennalleen ja laskee ne mukaan määriin', () => {
    const lohi = SEED_RECIPES.find(r => r.id === 'perus-lohikeitto')!
    const locked: WeekPlan = {
      ...plan,
      slots: plan.slots.map(s => (s.day === 'ke' ? { ...s, recipeId: lohi.id, isLocked: true } : s)),
    }
    const { slots } = randomizeWeek(locked, SEED_RECIPES, DEFAULT_RULES, [], seeded(7))
    expect(slots.find(s => s.day === 'ke')!.recipeId).toBe(lohi.id)
    expect(countBy(slots, SEED_RECIPES).kala).toBe(2)
  })

  it('täyttää vapaat päivät tyypeillä, joille ei ole asetettu määrää', () => {
    const rules: Rules = { ...DEFAULT_RULES, counts: { liha: 2, kala: 1, kasvis: null } }
    const { slots } = randomizeWeek(plan, SEED_RECIPES, rules, [], seeded(3))
    expect(countBy(slots, SEED_RECIPES)).toEqual({ liha: 2, kala: 1, kasvis: 4 })
  })

  it('noudattaa arkipäivien aikarajaa ja poissuljettuja tunnisteita', () => {
    const rules: Rules = { ...DEFAULT_RULES, weekdayMaxMinutes: 40, excludeTags: ['tulinen'] }
    const byId = new Map(SEED_RECIPES.map(r => [r.id, r]))
    for (let seed = 1; seed < 20; seed++) {
      const { slots } = randomizeWeek(plan, SEED_RECIPES, rules, [], seeded(seed))
      for (const s of slots) {
        const r = byId.get(s.recipeId!)!
        expect(r.tags).not.toContain('tulinen')
        if (['ma', 'ti', 'ke', 'to', 'pe'].includes(s.day)) expect(r.minutes!).toBeLessThanOrEqual(40)
      }
    }
  })

  it('ei toista edellisen viikon ruokia', () => {
    const first = randomizeWeek(plan, SEED_RECIPES, DEFAULT_RULES, [], seeded(11))
    const previous: WeekPlan = { weekStart: '2026-09-28', slots: first.slots }
    const second = randomizeWeek(plan, SEED_RECIPES, DEFAULT_RULES, [previous], seeded(12))
    const before = new Set(first.slots.map(s => s.recipeId))
    expect(second.slots.filter(s => before.has(s.recipeId))).toEqual([])
  })

  it('varoittaa, kun pooli ei riitä', () => {
    const fish = SEED_RECIPES.filter(r => r.category === 'kala').slice(0, 1)
    const rules: Rules = { ...DEFAULT_RULES, counts: { liha: null, kala: 3, kasvis: null } }
    const { warnings } = randomizeWeek(plan, fish, rules, [], seeded(1))
    expect(warnings.length).toBeGreaterThan(0)
  })

  it('suunnittelee vain valituille päiville', () => {
    const rules: Rules = { ...DEFAULT_RULES, days: ['ma', 'ke', 'pe'], counts: { liha: 1, kala: 1, kasvis: 1 } }
    const { slots } = randomizeWeek(plan, SEED_RECIPES, rules, [], seeded(5))
    expect(slots.map(s => s.day)).toEqual(['ma', 'ke', 'pe'])
  })
})

describe('buildShoppingList', () => {
  const byName = (name: string) => SEED_RECIPES.find(r => r.name === name)!

  it('yhdistää samat ainekset ja skaalaa perheen kokoon', () => {
    const plan: WeekPlan = {
      weekStart: '2026-10-05',
      slots: [
        { day: 'ma', recipeId: byName('Jauhelihakastike ja perunat').id, isLocked: false },
        { day: 'ti', recipeId: byName('Chili con carne').id, isLocked: false },
      ],
    }
    const list = buildShoppingList(plan, SEED_RECIPES, 4)
    expect(list.find(i => i.key === 'jauheliha')!.amount).toBe('800 g')
    expect(list.find(i => i.key === 'sipuli')!.amount).toBe('2')
    expect(list.find(i => i.key === 'jauheliha')!.usedIn).toHaveLength(2)

    expect(list.find(i => i.key === 'vesi')).toBeUndefined()
    expect(list.find(i => i.key === 'suola')!.isPantry).toBe(true)

    const double = buildShoppingList(plan, SEED_RECIPES, 8)
    expect(double.find(i => i.key === 'jauheliha')!.amount).toBe('1,6 kg')
  })

  it('laskee eri tilavuusyksiköt yhteen', () => {
    const a: Recipe = { ...byName('Pestopasta ja kirsikkatomaatit'), id: 'a', ingredients: [{ name: 'maito', amount: 5, unit: 'dl' }] }
    const b: Recipe = { ...a, id: 'b', ingredients: [{ name: 'Maito', amount: 1, unit: 'l' }] }
    const plan: WeekPlan = {
      weekStart: '2026-10-05',
      slots: [
        { day: 'ma', recipeId: 'a', isLocked: false },
        { day: 'ti', recipeId: 'b', isLocked: false },
      ],
    }
    expect(buildShoppingList(plan, [a, b], 4)).toEqual([
      { key: 'maito', name: 'maito', amount: '1,5 l', usedIn: [a.name], isPantry: false },
    ])
  })
})

describe('TheMealDB-tuonti', () => {
  it('päättelee ruokatyypin', () => {
    expect(categorize('Beef', [])).toBe('liha')
    expect(categorize('Seafood', [])).toBe('kala')
    expect(categorize('Pasta', [{ name: 'Salmon' }])).toBe('kala')
    expect(categorize('Pasta', [{ name: 'Basil' }])).toBe('kasvis')
  })

  it('muuntaa aterian reseptiksi', () => {
    const recipe = mealToRecipe({
      idMeal: '52772',
      strMeal: 'Teriyaki Chicken Casserole',
      strCategory: 'Chicken',
      strArea: 'Japanese',
      strInstructions: 'Preheat oven.',
      strTags: 'Meat,Casserole',
      strSource: null,
      strIngredient1: 'soy sauce',
      strMeasure1: '3/4 cup',
      strIngredient2: 'chicken breasts',
      strMeasure2: '500g',
      strIngredient3: '',
      strMeasure3: '',
    })
    expect(recipe.category).toBe('liha')
    expect(recipe.ingredients).toEqual([
      { name: 'soy sauce', note: '3/4 cup' },
      { name: 'chicken breasts', amount: 500, unit: 'g' },
    ])
    expect(recipe.tags).toEqual(['Meat', 'Casserole', 'Japanese'])
  })
})

describe('storage', () => {
  it('laskee viikon maanantain', () => {
    expect(mondayOf(new Date(2026, 9, 7))).toBe('2026-10-05')
    expect(mondayOf(new Date(2026, 9, 11))).toBe('2026-10-05')
    expect(addWeeks('2026-10-05', 1)).toBe('2026-10-12')
  })

  it('hylkää rikkinäisen datan ja täydentää puuttuvat kentät', () => {
    expect(normalize('roskaa').recipes.length).toBe(SEED_RECIPES.length)
    const partial = normalize({ version: 1, recipes: [], rules: { counts: { liha: 5 } } })
    expect(partial.rules.counts).toEqual({ liha: 5, kala: 2, kasvis: 2 })
    expect(partial.extras).toEqual([])
  })
})

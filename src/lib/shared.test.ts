import { describe, expect, it } from 'vitest'

import { SEED_RECIPES } from '../data/seedRecipes'
import { toRecipe } from './claudeRecipe'
import { PATHS, compose, diff } from './sharedData'
import type { SharedParts } from './sharedData'
import { initialData, normalize } from './storage'
import type { AppData, Recipe } from './types'

const empty = (): SharedParts => ({ settings: null, week: null, shopping: null, recipes: new Map() })

describe('yhteinen tallennus', () => {
  it('tyhjästä tallennuksesta saadaan perusreseptit ja oletussäännöt', () => {
    const data = compose(empty())
    expect(data.recipes).toHaveLength(SEED_RECIPES.length)
    expect(data.rules.leftoverDays).toBe(2)
    expect(data.checked).toEqual([])
  })

  it('yhdistää omat reseptit, muokatut ja piilotetut perusreseptit', () => {
    const own: Recipe = { ...SEED_RECIPES[0]!, id: 'oma-1', name: 'Mummon keitto', isOwn: true }
    const edited: Recipe = { ...SEED_RECIPES[1]!, name: 'Muokattu' }
    const parts = empty()
    parts.recipes.set(own.id, own)
    parts.recipes.set(edited.id, edited)
    parts.settings = { hiddenRecipeIds: [SEED_RECIPES[2]!.id] }
    const data = compose(parts)
    expect(data.recipes).toHaveLength(SEED_RECIPES.length)
    expect(data.recipes.find(r => r.id === edited.id)!.name).toBe('Muokattu')
    expect(data.recipes.some(r => r.id === SEED_RECIPES[2]!.id)).toBe(false)
    expect(data.recipes.at(-1)!.name).toBe('Mummon keitto')
  })

  it('kirjoittaa vain muuttuneet osat', () => {
    const prev = compose(empty())
    const next: AppData = { ...prev, household: 5 }
    expect(diff(prev, next).map(w => w.path)).toEqual([PATHS.settings])
    expect(diff(prev, prev)).toEqual([])
  })

  it('ostosmerkinnät yhdistetään rivikohtaisesti', () => {
    const prev: AppData = { ...compose(empty()), checked: ['maito'] }
    const next: AppData = { ...prev, checked: ['maito', 'sipuli'] }
    expect(diff(prev, next)).toEqual([
      {
        path: PATHS.shopping,
        op: 'merge',
        data: { checked: { sipuli: true } },
        fallback: { checked: { maito: true, sipuli: true }, extras: [] },
      },
    ])
    const cleared = diff(next, { ...next, checked: [] })
    expect(cleared[0]).toMatchObject({ op: 'set', data: { checked: {} } })
  })

  it('reseptien lisäys, poisto ja perusreseptin piilotus', () => {
    const prev = compose(empty())
    const own: Recipe = { ...SEED_RECIPES[0]!, id: 'oma-2', isOwn: true }
    const added = diff(prev, { ...prev, recipes: [...prev.recipes, own] })
    expect(added).toEqual([{ path: 'recipes/oma-2', op: 'set', data: JSON.parse(JSON.stringify(own)) }])

    const withoutSeed = { ...prev, recipes: prev.recipes.slice(1) }
    const hide = diff(prev, withoutSeed)
    expect(hide).toHaveLength(1)
    expect(hide[0]).toMatchObject({ path: PATHS.settings, data: { hiddenRecipeIds: [SEED_RECIPES[0]!.id] } })
  })

  it('tiedostosta tuonti ei tallenna muuttumattomia perusreseptejä', () => {
    const prev = compose(empty())
    const imported = normalize(JSON.parse(JSON.stringify(initialData())))
    const writes = diff(prev, imported)
    expect(writes.filter(w => w.path.startsWith('recipes/'))).toEqual([])
  })
})

describe('Clauden reseptivastaus', () => {
  it('muuttaa vastauksen reseptiksi ja korjaa kentät', () => {
    const recipe = toRecipe(
      {
        name: ' Lihakeitto ',
        category: 'liha',
        minutes: '90',
        servings: 4,
        lastsTwoDays: true,
        tags: ['keitto', 3],
        ingredients: [
          { name: 'naudanliha', amount: 500, unit: 'G', note: null },
          { name: 'suola', amount: null, unit: null, note: 'maun mukaan' },
          { name: '' },
        ],
        instructions: 'Keitä.',
        sourceUrl: 'https://example.com/lihakeitto',
      },
      'oma-x',
      'Tuotu resepti',
    )
    expect(recipe).toEqual({
      id: 'oma-x',
      name: 'Lihakeitto',
      category: 'liha',
      minutes: 90,
      tags: ['keitto'],
      servings: 4,
      lastsTwoDays: true,
      ingredients: [
        { name: 'naudanliha', amount: 500, unit: 'g' },
        { name: 'suola', note: 'maun mukaan' },
      ],
      instructions: 'Keitä.',
      source: { name: 'Tuotu resepti', url: 'https://example.com/lihakeitto' },
      isOwn: true,
    })
  })

  it('hylkää vastauksen ilman nimeä tai aineksia', () => {
    expect(toRecipe({ name: 'Tyhjä', ingredients: [] }, 'a', 'x')).toBeNull()
    expect(toRecipe('ei resepti', 'a', 'x')).toBeNull()
    expect(toRecipe({ name: 'X', category: 'jälkiruoka', ingredients: [{ name: 'a' }] }, 'a', 'x')!.category).toBe('kasvis')
  })
})

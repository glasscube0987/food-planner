import { describe, expect, it } from 'vitest'

import { SEED_RECIPES } from '../data/seedRecipes'
import { fridgePrompt, parseFridge, parseTidy, parseWeek, tidyBasis, tidyPrompt, weekPrompt } from './ai'
import type { WeekContext } from './ai'
import { compose, diff, PATHS } from './sharedData'
import type { ShoppingItem } from './shopping'
import { DEFAULT_RULES, emptyPlan } from './storage'
import { resolveSlots } from './types'
import type { WeekPlan } from './types'

const seeded = (seed: number) => () => {
  seed = (seed * 1664525 + 1013904223) % 2 ** 32
  return seed / 2 ** 32
}

const ctx = (plan: WeekPlan = emptyPlan('2026-11-23')): WeekContext => ({
  plan,
  recipes: SEED_RECIPES,
  rules: DEFAULT_RULES,
  history: [],
})

describe('viikko toiveesta', () => {
  it('kehotteessa on toive, säännöt ja ruokapooli', () => {
    const prompt = weekPrompt('lapset kipeinä, pe tacot', ctx())
    expect(prompt).toContain('lapset kipeinä, pe tacot')
    expect(prompt).toContain('Tähdepäiviä: 2')
    expect(prompt).toContain('perus-tacot | Tacot | liha')
  })

  it('ottaa Clauden valinnat ja täyttää loput säännöillä', () => {
    const proposal = parseWeek(
      {
        days: [
          { day: 'ma', recipeId: 'perus-kanakeitto', leftover: false },
          { day: 'ti', recipeId: null, leftover: true },
          { day: 'pe', recipeId: 'perus-tacot', leftover: false },
        ],
        reason: 'Keittoa sairaille, perjantaina tacot.',
      },
      ctx(),
      seeded(3),
    )
    const by = Object.fromEntries(proposal.slots.map(s => [s.day, s]))
    expect(by.ma!.recipeId).toBe('perus-kanakeitto')
    expect(by.ti!.isLeftover).toBe(true)
    expect(by.pe!.recipeId).toBe('perus-tacot')
    expect(proposal.reason).toBe('Keittoa sairaille, perjantaina tacot.')
    expect(proposal.filledDays).toEqual(expect.arrayContaining(['ke', 'to', 'la', 'su']))
    expect(resolveSlots(proposal.slots).every(s => s.eatenRecipeId)).toBe(true)
    expect(proposal.slots.every(s => !s.isLocked)).toBe(true)
  })

  it('hylkää tuntemattomat ruoat, toistot ja virheelliset tähdepäivät', () => {
    const proposal = parseWeek(
      {
        days: [
          { day: 'ma', recipeId: 'keksitty-ruoka' },
          { day: 'ti', recipeId: null, leftover: true },
          { day: 'ke', recipeId: 'perus-tacot' },
          { day: 'to', recipeId: null, leftover: true },
          { day: 'pe', recipeId: 'perus-tacot' },
        ],
      },
      ctx(),
      seeded(5),
    )
    const by = Object.fromEntries(proposal.slots.map(s => [s.day, s]))
    expect(by.ma!.recipeId).not.toBe('keksitty-ruoka')
    // Tacot eivät riitä kahdeksi päiväksi, joten torstain tähteet hylätään.
    expect(by.to!.isLeftover).toBeFalsy()
    expect(proposal.slots.filter(s => s.recipeId === 'perus-tacot')).toHaveLength(1)
    expect(proposal.filledDays).toEqual(expect.arrayContaining(['ma', 'to', 'pe']))
  })

  it('säilyttää lukitut päivät', () => {
    const plan = emptyPlan('2026-11-23')
    plan.slots[2] = { day: 'ke', recipeId: 'perus-lohikeitto', isLocked: true }
    const proposal = parseWeek({ days: [{ day: 'ke', recipeId: 'perus-tacot' }] }, ctx(plan), seeded(1))
    expect(proposal.slots.find(s => s.day === 'ke')).toEqual({ day: 'ke', recipeId: 'perus-lohikeitto', isLocked: true })
    expect(weekPrompt('', ctx(plan))).toContain('ke: perus-lohikeitto (Lohikeitto)')
  })

  it('kestää rikkinäisen vastauksen', () => {
    const proposal = parseWeek('ei json', ctx(), seeded(2))
    expect(resolveSlots(proposal.slots).filter(s => s.eatenRecipeId)).toHaveLength(7)
    expect(proposal.reason).toBe('')
  })
})

describe('jääkaappi-ideat', () => {
  it('tunnistaa ruokapoolin ruoat ja uudet ideat', () => {
    expect(fridgePrompt('perunaa, kinkkua', SEED_RECIPES)).toContain('perunaa, kinkkua')
    const ideas = parseFridge(
      {
        ideas: [
          { recipeId: 'perus-pyttipannu', name: '', uses: ['peruna', 'kinkku'], missing: ['punajuuri'], why: 'Käyttää perunat.' },
          { recipeId: 'olematon', name: 'Perunarieska', uses: ['peruna'], missing: [] },
          { name: '' },
          'roskaa',
        ],
      },
      SEED_RECIPES,
    )
    expect(ideas).toEqual([
      { recipeId: 'perus-pyttipannu', name: 'Pyttipannu', uses: ['peruna', 'kinkku'], missing: ['punajuuri'], why: 'Käyttää perunat.' },
      { recipeId: null, name: 'Perunarieska', uses: ['peruna'], missing: [], why: '' },
    ])
  })
})

describe('kauppalistan järjestäminen', () => {
  const items: ShoppingItem[] = [
    { key: 'sipuli', name: 'sipuli', amount: '2', usedIn: [], isPantry: false },
    { key: 'kananmuna', name: 'kananmuna', amount: '3', usedIn: [], isPantry: false },
    { key: 'kananmunaa', name: 'kananmunaa', amount: '2', usedIn: [], isPantry: false },
    { key: 'jauheliha', name: 'jauheliha', amount: '400 g', usedIn: [], isPantry: false },
  ]

  it('ryhmittelee, yhdistää ja ottaa jokaisen rivin kerran', () => {
    expect(tidyPrompt(items)).toContain('kananmunaa | kananmunaa | 2')
    const tidy = parseTidy(
      {
        groups: [
          { aisle: 'Maito, juusto ja munat', items: [{ keys: ['kananmuna', 'kananmunaa'], name: 'kananmuna', amount: '5' }] },
          { aisle: 'Hedelmät ja vihannekset', items: [{ keys: ['sipuli', 'kananmuna', 'keksitty'], name: 'sipuli' }] },
        ],
      },
      items,
    )
    expect(tidy.basis).toBe(tidyBasis(items))
    expect(tidy.groups).toEqual([
      { aisle: 'Hedelmät ja vihannekset', items: [{ keys: ['sipuli'], name: 'sipuli', amount: '2' }] },
      { aisle: 'Maito, juusto ja munat', items: [{ keys: ['kananmuna', 'kananmunaa'], name: 'kananmuna', amount: '5' }] },
      { aisle: 'Muut', items: [{ keys: ['jauheliha'], name: 'jauheliha', amount: '400 g' }] },
    ])
  })

  it('tunniste muuttuu, kun lista muuttuu', () => {
    expect(tidyBasis(items)).not.toBe(tidyBasis(items.slice(1)))
    expect(tidyBasis([...items].reverse())).toBe(tidyBasis(items))
  })

  it('järjestys tallentuu yhteiseen kauppalistaan', () => {
    const prev = compose({ settings: null, week: null, shopping: null, recipes: new Map() })
    const tidy = parseTidy({}, items)
    const writes = diff(prev, { ...prev, tidy })
    expect(writes).toHaveLength(1)
    expect(writes[0]).toMatchObject({ path: PATHS.shopping, op: 'merge', data: { tidy } })
    const parts = { settings: null, week: null, shopping: { tidy }, recipes: new Map() }
    expect(compose(parts).tidy).toEqual(tidy)
  })
})

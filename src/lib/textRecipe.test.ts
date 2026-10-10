import { describe, expect, it } from 'vitest'

import { inviteLink, isValidCode, newHouseholdCode, parseCode } from './household'
import { guessCategory, parseRecipeText } from './textRecipe'

describe('parseRecipeText', () => {
  it('tulkitsee otsikoidun reseptin', () => {
    const recipe = parseRecipeText(
      `Kermainen lohikeitto
4 annosta
40 min
https://example.com/lohikeitto

Ainekset
400 g lohta
800 g perunoita
1 sipuli
2 dl kuohukermaa
tilliä

Valmistus
1. Kuori ja kuutioi perunat ja sipuli.
2. Keitä liemessä pehmeiksi ja lisää lohi ja kerma.`,
      'oma-1',
    )!
    expect(recipe.name).toBe('Kermainen lohikeitto')
    expect(recipe.servings).toBe(4)
    expect(recipe.minutes).toBe(40)
    expect(recipe.category).toBe('kala')
    expect(recipe.lastsTwoDays).toBe(true)
    expect(recipe.source.url).toBe('https://example.com/lohikeitto')
    expect(recipe.ingredients).toEqual([
      { name: 'lohta', amount: 400, unit: 'g' },
      { name: 'perunoita', amount: 800, unit: 'g' },
      { name: 'sipuli', amount: 1 },
      { name: 'kuohukermaa', amount: 2, unit: 'dl' },
      { name: 'tilliä' },
    ])
    expect(recipe.instructions.split('\n')).toHaveLength(2)
  })

  it('tunnistaa ainekset ilman otsikoita määristä', () => {
    const recipe = parseRecipeText(
      `Pinaattiletut
5 dl maitoa
2 kananmunaa
2,5 dl vehnäjauhoja
Sekoita kaikki ainekset tasaiseksi taikinaksi ja anna turvota vartin ajan.`,
      'oma-2',
    )!
    expect(recipe.ingredients.map(i => i.name)).toEqual(['maitoa', 'kananmunaa', 'vehnäjauhoja'])
    expect(recipe.category).toBe('kasvis')
    expect(recipe.instructions).toMatch(/^Sekoita/)
  })

  it('palauttaa null, kun aineksia ei löydy', () => {
    expect(parseRecipeText('Pelkkä otsikko\nJa vähän tekstiä', 'x')).toBeNull()
    expect(parseRecipeText('   ', 'x')).toBeNull()
  })

  it('arvaa ruokatyypin', () => {
    expect(guessCategory('Jauhelihakeitto', [])).toBe('liha')
    expect(guessCategory('Pasta', [{ name: 'tonnikala' }])).toBe('kala')
    expect(guessCategory('Linssikeitto', [{ name: 'linssi' }])).toBe('kasvis')
    expect(guessCategory('Munakas', [{ name: 'kananmuna' }, { name: 'champignon' }])).toBe('kasvis')
    expect(guessCategory('Kanakeitto', [])).toBe('liha')
  })
})

describe('perhekoodi', () => {
  it('luo kelvollisia, toisistaan eroavia koodeja', () => {
    const a = newHouseholdCode()
    expect(isValidCode(a)).toBe(true)
    expect(newHouseholdCode()).not.toBe(a)
  })

  it('poimii koodin kutsulinkistä tai pelkästä koodista', () => {
    const code = newHouseholdCode()
    const link = inviteLink(code, 'https://glasscube0987.github.io/food-planner/#vanha')
    expect(link).toBe(`https://glasscube0987.github.io/food-planner/#liity-${code}`)
    expect(parseCode(link)).toBe(code)
    expect(parseCode(`  ${code.toUpperCase()} `)).toBe(code)
    expect(parseCode('https://example.com')).toBeNull()
    expect(parseCode('liian-lyhyt')).toBeNull()
  })
})

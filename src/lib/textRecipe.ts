import { parseIngredientLine } from './parse'
import type { Category, Ingredient, Recipe } from './types'

const INGREDIENT_HEADER = /^(ainekset|ainesosat|tarvikkeet|tarvitset|ingredients)\b/i
const INSTRUCTION_HEADER = /^(ohje|ohjeet|valmistus|valmistusohje|tee näin|näin valmistat|instructions|method|directions)\b/i
const STARTS_WITH_AMOUNT = /^[-•*]?\s*(\d|[½¼¾⅓⅔])/
const STEP_NUMBER = /^\d+[.)]\s+\S/

const FISH = /lohi|lohta|kala|tonnikal|silak|muik|turska|seiti|kirjolohi|katkarap|äyriä|simpuk|salmon|tuna|\bcod\b|fish|shrimp|prawn/i
// "kana" ei saa osua sanaan "kananmuna", eikä "ham" sanaan "champignon".
const MEAT = /liha|broiler|kana(?!nmun)|nauta|naudan|porsa|possu|sika|kinkku|pekoni|makkara|nakki|lammas|kalkkun|beef|pork|chicken|bacon|\bham\b|sausage|lamb/i
const BATCH = /keitto|laatikko|pata|kastike|curry|chili|lasagne|soppa|soup|stew|casserole/i

/** Päättelee ruokatyypin nimestä ja aineksista: kala, liha tai muuten kasvis. */
export const guessCategory = (name: string, ingredients: Ingredient[]): Category => {
  const text = [name, ...ingredients.map(i => i.name)].join(' ')
  if (FISH.test(text)) return 'kala'
  if (MEAT.test(text)) return 'liha'
  return 'kasvis'
}

/**
 * Tulkitsee reseptisivulta kopioidun tekstin ilman tekoälyä. Ainekset tunnistetaan
 * "Ainekset"-otsikon alta tai riveistä, jotka alkavat määrällä; ohjeeksi tulee
 * "Ohje"/"Valmistus"-otsikon jälkeinen teksti tai muut pitkät rivit. Tulos on
 * karkea, ja se tarkistetaan lomakkeella ennen tallennusta.
 */
export const parseRecipeText = (text: string, id: string): Recipe | null => {
  const lines = text
    .split('\n')
    .map(l => l.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
  if (lines.length === 0) return null

  let url: string | undefined
  let servings = 4
  let minutes: number | undefined
  let name = ''
  const ingredients: Ingredient[] = []
  const steps: string[] = []
  let section: 'none' | 'ingredients' | 'instructions' = 'none'

  for (const line of lines) {
    const link = line.match(/https?:\/\/\S+/)
    if (link) {
      url ??= link[0]
      if (line === link[0]) continue
    }
    const servingMatch = line.match(/(\d+)\s*(annosta|annokselle|hengelle|henkilölle|servings|portions)/i) ?? line.match(/serves\s*(\d+)/i)
    const minuteMatch = line.match(/(\d+)\s*(min|minuuttia|minutes)\b/i)
    const isMeta = line.length < 40 && (servingMatch || minuteMatch)
    if (servingMatch) servings = Number(servingMatch[1])
    if (minuteMatch && line.length < 40) minutes = Number(minuteMatch[1])

    if (INGREDIENT_HEADER.test(line)) {
      section = 'ingredients'
      continue
    }
    if (INSTRUCTION_HEADER.test(line)) {
      section = 'instructions'
      continue
    }
    if (isMeta) continue
    if (!name) {
      name = line.replace(/[:.]$/, '')
      continue
    }

    const looksLikeIngredient =
      STARTS_WITH_AMOUNT.test(line) && !STEP_NUMBER.test(line) && line.length < 70
    if (section === 'ingredients' ? line.length < 70 && !STEP_NUMBER.test(line) : section === 'none' && looksLikeIngredient) {
      const ingredient = parseIngredientLine(line)
      if (ingredient) ingredients.push(ingredient)
    } else if (section === 'instructions' || line.length >= 40 || STEP_NUMBER.test(line)) {
      steps.push(line)
    }
  }

  if (!name || ingredients.length === 0) return null

  const recipe: Recipe = {
    id,
    name,
    category: guessCategory(name, ingredients),
    tags: [],
    servings,
    lastsTwoDays: BATCH.test(name),
    ingredients,
    instructions: steps.join('\n'),
    source: url ? { name: 'Tuotu resepti', url } : { name: 'Tuotu resepti' },
    isOwn: true,
  }
  if (minutes !== undefined) recipe.minutes = minutes
  return recipe
}

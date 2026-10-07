import type { Ingredient } from './types'

const UNITS = [
  'kg', 'g', 'l', 'dl', 'cl', 'ml', 'rkl', 'tl', 'mm', 'kpl', 'prk', 'pkt', 'pss', 'tlk', 'rs', 'nippu', 'kynsi', 'kynttä', 'viipale',
  'cup', 'cups', 'tbsp', 'tsp', 'oz', 'lb', 'lbs',
]

const FRACTIONS: Record<string, number> = { '½': 0.5, '¼': 0.25, '¾': 0.75, '⅓': 1 / 3, '⅔': 2 / 3 }

/** Lukee määrän kuten "1,5", "1/2", "½" tai "1 ½". */
const parseNumber = (text: string): number | undefined => {
  const t = text.trim()
  if (t in FRACTIONS) return FRACTIONS[t]
  const mixed = t.match(/^(\d+)\s*([½¼¾⅓⅔])$/)
  if (mixed) return Number(mixed[1]) + FRACTIONS[mixed[2]!]!
  const frac = t.match(/^(\d+)\/(\d+)$/)
  if (frac) return Number(frac[1]) / Number(frac[2])
  const n = Number(t.replace(',', '.'))
  return Number.isFinite(n) ? n : undefined
}

/**
 * Jäsentää yhden ainesrivin: "400 g jauhelihaa", "2 rkl voita", "1/2 sipuli", "suolaa".
 * Rivin alussa oleva määrä ja yksikkö erotetaan nimestä; muu jää nimeksi.
 */
export const parseIngredientLine = (line: string): Ingredient | null => {
  const text = line.trim().replace(/^[-•*]\s*/, '')
  if (!text) return null

  const match = text.match(/^((?:\d+\s*[½¼¾⅓⅔])|\d+[.,]?\d*(?:\/\d+)?|[½¼¾⅓⅔])\s*([a-zA-ZäöåÄÖÅ]+\.?)?\s+(.+)$/)
  if (!match) return { name: text }

  const amount = parseNumber(match[1]!)
  const maybeUnit = match[2]?.replace(/\.$/, '').toLowerCase()
  let name = match[3]!.trim()

  if (maybeUnit && UNITS.includes(maybeUnit)) {
    return { name, amount, unit: maybeUnit }
  }
  if (maybeUnit) name = `${match[2]} ${name}`

  return { name, amount }
}

export const parseIngredientLines = (text: string): Ingredient[] =>
  text
    .split('\n')
    .map(parseIngredientLine)
    .filter((i): i is Ingredient => i !== null)

export const formatIngredient = (i: Ingredient): string => {
  const amount = i.amount !== undefined ? String(Math.round(i.amount * 100) / 100).replace('.', ',') : ''
  return [amount, i.unit, i.name, i.note ? `(${i.note})` : ''].filter(Boolean).join(' ')
}

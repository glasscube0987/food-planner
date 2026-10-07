import type { Category, Ingredient, Recipe } from './types'

/**
 * TheMealDB (https://www.themealdb.com) on avoin, ilmainen reseptirajapinta.
 * Testiavain "1" on tarkoitettu kehitykseen ja henkilökohtaiseen käyttöön.
 * Reseptit ovat englanniksi. Kutsu tehdään suoraan selaimesta.
 */
const API = 'https://www.themealdb.com/api/json/v1/1'

type Meal = Record<string, string | null> & {
  idMeal: string
  strMeal: string
  strCategory: string | null
  strArea: string | null
  strInstructions: string | null
  strTags: string | null
  strSource: string | null
}

const MEAT = ['Beef', 'Pork', 'Lamb', 'Goat', 'Chicken']
const FISH = ['Seafood']
const VEG = ['Vegetarian', 'Vegan']

const FISH_WORDS = /salmon|tuna|cod|fish|prawn|shrimp|mackerel|haddock|anchov|sardine|crab|mussel|squid/i
const MEAT_WORDS = /beef|pork|lamb|chicken|bacon|ham|sausage|mince|turkey|duck|chorizo|veal|goat|prosciutto/i

/** Päättelee ruokatyypin TheMealDB:n kategoriasta tai aineksista. */
export const categorize = (category: string | null, ingredients: Ingredient[]): Category => {
  if (category && MEAT.includes(category)) return 'liha'
  if (category && FISH.includes(category)) return 'kala'
  if (category && VEG.includes(category)) return 'kasvis'
  const names = ingredients.map(i => i.name).join(' ')
  if (FISH_WORDS.test(names)) return 'kala'
  if (MEAT_WORDS.test(names)) return 'liha'
  return 'kasvis'
}

const parseMeasure = (measure: string): Pick<Ingredient, 'amount' | 'unit' | 'note'> => {
  const m = measure.trim()
  const match = m.match(/^(\d+(?:[.,]\d+)?)\s*(g|kg|ml|l)$/i)
  if (match) return { amount: Number(match[1]!.replace(',', '.')), unit: match[2]!.toLowerCase() }
  return m ? { note: m } : {}
}

export const mealToRecipe = (meal: Meal): Recipe => {
  const ingredients: Ingredient[] = []
  for (let i = 1; i <= 20; i++) {
    const name = meal[`strIngredient${i}`]?.trim()
    if (!name) continue
    ingredients.push({ name, ...parseMeasure(meal[`strMeasure${i}`] ?? '') })
  }
  const tags = [
    ...(meal.strTags ?? '').split(',').map(t => t.trim()).filter(Boolean),
    ...(meal.strArea ? [meal.strArea] : []),
  ]

  return {
    id: `mealdb-${meal.idMeal}`,
    name: meal.strMeal,
    category: categorize(meal.strCategory, ingredients),
    tags,
    servings: 4,
    ingredients,
    instructions: (meal.strInstructions ?? '').trim(),
    source: { name: 'TheMealDB', url: meal.strSource || `https://www.themealdb.com/meal/${meal.idMeal}` },
    isOwn: false,
  }
}

const fetchMeals = async (path: string): Promise<Meal[]> => {
  const res = await fetch(`${API}/${path}`)
  if (!res.ok) throw new Error(`TheMealDB vastasi ${res.status}`)
  const data = (await res.json()) as { meals: Meal[] | null }
  return data.meals ?? []
}

/** Hakee reseptejä nimellä (englanniksi, esim. "chicken", "soup"). */
export const searchMeals = async (query: string): Promise<Recipe[]> =>
  (await fetchMeals(`search.php?s=${encodeURIComponent(query.trim())}`)).map(mealToRecipe)

/** Hakee annetun määrän satunnaisia reseptejä. */
export const randomMeals = async (count: number): Promise<Recipe[]> => {
  const results = await Promise.all(Array.from({ length: count }, () => fetchMeals('random.php')))
  const unique = new Map(results.flat().map(m => [m.idMeal, mealToRecipe(m)]))
  return [...unique.values()]
}

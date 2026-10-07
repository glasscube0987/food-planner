export type Category = 'liha' | 'kala' | 'kasvis'

export const CATEGORIES: readonly Category[] = ['liha', 'kala', 'kasvis']

export const CATEGORY_LABEL: Record<Category, string> = {
  liha: 'Liha',
  kala: 'Kala',
  kasvis: 'Kasvis',
}

export type Ingredient = {
  name: string
  /** Määrä numerona, jos se on tiedossa; muuten koko määrä on `note`-kentässä. */
  amount?: number
  unit?: string
  /** Vapaa teksti, kun määrää ei voi esittää numerona ("ripaus", "1 cup"). */
  note?: string
}

export type Recipe = {
  id: string
  name: string
  category: Category
  /** Vapaat tunnisteet sääntöjä varten, esim. "nopea", "pasta", "lasten suosikki". */
  tags: string[]
  /** Valmistusaika minuutteina, jos tiedossa. */
  minutes?: number
  /** Annosmäärä, jolle ainesmäärät on kirjoitettu. */
  servings: number
  ingredients: Ingredient[]
  instructions: string
  source: { name: string; url?: string }
  isOwn: boolean
}

export const DAYS = ['ma', 'ti', 'ke', 'to', 'pe', 'la', 'su'] as const
export type Day = (typeof DAYS)[number]

export const DAY_LABEL: Record<Day, string> = {
  ma: 'Maanantai',
  ti: 'Tiistai',
  ke: 'Keskiviikko',
  to: 'Torstai',
  pe: 'Perjantai',
  la: 'Lauantai',
  su: 'Sunnuntai',
}

export type PlanSlot = {
  day: Day
  recipeId: string | null
  /** Lukittua päivää arvonta ei muuta. */
  isLocked: boolean
}

export type WeekPlan = {
  /** Viikon maanantai muodossa YYYY-MM-DD. */
  weekStart: string
  slots: PlanSlot[]
}

export type Rules = {
  /** Päivät, joille ruoka suunnitellaan. */
  days: Day[]
  /** Kuinka monta kunkin tyypin ruokaa viikolle tulee; null = ei väliä. */
  counts: Record<Category, number | null>
  /** Arkipäivien (ma–pe) enimmäisvalmistusaika minuutteina; null = ei rajaa. */
  weekdayMaxMinutes: number | null
  /** Älä arvo samaa tyyppiä kahtena peräkkäisenä päivänä. */
  avoidSameCategoryInRow: boolean
  /** Älä arvo ruokia, jotka olivat listalla näin monena edellisenä viikkona. */
  noRepeatWeeks: number
  /** Ruokia, joissa on jokin näistä tunnisteista, ei arvota. */
  excludeTags: string[]
  /** Arvotaan vain ruokia, joissa on kaikki nämä tunnisteet. */
  requireTags: string[]
}

export type ShoppingExtra = { id: string; text: string }

export type AppData = {
  version: 1
  recipes: Recipe[]
  plan: WeekPlan
  /** Aiemmat viikot (uusin ensin) toistojen välttämiseen. */
  history: WeekPlan[]
  rules: Rules
  /** Kuinka monelle ruoka tehdään; kauppalistan määrät skaalataan tähän. */
  household: number
  /** Kauppalistan rivit, jotka on jo merkitty ostetuiksi (rivin avaimella). */
  checked: string[]
  extras: ShoppingExtra[]
}

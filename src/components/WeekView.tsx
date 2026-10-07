import { useState } from 'react'

import { randomizeWeek } from '../lib/randomize'
import { addWeeks, emptyPlan } from '../lib/storage'
import { CATEGORIES, DAY_LABEL } from '../lib/types'
import type { AppData, Day, PlanSlot, Recipe } from '../lib/types'
import type { Update } from '../state'
import { Modal, RecipeDetails, RecipeMeta, RecipePicker } from './common'

const formatWeek = (weekStart: string) => {
  const [y, m, d] = weekStart.split('-').map(Number)
  const start = new Date(y!, m! - 1, d!)
  const end = new Date(y!, m! - 1, d! + 6)
  const f = (date: Date) => `${date.getDate()}.${date.getMonth() + 1}.`
  return `${f(start)}–${f(end)}${end.getFullYear()}`
}

export const WeekView = ({ data, update, onShopping }: { data: AppData; update: Update; onShopping: () => void }) => {
  const [warnings, setWarnings] = useState<string[]>([])
  const [picking, setPicking] = useState<Day | null>(null)
  const [viewing, setViewing] = useState<Recipe | null>(null)

  const byId = new Map(data.recipes.map(r => [r.id, r]))
  const planned = data.plan.slots.filter(s => s.recipeId && byId.has(s.recipeId)).length

  const setSlot = (day: Day, patch: Partial<PlanSlot>) =>
    update(d => ({
      ...d,
      plan: { ...d.plan, slots: d.plan.slots.map(s => (s.day === day ? { ...s, ...patch } : s)) },
    }))

  const randomizeAll = () => {
    const { slots, warnings } = randomizeWeek(data.plan, data.recipes, data.rules, data.history)
    setWarnings(warnings)
    update(d => ({
      ...d,
      checked: [],
      plan: { ...d.plan, slots: d.plan.slots.map(s => slots.find(n => n.day === s.day) ?? s) },
    }))
  }

  /** Arpoo yhden päivän uudelleen saman tyypin ruoista, muut päivät ennallaan. */
  const reroll = (day: Day) => {
    const current = data.plan.slots.find(s => s.day === day)
    const category = current?.recipeId ? byId.get(current.recipeId)?.category : undefined
    const counts = Object.fromEntries(CATEGORIES.map(c => [c, category ? (c === category ? 1 : 0) : null])) as AppData['rules']['counts']
    const others = data.plan.slots.filter(s => s.day !== day).map(s => s.recipeId).filter(Boolean) as string[]
    const pool = data.recipes.filter(r => !others.includes(r.id) && r.id !== current?.recipeId)
    const { slots, warnings } = randomizeWeek(
      { ...data.plan, slots: [{ day, recipeId: null, isLocked: false }] },
      pool,
      { ...data.rules, days: [day], counts, avoidSameCategoryInRow: false },
      data.history,
    )
    setWarnings(warnings)
    const picked = slots[0]?.recipeId
    if (picked) setSlot(day, { recipeId: picked })
  }

  const startNextWeek = () => {
    if (planned > 0 && !confirm('Siirretäänkö tämä viikko historiaan ja aloitetaan seuraava viikko tyhjänä?')) return
    update(d => ({
      ...d,
      history: planned > 0 ? [d.plan, ...d.history].slice(0, 12) : d.history,
      plan: emptyPlan(addWeeks(d.plan.weekStart, 1)),
      checked: [],
      extras: [],
    }))
    setWarnings([])
  }

  return (
    <section>
      <div className="section-head">
        <div>
          <h2>Viikko {formatWeek(data.plan.weekStart)}</h2>
          <p className="muted">
            {planned}/{data.plan.slots.length} päivää suunniteltu
          </p>
        </div>
      </div>

      <div className="actions">
        <button className="primary" onClick={randomizeAll}>
          🎲 Arvo viikko
        </button>
        <button onClick={onShopping} disabled={planned === 0}>
          🛒 Kauppalista
        </button>
        <button onClick={startNextWeek}>➡️ Seuraava viikko</button>
      </div>
      <p className="muted small">Arvonta noudattaa Säännöt-välilehden asetuksia. Lukitut 🔒 päivät pysyvät ennallaan.</p>

      {warnings.length > 0 && (
        <div className="notice" role="status">
          {warnings.map((w, i) => (
            <p key={i}>{w}</p>
          ))}
        </div>
      )}

      <ol className="days">
        {data.plan.slots.map(slot => {
          const recipe = slot.recipeId ? byId.get(slot.recipeId) : undefined
          const isPlannedDay = data.rules.days.includes(slot.day)
          return (
            <li key={slot.day} className={isPlannedDay ? 'day' : 'day is-off'}>
              <div className="day-name">
                {DAY_LABEL[slot.day]}
                {!isPlannedDay && <span className="muted small"> · ei arvota</span>}
              </div>
              {recipe ? (
                <button className="day-recipe" onClick={() => setViewing(recipe)}>
                  <span className="row-title">{recipe.name}</span>
                  <RecipeMeta recipe={recipe} />
                </button>
              ) : (
                <button className="day-recipe is-empty" onClick={() => setPicking(slot.day)}>
                  + Valitse ruoka
                </button>
              )}
              <div className="day-tools">
                <button
                  className={slot.isLocked ? 'icon is-active' : 'icon'}
                  onClick={() => setSlot(slot.day, { isLocked: !slot.isLocked })}
                  disabled={!recipe}
                  aria-label={slot.isLocked ? 'Avaa lukitus' : 'Lukitse'}
                  title={slot.isLocked ? 'Avaa lukitus' : 'Lukitse'}
                >
                  {slot.isLocked ? '🔒' : '🔓'}
                </button>
                <button className="icon" onClick={() => reroll(slot.day)} disabled={slot.isLocked} aria-label="Arvo uudelleen" title="Arvo uudelleen">
                  🎲
                </button>
                <button className="icon" onClick={() => setPicking(slot.day)} aria-label="Valitse itse" title="Valitse itse">
                  ✏️
                </button>
                <button
                  className="icon"
                  onClick={() => setSlot(slot.day, { recipeId: null, isLocked: false })}
                  disabled={!recipe}
                  aria-label="Tyhjennä"
                  title="Tyhjennä"
                >
                  ✕
                </button>
              </div>
            </li>
          )
        })}
      </ol>

      {picking && (
        <RecipePicker
          title={`Valitse ruoka: ${DAY_LABEL[picking]}`}
          recipes={data.recipes}
          usedIds={new Set(data.plan.slots.map(s => s.recipeId).filter((id): id is string => id !== null))}
          onClose={() => setPicking(null)}
          onPick={r => {
            setSlot(picking, { recipeId: r.id })
            setPicking(null)
          }}
        />
      )}

      {viewing && (
        <Modal title={viewing.name} onClose={() => setViewing(null)}>
          <RecipeDetails recipe={viewing} />
        </Modal>
      )}
    </section>
  )
}

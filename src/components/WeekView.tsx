import { useState } from 'react'

import { randomizeWeek } from '../lib/randomize'
import { addWeeks, emptyPlan } from '../lib/storage'
import { CATEGORIES, DAYS, DAY_GENITIVE, DAY_LABEL, resolveSlots } from '../lib/types'
import type { AppData, Day, PlanSlot } from '../lib/types'
import { newId } from '../state'
import type { Update } from '../state'
import { AiWeekPanel } from './AiWeekPanel'
import { ConfirmButton, Modal, RecipeDetails, RecipeMeta, RecipePicker, dayDate } from './common'
import { FridgePanel } from './FridgePanel'

export const WeekView = ({
  data,
  update,
  sample,
  onWriteRecipe,
}: {
  data: AppData
  update: Update
  sample: ClaudeSample | null
  onWriteRecipe: (name: string) => void
}) => {
  const [warnings, setWarnings] = useState<string[]>([])
  const [openDay, setOpenDay] = useState<Day | null>(null)
  const [picking, setPicking] = useState<Day | null>(null)
  const [panel, setPanel] = useState<'week' | 'fridge' | null>(null)

  const byId = new Map(data.recipes.map(r => [r.id, r]))
  const resolved = resolveSlots(data.plan.slots)
  const planned = resolved.filter(s => s.eatenRecipeId && byId.has(s.eatenRecipeId)).length
  const cookings = resolved.filter(s => !s.isLeftover && s.recipeId && byId.has(s.recipeId)).length
  const leftoverCount = planned - cookings

  const setSlot = (day: Day, patch: Partial<PlanSlot>) =>
    update(d => ({
      ...d,
      plan: { ...d.plan, slots: d.plan.slots.map(s => (s.day === day ? { ...s, ...patch } : s)) },
    }))

  const applyWeek = (slots: PlanSlot[]) =>
    update(d => ({
      ...d,
      checked: [],
      plan: { ...d.plan, slots: d.plan.slots.map(s => slots.find(n => n.day === s.day) ?? s) },
    }))

  const randomizeAll = () => {
    const { slots, warnings } = randomizeWeek(data.plan, data.recipes, data.rules, data.history)
    setWarnings(warnings)
    applyWeek(slots)
  }

  /**
   * Arpoo yhden päivän uudelleen saman tyypin ruoista, muut päivät ennallaan.
   * Tuplasatsipäivälle arvotaan ensisijaisesti ruoka, joka riittää kahdeksi päiväksi.
   */
  const reroll = (day: Day) => {
    const current = resolved.find(s => s.day === day)
    const category = current?.recipeId ? byId.get(current.recipeId)?.category : undefined
    const counts = Object.fromEntries(CATEGORIES.map(c => [c, category ? (c === category ? 1 : 0) : null])) as AppData['rules']['counts']
    const others = data.plan.slots.filter(s => s.day !== day).map(s => s.recipeId).filter(Boolean) as string[]
    const pool = data.recipes.filter(r => !others.includes(r.id) && r.id !== current?.recipeId)
    const batchPool = pool.filter(r => r.lastsTwoDays)
    const needsBatch = (current?.coversDays ?? 0) > 1 && batchPool.some(r => !category || r.category === category)
    const { slots, warnings } = randomizeWeek(
      { ...data.plan, slots: [{ day, recipeId: null, isLocked: false }] },
      needsBatch ? batchPool : pool,
      { ...data.rules, days: [day], counts, avoidSameCategoryInRow: false, leftoverDays: 0 },
      data.history,
    )
    setWarnings(warnings)
    const picked = slots[0]?.recipeId
    if (picked) setSlot(day, { recipeId: picked, isLeftover: false })
  }

  const startNextWeek = () => {
    update(d => ({
      ...d,
      history: planned > 0 ? [d.plan, ...d.history].slice(0, 12) : d.history,
      plan: emptyPlan(addWeeks(d.plan.weekStart, 1)),
      checked: [],
      extras: [],
      tidy: null,
    }))
    setWarnings([])
  }

  const addMissing = (items: string[]) =>
    update(d => {
      const have = new Set(d.extras.map(e => e.text.toLowerCase()))
      const extras = items.filter(t => !have.has(t.toLowerCase())).map(text => ({ id: newId(), text }))
      return extras.length ? { ...d, extras: [...d.extras, ...extras] } : d
    })

  const sheetSlot = openDay ? resolved.find(s => s.day === openDay) : undefined
  const sheetRecipe = sheetSlot?.eatenRecipeId ? byId.get(sheetSlot.eatenRecipeId) : undefined

  return (
    <section>
      <div className="block">
        <p className="lede">
          {planned === 0
            ? 'Viikko on tyhjä. Suunnittele se Clauden kanssa, arvo säännöillä tai napauta päivää ja valitse itse.'
            : `${planned}/7 päivää suunniteltu · ${cookings} kokkauskertaa${leftoverCount > 0 ? `, ${leftoverCount} tähdepäivää` : ''}`}
        </p>
        <div className="actions">
          {sample && (
            <button className="primary" onClick={() => setPanel('week')}>
              Suunnittele Clauden kanssa
            </button>
          )}
          <button className={sample ? undefined : 'primary'} onClick={randomizeAll}>
            Arvo viikko
          </button>
          {sample && <button onClick={() => setPanel('fridge')}>Mitä kaapista?</button>}
        </div>
      </div>

      {warnings.length > 0 && (
        <div className="notice" role="status">
          {warnings.map((w, i) => (
            <p key={i}>{w}</p>
          ))}
        </div>
      )}

      <ol className="days">
        {resolved.map((slot, index) => {
          const recipe = slot.eatenRecipeId ? byId.get(slot.eatenRecipeId) : undefined
          const isPlannedDay = data.rules.days.includes(slot.day)
          const cookLocked = data.plan.slots.find(s => s.day === slot.cookedOn)?.isLocked
          const classes = [
            'day',
            recipe ? `cat-${recipe.category}` : '',
            slot.isLeftover ? 'is-leftover' : '',
            isPlannedDay ? '' : 'is-off',
          ]
          return (
            <li key={slot.day}>
              <button className={classes.join(' ').trim()} onClick={() => setOpenDay(slot.day)}>
                <span className="when">
                  {DAY_LABEL[slot.day].slice(0, 2)}
                  <small>{dayDate(data.plan.weekStart, index)}</small>
                </span>
                <span className="what">
                  {slot.isLeftover && recipe && <span className="muted small">Tähteet: {DAY_GENITIVE[slot.cookedOn!]} ruoka</span>}
                  {recipe ? <span className="name">{recipe.name}</span> : <span className="empty">Valitse ruoka</span>}
                  {recipe && !slot.isLeftover && (
                    <span className="meta">
                      <RecipeMeta recipe={recipe} />
                      {slot.coversDays > 1 && <span className="tag accent">tuplasatsi</span>}
                      {cookLocked && <span className="tag">lukittu</span>}
                    </span>
                  )}
                  {!isPlannedDay && <span className="muted small">Ei arvota</span>}
                </span>
              </button>
            </li>
          )
        })}
      </ol>

      <div className="actions">
        <ConfirmButton
          label="Aloita seuraava viikko"
          confirmLabel="Vahvista: tämä viikko siirtyy historiaan"
          skip={planned === 0}
          onConfirm={startNextWeek}
        />
      </div>

      {openDay && sheetSlot && (
        <DaySheet
          day={openDay}
          dateText={dayDate(data.plan.weekStart, DAYS.indexOf(openDay))}
          recipeName={sheetRecipe?.name}
          details={sheetRecipe ? <RecipeDetails recipe={sheetRecipe} /> : null}
          isLeftover={Boolean(sheetSlot.isLeftover)}
          leftoverText={sheetSlot.isLeftover && sheetSlot.cookedOn ? `Tähteet: ${DAY_GENITIVE[sheetSlot.cookedOn]} ruoka` : null}
          canBeLeftover={Boolean(
            DAYS.indexOf(openDay) > 0 && resolved.find(s => s.day === DAYS[DAYS.indexOf(openDay) - 1])?.eatenRecipeId,
          )}
          isLocked={sheetSlot.isLocked}
          onClose={() => setOpenDay(null)}
          onPick={() => {
            setPicking(openDay)
            setOpenDay(null)
          }}
          onReroll={() => reroll(openDay)}
          onToggleLeftover={() =>
            setSlot(openDay, sheetSlot.isLeftover ? { isLeftover: false } : { isLeftover: true, recipeId: null, isLocked: false })
          }
          onToggleLock={() => setSlot(openDay, { isLocked: !sheetSlot.isLocked })}
          onClear={() => {
            setSlot(openDay, { recipeId: null, isLocked: false, isLeftover: false })
            setOpenDay(null)
          }}
        />
      )}

      {picking && (
        <RecipePicker
          title={`Valitse ruoka: ${DAY_LABEL[picking]}`}
          recipes={data.recipes}
          usedIds={new Set(data.plan.slots.map(s => s.recipeId).filter((id): id is string => id !== null))}
          onClose={() => setPicking(null)}
          onPick={r => {
            setSlot(picking, { recipeId: r.id, isLeftover: false })
            setPicking(null)
          }}
        />
      )}

      {panel === 'week' && sample && (
        <AiWeekPanel
          data={data}
          sample={sample}
          onClose={() => setPanel(null)}
          onApply={slots => {
            applyWeek(slots)
            setWarnings([])
            setPanel(null)
          }}
        />
      )}

      {panel === 'fridge' && sample && (
        <FridgePanel
          data={data}
          sample={sample}
          onClose={() => setPanel(null)}
          onAddToDay={(day, recipeId) => setSlot(day, { recipeId, isLeftover: false })}
          onAddMissing={addMissing}
          onWriteRecipe={name => {
            setPanel(null)
            onWriteRecipe(name)
          }}
        />
      )}
    </section>
  )
}

/** Päivän toiminnot alapaneelissa: resepti, vaihto, arvonta, tähteet, lukitus ja tyhjennys. */
const DaySheet = ({
  day,
  dateText,
  recipeName,
  details,
  isLeftover,
  leftoverText,
  canBeLeftover,
  isLocked,
  onClose,
  onPick,
  onReroll,
  onToggleLeftover,
  onToggleLock,
  onClear,
}: {
  day: Day
  dateText: string
  recipeName?: string
  details: React.ReactNode
  isLeftover: boolean
  leftoverText: string | null
  canBeLeftover: boolean
  isLocked: boolean
  onClose: () => void
  onPick: () => void
  onReroll: () => void
  onToggleLeftover: () => void
  onToggleLock: () => void
  onClear: () => void
}) => {
  const [showRecipe, setShowRecipe] = useState(false)

  return (
    <Modal title={`${DAY_LABEL[day]} ${dateText}`} onClose={onClose}>
      {leftoverText && <p className="muted small">{leftoverText}</p>}
      <h2>{recipeName ?? 'Ei ruokaa valittuna'}</h2>
      {details && showRecipe && details}
      <div className="sheet-actions">
        {details && <button onClick={() => setShowRecipe(v => !v)}>{showRecipe ? 'Piilota resepti' : 'Näytä resepti'}</button>}
        <button onClick={onPick}>{recipeName && !isLeftover ? 'Vaihda ruoka' : 'Valitse ruoka'}</button>
        {!isLeftover && (
          <button onClick={onReroll} disabled={isLocked}>
            Arvo uudelleen
          </button>
        )}
        {(isLeftover || canBeLeftover) && (
          <button onClick={onToggleLeftover}>{isLeftover ? 'Kokataan tänään uutta' : 'Tähteet edellisestä päivästä'}</button>
        )}
        {recipeName && !isLeftover && (
          <button onClick={onToggleLock}>{isLocked ? 'Avaa lukitus' : 'Lukitse (arvonta ei muuta)'}</button>
        )}
        {recipeName && (
          <button className="danger" onClick={onClear}>
            Tyhjennä päivä
          </button>
        )}
      </div>
    </Modal>
  )
}

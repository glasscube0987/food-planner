import { useEffect, useState } from 'react'

import { ClaudeImport } from './ClaudeImport'

import { randomMeals, searchMeals } from '../lib/mealdb'
import { formatIngredient, parseIngredientLines } from '../lib/parse'
import { CATEGORIES, CATEGORY_LABEL } from '../lib/types'
import type { AppData, Category, Recipe } from '../lib/types'
import { newId } from '../state'
import type { Update } from '../state'
import { ConfirmButton, Modal, RecipeDetails, RecipeMeta, useRecipeFilter } from './common'

export const RecipesView = ({ data, update }: { data: AppData; update: Update }) => {
  const { filtered, controls } = useRecipeFilter(data.recipes)
  const [open, setOpen] = useState<string | null>(null)
  const [editing, setEditing] = useState<{ recipe?: Recipe; title: string } | null>(null)
  const [importing, setImporting] = useState(false)
  const [asking, setAsking] = useState<'parse' | 'suggest' | null>(null)
  const sample = useSample()

  const counts = Object.fromEntries(CATEGORIES.map(c => [c, data.recipes.filter(r => r.category === c).length]))

  const saveRecipe = (recipe: Recipe) => {
    update(d => ({
      ...d,
      recipes: d.recipes.some(r => r.id === recipe.id)
        ? d.recipes.map(r => (r.id === recipe.id ? recipe : r))
        : [...d.recipes, recipe],
    }))
    setEditing(null)
  }

  const remove = (recipe: Recipe) => {
    update(d => ({
      ...d,
      recipes: d.recipes.filter(r => r.id !== recipe.id),
      plan: { ...d.plan, slots: d.plan.slots.map(s => (s.recipeId === recipe.id ? { ...s, recipeId: null, isLocked: false } : s)) },
    }))
  }

  return (
    <section>
      <div className="section-head">
        <div>
          <h2>Ruokapooli</h2>
          <p className="muted">
            {data.recipes.length} reseptiä · {CATEGORIES.map(c => `${CATEGORY_LABEL[c].toLowerCase()} ${counts[c]}`).join(' · ')}
          </p>
        </div>
      </div>

      <div className="actions">
        <button className="primary" onClick={() => setEditing({ title: 'Uusi oma resepti' })}>
          + Oma resepti
        </button>
        {sample && <button onClick={() => setAsking('parse')}>📋 Liitä resepti netistä</button>}
        {sample && <button onClick={() => setAsking('suggest')}>✨ Kysy Claudelta</button>}
        {!window.claude && <button onClick={() => setImporting(true)}>🌐 Hae TheMealDB:stä</button>}
      </div>

      {controls}

      <ul className="list">
        {filtered.map(r => (
          <li key={r.id} className="card">
            <button className="list-row" onClick={() => setOpen(open === r.id ? null : r.id)} aria-expanded={open === r.id}>
              <span className="row-title">{r.name}</span>
              <RecipeMeta recipe={r} />
            </button>
            {open === r.id && (
              <>
                <RecipeDetails recipe={r} />
                <div className="actions">
                  <button onClick={() => setEditing({ recipe: r, title: 'Muokkaa reseptiä' })}>Muokkaa</button>
                  <ConfirmButton className="danger" label="Poista" confirmLabel="Vahvista poisto" onConfirm={() => remove(r)} />
                </div>
              </>
            )}
          </li>
        ))}
        {filtered.length === 0 && <li className="muted">Ei osumia.</li>}
      </ul>

      {editing && (
        <RecipeForm
          initial={editing.recipe}
          title={editing.title}
          onCancel={() => setEditing(null)}
          onSave={saveRecipe}
        />
      )}

      {asking && sample && (
        <ClaudeImport
          mode={asking}
          sample={sample}
          onClose={() => setAsking(null)}
          onRecipe={recipe => {
            setAsking(null)
            setEditing({ recipe, title: 'Tarkista ja tallenna resepti' })
          }}
        />
      )}

      {importing && (
        <ImportDialog
          existing={new Set(data.recipes.map(r => r.id))}
          onClose={() => setImporting(false)}
          onAdd={recipe => update(d => ({ ...d, recipes: [...d.recipes, recipe] }))}
        />
      )}
    </section>
  )
}

/** Clauden kysymisominaisuus, kun sovellus on avattu claude.ai-artifaktina; muuten null. */
const useSample = () => {
  const [sample, setSample] = useState<ClaudeSample | null>(null)
  useEffect(() => {
    let isActive = true
    void window.claude?.use('sample').then(s => isActive && setSample(() => s))
    return () => {
      isActive = false
    }
  }, [])
  return sample
}

const RecipeForm = ({
  initial,
  title,
  onSave,
  onCancel,
}: {
  initial?: Recipe
  title: string
  onSave: (recipe: Recipe) => void
  onCancel: () => void
}) => {
  const [name, setName] = useState(initial?.name ?? '')
  const [category, setCategory] = useState<Category>(initial?.category ?? 'liha')
  const [minutes, setMinutes] = useState(initial?.minutes?.toString() ?? '')
  const [servings, setServings] = useState(initial?.servings.toString() ?? '4')
  const [tags, setTags] = useState(initial?.tags.join(', ') ?? '')
  const [lastsTwoDays, setLastsTwoDays] = useState(initial?.lastsTwoDays ?? false)
  const [ingredients, setIngredients] = useState(initial?.ingredients.map(formatIngredient).join('\n') ?? '')
  const [instructions, setInstructions] = useState(initial?.instructions ?? '')

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    const parsedMinutes = Number(minutes)
    onSave({
      id: initial?.id ?? `oma-${newId()}`,
      name: name.trim(),
      category,
      minutes: minutes.trim() && Number.isFinite(parsedMinutes) ? parsedMinutes : undefined,
      servings: Math.max(1, Number(servings) || 4),
      tags: tags.split(',').map(t => t.trim()).filter(Boolean),
      lastsTwoDays,
      ingredients: parseIngredientLines(ingredients),
      instructions: instructions.trim(),
      source: initial?.source ?? { name: 'Oma resepti' },
      isOwn: initial?.isOwn ?? true,
    })
  }

  return (
    <Modal title={title} onClose={onCancel}>
      <form className="form" onSubmit={submit}>
        <label>
          Nimi
          <input required value={name} onChange={e => setName(e.target.value)} placeholder="esim. Mummon lihakeitto" />
        </label>
        <fieldset>
          <legend>Tyyppi</legend>
          <div className="chips">
            {CATEGORIES.map(c => (
              <button type="button" key={c} className={category === c ? 'chip is-active' : 'chip'} onClick={() => setCategory(c)}>
                {CATEGORY_LABEL[c]}
              </button>
            ))}
          </div>
        </fieldset>
        <div className="row">
          <label>
            Valmistusaika (min)
            <input inputMode="numeric" value={minutes} onChange={e => setMinutes(e.target.value)} placeholder="30" />
          </label>
          <label>
            Annoksia
            <input inputMode="numeric" value={servings} onChange={e => setServings(e.target.value)} />
          </label>
        </div>
        <label className="inline">
          <input type="checkbox" checked={lastsTwoDays} onChange={e => setLastsTwoDays(e.target.checked)} />
          Riittää kahdeksi päiväksi (tuplasatsi, esim. keitot ja laatikot)
        </label>
        <label>
          Tunnisteet (pilkuilla eroteltuna)
          <input value={tags} onChange={e => setTags(e.target.value)} placeholder="nopea, arki, lasten suosikki" />
        </label>
        <label>
          Ainekset (yksi per rivi, määrä ensin)
          <textarea
            required
            rows={7}
            value={ingredients}
            onChange={e => setIngredients(e.target.value)}
            placeholder={'400 g jauheliha\n1 sipuli\n2 dl ruokakerma\nsuola'}
          />
        </label>
        <label>
          Ohje
          <textarea rows={5} value={instructions} onChange={e => setInstructions(e.target.value)} />
        </label>
        <div className="actions">
          <button type="submit" className="primary">
            Tallenna
          </button>
          <button type="button" onClick={onCancel}>
            Peruuta
          </button>
        </div>
      </form>
    </Modal>
  )
}

const ImportDialog = ({
  existing,
  onAdd,
  onClose,
}: {
  existing: Set<string>
  onAdd: (recipe: Recipe) => void
  onClose: () => void
}) => {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Recipe[]>([])
  const [added, setAdded] = useState<Set<string>>(new Set())
  const [status, setStatus] = useState<string | null>(null)
  const [open, setOpen] = useState<string | null>(null)

  const run = async (fetcher: () => Promise<Recipe[]>) => {
    setStatus('Haetaan…')
    try {
      const found = await fetcher()
      setResults(found)
      setStatus(found.length === 0 ? 'Ei osumia. Kokeile englanninkielistä hakusanaa, esim. "chicken" tai "soup".' : null)
    } catch {
      setStatus('Haku epäonnistui. Tarkista verkkoyhteys ja yritä uudelleen.')
    }
  }

  const setCategory = (id: string, category: Category) =>
    setResults(rs => rs.map(r => (r.id === id ? { ...r, category } : r)))

  return (
    <Modal title="Hae reseptejä avoimesta lähteestä" onClose={onClose}>
      <p className="muted small">
        Lähde: <a href="https://www.themealdb.com" target="_blank" rel="noreferrer">TheMealDB</a>, ilmainen avoin reseptitietokanta. Reseptit ovat englanniksi. Tarkista ruokatyyppi ennen lisäämistä.
      </p>
      <form
        className="filter"
        onSubmit={e => {
          e.preventDefault()
          if (query.trim()) void run(() => searchMeals(query))
        }}
      >
        <div className="row">
          <input type="search" value={query} onChange={e => setQuery(e.target.value)} placeholder="esim. chicken, salmon, pasta" />
          <button type="submit" className="primary">
            Hae
          </button>
        </div>
      </form>
      <div className="actions">
        <button onClick={() => void run(() => randomMeals(6))}>🎲 6 satunnaista</button>
      </div>
      {status && <p className="muted">{status}</p>}
      <ul className="list">
        {results.map(r => {
          const isIn = existing.has(r.id) || added.has(r.id)
          return (
            <li key={r.id} className="card">
              <button className="list-row" onClick={() => setOpen(open === r.id ? null : r.id)}>
                <span className="row-title">{r.name}</span>
                <span className="muted small">{r.ingredients.length} ainesta</span>
              </button>
              <div className="chips">
                {CATEGORIES.map(c => (
                  <button key={c} className={r.category === c ? 'chip is-active' : 'chip'} onClick={() => setCategory(r.id, c)} disabled={isIn}>
                    {CATEGORY_LABEL[c]}
                  </button>
                ))}
                <button
                  className="primary"
                  disabled={isIn}
                  onClick={() => {
                    onAdd(r)
                    setAdded(s => new Set(s).add(r.id))
                  }}
                >
                  {isIn ? '✓ Poolissa' : 'Lisää pooliin'}
                </button>
              </div>
              {open === r.id && <RecipeDetails recipe={r} />}
            </li>
          )
        })}
      </ul>
    </Modal>
  )
}

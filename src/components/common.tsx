import { useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'

import { formatIngredient } from '../lib/parse'
import { CATEGORIES, CATEGORY_LABEL } from '../lib/types'
import type { Category, Recipe } from '../lib/types'

export const CategoryBadge = ({ category }: { category: Category }) => (
  <span>
    <i className={`cat-dot cat-${category}`} aria-hidden="true" />
    {CATEGORY_LABEL[category]}
  </span>
)

export const RecipeMeta = ({ recipe }: { recipe: Recipe }) => (
  <span className="meta">
    <CategoryBadge category={recipe.category} />
    {recipe.minutes !== undefined && <span>{recipe.minutes} min</span>}
    {recipe.lastsTwoDays && <span>riittää 2 pv</span>}
    {recipe.isOwn && <span className="tag">oma</span>}
  </span>
)

/** Viikon päivämäärät otsikkoon, esim. "23.–29.11.2026". */
export const formatWeek = (weekStart: string) => {
  const [y, m, d] = weekStart.split('-').map(Number)
  const start = new Date(y!, m! - 1, d!)
  const end = new Date(y!, m! - 1, d! + 6)
  const startText = start.getMonth() === end.getMonth() ? `${start.getDate()}.` : `${start.getDate()}.${start.getMonth() + 1}.`
  return `${startText}–${end.getDate()}.${end.getMonth() + 1}.${end.getFullYear()}`
}

/** Viikonpäivän päivämäärä, esim. "24.11.". */
export const dayDate = (weekStart: string, index: number) => {
  const [y, m, d] = weekStart.split('-').map(Number)
  const date = new Date(y!, m! - 1, d! + index)
  return `${date.getDate()}.${date.getMonth() + 1}.`
}

export const RecipeDetails = ({ recipe }: { recipe: Recipe }) => (
  <div className="details">
    <p className="muted">
      {recipe.servings} annosta
      {recipe.tags.length > 0 && <> · {recipe.tags.join(', ')}</>}
    </p>
    <h3>Ainekset</h3>
    <ul>
      {recipe.ingredients.map((i, n) => (
        <li key={n}>{formatIngredient(i)}</li>
      ))}
    </ul>
    {recipe.instructions && (
      <>
        <h3>Ohje</h3>
        <p className="instructions">{recipe.instructions}</p>
      </>
    )}
    <p className="muted small">
      Lähde:{' '}
      {recipe.source.url ? (
        <a href={recipe.source.url} target="_blank" rel="noreferrer">
          {recipe.source.name}
        </a>
      ) : (
        recipe.source.name
      )}
    </p>
  </div>
)

export const Modal = ({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) => (
  <div className="modal-backdrop" onClick={onClose}>
    <div className="modal" role="dialog" aria-modal="true" aria-label={title} onClick={e => e.stopPropagation()}>
      <div className="modal-head">
        <h3>{title}</h3>
        <button className="ghost" onClick={onClose}>
          Sulje
        </button>
      </div>
      <div className="modal-body">{children}</div>
    </div>
  </div>
)

/** Hakukenttä ja tyyppisuodatin, joita resepti- ja valintanäkymät käyttävät. */
export const useRecipeFilter = (recipes: readonly Recipe[]) => {
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<Category | null>(null)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return recipes
      .filter(r => category === null || r.category === category)
      .filter(
        r =>
          !q ||
          r.name.toLowerCase().includes(q) ||
          r.tags.some(t => t.toLowerCase().includes(q)) ||
          r.ingredients.some(i => i.name.toLowerCase().includes(q)),
      )
      .sort((a, b) => a.name.localeCompare(b.name, 'fi'))
  }, [recipes, query, category])

  const controls = (
    <div className="filter">
      <input
        type="search"
        placeholder="Hae nimellä, aineksella tai tunnisteella"
        value={query}
        onChange={e => setQuery(e.target.value)}
      />
      <div className="chips">
        <button className={category === null ? 'chip is-active' : 'chip'} onClick={() => setCategory(null)}>
          Kaikki
        </button>
        {CATEGORIES.map(c => (
          <button key={c} className={category === c ? 'chip is-active' : 'chip'} onClick={() => setCategory(c)}>
            {CATEGORY_LABEL[c]}
          </button>
        ))}
      </div>
    </div>
  )

  return { filtered, controls }
}

export const RecipePicker = ({
  recipes,
  title,
  usedIds = new Set(),
  onPick,
  onClose,
}: {
  recipes: readonly Recipe[]
  title: string
  /** Ruoat, jotka ovat jo tällä viikolla; merkitään listaan. */
  usedIds?: ReadonlySet<string>
  onPick: (recipe: Recipe) => void
  onClose: () => void
}) => {
  const { filtered, controls } = useRecipeFilter(recipes)

  return (
    <Modal title={title} onClose={onClose}>
      {controls}
      <ul className="list">
        {filtered.map(r => (
          <li key={r.id}>
            <button className="list-row" onClick={() => onPick(r)}>
              <span className="row-title">{r.name}</span>
              <span className="meta">
                <RecipeMeta recipe={r} />
                {usedIds.has(r.id) && <span>· jo tällä viikolla</span>}
              </span>
            </button>
          </li>
        ))}
        {filtered.length === 0 && <li className="muted">Ei osumia.</li>}
      </ul>
    </Modal>
  )
}

/**
 * Painike, joka pyytää vahvistuksen toisella painalluksella. Selaimen confirm()-ikkunaa
 * ei käytetä, koska kaikki ympäristöt eivät näytä sitä.
 */
export const ConfirmButton = ({
  label,
  confirmLabel,
  onConfirm,
  className,
  skip = false,
}: {
  label: ReactNode
  confirmLabel: string
  onConfirm: () => void
  className?: string
  /** Kun tosi, toiminto tehdään heti ilman vahvistusta. */
  skip?: boolean
}) => {
  const [isArmed, setArmed] = useState(false)

  useEffect(() => {
    if (!isArmed) return
    const timer = setTimeout(() => setArmed(false), 4000)
    return () => clearTimeout(timer)
  }, [isArmed])

  return (
    <button
      className={[className, isArmed ? 'is-armed' : ''].filter(Boolean).join(' ')}
      onClick={() => {
        if (skip || isArmed) {
          setArmed(false)
          onConfirm()
        } else {
          setArmed(true)
        }
      }}
    >
      {isArmed ? confirmLabel : label}
    </button>
  )
}

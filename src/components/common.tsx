import { useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'

import { formatIngredient } from '../lib/parse'
import { CATEGORIES, CATEGORY_LABEL } from '../lib/types'
import type { Category, Recipe } from '../lib/types'

export const CategoryBadge = ({ category }: { category: Category }) => (
  <span className={`badge badge-${category}`}>{CATEGORY_LABEL[category]}</span>
)

export const RecipeMeta = ({ recipe }: { recipe: Recipe }) => (
  <span className="meta">
    <CategoryBadge category={recipe.category} />
    {recipe.minutes !== undefined && <span>⏱ {recipe.minutes} min</span>}
    {recipe.isOwn && <span>⭐ oma</span>}
  </span>
)

export const RecipeDetails = ({ recipe }: { recipe: Recipe }) => (
  <div className="details">
    <p className="muted">
      {recipe.servings} annosta
      {recipe.tags.length > 0 && <> · {recipe.tags.join(', ')}</>}
    </p>
    <h4>Ainekset</h4>
    <ul>
      {recipe.ingredients.map((i, n) => (
        <li key={n}>{formatIngredient(i)}</li>
      ))}
    </ul>
    {recipe.instructions && (
      <>
        <h4>Ohje</h4>
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
        <button className="ghost" onClick={onClose} aria-label="Sulje">
          ✕
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

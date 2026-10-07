import { useMemo, useState } from 'react'

import { buildShoppingList, shoppingText } from '../lib/shopping'
import type { ShoppingItem } from '../lib/shopping'
import type { AppData } from '../lib/types'
import { newId } from '../state'
import type { Update } from '../state'

export const ShoppingView = ({ data, update }: { data: AppData; update: Update }) => {
  const items = useMemo(() => buildShoppingList(data.plan, data.recipes, data.household), [data.plan, data.recipes, data.household])
  const [extra, setExtra] = useState('')
  const [copied, setCopied] = useState(false)
  const [showText, setShowText] = useState(false)
  const checked = new Set(data.checked)

  const toggle = (key: string) =>
    update(d => ({
      ...d,
      checked: d.checked.includes(key) ? d.checked.filter(k => k !== key) : [...d.checked, key],
    }))

  const toBuy = items.filter(i => !i.isPantry)
  const pantry = items.filter(i => i.isPantry)
  const open = items.filter(i => !checked.has(i.key))
  const openExtras = data.extras.filter(e => !checked.has(e.id))
  const text = shoppingText(open, openExtras.map(e => e.text))

  const share = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: 'Kauppalista', text })
        return
      } catch {
        // Peruttu jakaminen: kopioidaan leikepöydälle.
      }
    }
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Leikepöytä ei ole käytettävissä: näytetään lista valittavana tekstinä.
      setShowText(true)
    }
  }

  return (
    <section>
      <div className="section-head">
        <div>
          <h2>Kauppalista</h2>
          <p className="muted">
            {open.length + openExtras.length} ostettavaa · {checked.size > 0 ? `${data.checked.length} merkitty` : 'viikon ruokien ainekset'}
          </p>
        </div>
      </div>

      <div className="row household">
        <label>
          Ruokailijoita
          <input
            type="number"
            min={1}
            max={20}
            value={data.household}
            onChange={e => update(d => ({ ...d, household: Math.max(1, Number(e.target.value) || 1) }))}
          />
        </label>
        <p className="muted small">Määrät skaalataan reseptien annosmäärästä tähän.</p>
      </div>

      <div className="actions">
        <button className="primary" onClick={() => void share()} disabled={!text}>
          {copied ? '✓ Kopioitu' : '📤 Jaa / kopioi lista'}
        </button>
        <button onClick={() => update(d => ({ ...d, checked: [] }))} disabled={checked.size === 0}>
          Poista merkinnät
        </button>
      </div>

      {showText && (
        <textarea
          className="copy-text"
          readOnly
          rows={Math.min(12, text.split('\n').length + 1)}
          value={text}
          onFocus={e => e.target.select()}
          aria-label="Kauppalista tekstinä"
        />
      )}

      {items.length === 0 && data.extras.length === 0 && (
        <p className="muted">Lista on tyhjä. Valitse tai arvo ensin viikon ruoat Viikko-välilehdellä.</p>
      )}

      <ul className="shopping">
        {toBuy.map(item => (
          <ItemRow key={item.key} item={item} isChecked={checked.has(item.key)} onToggle={() => toggle(item.key)} />
        ))}
        {data.extras.map(e => (
          <li key={e.id} className={checked.has(e.id) ? 'is-checked' : undefined}>
            <label>
              <input type="checkbox" checked={checked.has(e.id)} onChange={() => toggle(e.id)} />
              <span className="item-name">{e.text}</span>
            </label>
            <button
              className="icon"
              aria-label={`Poista ${e.text}`}
              onClick={() => update(d => ({ ...d, extras: d.extras.filter(x => x.id !== e.id) }))}
            >
              ✕
            </button>
          </li>
        ))}
      </ul>

      {pantry.length > 0 && (
        <>
          <h3 className="group-title">Tarkista kaapista</h3>
          <ul className="shopping">
            {pantry.map(item => (
              <ItemRow key={item.key} item={item} isChecked={checked.has(item.key)} onToggle={() => toggle(item.key)} />
            ))}
          </ul>
        </>
      )}

      <form
        className="row"
        onSubmit={e => {
          e.preventDefault()
          const value = extra.trim()
          if (!value) return
          update(d => ({ ...d, extras: [...d.extras, { id: newId(), text: value }] }))
          setExtra('')
        }}
      >
        <input value={extra} onChange={e => setExtra(e.target.value)} placeholder="Lisää muu ostos, esim. maito, vessapaperi" />
        <button type="submit">Lisää</button>
      </form>
    </section>
  )
}

const ItemRow = ({ item, isChecked, onToggle }: { item: ShoppingItem; isChecked: boolean; onToggle: () => void }) => (
  <li className={isChecked ? 'is-checked' : undefined}>
    <label>
      <input type="checkbox" checked={isChecked} onChange={onToggle} />
      <span>
        <span className="item-name">{item.name}</span>
        {item.amount && <span className="item-amount"> {item.amount}</span>}
        <span className="muted small item-used"> {item.usedIn.join(', ')}</span>
      </span>
    </label>
  </li>
)

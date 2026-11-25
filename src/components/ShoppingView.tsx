import { useMemo, useState } from 'react'

import { parseTidy, tidyBasis, tidyPrompt } from '../lib/ai'
import { buildShoppingList, shoppingText } from '../lib/shopping'
import type { ShoppingItem } from '../lib/shopping'
import type { AppData, TidyItem } from '../lib/types'
import { useClaudeRequest } from '../lib/useSample'
import { newId } from '../state'
import type { Update } from '../state'

export const ShoppingView = ({ data, update, sample }: { data: AppData; update: Update; sample: ClaudeSample | null }) => {
  const items = useMemo(() => buildShoppingList(data.plan, data.recipes, data.household), [data.plan, data.recipes, data.household])
  const [extra, setExtra] = useState('')
  const [copied, setCopied] = useState(false)
  const [showText, setShowText] = useState(false)
  const { run, isBusy, error, cancel } = useClaudeRequest()
  const checked = new Set(data.checked)

  const toBuy = items.filter(i => !i.isPantry)
  const pantry = items.filter(i => i.isPantry)
  const basis = tidyBasis(toBuy)
  const tidy = data.tidy && data.tidy.basis === basis ? data.tidy : null
  const isStale = Boolean(data.tidy) && !tidy

  /** Merkitsee rivin avaimet: yhdistetyllä rivillä kaikki kerralla. */
  const setChecked = (keys: string[], isOn: boolean) =>
    update(d => ({
      ...d,
      checked: isOn ? [...new Set([...d.checked, ...keys])] : d.checked.filter(k => !keys.includes(k)),
    }))

  const arrange = async () => {
    const raw = await run(signal => sample!.json(tidyPrompt(toBuy), { signal }))
    if (raw !== undefined) update(d => ({ ...d, tidy: parseTidy(raw, toBuy) }))
  }

  const openExtras = data.extras.filter(e => !checked.has(e.id))
  const isOpen = (keys: string[]) => !keys.every(k => checked.has(k))
  const text = tidy
    ? [
        ...tidy.groups.flatMap(g => {
          const rows = g.items.filter(i => isOpen(i.keys)).map(i => `- ${i.name}${i.amount ? `: ${i.amount}` : ''}`)
          return rows.length ? [`${g.aisle}:`, ...rows] : []
        }),
        ...openExtras.map(e => `- ${e.text}`),
      ].join('\n')
    : shoppingText(
        toBuy.filter(i => !checked.has(i.key)),
        openExtras.map(e => e.text),
      )
  const openCount = (tidy ? tidy.groups.flatMap(g => g.items).filter(i => isOpen(i.keys)).length : toBuy.filter(i => !checked.has(i.key)).length) + openExtras.length

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

  const extrasList = data.extras.map(e => (
    <li key={e.id} className={checked.has(e.id) ? 'is-checked' : undefined}>
      <label>
        <input type="checkbox" checked={checked.has(e.id)} onChange={() => setChecked([e.id], !checked.has(e.id))} />
        <span className="item-name">{e.text}</span>
      </label>
      <button onClick={() => update(d => ({ ...d, extras: d.extras.filter(x => x.id !== e.id) }))}>Poista</button>
    </li>
  ))

  return (
    <section>
      <div className="block">
        <h2>Kauppalista</h2>
        <p className="lede">
          {openCount} ostettavaa{data.checked.length > 0 ? ` · ${data.checked.length} merkitty` : ''} · tähdepäivien ruoat tuplana
        </p>
        <div className="actions">
          <button className="primary" onClick={() => void share()} disabled={!text}>
            {copied ? 'Kopioitu' : 'Jaa tai kopioi'}
          </button>
          {sample && toBuy.length > 0 && !tidy && (
            <button onClick={() => void arrange()} disabled={isBusy}>
              {isBusy ? 'Claude järjestää…' : 'Järjestä osastoittain'}
            </button>
          )}
          {isBusy && <button onClick={cancel}>Keskeytä</button>}
          {tidy && <button onClick={() => update(d => ({ ...d, tidy: null }))}>Aakkosjärjestys</button>}
          <button onClick={() => update(d => ({ ...d, checked: [] }))} disabled={checked.size === 0}>
            Poista merkinnät
          </button>
        </div>
        {isStale && sample && <p className="muted small">Lista on muuttunut järjestämisen jälkeen. Järjestä se uudelleen.</p>}
        {error && <p className="notice">{error}</p>}
      </div>

      {showText && (
        <textarea
          id="shopping-text"
          className="copy-text"
          readOnly
          rows={Math.min(12, text.split('\n').length + 1)}
          value={text}
          onFocus={e => e.target.select()}
          aria-label="Kauppalista tekstinä"
        />
      )}

      {items.length === 0 && data.extras.length === 0 && (
        <p className="muted">Lista on tyhjä. Valitse ensin viikon ruoat Viikko-välilehdellä.</p>
      )}

      {tidy ? (
        <>
          {tidy.groups.map(g => (
            <div key={g.aisle} className="block">
              <h3>{g.aisle}</h3>
              <ul className="shopping">
                {g.items.map(item => (
                  <TidyRow
                    key={item.keys.join('|')}
                    item={item}
                    usedIn={[...new Set(item.keys.flatMap(k => toBuy.find(i => i.key === k)?.usedIn ?? []))]}
                    isChecked={!isOpen(item.keys)}
                    onToggle={() => setChecked(item.keys, isOpen(item.keys))}
                  />
                ))}
              </ul>
            </div>
          ))}
          {data.extras.length > 0 && (
            <div className="block">
              <h3>Muut ostokset</h3>
              <ul className="shopping">{extrasList}</ul>
            </div>
          )}
        </>
      ) : (
        (toBuy.length > 0 || data.extras.length > 0) && (
          <ul className="shopping">
            {toBuy.map(item => (
              <ItemRow key={item.key} item={item} isChecked={checked.has(item.key)} onToggle={() => setChecked([item.key], !checked.has(item.key))} />
            ))}
            {extrasList}
          </ul>
        )
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
        <input
          id="shopping-extra"
          value={extra}
          onChange={e => setExtra(e.target.value)}
          placeholder="Muu ostos, esim. vessapaperi"
          aria-label="Muu ostos"
        />
        <button type="submit">Lisää</button>
      </form>

      {pantry.length > 0 && (
        <div className="block">
          <h3>Tarkista kaapista</h3>
          <ul className="shopping">
            {pantry.map(item => (
              <ItemRow key={item.key} item={item} isChecked={checked.has(item.key)} onToggle={() => setChecked([item.key], !checked.has(item.key))} />
            ))}
          </ul>
        </div>
      )}

      <div className="row household">
        <label>
          Ruokailijoita
          <input
            id="household"
            type="number"
            min={1}
            max={20}
            value={data.household}
            onChange={e => update(d => ({ ...d, household: Math.max(1, Number(e.target.value) || 1) }))}
          />
        </label>
        <p className="muted small">Määrät skaalataan reseptien annosmäärästä tähän.</p>
      </div>
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
        <span className="muted small item-used">{item.usedIn.join(', ')}</span>
      </span>
    </label>
  </li>
)

const TidyRow = ({
  item,
  usedIn,
  isChecked,
  onToggle,
}: {
  item: TidyItem
  usedIn: string[]
  isChecked: boolean
  onToggle: () => void
}) => (
  <li className={isChecked ? 'is-checked' : undefined}>
    <label>
      <input type="checkbox" checked={isChecked} onChange={onToggle} />
      <span>
        <span className="item-name">{item.name}</span>
        {item.amount && <span className="item-amount"> {item.amount}</span>}
        <span className="muted small item-used">{usedIn.join(', ')}</span>
      </span>
    </label>
  </li>
)

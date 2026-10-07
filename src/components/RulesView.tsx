import { useRef, useState } from 'react'

import { DEFAULT_RULES, initialData, normalize } from '../lib/storage'
import { CATEGORIES, CATEGORY_LABEL, DAYS, DAY_LABEL } from '../lib/types'
import type { AppData, Rules } from '../lib/types'
import type { Update } from '../state'
import { ConfirmButton } from './common'

const splitTags = (text: string) => text.split(',').map(t => t.trim()).filter(Boolean)

export const RulesView = ({
  data,
  update,
  replace,
  isShared,
}: {
  data: AppData
  update: Update
  replace: (d: AppData) => void
  isShared: boolean
}) => {
  const rules = data.rules
  const setRules = (patch: Partial<Rules>) => update(d => ({ ...d, rules: { ...d.rules, ...patch } }))
  const fileInput = useRef<HTMLInputElement>(null)
  const [message, setMessage] = useState<string | null>(null)

  const total = CATEGORIES.reduce((sum, c) => sum + (rules.counts[c] ?? 0), 0)
  const allTags = [...new Set(data.recipes.flatMap(r => r.tags))].sort((a, b) => a.localeCompare(b, 'fi'))

  const exportData = async () => {
    const json = JSON.stringify(data, null, 2)
    const filename = `ruokalista-${new Date().toISOString().slice(0, 10)}.json`
    if (window.claude) {
      // Artifaktina sivu ei voi ladata tiedostoja itse; tallennus kysytään käyttäjältä.
      const downloads = await window.claude.use('downloads')
      if (!downloads) {
        setMessage('Tiedostoon vienti ei ole käytettävissä tässä näkymässä.')
        return
      }
      try {
        await downloads.save({ filename, data: json })
      } catch {
        setMessage('Tiedostoa ei tallennettu.')
      }
      return
    }
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }

  const importData = async (file: File) => {
    try {
      const imported = normalize(JSON.parse(await file.text()))
      replace(imported)
      setMessage(`Tuotu ${imported.recipes.length} reseptiä ja viikon suunnitelma.`)
    } catch {
      setMessage('Tiedostoa ei voitu lukea. Valitse sovelluksesta viety .json-tiedosto.')
    }
  }

  return (
    <section>
      <div className="section-head">
        <div>
          <h2>Arvonnan säännöt</h2>
          <p className="muted">Nämä ohjaavat Arvo viikko ‑painiketta. Itse valittuihin ruokiin säännöt eivät vaikuta.</p>
        </div>
      </div>

      <fieldset className="card">
        <legend>Suunniteltavat päivät</legend>
        <div className="chips">
          {DAYS.map(day => {
            const isOn = rules.days.includes(day)
            return (
              <button
                key={day}
                className={isOn ? 'chip is-active' : 'chip'}
                aria-pressed={isOn}
                onClick={() => setRules({ days: isOn ? rules.days.filter(d => d !== day) : DAYS.filter(d => d === day || rules.days.includes(d)) })}
              >
                {DAY_LABEL[day].slice(0, 2)}
              </button>
            )
          })}
        </div>
      </fieldset>

      <fieldset className="card">
        <legend>Ruokatyyppien määrät viikossa</legend>
        {CATEGORIES.map(c => {
          const value = rules.counts[c]
          return (
            <div key={c} className="count-row">
              <span className={`badge badge-${c}`}>{CATEGORY_LABEL[c]}</span>
              <div className="stepper">
                <button
                  aria-label={`Vähemmän ${CATEGORY_LABEL[c]}`}
                  onClick={() => setRules({ counts: { ...rules.counts, [c]: Math.max(0, (value ?? 0) - 1) } })}
                >
                  −
                </button>
                <span className="stepper-value">{value === null ? 'ei väliä' : value}</span>
                <button
                  aria-label={`Enemmän ${CATEGORY_LABEL[c]}`}
                  onClick={() => setRules({ counts: { ...rules.counts, [c]: (value ?? 0) + 1 } })}
                >
                  +
                </button>
              </div>
              <label className="inline">
                <input
                  type="checkbox"
                  checked={value === null}
                  onChange={e => setRules({ counts: { ...rules.counts, [c]: e.target.checked ? null : 0 } })}
                />
                ei väliä
              </label>
            </div>
          )
        })}
        <p className={total > rules.days.length ? 'warning small' : 'muted small'}>
          {total > rules.days.length
            ? `Määriä on yhteensä ${total}, mutta päiviä ${rules.days.length}. Vähennä määriä tai lisää päiviä.`
            : `Asetettuja yhteensä ${total}/${rules.days.length}. Loput päivät täytetään tyypeillä, joille on valittu "ei väliä".`}
        </p>
      </fieldset>

      <fieldset className="card">
        <legend>Tähdepäivät</legend>
        <div className="count-row">
          <span>Tähdepäiviä viikossa</span>
          <div className="stepper">
            <button aria-label="Vähemmän tähdepäiviä" onClick={() => setRules({ leftoverDays: Math.max(0, rules.leftoverDays - 1) })}>
              −
            </button>
            <span className="stepper-value">{rules.leftoverDays}</span>
            <button aria-label="Enemmän tähdepäiviä" onClick={() => setRules({ leftoverDays: Math.min(3, rules.leftoverDays + 1) })}>
              +
            </button>
          </div>
        </div>
        <p className="muted small">
          Tähdepäivänä syödään edellisen päivän ruokaa, joten sinä päivänä ei kokata. Edelliselle päivälle arvotaan ruoka, joka
          riittää kahdeksi päiväksi, ja kauppalista laskee sille tuplamäärät. Esimerkiksi 7 päivää ja 2 tähdepäivää = 5 kokkauskertaa.
        </p>
      </fieldset>

      <fieldset className="card">
        <legend>Muut säännöt</legend>
        <label>
          Arkipäivien (ma–pe) enimmäisvalmistusaika
          <select
            value={rules.weekdayMaxMinutes ?? ''}
            onChange={e => setRules({ weekdayMaxMinutes: e.target.value ? Number(e.target.value) : null })}
          >
            <option value="">ei rajaa</option>
            {[20, 30, 40, 60, 90].map(m => (
              <option key={m} value={m}>
                {m} min
              </option>
            ))}
          </select>
        </label>
        <label className="inline">
          <input
            type="checkbox"
            checked={rules.avoidSameCategoryInRow}
            onChange={e => setRules({ avoidSameCategoryInRow: e.target.checked })}
          />
          Vältä samaa tyyppiä peräkkäisinä päivinä
        </label>
        <label>
          Älä toista ruokia, jotka olivat listalla edellisinä viikkoina
          <select value={rules.noRepeatWeeks} onChange={e => setRules({ noRepeatWeeks: Number(e.target.value) })}>
            <option value={0}>saa toistua</option>
            {[1, 2, 3, 4].map(n => (
              <option key={n} value={n}>
                {n} viikko{n > 1 ? 'a' : ''}
              </option>
            ))}
          </select>
        </label>
        <TagField
          label="Älä arvo ruokia, joissa on tunniste"
          value={rules.excludeTags}
          suggestions={allTags}
          onChange={excludeTags => setRules({ excludeTags })}
        />
        <TagField
          label="Arvo vain ruokia, joissa on kaikki tunnisteet"
          value={rules.requireTags}
          suggestions={allTags}
          onChange={requireTags => setRules({ requireTags })}
        />
        <button onClick={() => setRules(DEFAULT_RULES)}>Palauta oletussäännöt</button>
      </fieldset>

      <fieldset className="card">
        <legend>Tiedot</legend>
        <p className="muted small">
          {isShared
            ? 'Tiedot tallentuvat yhteiseen listaan, jonka kaikki sivun muokkaajat näkevät. Vie ne tiedostoon varmuuskopioksi. Tiedostosta tuonti ja alkutilaan palautus muuttavat listan kaikilta.'
            : 'Tiedot tallentuvat tämän selaimen muistiin. Vie ne tiedostoon varmuuskopioksi tai siirtääksesi ne toiselle laitteelle.'}
        </p>
        <div className="actions">
          <button onClick={() => void exportData()}>⬇️ Vie tiedostoon</button>
          <button onClick={() => fileInput.current?.click()}>⬆️ Tuo tiedostosta</button>
          <ConfirmButton
            className="danger"
            label="Palauta alkutilaan"
            confirmLabel="Vahvista: omat reseptit ja suunnitelmat poistuvat"
            onConfirm={() => replace(initialData())}
          />
        </div>
        <input
          ref={fileInput}
          type="file"
          accept="application/json,.json"
          hidden
          onChange={e => {
            const file = e.target.files?.[0]
            if (file) void importData(file)
            e.target.value = ''
          }}
        />
        {message && <p className="notice">{message}</p>}
      </fieldset>
    </section>
  )
}

const TagField = ({
  label,
  value,
  suggestions,
  onChange,
}: {
  label: string
  value: string[]
  suggestions: string[]
  onChange: (tags: string[]) => void
}) => {
  const [text, setText] = useState(value.join(', '))

  return (
    <div className="tag-field">
      <label>
        {label}
        <input
          value={text}
          onChange={e => setText(e.target.value)}
          onBlur={() => onChange(splitTags(text))}
          placeholder="esim. tulinen, uuniruoka"
        />
      </label>
      <div className="chips small">
        {suggestions.map(tag => {
          const isOn = value.some(t => t.toLowerCase() === tag.toLowerCase())
          return (
            <button
              key={tag}
              className={isOn ? 'chip is-active' : 'chip'}
              onClick={() => {
                const next = isOn ? value.filter(t => t.toLowerCase() !== tag.toLowerCase()) : [...value, tag]
                onChange(next)
                setText(next.join(', '))
              }}
            >
              {tag}
            </button>
          )
        })}
      </div>
    </div>
  )
}

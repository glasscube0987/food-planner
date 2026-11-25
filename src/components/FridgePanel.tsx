import { useState } from 'react'

import { fridgePrompt, parseFridge } from '../lib/ai'
import type { FridgeIdea } from '../lib/ai'
import { DAYS, DAY_LABEL } from '../lib/types'
import type { AppData, Day } from '../lib/types'
import { useClaudeRequest } from '../lib/useSample'
import { Modal } from './common'
import { DictateButton } from './DictateButton'

/**
 * Jääkaappi-ideat: perhe kertoo, mitä kaapissa on, ja Claude ehdottaa ruokia, joilla
 * ainekset käytetään. Ruokapoolin ruoan voi lisätä päivälle, uudesta voi kirjoittaa
 * reseptin, ja puuttuvat ainekset voi lisätä kauppalistalle.
 */
export const FridgePanel = ({
  data,
  sample,
  onAddToDay,
  onAddMissing,
  onWriteRecipe,
  onClose,
}: {
  data: AppData
  sample: ClaudeSample
  onAddToDay: (day: Day, recipeId: string) => void
  onAddMissing: (items: string[]) => void
  onWriteRecipe: (name: string) => void
  onClose: () => void
}) => {
  const [text, setText] = useState('')
  const [ideas, setIdeas] = useState<FridgeIdea[] | null>(null)
  const [done, setDone] = useState<Record<string, string>>({})
  const { run, isBusy, error, cancel } = useClaudeRequest()
  const firstEmpty = data.plan.slots.find(s => !s.recipeId && !s.isLeftover)?.day ?? 'ma'
  const [targetDay, setTargetDay] = useState<Day>(firstEmpty)

  const ask = async () => {
    const raw = await run(signal => sample.json(fridgePrompt(text.trim(), data.recipes), { signal, cache: false }))
    if (raw === undefined) return
    setIdeas(parseFridge(raw, data.recipes))
    setDone({})
  }

  return (
    <Modal title="Mitä kaapista?" onClose={onClose}>
      <p className="lede">Kerro, mitä jääkaapissa ja kaapissa on käytettävänä. Claude ehdottaa ruokia, joilla ne saa käytettyä.</p>
      <textarea
        id="fridge-text"
        rows={3}
        value={text}
        onChange={e => setText(e.target.value)}
        placeholder="Esim. puoli pussia porkkanoita, kermaa, keitettyjä perunoita, kinkkua"
        aria-label="Mitä kaapissa on"
      />
      <div className="actions">
        <button className="primary" onClick={() => void ask()} disabled={isBusy || !text.trim()}>
          {isBusy ? 'Claude miettii…' : 'Ehdota ruokia'}
        </button>
        {isBusy ? <button onClick={cancel}>Keskeytä</button> : <DictateButton onText={f => setText(f)} />}
      </div>
      {error && <p className="notice">{error}</p>}

      {ideas && ideas.length === 0 && <p className="muted">Claude ei keksinyt ehdotuksia. Kokeile kuvata ainekset tarkemmin.</p>}
      {ideas && ideas.length > 0 && (
        <>
          <label>
            Lisää valittu ruoka päivälle
            <select id="fridge-day" value={targetDay} onChange={e => setTargetDay(e.target.value as Day)}>
              {DAYS.map(d => (
                <option key={d} value={d}>
                  {DAY_LABEL[d]}
                </option>
              ))}
            </select>
          </label>
          {ideas.map((idea, i) => {
            const key = `${i}-${idea.name}`
            return (
              <div key={key} className="idea">
                <span className="name">{idea.name}</span>
                {idea.why && <span className="muted small">{idea.why}</span>}
                {idea.uses.length > 0 && <span className="small">Käyttää: {idea.uses.join(', ')}</span>}
                {idea.missing.length > 0 && <span className="small warning">Puuttuu: {idea.missing.join(', ')}</span>}
                <div className="actions">
                  {idea.recipeId ? (
                    <button
                      className="primary"
                      onClick={() => {
                        onAddToDay(targetDay, idea.recipeId!)
                        setDone(d => ({ ...d, [key]: `Lisätty: ${DAY_LABEL[targetDay].toLowerCase()}` }))
                      }}
                    >
                      Lisää päivälle
                    </button>
                  ) : (
                    <button onClick={() => onWriteRecipe(idea.name)}>Kirjoita resepti</button>
                  )}
                  {idea.missing.length > 0 && (
                    <button
                      onClick={() => {
                        onAddMissing(idea.missing)
                        setDone(d => ({ ...d, [`${key}-m`]: 'Puuttuvat lisätty kauppalistaan' }))
                      }}
                    >
                      Puuttuvat kauppalistaan
                    </button>
                  )}
                </div>
                {(done[key] || done[`${key}-m`]) && (
                  <span className="muted small" role="status">
                    {[done[key], done[`${key}-m`]].filter(Boolean).join(' · ')}
                  </span>
                )}
              </div>
            )
          })}
        </>
      )}
    </Modal>
  )
}

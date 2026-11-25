import { useState } from 'react'

import { parseWeek, weekPrompt } from '../lib/ai'
import type { WeekProposal } from '../lib/ai'
import { DAY_GENITIVE, DAY_LABEL, resolveSlots } from '../lib/types'
import type { AppData, PlanSlot } from '../lib/types'
import { useClaudeRequest } from '../lib/useSample'
import { Modal } from './common'
import { DictateButton } from './DictateButton'

/**
 * Viikko toiveesta: perhe kertoo tilanteensa, Claude kokoaa viikon ruokapoolista
 * sääntöjen mukaan, ja ehdotus näytetään ennen käyttöönottoa.
 */
export const AiWeekPanel = ({
  data,
  sample,
  onApply,
  onClose,
}: {
  data: AppData
  sample: ClaudeSample
  onApply: (slots: PlanSlot[]) => void
  onClose: () => void
}) => {
  const [wish, setWish] = useState('')
  const [proposal, setProposal] = useState<WeekProposal | null>(null)
  const { run, isBusy, error, cancel } = useClaudeRequest()
  const ctx = { plan: data.plan, recipes: data.recipes, rules: data.rules, history: data.history }
  const byId = new Map(data.recipes.map(r => [r.id, r]))

  const ask = async () => {
    const raw = await run(signal => sample.json(weekPrompt(wish.trim(), ctx), { signal, cache: false }))
    if (raw !== undefined) setProposal(parseWeek(raw, ctx))
  }

  return (
    <Modal title="Suunnittele Clauden kanssa" onClose={onClose}>
      {!proposal ? (
        <>
          <p className="lede">
            Kerro viikon tilanne ja toiveet. Claude kokoaa päivälliset ruokapoolista Säännöt-välilehden asetusten mukaan, ja
            lukitut päivät pysyvät.
          </p>
          <textarea
            id="ai-week-wish"
            rows={4}
            value={wish}
            onChange={e => setWish(e.target.value)}
            placeholder="Esim. lapset kipeinä, nopeita ja mietoja ruokia, perjantaina tacot, keskiviikkona ei ehdi kokata."
            aria-label="Viikon toiveet"
          />
          <div className="actions">
            <button className="primary" onClick={() => void ask()} disabled={isBusy}>
              {isBusy ? 'Claude miettii…' : 'Suunnittele viikko'}
            </button>
            {isBusy ? <button onClick={cancel}>Keskeytä</button> : <DictateButton onText={f => setWish(f)} />}
          </div>
          {isBusy && <p className="muted small">Tämä kestää yleensä puolesta minuutista minuuttiin.</p>}
          {error && <p className="notice">{error}</p>}
        </>
      ) : (
        <>
          {proposal.reason && <p className="rule">{proposal.reason}</p>}
          <ul className="proposal">
            {resolveSlots(proposal.slots).map(s => {
              const recipe = s.eatenRecipeId ? byId.get(s.eatenRecipeId) : undefined
              return (
                <li key={s.day} className={recipe ? `cat-${recipe.category}` : undefined}>
                  <span className="when">{DAY_LABEL[s.day].slice(0, 2)}</span>
                  <span>
                    {s.isLeftover ? `Tähteet: ${DAY_GENITIVE[s.cookedOn!]} ruoka` : (recipe?.name ?? '–')}
                    {proposal.filledDays.includes(s.day) && !s.isLeftover && <span className="muted small"> · arvottu</span>}
                    {s.coversDays > 1 && <span className="muted small"> · tuplasatsi</span>}
                  </span>
                </li>
              )
            })}
          </ul>
          {proposal.filledDays.length > 0 && (
            <p className="muted small">"Arvottu" tarkoittaa, että sovellus täytti päivän itse, koska Clauden ehdotus ei sopinut sille.</p>
          )}
          {proposal.warnings.length > 0 && (
            <div className="notice">
              {proposal.warnings.map((w, i) => (
                <p key={i}>{w}</p>
              ))}
            </div>
          )}
          <div className="actions">
            <button className="primary" onClick={() => onApply(proposal.slots)}>
              Ota käyttöön
            </button>
            <button onClick={() => setProposal(null)}>Muokkaa toivetta</button>
          </div>
        </>
      )}
    </Modal>
  )
}

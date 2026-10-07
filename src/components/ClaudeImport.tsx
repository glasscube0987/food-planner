import { useRef, useState } from 'react'

import { parsePrompt, suggestPrompt, toRecipe } from '../lib/claudeRecipe'
import type { Recipe } from '../lib/types'
import { newId } from '../state'
import { Modal } from './common'

const ERRORS: Record<string, string> = {
  not_granted: 'Claude-avun käyttöä ei sallittu tälle sivulle.',
  rate_limited: 'Claude on hetken varattu tai käyttöraja on täynnä. Yritä hetken päästä uudelleen.',
  refused: 'Claude ei voinut käsitellä tätä tekstiä. Kokeile liittää pelkkä resepti.',
  prompt_too_large: 'Teksti on liian pitkä. Liitä vain reseptin osuus sivusta.',
  session_expired: 'Kirjaudu claude.ai-palveluun uudelleen ja yritä sitten.',
}

/**
 * Reseptin tuonti Clauden avulla: liitetty teksti mistä tahansa reseptisivusta
 * muunnetaan sovelluksen muotoon, tai Claude kirjoittaa reseptin toiveen pohjalta.
 * Tulos avataan aina tarkistettavaksi ennen tallennusta.
 */
export const ClaudeImport = ({
  mode,
  sample,
  onRecipe,
  onClose,
}: {
  mode: 'parse' | 'suggest'
  sample: ClaudeSample
  onRecipe: (recipe: Recipe) => void
  onClose: () => void
}) => {
  const [text, setText] = useState('')
  const [status, setStatus] = useState<string | null>(null)
  const [isBusy, setBusy] = useState(false)
  const abort = useRef<AbortController | null>(null)

  const run = async () => {
    const input = text.trim()
    if (!input) return
    abort.current = new AbortController()
    setBusy(true)
    setStatus('Claude käsittelee reseptiä… tämä voi kestää puoli minuuttia.')
    try {
      const raw = await sample.json(mode === 'parse' ? parsePrompt(input) : suggestPrompt(input), {
        signal: abort.current.signal,
        cache: mode === 'parse',
      })
      const recipe = toRecipe(raw, `oma-${newId()}`, mode === 'parse' ? 'Tuotu resepti' : 'Clauden ehdotus')
      if (recipe) onRecipe(recipe)
      else setStatus('Tekstistä ei löytynyt reseptiä, jossa olisi nimi ja ainekset. Tarkista liitetty teksti.')
    } catch (e) {
      const code = (e as { code?: string }).code ?? ''
      setStatus(code === 'cancelled' ? null : (ERRORS[code] ?? 'Tuonti epäonnistui. Yritä uudelleen.'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal title={mode === 'parse' ? 'Liitä resepti netistä' : 'Kysy reseptiä Claudelta'} onClose={onClose}>
      {mode === 'parse' ? (
        <p className="muted small">
          Avaa resepti millä tahansa sivustolla, valitse sivun teksti (tai pelkkä resepti) ja kopioi se tähän. Claude poimii
          ainekset ja ohjeen, kääntää tarvittaessa suomeksi ja päättelee ruokatyypin. Voit tarkistaa tuloksen ennen tallennusta.
        </p>
      ) : (
        <p className="muted small">
          Kirjoita ruoan nimi tai toive, esimerkiksi "karjalanpaisti", "nopea kasviskeitto lapsille" tai "jotain broilerista
          uunissa". Claude kirjoittaa reseptin, jonka voit tarkistaa ennen tallennusta.
        </p>
      )}
      <form
        className="form"
        onSubmit={e => {
          e.preventDefault()
          void run()
        }}
      >
        {mode === 'parse' ? (
          <textarea
            id="claude-import-text"
            rows={10}
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder={'Esim.\nPinaattikeitto\n4 annosta\n150 g pinaattia\n...'}
            aria-label="Reseptin teksti"
          />
        ) : (
          <input
            id="claude-import-wish"
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder="esim. karjalanpaisti"
            aria-label="Ruoan nimi tai toive"
          />
        )}
        <div className="actions">
          <button type="submit" className="primary" disabled={isBusy || !text.trim()}>
            {mode === 'parse' ? 'Tuo resepti' : 'Kirjoita resepti'}
          </button>
          {isBusy && (
            <button type="button" onClick={() => abort.current?.abort()}>
              Keskeytä
            </button>
          )}
        </div>
      </form>
      {status && <p className={isBusy ? 'muted' : 'notice'}>{status}</p>}
    </Modal>
  )
}

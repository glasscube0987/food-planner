import { useState } from 'react'

import { parsePrompt, suggestPrompt, toRecipe } from '../lib/claudeRecipe'
import { parseRecipeText } from '../lib/textRecipe'
import type { Recipe } from '../lib/types'
import { useClaudeRequest } from '../lib/useSample'
import { newId } from '../state'
import { Modal } from './common'
import { DictateButton } from './DictateButton'

/**
 * Reseptin tuonti: liitetty teksti mistä tahansa reseptisivusta muunnetaan
 * sovelluksen muotoon, tai Claude kirjoittaa reseptin toiveen pohjalta. Ilman
 * Claudea (sovellus omassa osoitteessaan) teksti tulkitaan sovelluksessa itse.
 * Tulos avataan aina tarkistettavaksi ennen tallennusta.
 */
export const ClaudeImport = ({
  mode,
  initialText = '',
  sample,
  onRecipe,
  onClose,
}: {
  mode: 'parse' | 'suggest'
  initialText?: string
  sample: ClaudeSample | null
  onRecipe: (recipe: Recipe) => void
  onClose: () => void
}) => {
  const [text, setText] = useState(initialText)
  const [status, setStatus] = useState<string | null>(null)
  const { run, isBusy, error, cancel } = useClaudeRequest()

  const submit = async () => {
    const input = text.trim()
    if (!input) return
    setStatus(null)
    if (!sample) {
      const recipe = parseRecipeText(input, `oma-${newId()}`)
      if (recipe) onRecipe(recipe)
      else setStatus('Tekstistä ei löytynyt aineksia. Tarkista, että mukana on ainesosaluettelo, jossa määrät ovat rivien alussa.')
      return
    }
    const raw = await run(signal =>
      sample.json(mode === 'parse' ? parsePrompt(input) : suggestPrompt(input), { signal, cache: mode === 'parse' }),
    )
    if (raw === undefined) return
    const recipe = toRecipe(raw, `oma-${newId()}`, mode === 'parse' ? 'Tuotu resepti' : 'Clauden ehdotus')
    if (recipe) onRecipe(recipe)
    else setStatus('Tekstistä ei löytynyt reseptiä, jossa olisi nimi ja ainekset. Tarkista liitetty teksti.')
  }

  return (
    <Modal title={mode === 'parse' ? 'Liitä resepti netistä' : 'Kysy reseptiä Claudelta'} onClose={onClose}>
      <p className="lede">
        {mode === 'suggest'
          ? 'Kirjoita ruoan nimi tai toive, esimerkiksi "karjalanpaisti" tai "nopea kasviskeitto lapsille". Claude kirjoittaa reseptin, jonka voit tarkistaa ennen tallennusta.'
          : sample
            ? 'Avaa resepti millä tahansa sivustolla, valitse sivun teksti ja kopioi se tähän. Claude poimii ainekset ja ohjeen, kääntää tarvittaessa suomeksi ja päättelee ruokatyypin.'
            : 'Avaa resepti millä tahansa sivustolla, valitse nimi, ainekset ja ohje ja kopioi ne tähän. Rivit, jotka alkavat määrällä (esim. "400 g jauhelihaa"), tulevat aineksiksi ja muu teksti ohjeeksi. Tarkista tulos ennen tallennusta.'}
      </p>
      <form
        className="form"
        onSubmit={e => {
          e.preventDefault()
          void submit()
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
            {isBusy ? 'Claude miettii…' : mode === 'parse' ? 'Tuo resepti' : 'Kirjoita resepti'}
          </button>
          {isBusy ? (
            <button type="button" onClick={cancel}>
              Keskeytä
            </button>
          ) : (
            mode === 'suggest' && <DictateButton onText={f => setText(f)} />
          )}
        </div>
      </form>
      {isBusy && <p className="muted small">Tämä kestää yleensä puolesta minuutista minuuttiin.</p>}
      {(error || status) && <p className="notice">{error ?? status}</p>}
    </Modal>
  )
}

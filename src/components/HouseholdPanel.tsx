import { useState } from 'react'

import { inviteLink, newHouseholdCode, parseCode } from '../lib/household'
import type { SharedKind, StorageMode } from '../state'
import { ConfirmButton } from './common'

/** Yhteisen listan tila ja ohjeet: luonti, kutsulinkki ja liittyminen. */
export const HouseholdPanel = ({
  mode,
  kind,
  code,
  canShare,
  onCreate,
  onJoin,
  onLeave,
}: {
  mode: StorageMode
  kind: SharedKind
  code: string | null
  canShare: boolean
  onCreate: (code: string) => void
  onJoin: (code: string) => void
  onLeave: () => void
}) => {
  const [joinText, setJoinText] = useState('')
  const [joinError, setJoinError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  if (kind === 'claude') {
    return (
      <>
        <p>
          Viikon suunnitelma, kauppalista, säännöt ja omat reseptit tallentuvat yhteisesti. Kaikki, joille tämä sivu on jaettu
          muokkausoikeuksin, näkevät muutokset heti omalla laitteellaan.
        </p>
        <h4>Näin jaat listan</h4>
        <ol className="steps">
          <li>Avaa tämän sivun Share-valikko.</li>
          <li>Kutsu henkilö sähköpostiosoitteella ja anna oikeudeksi Editor (muokkaaja).</li>
          <li>Hän avaa linkin ja kirjautuu claude.ai-tililleen.</li>
        </ol>
      </>
    )
  }

  if (!canShare) {
    return (
      <p>
        Tiedot tallentuvat vain tämän selaimen muistiin. Voit siirtää ne toiselle laitteelle Säännöt-välilehden Vie- ja
        Tuo-painikkeilla.
      </p>
    )
  }

  if (code) {
    const link = inviteLink(code, location.href)
    const share = async () => {
      if (navigator.share) {
        try {
          await navigator.share({ title: 'Ruokalista', text: 'Liity perheen ruokalistaan:', url: link })
          return
        } catch {
          // Jakaminen peruttiin: kopioidaan linkki.
        }
      }
      try {
        await navigator.clipboard.writeText(link)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      } catch {
        // Linkki näkyy alla valittavana tekstinä.
      }
    }

    return (
      <>
        <p>
          {mode === 'shared'
            ? 'Tämä puhelin on perheen yhteisessä listassa. Muutokset näkyvät kaikille listaan liittyneille heti.'
            : 'Yhdistetään perheen yhteiseen listaan…'}
        </p>
        <h4>Kutsu puoliso</h4>
        <ol className="steps">
          <li>Lähetä alla oleva linkki puolisolle, esimerkiksi WhatsAppissa tai tekstiviestillä.</li>
          <li>Puoliso avaa linkin puhelimellaan. Tunnuksia ei tarvita.</li>
          <li>Vinkki: lisää sivu kotivalikkoon selaimen jakovalikosta ("Lisää Koti-valikkoon").</li>
        </ol>
        <div className="actions">
          <button className="primary" onClick={() => void share()}>
            {copied ? '✓ Linkki kopioitu' : '📤 Jaa kutsulinkki'}
          </button>
        </div>
        <textarea
          id="invite-link"
          className="copy-text"
          readOnly
          rows={2}
          value={link}
          onFocus={e => e.target.select()}
          aria-label="Kutsulinkki"
        />
        <p className="muted small">
          Linkki on perheen avain listaan: kuka tahansa, jolla se on, voi lukea ja muokata listaa. Jaa se vain omalle perheelle.
        </p>
        <ConfirmButton
          className="danger"
          label="Irrota tämä puhelin listasta"
          confirmLabel="Vahvista: lista jää muille ennalleen"
          onConfirm={onLeave}
        />
      </>
    )
  }

  return (
    <>
      <p>
        Nyt tiedot ovat vain tässä puhelimessa. Yhteisen listan avulla sinä ja puoliso näette saman viikon, kauppalistan ja
        reseptit omilla puhelimillanne. Tunnuksia ei tarvita.
      </p>
      <h4>Aloita yhteinen lista</h4>
      <p className="muted small">Tämän puhelimen nykyinen suunnitelma ja omat reseptit siirtyvät yhteiseen listaan.</p>
      <div className="actions">
        <button className="primary" onClick={() => onCreate(newHouseholdCode())}>
          👥 Luo yhteinen lista
        </button>
      </div>
      <h4>Tai liity puolison listaan</h4>
      <p className="muted small">Avaa puolisolta saamasi kutsulinkki, tai liitä se tähän.</p>
      <form
        className="row"
        onSubmit={e => {
          e.preventDefault()
          const parsed = parseCode(joinText)
          if (parsed) onJoin(parsed)
          else setJoinError('Kutsulinkkiä ei tunnistettu. Liitä koko linkki sellaisenaan.')
        }}
      >
        <input
          id="join-code"
          value={joinText}
          onChange={e => {
            setJoinText(e.target.value)
            setJoinError(null)
          }}
          placeholder="Kutsulinkki"
          aria-label="Kutsulinkki"
        />
        <button type="submit">Liity</button>
      </form>
      {joinError && <p className="warning small">{joinError}</p>}
    </>
  )
}

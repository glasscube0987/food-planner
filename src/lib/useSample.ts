import { useEffect, useRef, useState } from 'react'

/**
 * Claude-artifaktin ominaisuus (esim. `sample`, `dictation`), kun sovellus on avattu
 * claude.ai:ssa ja katsojalla on siihen pääsy; muuten null, ja ominaisuuden
 * painikkeet piilotetaan.
 */
export const useCapability = <K extends keyof ClaudeCapabilities>(name: K): ClaudeCapabilities[K] | null => {
  const [value, setValue] = useState<ClaudeCapabilities[K] | null>(null)
  useEffect(() => {
    let isActive = true
    void window.claude
      ?.use(name)
      .then(v => isActive && setValue(() => v))
      .catch(() => undefined)
    return () => {
      isActive = false
    }
  }, [name])
  return value
}

export const useSample = () => useCapability('sample')

const ERRORS: Record<string, string> = {
  not_granted: 'Claude-avun käyttöä ei sallittu tälle sivulle.',
  rate_limited: 'Claude on hetken varattu tai käyttöraja on täynnä. Yritä hetken päästä uudelleen.',
  refused: 'Claude ei voinut käsitellä tätä pyyntöä. Muotoile se toisin.',
  prompt_too_large: 'Teksti on liian pitkä. Lyhennä sitä.',
  session_expired: 'Kirjaudu claude.ai-palveluun uudelleen ja yritä sitten.',
  invalid_json: 'Clauden vastaus jäi kesken. Yritä uudelleen.',
}

/** Clauden virhe käyttäjälle näytettävänä tekstinä, tai null kun käyttäjä keskeytti itse. */
export const sampleErrorText = (e: unknown): string | null => {
  const code = (e as { code?: string } | null)?.code ?? ''
  if (code === 'cancelled') return null
  return ERRORS[code] ?? 'Claude ei vastannut. Yritä uudelleen.'
}

/**
 * Yksi Claude-kysely kerrallaan: tila "miettii", keskeytys ja virheteksti.
 * `run` palauttaa vastauksen, tai undefined jos kysely keskeytettiin tai epäonnistui.
 */
export const useClaudeRequest = () => {
  const [isBusy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const abort = useRef<AbortController | null>(null)

  const run = async <T>(ask: (signal: AbortSignal) => Promise<T>): Promise<T | undefined> => {
    abort.current?.abort()
    const controller = new AbortController()
    abort.current = controller
    setBusy(true)
    setError(null)
    try {
      return await ask(controller.signal)
    } catch (e) {
      setError(sampleErrorText(e))
      return undefined
    } finally {
      if (abort.current === controller) setBusy(false)
    }
  }

  return { run, isBusy, error, setError, cancel: () => abort.current?.abort() }
}

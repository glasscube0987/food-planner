import { useEffect, useRef, useState } from 'react'

import { useCapability } from '../lib/useSample'

/**
 * Sanelupainike tekstikentän viereen. Näkyy vain, kun claude.ai tarjoaa sanelun
 * tälle katsojalle; muuten kenttään kirjoitetaan tai puhelimen näppäimistö sanelee.
 * Sanelu lisää valmiit lauseet kentän tekstin perään.
 */
export const DictateButton = ({ onText }: { onText: (append: (current: string) => string) => void }) => {
  const dictation = useCapability('dictation')
  const [state, setState] = useState<'idle' | 'starting' | 'listening' | 'finishing'>('idle')
  const [isDenied, setDenied] = useState(false)
  // Viimeisin takaisinkutsu talteen, jotta näkymän uudelleenpiirto ei katkaise sanelua.
  const onTextRef = useRef(onText)
  onTextRef.current = onText

  useEffect(() => {
    if (!dictation) return
    const offState = dictation.onState(e => setState(e.state))
    const offFinal = dictation.onFinal(({ text }) => {
      const words = text.trim()
      if (words) onTextRef.current(current => (current.trim() ? `${current.trimEnd()} ${words}` : words))
    })
    return () => {
      offState()
      offFinal()
      void dictation.stop().catch(() => undefined)
    }
  }, [dictation])

  if (!dictation || isDenied) return null
  const isOn = state !== 'idle'

  return (
    <button
      type="button"
      className={isOn ? 'mic is-on' : 'mic'}
      onClick={() => {
        if (isOn) {
          void dictation.stop().catch(() => undefined)
          return
        }
        dictation.start({ language: 'fi' }).catch((e: { code?: string }) => {
          if (e?.code === 'not_granted' || e?.code === 'unavailable') setDenied(true)
        })
      }}
    >
      {isOn ? 'Lopeta sanelu' : 'Sanele'}
    </button>
  )
}

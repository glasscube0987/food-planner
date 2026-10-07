import { useCallback, useEffect, useState } from 'react'

import { load, save } from './lib/storage'
import type { AppData } from './lib/types'

/** Sovelluksen koko tila, tallennettuna selaimen localStorageen jokaisen muutoksen jälkeen. */
export const useAppData = () => {
  const [data, setData] = useState<AppData>(load)

  useEffect(() => save(data), [data])

  const update = useCallback((fn: (d: AppData) => AppData) => setData(d => fn(d)), [])

  return [data, update, setData] as const
}

export type Update = (fn: (d: AppData) => AppData) => void

export const newId = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`

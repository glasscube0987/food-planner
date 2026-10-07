import { useCallback, useEffect, useRef, useState } from 'react'

import { PATHS, compose, diff } from './lib/sharedData'
import type { SharedParts, Write } from './lib/sharedData'
import { load, save } from './lib/storage'
import type { AppData, Recipe } from './lib/types'

/**
 * Missä tiedot ovat:
 * - `connecting`: yhteistä tallennusta haetaan vielä
 * - `shared`: yhteinen tallennus, sama suunnitelma kaikilla, joille sivu on jaettu
 * - `local`: vain tämän selaimen muisti (sovellus ei ole claude.ai-artifakti, tai ei kirjautunut)
 */
export type StorageMode = 'connecting' | 'shared' | 'local'

export type Update = (fn: (d: AppData) => AppData) => void

type Store = {
  db: ClaudeDb
  exists: Set<string>
  /** Yksi kirjoitus kerrallaan per dokumentti. */
  queues: Map<string, Promise<void>>
}

const runWrite = (store: Store, write: Write, onError: (message: string) => void) => {
  const previous = store.queues.get(write.path) ?? Promise.resolve()
  const next = previous
    .then(async () => {
      const ref = store.db.doc(write.path)
      if (write.op === 'delete') await ref.delete()
      else if (write.op === 'set') await ref.set(write.data)
      else if (store.exists.has(write.path)) await ref.update(write.data)
      else await ref.set(write.fallback)
    })
    .catch((e: ClaudeDbError) => {
      onError(
        e?.code === 'invalid_argument'
          ? 'Sinulla ei ole muokkausoikeutta tähän listaan. Pyydä listan omistajaa jakamaan se sinulle muokkaajana.'
          : e?.code === 'quota_exceeded'
            ? 'Yhteinen tallennustila on täynnä. Poista vanhoja reseptejä.'
            : 'Muutoksen tallentaminen epäonnistui. Tarkista verkkoyhteys.',
      )
    })
  store.queues.set(write.path, next)
}

/** Sovelluksen koko tila. Yhteinen tallennus, kun se on saatavilla, muuten selaimen muisti. */
export const useAppData = () => {
  const [data, setData] = useState<AppData>(load)
  const [mode, setMode] = useState<StorageMode>(() => (window.claude ? 'connecting' : 'local'))
  const [error, setError] = useState<string | null>(null)
  const dataRef = useRef(data)
  const storeRef = useRef<Store | null>(null)

  useEffect(() => {
    if (!window.claude) return
    let isActive = true
    const unsubscribes: ClaudeUnsubscribe[] = []

    void window.claude.use('db').then(db => {
      if (!isActive) return
      if (!db) {
        setMode('local')
        return
      }
      const store: Store = { db, exists: new Set(), queues: new Map() }
      const parts: SharedParts = { settings: null, week: null, shopping: null, recipes: new Map() }
      const pending = new Set<string>([PATHS.settings, PATHS.week, PATHS.shopping, PATHS.recipes])

      const publish = () => {
        if (pending.size > 0) return
        const next = compose(parts)
        dataRef.current = next
        setData(next)
        storeRef.current = store
        setMode('shared')
      }
      const fail = (e: ClaudeDbError) => {
        if (e.code === 'revoked') setError('Pääsy yhteiseen listaan päättyi.')
        else setError('Yhteys yhteiseen listaan katkesi. Lataa sivu uudelleen.')
      }

      const docs = [
        [PATHS.settings, 'settings'],
        [PATHS.week, 'week'],
        [PATHS.shopping, 'shopping'],
      ] as const
      for (const [path, key] of docs) {
        unsubscribes.push(
          db.doc(path).onSnapshot(snap => {
            if (snap.exists) store.exists.add(path)
            else store.exists.delete(path)
            ;(parts as Record<string, unknown>)[key] = snap.exists ? (snap.data() ?? null) : null
            pending.delete(path)
            publish()
          }, fail),
        )
      }
      unsubscribes.push(
        db.collection(PATHS.recipes).onSnapshot(snap => {
          parts.recipes = new Map(
            snap.docs.filter(d => d.exists).map(d => [d.id, { ...(d.data() as Recipe), id: d.id }]),
          )
          pending.delete(PATHS.recipes)
          publish()
        }, fail),
      )
    })

    return () => {
      isActive = false
      for (const u of unsubscribes) u()
    }
  }, [])

  useEffect(() => {
    if (mode === 'local') save(data)
  }, [data, mode])

  const update = useCallback<Update>(fn => {
    const prev = dataRef.current
    const next = fn(prev)
    if (next === prev) return
    dataRef.current = next
    setData(next)
    const store = storeRef.current
    if (store) for (const write of diff(prev, next)) runWrite(store, write, setError)
  }, [])

  const replace = useCallback((next: AppData) => update(() => next), [update])

  return { data, update, replace, mode, error, clearError: () => setError(null) }
}

export const newId = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`

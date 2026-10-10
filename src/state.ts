import { useCallback, useEffect, useRef, useState } from 'react'

import { firebaseConfig } from './firebaseConfig'
import { loadCode, saveCode, takeCodeFromUrl } from './lib/household'
import { PATHS, compose, diff } from './lib/sharedData'
import type { SharedParts, Write } from './lib/sharedData'
import { load, save } from './lib/storage'
import type { AppData, Recipe } from './lib/types'

/**
 * Missä tiedot ovat:
 * - `connecting`: yhteistä listaa haetaan vielä
 * - `shared`: yhteinen lista; claude.ai-artifaktina sivun oma tietokanta, muualla
 *   Firebase perhekoodilla
 * - `local`: vain tämän selaimen muisti
 */
export type StorageMode = 'connecting' | 'shared' | 'local'

/** Kumpi yhteinen tallennus on käytössä, tai null kun lista on vain tällä laitteella. */
export type SharedKind = 'claude' | 'firebase' | null

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
          ? 'Sinulla ei ole muokkausoikeutta tähän listaan.'
          : e?.code === 'quota_exceeded'
            ? 'Yhteinen tallennustila on täynnä. Poista vanhoja reseptejä.'
            : 'Muutoksen tallentaminen epäonnistui. Tarkista verkkoyhteys.',
      )
    })
  store.queues.set(write.path, next)
}

/** Avaa yhteisen tallennuksen, jos sellainen on saatavilla tässä ympäristössä. */
const connect = async (code: string | null): Promise<{ db: ClaudeDb; kind: SharedKind } | null> => {
  if (window.claude) {
    const db = await window.claude.use('db')
    return db ? { db, kind: 'claude' } : null
  }
  if (firebaseConfig && code) {
    // Firebase ladataan vasta, kun yhteinen lista on käytössä.
    const { openFirestore } = await import('./lib/firestoreDb')
    return { db: await openFirestore(firebaseConfig, code), kind: 'firebase' }
  }
  return null
}

/** Sovelluksen koko tila. Yhteinen lista, kun sellainen on käytössä, muuten selaimen muisti. */
export const useAppData = () => {
  const [data, setData] = useState<AppData>(load)
  const [code, setCode] = useState<string | null>(() => takeCodeFromUrl() ?? loadCode())
  const [mode, setMode] = useState<StorageMode>(() =>
    window.claude || (firebaseConfig && code) ? 'connecting' : 'local',
  )
  const [kind, setKind] = useState<SharedKind>(null)
  const [error, setError] = useState<string | null>(null)
  const dataRef = useRef(data)
  const storeRef = useRef<Store | null>(null)
  /** Tämän laitteen tiedot, jotka viedään juuri luotuun yhteiseen listaan. */
  const uploadRef = useRef<AppData | null>(null)

  useEffect(() => {
    let isActive = true
    const unsubscribes: ClaudeUnsubscribe[] = []
    storeRef.current = null

    connect(code)
      .then(connection => {
        if (!isActive) return
        if (!connection) {
          setKind(null)
          setMode('local')
          return
        }
        const { db } = connection
        const store: Store = { db, exists: new Set(), queues: new Map() }
        const parts: SharedParts = { settings: null, week: null, shopping: null, recipes: new Map() }
        const pending = new Set<string>([PATHS.settings, PATHS.week, PATHS.shopping, PATHS.recipes])

        const publish = () => {
          if (pending.size > 0) return
          let next = compose(parts)
          storeRef.current = store
          const upload = uploadRef.current
          if (upload) {
            uploadRef.current = null
            for (const write of diff(next, upload)) runWrite(store, write, setError)
            next = upload
          }
          dataRef.current = next
          setData(next)
          setKind(connection.kind)
          setMode('shared')
        }
        const fail = (e: ClaudeDbError) => {
          if (e.code === 'revoked') setError('Pääsy yhteiseen listaan päättyi.')
          else if (e.code === 'invalid_argument') setError('Yhteiseen listaan ei päästy. Tarkista perhekoodi.')
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
      .catch(() => {
        if (!isActive) return
        setError('Yhteiseen listaan ei saatu yhteyttä. Muutokset tallentuvat nyt vain tälle laitteelle.')
        setKind(null)
        setMode('local')
      })

    return () => {
      isActive = false
      for (const u of unsubscribes) u()
    }
  }, [code])

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

  /** Luo uuden yhteisen listan tämän laitteen tiedoista. */
  const createHousehold = useCallback((newCode: string) => {
    uploadRef.current = dataRef.current
    saveCode(newCode)
    setMode('connecting')
    setCode(newCode)
  }, [])

  /** Liittyy olemassa olevaan listaan; tämän laitteen omat tiedot jäävät talteen laitteelle. */
  const joinHousehold = useCallback((newCode: string) => {
    save(dataRef.current)
    uploadRef.current = null
    saveCode(newCode)
    setMode('connecting')
    setCode(newCode)
  }, [])

  /** Irrottaa tämän laitteen yhteisestä listasta; lista jää muille ennalleen. */
  const leaveHousehold = useCallback(() => {
    saveCode(null)
    setCode(null)
  }, [])

  return {
    data,
    update,
    replace,
    mode,
    kind,
    code,
    canShare: Boolean(firebaseConfig) && !window.claude,
    createHousehold,
    joinHousehold,
    leaveHousehold,
    error,
    clearError: () => setError(null),
  }
}

export const newId = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`

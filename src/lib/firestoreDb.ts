import { initializeApp } from 'firebase/app'
import { getAuth, signInAnonymously } from 'firebase/auth'
import {
  collection,
  deleteDoc,
  doc,
  initializeFirestore,
  onSnapshot,
  persistentLocalCache,
  setDoc,
} from 'firebase/firestore'

import type { FirebaseConfig } from '../firebaseConfig'

const opened = new Map<string, Promise<ClaudeDb>>()

/**
 * Firestore samalla rajapinnalla kuin claude.ai-artifaktin tietokanta, jotta
 * tallennuslogiikka (`sharedData.ts`, `state.ts`) on molemmille yhteinen.
 * Perheen tiedot ovat polussa `households/<perhekoodi>/…`.
 *
 * `update` on Firestoren `set(…, { merge: true })`: sisäkkäiset objektit
 * yhdistetään ja taulukot korvataan, kuten artifaktin `update` tekee. Se myös
 * luo puuttuvan dokumentin.
 */
export const openFirestore = (config: FirebaseConfig, code: string): Promise<ClaudeDb> => {
  // Firebase-sovelluksen voi alustaa vain kerran sivun elinaikana, joten avattu yhteys käytetään uudelleen.
  const existing = opened.get(code)
  if (existing) return existing
  const opening = open(config, code)
  opened.set(code, opening)
  opening.catch(() => opened.delete(code))
  return opening
}

/** Firestoren virhe samassa muodossa kuin artifaktin tietokannan virheet. */
const toDbError = (e: { code?: string; message?: string }): ClaudeDbError => ({
  code: e.code === 'permission-denied' ? 'invalid_argument' : e.code === 'resource-exhausted' ? 'quota_exceeded' : 'unavailable',
  message: e.message ?? '',
})

const rethrow = (e: { code?: string; message?: string }): never => {
  throw toDbError(e)
}

const open = async (config: FirebaseConfig, code: string): Promise<ClaudeDb> => {
  const app = initializeApp(config, `ruokalista-${code}`)
  await signInAnonymously(getAuth(app))
  // Paikallinen välimuisti: lista aukeaa ja toimii myös kaupassa huonolla yhteydellä.
  const db = initializeFirestore(app, { localCache: persistentLocalCache() })
  const root = `households/${code}`

  const docRef = (path: string): ClaudeDocRef => {
    const ref = doc(db, `${root}/${path}`)
    return {
      set: data => setDoc(ref, data).catch(rethrow),
      update: data => setDoc(ref, data, { merge: true }).catch(rethrow),
      delete: () => deleteDoc(ref).catch(rethrow),
      onSnapshot: (next, error) =>
        onSnapshot(
          ref,
          snap => next({ exists: snap.exists(), data: () => snap.data() }),
          e => error?.(toDbError(e)),
        ),
    }
  }

  return {
    doc: docRef,
    collection: path => ({
      doc: id => docRef(`${path}/${id}`),
      onSnapshot: (next, error) =>
        onSnapshot(
          collection(db, `${root}/${path}`),
          snap => next({ docs: snap.docs.map(d => ({ id: d.id, exists: true, data: () => d.data() })) }),
          e => error?.(toDbError(e)),
        ),
    }),
  }
}

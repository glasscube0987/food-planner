/**
 * Claude-artifact-sivun ajonaikaiset ominaisuudet, siltä osin kuin sovellus käyttää niitä.
 * Ne ovat käytössä vain, kun sovellus avataan claude.ai-artifaktina; muualla
 * `window.claude` puuttuu ja sovellus toimii pelkällä selaimen muistilla.
 */

type ClaudeDocSnapshot = { exists: boolean; data(): Record<string, unknown> | undefined }
type ClaudeQuerySnapshot = { docs: (ClaudeDocSnapshot & { id: string })[] }
type ClaudeDbError = { code: string; message: string }
type ClaudeUnsubscribe = () => void

type ClaudeDocRef = {
  set(data: Record<string, unknown>): Promise<void>
  update(data: Record<string, unknown>): Promise<void>
  delete(): Promise<void>
  onSnapshot(next: (snap: ClaudeDocSnapshot) => void, error?: (e: ClaudeDbError) => void): ClaudeUnsubscribe
}

type ClaudeDb = {
  doc(path: string): ClaudeDocRef
  collection(path: string): {
    doc(id: string): ClaudeDocRef
    onSnapshot(next: (snap: ClaudeQuerySnapshot) => void, error?: (e: ClaudeDbError) => void): ClaudeUnsubscribe
  }
}

type ClaudeSample = ((input: string, options?: { signal?: AbortSignal }) => Promise<{ text: string }>) & {
  json<T = unknown>(input: string, options?: { signal?: AbortSignal; cache?: boolean }): Promise<T>
}

type ClaudeDownloads = { save(request: { filename: string; data: string }): Promise<unknown> }

type ClaudeCapabilities = {
  db: ClaudeDb
  sample: ClaudeSample
  downloads: ClaudeDownloads
}

interface Window {
  claude?: { use<K extends keyof ClaudeCapabilities>(name: K): Promise<ClaudeCapabilities[K] | null> }
}

/**
 * Perhekoodi yhdistää saman perheen puhelimet samaan listaan ilman käyttäjätilejä.
 * Koodi on pitkä satunnainen merkkijono: sen tunteva pääsee listaan, joten se
 * jaetaan vain omalle perheelle.
 */

const KEY = 'ruokalista:perhekoodi'
const ALPHABET = 'abcdefghijkmnpqrstuvwxyz23456789'
const LENGTH = 24
const LINK_PREFIX = '#liity-'

export const isValidCode = (code: string): boolean => new RegExp(`^[${ALPHABET}]{${LENGTH}}$`).test(code)

export const newHouseholdCode = (): string => {
  const bytes = new Uint8Array(LENGTH)
  crypto.getRandomValues(bytes)
  return [...bytes].map(b => ALPHABET[b % ALPHABET.length]).join('')
}

/** Linkki, jonka avaamalla toinen puhelin liittyy listaan. */
export const inviteLink = (code: string, base: string): string => `${base.split('#')[0]}${LINK_PREFIX}${code}`

/** Poimii perhekoodin kutsulinkistä, osoitteen #-osasta tai pelkästä koodista. */
export const parseCode = (input: string): string | null => {
  const text = input.trim().toLowerCase()
  const fromLink = text.includes(LINK_PREFIX) ? text.slice(text.indexOf(LINK_PREFIX) + LINK_PREFIX.length) : text
  const code = fromLink.replace(/[^a-z0-9]/g, '')
  return isValidCode(code) ? code : null
}

export const loadCode = (): string | null => {
  try {
    const code = localStorage.getItem(KEY)
    return code && isValidCode(code) ? code : null
  } catch {
    return null
  }
}

export const saveCode = (code: string | null) => {
  try {
    if (code) localStorage.setItem(KEY, code)
    else localStorage.removeItem(KEY)
  } catch {
    // Ilman selaimen muistia koodi on voimassa vain tämän käynnin ajan.
  }
}

/**
 * Jos sivu avattiin kutsulinkillä, tallentaa koodin ja siivoaa sen osoiteriviltä,
 * jottei se jää selaimen historiaan näkyviin.
 */
export const takeCodeFromUrl = (): string | null => {
  if (!location.hash.startsWith(LINK_PREFIX)) return null
  const code = parseCode(location.hash)
  history.replaceState(null, '', location.pathname + location.search)
  if (code) saveCode(code)
  return code
}

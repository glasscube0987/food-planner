export type Progress = {
  /** Työkalukutsut tämän tehtävän aikana. */
  steps: number
  /** Epäonnistuneet työkalukutsut. */
  errors: number
  /** Mitä tehdään juuri nyt, tai null kun mikään työkalu ei ole käynnissä. */
  current: string | null
  /** Muokatut tiedostot (pelkät nimet), uusin viimeisenä. */
  files: string[]
  /** Onko tehtävä valmis. */
  isDone: boolean
}

declare module 'claude-code' {
  interface PluginState {
    'selkea-naytto': { isOn: boolean; progress: Progress | null }
  }
}

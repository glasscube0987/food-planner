import { useState } from 'react'

import { formatWeek } from './components/common'
import { HouseholdPanel } from './components/HouseholdPanel'
import { RecipesView } from './components/RecipesView'
import { RulesView } from './components/RulesView'
import { ShoppingView } from './components/ShoppingView'
import { WeekView } from './components/WeekView'
import { useSample } from './lib/useSample'
import { useAppData } from './state'

const TABS = [
  { id: 'week', label: 'Viikko' },
  { id: 'shopping', label: 'Kauppalista' },
  { id: 'recipes', label: 'Reseptit' },
  { id: 'rules', label: 'Säännöt' },
] as const

type Tab = (typeof TABS)[number]['id']

export const App = () => {
  const app = useAppData()
  const { data, update, replace, mode, error, clearError } = app
  const sample = useSample()
  const [tab, setTab] = useState<Tab>('week')
  /** Ruoka, jolle Claude kirjoittaa reseptin (jääkaappi-ideasta Reseptit-välilehdelle). */
  const [suggest, setSuggest] = useState<string | null>(null)

  return (
    <div className="app">
      <header className="app-header">
        <p className="eyebrow">Perheen ruokalista</p>
        <h1>Viikko {formatWeek(data.plan.weekStart)}</h1>
        <p className="stamp">
          {mode === 'shared'
            ? 'Yhteinen lista: muutokset näkyvät kaikille heti.'
            : mode === 'connecting'
              ? 'Haetaan yhteistä listaa…'
              : 'Tiedot ovat vain tällä laitteella.'}
        </p>
      </header>

      <nav className="tabs" aria-label="Näkymät">
        {TABS.map(t => (
          <button
            key={t.id}
            className={t.id === tab ? 'tab is-active' : 'tab'}
            aria-current={t.id === tab ? 'page' : undefined}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </nav>

      {error && (
        <div className="notice" role="alert">
          <p>{error}</p>
          <div className="actions">
            <button onClick={clearError}>Sulje ilmoitus</button>
          </div>
        </div>
      )}

      <main>
        {mode === 'connecting' ? (
          <p className="muted loading">Haetaan yhteistä ruokalistaa…</p>
        ) : (
          <>
            {tab === 'week' && (
              <WeekView
                data={data}
                update={update}
                sample={sample}
                onWriteRecipe={name => {
                  setSuggest(name)
                  setTab('recipes')
                }}
              />
            )}
            {tab === 'shopping' && <ShoppingView data={data} update={update} sample={sample} />}
            {tab === 'recipes' && (
              <RecipesView data={data} update={update} sample={sample} suggest={suggest} onSuggestShown={() => setSuggest(null)} />
            )}
            {tab === 'rules' && (
              <RulesView
                data={data}
                update={update}
                replace={replace}
                isShared={mode === 'shared'}
                family={
                  <HouseholdPanel
                    mode={mode}
                    kind={app.kind}
                    code={app.code}
                    canShare={app.canShare}
                    onCreate={app.createHousehold}
                    onJoin={app.joinHousehold}
                    onLeave={app.leaveHousehold}
                  />
                }
              />
            )}
          </>
        )}
      </main>
    </div>
  )
}

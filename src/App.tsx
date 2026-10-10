import { useState } from 'react'

import { Modal } from './components/common'
import { HouseholdPanel } from './components/HouseholdPanel'
import { RecipesView } from './components/RecipesView'
import { RulesView } from './components/RulesView'
import { ShoppingView } from './components/ShoppingView'
import { WeekView } from './components/WeekView'
import { useAppData } from './state'

const TABS = [
  { id: 'week', label: 'Viikko', icon: '📅' },
  { id: 'recipes', label: 'Reseptit', icon: '📖' },
  { id: 'shopping', label: 'Kauppalista', icon: '🛒' },
  { id: 'rules', label: 'Säännöt', icon: '⚙️' },
] as const

type Tab = (typeof TABS)[number]['id']

export const App = () => {
  const app = useAppData()
  const { data, update, replace, mode, error, clearError } = app
  const [tab, setTab] = useState<Tab>('week')
  const [showSharing, setShowSharing] = useState(false)

  return (
    <div className="app">
      <header className="app-header">
        <h1>🍲 Ruokalista</h1>
        <button className={`mode mode-${mode}`} onClick={() => setShowSharing(true)}>
          {mode === 'shared' ? '👥 Yhteinen lista' : mode === 'connecting' ? 'Yhdistetään…' : '📱 Vain tällä laitteella'}
        </button>
      </header>

      {error && (
        <div className="notice error-notice" role="alert">
          <p>{error}</p>
          <button className="ghost" onClick={clearError} aria-label="Sulje ilmoitus">
            ✕
          </button>
        </div>
      )}

      <main className="app-main">
        {mode === 'connecting' ? (
          <p className="muted loading">Haetaan yhteistä ruokalistaa…</p>
        ) : (
          <>
            {tab === 'week' && <WeekView data={data} update={update} onShopping={() => setTab('shopping')} />}
            {tab === 'recipes' && <RecipesView data={data} update={update} />}
            {tab === 'shopping' && <ShoppingView data={data} update={update} />}
            {tab === 'rules' && <RulesView data={data} update={update} replace={replace} isShared={mode === 'shared'} />}
          </>
        )}
      </main>

      <nav className="tabs" aria-label="Näkymät">
        {TABS.map(t => (
          <button
            key={t.id}
            className={t.id === tab ? 'tab is-active' : 'tab'}
            aria-current={t.id === tab ? 'page' : undefined}
            onClick={() => setTab(t.id)}
          >
            <span aria-hidden="true">{t.icon}</span>
            {t.label}
          </button>
        ))}
      </nav>

      {showSharing && (
        <Modal title={mode === 'shared' ? 'Yhteinen lista' : 'Perheen yhteinen lista'} onClose={() => setShowSharing(false)}>
          <HouseholdPanel
            mode={mode}
            kind={app.kind}
            code={app.code}
            canShare={app.canShare}
            onCreate={app.createHousehold}
            onJoin={app.joinHousehold}
            onLeave={app.leaveHousehold}
          />
        </Modal>
      )}
    </div>
  )
}

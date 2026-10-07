import { useState } from 'react'

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
  const [data, update, replace] = useAppData()
  const [tab, setTab] = useState<Tab>('week')

  return (
    <div className="app">
      <header className="app-header">
        <h1>🍲 Ruokalista</h1>
      </header>

      <main className="app-main">
        {tab === 'week' && <WeekView data={data} update={update} onShopping={() => setTab('shopping')} />}
        {tab === 'recipes' && <RecipesView data={data} update={update} />}
        {tab === 'shopping' && <ShoppingView data={data} update={update} />}
        {tab === 'rules' && <RulesView data={data} update={update} replace={replace} />}
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
    </div>
  )
}

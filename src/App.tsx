import { useState } from 'react'

import { Modal } from './components/common'
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
  const { data, update, replace, mode, error, clearError } = useAppData()
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
        <Modal title={mode === 'shared' ? 'Yhteinen lista' : 'Tiedot tällä laitteella'} onClose={() => setShowSharing(false)}>
          {mode === 'shared' ? (
            <>
              <p>
                Viikon suunnitelma, kauppalista, säännöt ja omat reseptit tallentuvat yhteisesti. Kaikki, joille tämä sivu on
                jaettu muokkausoikeuksin, näkevät muutokset heti omalla laitteellaan.
              </p>
              <h4>Näin jaat listan puolisolle</h4>
              <ol className="steps">
                <li>Avaa tämän sivun Share-valikko (jakopainike sivun yläreunassa).</li>
                <li>Kutsu puoliso sähköpostiosoitteella ja anna oikeudeksi Editor (muokkaaja).</li>
                <li>Puoliso avaa linkin omalla puhelimellaan ja kirjautuu claude.ai-tililleen.</li>
              </ol>
              <p className="muted small">
                Älä jaa sivua julkisella linkillä: silloin kutsutut muokkaajat eivät voi tallentaa muutoksia.
              </p>
            </>
          ) : (
            <p>
              Tiedot tallentuvat vain tämän selaimen muistiin. Yhteinen lista on käytössä, kun sovellus avataan claude.ai-linkistä
              kirjautuneena. Voit siirtää tiedot toiselle laitteelle Säännöt-välilehden Vie- ja Tuo-painikkeilla.
            </p>
          )}
        </Modal>
      )}
    </div>
  )
}

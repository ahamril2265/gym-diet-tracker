import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource/big-shoulders-display/latin-800'
import '@fontsource-variable/manrope/wght.css'
import './index.css'
import { App } from './app/App'
import { db } from './db/db'
import { initDb } from './db/init'
import { installRestAlarm } from './lib/restAlarm'
import { startReminderEngine } from './lib/reminderEngine'

const root = createRoot(document.getElementById('root')!)
installRestAlarm()

initDb(db)
  .then(() => {
    startReminderEngine()
    root.render(
      <StrictMode>
        <App />
      </StrictMode>,
    )
  })
  .catch((error: unknown) => {
    // IndexedDB can be unavailable (e.g. some private-browsing modes). Show a plain message.
    console.error(error)
    root.render(
      <div className="mx-auto max-w-app p-6 pt-16">
        <h1 className="h-display text-4xl">Storage unavailable</h1>
        <p className="mt-3 text-muted">
          This app keeps all your data on this device using browser storage, which isn't available right now. If
          you're in a private/incognito window, open the app in a normal window.
        </p>
      </div>,
    )
  })

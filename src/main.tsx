import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './theme/theme.css'
import './index.css'
import './theme/theme-bridge.css'
import './theme/perf.css'
import './screens/screens.css'
import './screens/screens-lms.css'
import './screens/screens-rules.css'
import './screens/screens-game.css'
import './screens/screens-game-table.css'
import './screens/screens-misc.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

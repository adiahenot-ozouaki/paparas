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
import './screens/screens-layout.css'
import './theme/p1-unified.css'
import './theme/p2-a11y.css'
import './theme/p3-polish.css'
import './theme/clean-layout.css'
import './theme/clean-bridge.css'
import './screens/freestyle-table.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

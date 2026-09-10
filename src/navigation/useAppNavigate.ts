import { useCallback } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import type { Screen } from '../types'
import { pathFor, screenFromPathname } from './paths'

export type AppNavigate = (screen: Screen) => void

/**
 * Drop-in replacement for the old App `navigate(screen)` helper.
 * Preserves auth returnTo behaviour via location state.
 */
export function useAppNavigate(): AppNavigate {
  const navigate = useNavigate()
  const location = useLocation()
  const active = screenFromPathname(location.pathname)

  return useCallback(
    (screen: Screen) => {
      if (screen === 'auth') {
        let returnTo: Screen = 'home'
        if (active === 'gameMode' || active === 'onlineLobby' || active === 'onlineGameTable') {
          returnTo = 'onlineLobby'
        } else if (active === 'profile') {
          returnTo = 'profile'
        }
        navigate(pathFor('auth'), { state: { returnTo } })
        return
      }
      navigate(pathFor(screen))
    },
    [navigate, active],
  )
}

export function useActiveScreen(): Screen {
  const location = useLocation()
  return screenFromPathname(location.pathname)
}

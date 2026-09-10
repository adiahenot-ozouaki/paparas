import type { ComponentType } from 'react'
import { useLocation } from 'react-router-dom'
import type { Screen } from '../types'
import { useAppNavigate } from './useAppNavigate'

type WithNavigate = { onNavigate: (s: Screen) => void }

/** Wrap a screen component so it receives onNavigate from React Router. */
export function screenPage<P extends WithNavigate>(Comp: ComponentType<P>) {
  function ScreenPage(props: Omit<P, 'onNavigate'>) {
    const onNavigate = useAppNavigate()
    return <Comp {...(props as P)} onNavigate={onNavigate} />
  }
  ScreenPage.displayName = `ScreenPage(${Comp.displayName ?? Comp.name ?? 'Screen'})`
  return ScreenPage
}

/** Auth needs returnTo from location.state. */
export function AuthPage({
  Comp,
}: {
  Comp: ComponentType<{ onNavigate: (s: Screen) => void; returnTo?: Screen }>
}) {
  const onNavigate = useAppNavigate()
  const location = useLocation()
  const returnTo = (location.state as { returnTo?: Screen } | null)?.returnTo ?? 'home'
  return <Comp onNavigate={onNavigate} returnTo={returnTo} />
}

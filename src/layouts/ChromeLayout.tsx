import { Outlet } from 'react-router-dom'
import BottomNav from '../components/BottomNav'
import SideNav from '../components/SideNav'
import TopBar from '../components/TopBar'
import { useActiveScreen, useAppNavigate } from '../navigation/useAppNavigate'

/** Shell with SideNav (desktop) + TopBar/BottomNav (mobile). */
export default function ChromeLayout() {
  const active = useActiveScreen()
  const onNavigate = useAppNavigate()

  return (
    <div className="app-layout app-layout--with-nav">
      <SideNav active={active} onNavigate={onNavigate} />
      <div className="app-main">
        <TopBar active={active} onNavigate={onNavigate} />
        <div className="anim-fade-in app-screen">
          <Outlet />
        </div>
        <BottomNav active={active} onNavigate={onNavigate} />
      </div>
    </div>
  )
}

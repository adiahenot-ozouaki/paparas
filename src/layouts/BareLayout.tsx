import { Outlet } from 'react-router-dom'

/** Full-bleed screens: splash, auth, end-game, freestyle. */
export default function BareLayout() {
  return (
    <div className="app-layout">
      <div className="app-main">
        <div className="anim-fade-in app-screen">
          <Outlet />
        </div>
      </div>
    </div>
  )
}

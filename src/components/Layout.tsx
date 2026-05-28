import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { Heart, MessageCircle, User, Compass, Swords } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useEffect, useState } from 'react'
import { wsClient } from '@/lib/ws'
import { useQueryClient } from '@tanstack/react-query'

export default function Layout() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [matchNotif, setMatchNotif] = useState(false)

  useEffect(() => {
    function handleNewMatch() {
      setMatchNotif(true)
      // Invalidate matches query so list refreshes
      queryClient.invalidateQueries({ queryKey: ['matches'] })
      // Auto-hide after 5s
      setTimeout(() => setMatchNotif(false), 5000)
    }

    wsClient.on('new_match', handleNewMatch)
    return () => { wsClient.off('new_match', handleNewMatch) }
  }, [queryClient])

  return (
    <div className="flex h-screen flex-col bg-gradient-soft">
      {/* Match notification banner */}
      {matchNotif && (
        <div
          className="animate-slide-up cursor-pointer bg-gradient-romantic px-4 py-3 text-center text-sm font-medium text-white shadow-md"
          onClick={() => { setMatchNotif(false); navigate('/matches') }}
        >
          💕 Bạn có match mới! Nhấn để xem
        </div>
      )}

      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
      <nav className="border-t border-border/50 bg-white/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-md justify-around py-2.5">
          <NavItem to="/discover" icon={<Compass size={22} />} label="Khám phá" />
          <NavItem to="/matches" icon={<Heart size={22} />} label="Matches" badge={matchNotif} />
          <NavItem to="/debate" icon={<Swords size={22} />} label="Debate" />
          <NavItem to="/matches" icon={<MessageCircle size={22} />} label="Chat" />
          <NavItem to="/profile" icon={<User size={22} />} label="Hồ sơ" />
        </div>
      </nav>
    </div>
  )
}

function NavItem({ to, icon, label, badge }: { to: string; icon: React.ReactNode; label: string; badge?: boolean }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        cn(
          'relative flex flex-col items-center gap-0.5 px-3 py-1 text-[11px] font-medium transition-all',
          isActive ? 'text-primary scale-105' : 'text-muted-foreground hover:text-foreground'
        )
      }
    >
      {icon}
      <span>{label}</span>
      {badge && (
        <span className="absolute -top-0.5 right-1 h-2.5 w-2.5 rounded-full bg-accent animate-pulse" />
      )}
    </NavLink>
  )
}

import { Outlet, NavLink } from 'react-router-dom'
import { Heart, MessageCircle, User, Compass, Swords } from 'lucide-react'
import { cn } from '@/lib/utils'

export default function Layout() {
  return (
    <div className="flex h-screen flex-col bg-gradient-soft">
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
      <nav className="border-t border-border/50 bg-white/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-md justify-around py-2.5">
          <NavItem to="/discover" icon={<Compass size={22} />} label="Khám phá" />
          <NavItem to="/matches" icon={<Heart size={22} />} label="Matches" />
          <NavItem to="/debate" icon={<Swords size={22} />} label="Debate" />
          <NavItem to="/matches" icon={<MessageCircle size={22} />} label="Chat" />
          <NavItem to="/profile" icon={<User size={22} />} label="Hồ sơ" />
        </div>
      </nav>
    </div>
  )
}

function NavItem({ to, icon, label }: { to: string; icon: React.ReactNode; label: string }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        cn(
          'flex flex-col items-center gap-0.5 px-3 py-1 text-[11px] font-medium transition-all',
          isActive ? 'text-primary scale-105' : 'text-muted-foreground hover:text-foreground'
        )
      }
    >
      {icon}
      <span>{label}</span>
    </NavLink>
  )
}

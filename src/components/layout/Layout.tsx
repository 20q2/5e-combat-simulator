import { Link, Outlet, useLocation } from 'react-router-dom'
import { cn } from '@/lib/utils'

const navItems = [
  { path: '/', label: 'Home' },
  { path: '/character', label: 'Character Creator' },
  { path: '/encounter', label: 'Encounter Setup' },
  { path: '/combat', label: 'Combat' },
  { path: '/map-builder', label: 'Map Builder' },
]

export function Layout() {
  const location = useLocation()

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4">
          <nav className="flex items-center h-16 gap-6">
            <Link to="/" className="flex items-center gap-2 text-xl font-bold">
              <img src={`${import.meta.env.BASE_URL}logo.png`} alt="Logo" className="h-8 w-8" />
              5e Combat Sim
            </Link>
            <div className="flex gap-4">
              {navItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={cn(
                    "text-sm font-medium transition-colors hover:text-primary",
                    location.pathname === item.path
                      ? "text-foreground"
                      : "text-muted-foreground"
                  )}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </nav>
        </div>
      </header>
      <main className={cn(
        location.pathname === '/combat'
          ? '' // Combat page uses full width, no padding
          : 'container mx-auto px-4 py-6'
      )}>
        <Outlet />
      </main>
    </div>
  )
}

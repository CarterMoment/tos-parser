import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useDarkMode } from '../lib/useDarkMode'
import { useAuth } from '../contexts/AuthContext'

// ── Icons ────────────────────────────────────────────────────────────────────

function HomeIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-full h-full">
      <path d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9.5z" />
      <polyline points="9 21 9 12 15 12 15 21" />
    </svg>
  )
}

function ClockIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-full h-full">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  )
}

function UserIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-full h-full">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  )
}

function GearIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-full h-full">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  )
}

function SunIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-full h-full">
      <circle cx="12" cy="12" r="5" />
      <line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" />
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
      <line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" />
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
    </svg>
  )
}

function MoonIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-full h-full">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  )
}

function ChevronLeftIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3">
      <polyline points="15 18 9 12 15 6" />
    </svg>
  )
}

function ChevronRightIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3">
      <polyline points="9 18 15 12 9 6" />
    </svg>
  )
}

function LogoMark() {
  return (
    <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center shrink-0">
      <span className="text-white font-black text-sm">T</span>
    </div>
  )
}

// ── Sidebar ───────────────────────────────────────────────────────────────────

export default function AppSidebar() {
  const location = useLocation()
  const { isDarkMode, toggleDarkMode } = useDarkMode()
  const { user, signOut } = useAuth()

  const [collapsed, setCollapsed] = useState(() => {
    return localStorage.getItem('sidebar_collapsed') === 'true'
  })
  const [showUserPopover, setShowUserPopover] = useState(false)

  const toggleCollapsed = () => {
    const next = !collapsed
    setCollapsed(next)
    localStorage.setItem('sidebar_collapsed', String(next))
  }

  const initials = user?.displayName
    ? user.displayName.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
    : user?.email?.[0]?.toUpperCase() ?? '?'

  const navLinks = [
    { to: '/app', label: 'Analyze', icon: <HomeIcon /> },
    { to: '/history', label: 'History', icon: <ClockIcon /> },
    { to: '/profile', label: 'Profile', icon: <UserIcon /> },
  ]

  return (
    <aside
      className={`hidden lg:flex flex-col h-full border-r border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 transition-all duration-200 relative shrink-0 ${collapsed ? 'w-16' : 'w-60'}`}
    >
      {/* Logo */}
      <div className="flex items-center h-14 px-4 border-b border-gray-200 dark:border-slate-700 shrink-0">
        <Link to="/" className="flex items-center gap-2.5 min-w-0">
          <LogoMark />
          {!collapsed && (
            <span className="font-bold text-gray-900 dark:text-white text-lg truncate">Termshift</span>
          )}
        </Link>
      </div>

      {/* Collapse toggle */}
      <button
        onClick={toggleCollapsed}
        className="absolute top-4 -right-3 z-10 w-6 h-6 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-full flex items-center justify-center shadow-sm hover:bg-gray-50 dark:hover:bg-slate-700 transition"
        title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {collapsed ? <ChevronRightIcon /> : <ChevronLeftIcon />}
      </button>

      {/* Nav links */}
      <nav className="flex flex-col gap-1 p-2 flex-1 min-h-0">
        {navLinks.map(link => {
          const active = location.pathname === link.to
          return (
            <Link
              key={link.to}
              to={link.to}
              title={collapsed ? link.label : undefined}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                active
                  ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800'
              }`}
            >
              <span className="w-5 h-5 shrink-0">{link.icon}</span>
              {!collapsed && <span>{link.label}</span>}
            </Link>
          )
        })}
      </nav>

      {/* Bottom section */}
      <div className="flex flex-col gap-1 p-2 border-t border-gray-200 dark:border-slate-700 shrink-0">
        {/* Dark mode toggle */}
        <button
          onClick={toggleDarkMode}
          title={collapsed ? (isDarkMode ? 'Light mode' : 'Dark mode') : undefined}
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
        >
          <span className="w-5 h-5 shrink-0">{isDarkMode ? <SunIcon /> : <MoonIcon />}</span>
          {!collapsed && <span>{isDarkMode ? 'Light mode' : 'Dark mode'}</span>}
        </button>

        {/* Settings */}
        <Link
          to="/settings"
          title={collapsed ? 'Settings' : undefined}
          className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
            location.pathname === '/settings'
              ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
              : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800'
          }`}
        >
          <span className="w-5 h-5 shrink-0"><GearIcon /></span>
          {!collapsed && <span>Settings</span>}
        </Link>

        {/* User identity widget */}
        <div className="relative">
          <button
            onClick={() => setShowUserPopover(v => !v)}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
          >
            <span className="w-8 h-8 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center shrink-0">
              {initials}
            </span>
            {!collapsed && (
              <div className="min-w-0 text-left">
                <div className="text-sm font-medium text-gray-900 dark:text-white truncate">
                  {user?.displayName ?? user?.email ?? ''}
                </div>
                {user?.displayName && (
                  <div className="text-xs text-gray-500 dark:text-gray-400 truncate">{user?.email ?? ''}</div>
                )}
              </div>
            )}
          </button>

          {showUserPopover && (
            <div className="absolute bottom-full left-0 mb-1 w-44 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl shadow-lg py-1 z-50">
              <Link
                to="/profile"
                onClick={() => setShowUserPopover(false)}
                className="flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700 transition"
              >
                Profile
              </Link>
              <button
                onClick={() => { signOut(); setShowUserPopover(false) }}
                className="w-full flex items-center px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-slate-700 transition"
              >
                Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </aside>
  )
}

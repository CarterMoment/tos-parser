import AppLayout from '../components/AppLayout'
import { useAuth } from '../contexts/AuthContext'

export default function ProfilePage() {
  const { user } = useAuth()

  const initials = user?.displayName
    ? user.displayName.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
    : user?.email?.[0]?.toUpperCase() ?? '?'

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto px-4 py-8">

        {/* Profile header */}
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6 mb-4 flex items-center gap-5">
          <div className="w-16 h-16 rounded-full bg-blue-600 text-white text-2xl font-bold flex items-center justify-center shrink-0">
            {initials}
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">
              {user?.displayName ?? 'User'}
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">{user?.email ?? ''}</p>
          </div>
        </div>

        {/* Subscription */}
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6 mb-4">
          <h2 className="font-semibold text-gray-900 dark:text-white mb-3">Subscription</h2>
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
              Free Plan
            </span>
            <button className="text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition">
              Upgrade to Pro →
            </button>
          </div>
        </div>

        {/* Usage */}
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
          <h2 className="font-semibold text-gray-900 dark:text-white mb-3">Usage</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">0 / 10 scans this month</p>
          <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-2">
            <div className="bg-blue-600 h-2 rounded-full" style={{ width: '0%' }} />
          </div>
        </div>

      </div>
    </AppLayout>
  )
}

'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut } from 'next-auth/react'
import { 
  LayoutDashboard, 
  Map as MapIcon, 
  Search, 
  BarChart2, 
  Users, 
  Settings,
  LogOut,
  Route,
  GitCompare,
  Building2
} from 'lucide-react'
import styles from './Sidebar.module.css'

const navItems = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Overview' },
  { href: '/dashboard/roads', icon: Route, label: 'Roads' },
  { href: '/dashboard/map', icon: MapIcon, label: 'Map View' },
  { href: '/dashboard/inspections', icon: Search, label: 'Inspections' },
  { href: '/dashboard/compare', icon: GitCompare, label: 'Compare' },
  { href: '/dashboard/contractors', icon: Building2, label: 'Contractors' },
  { href: '/dashboard/analytics', icon: BarChart2, label: 'Analytics' },
]

const adminItems = [
  { href: '/dashboard/admin/users', icon: Users, label: 'Users' },
  { href: '/dashboard/admin/settings', icon: Settings, label: 'Settings' },
]

interface SidebarProps {
  userRole?: string
  userName?: string
}

export default function Sidebar({ userRole, userName }: SidebarProps) {
  const pathname = usePathname()

  return (
    <aside className={styles.sidebar}>
      {/* Logo */}
      <div className={styles.logo}>
        <div className={styles.logoTitle}>RoadIQ</div>
      </div>

      {/* Nav */}
      <nav className={styles.nav}>
        <div className={styles.navSection}>
          <span className={styles.navSectionLabel}>Navigation</span>
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href))
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`${styles.navItem} ${isActive ? styles.active : ''}`}
              >
                <Icon size={18} className={styles.navIcon} />
                <span>{item.label}</span>
              </Link>
            )
          })}
        </div>

        {userRole === 'ADMIN' && (
          <div className={styles.navSection}>
            <span className={styles.navSectionLabel}>Administration</span>
            {adminItems.map((item) => {
              const Icon = item.icon
              const isActive = pathname.startsWith(item.href)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`${styles.navItem} ${isActive ? styles.active : ''}`}
                >
                  <Icon size={18} className={styles.navIcon} />
                  <span>{item.label}</span>
                </Link>
              )
            })}
          </div>
        )}
      </nav>

      {/* User Footer */}
      <div className={styles.userSection}>
        <div className={styles.userInfo}>
          <div className={styles.userName}>{userName || 'User'}</div>
          <div className={styles.userRole}>{userRole || 'Viewer'}</div>
        </div>
        <button
          className={styles.logoutBtn}
          onClick={() => signOut({ callbackUrl: '/login' })}
          title="Sign out"
        >
          <LogOut size={16} />
        </button>
      </div>
    </aside>
  )
}

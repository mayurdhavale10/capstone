'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ChevronRight, Circle } from 'lucide-react'
import styles from './Header.module.css'

interface HeaderProps {
  title?: string
}

const breadcrumbMap: Record<string, string> = {
  dashboard: 'Overview',
  roads: 'Road Network',
  map: 'Map View',
  inspections: 'Inspections',
  compare: 'Compare Roads',
  analytics: 'Analytics',
  admin: 'Administration',
}

export default function Header({ title }: HeaderProps) {
  const pathname = usePathname()
  const segments = pathname.split('/').filter(Boolean)

  return (
    <header className={styles.header}>
      <div className={styles.breadcrumb}>
        {segments.map((seg, i) => {
          const isLast = i === segments.length - 1
          const label = breadcrumbMap[seg] || seg.charAt(0).toUpperCase() + seg.slice(1)
          return (
            <span key={i} className={styles.breadcrumbItem}>
              {i > 0 && <ChevronRight size={14} className={styles.breadcrumbSep} />}
              {isLast ? (
                <span className={styles.breadcrumbCurrent}>{title || label}</span>
              ) : (
                <Link href={`/${segments.slice(0, i + 1).join('/')}`} className={styles.breadcrumbLink}>
                  {label}
                </Link>
              )}
            </span>
          )
        })}
      </div>

      <div className={styles.actions}>
        <Circle size={8} fill="var(--accent-green)" color="var(--accent-green)" />
        <span className={styles.statusText}>System Online</span>
      </div>
    </header>
  )
}

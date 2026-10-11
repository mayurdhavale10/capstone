import { type ClassValue } from 'clsx'

export function cn(...inputs: ClassValue[]) {
  return inputs
    .flat()
    .filter(Boolean)
    .join(' ')
}

export function getStatusColor(status: string): string {
  const map: Record<string, string> = {
    GOOD: 'var(--accent-green)',
    FAIR: 'var(--accent-yellow)',
    POOR: 'var(--accent-orange)',
    CRITICAL: 'var(--accent-red)',
  }
  return map[status] || 'var(--text-secondary)'
}

export function getStatusBg(status: string): string {
  const map: Record<string, string> = {
    GOOD: 'rgba(16,185,129,0.15)',
    FAIR: 'rgba(245,158,11,0.15)',
    POOR: 'rgba(249,115,22,0.15)',
    CRITICAL: 'rgba(239,68,68,0.15)',
  }
  return map[status] || 'rgba(156,163,175,0.15)'
}

export { scoreToStatus as healthScoreToStatus } from './scoring'

export function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount)
}

export function getHealthGrade(score: number): string {
  if (score >= 85) return 'A'
  if (score >= 70) return 'B'
  if (score >= 55) return 'C'
  if (score >= 40) return 'D'
  return 'F'
}

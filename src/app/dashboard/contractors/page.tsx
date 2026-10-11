'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { 
  Building2, 
  ShieldAlert, 
  ShieldCheck, 
  AlertTriangle, 
  ChevronDown, 
  ChevronUp, 
  FileText, 
  DollarSign,
  TrendingDown,
  ArrowRight
} from 'lucide-react'
import { formatCurrency, formatDate, getStatusColor, getStatusBg } from '@/lib/utils'
import { warrantyStatus } from '@/lib/scoring'
import styles from './contractors.module.css'

interface ContractorGroup {
  name: string
  roads: any[]
  totalCost: number
  avgHealth: number
  criticalCount: number
  poorCount: number
  liableCount: number
  activeWarrantyCount: number
  rating: 'A' | 'B' | 'C' | 'D'
}

export default function ContractorsPage() {
  const [roads, setRoads] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedContractor, setExpandedContractor] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/roads?includeInspections=true')
      .then(res => res.json())
      .then(data => {
        setRoads(Array.isArray(data) ? data : [])
        setLoading(false)
      })
      .catch(err => {
        console.error('Failed to load contractor data:', err)
        setLoading(false)
      })
  }, [])

  // Aggregate roads by contractor
  const contractorMap: Record<string, any[]> = {}
  roads.forEach(road => {
    const cName = road.contractorName || 'Unassigned / Municipal Direct'
    if (!contractorMap[cName]) contractorMap[cName] = []
    contractorMap[cName].push(road)
  })

  const contractorGroups: ContractorGroup[] = Object.entries(contractorMap).map(([name, cRoads]) => {
    const totalCost = cRoads.reduce((sum, r) => sum + (r.contractCost || 0), 0)
    const avgHealth = Math.round(cRoads.reduce((sum, r) => sum + r.healthScore, 0) / cRoads.length)
    const criticalCount = cRoads.filter(r => r.status === 'CRITICAL').length
    const poorCount = cRoads.filter(r => r.status === 'POOR').length

    let liableCount = 0
    let activeWarrantyCount = 0

    cRoads.forEach(r => {
      const w = warrantyStatus(r)
      if (w?.contractorLiable) liableCount++
      if (w?.active) activeWarrantyCount++
    })

    let rating: 'A' | 'B' | 'C' | 'D' = 'B'
    if (liableCount > 0) rating = 'D'
    else if (avgHealth >= 80) rating = 'A'
    else if (avgHealth >= 60) rating = 'B'
    else if (avgHealth >= 40) rating = 'C'
    else rating = 'D'

    return {
      name,
      roads: cRoads,
      totalCost,
      avgHealth,
      criticalCount,
      poorCount,
      liableCount,
      activeWarrantyCount,
      rating
    }
  })

  // Sort: Contractors with liable violations first, then lowest health
  const sortedContractors = [...contractorGroups].sort((a, b) => {
    if (b.liableCount !== a.liableCount) return b.liableCount - a.liableCount
    return a.avgHealth - b.avgHealth
  })

  // Summary Metrics
  const totalContractors = contractorGroups.length
  const totalPublicValue = contractorGroups.reduce((sum, c) => sum + c.totalCost, 0)
  const totalLiableViolations = contractorGroups.reduce((sum, c) => sum + c.liableCount, 0)
  const overallAvgHealth = roads.length > 0 
    ? Math.round(roads.reduce((sum, r) => sum + r.healthScore, 0) / roads.length) 
    : 0

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Contractor Performance & Quality Audit</h1>
          <p className={styles.subtitle}>
            Benchmark infrastructure firms by pavement longevity, premature defect rates, and active warranty liabilities.
          </p>
        </div>
      </div>

      {/* KPI Stats Row */}
      <div className={styles.statsRow}>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>Contractors Audited</span>
          <span className={styles.statVal}>{totalContractors}</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>Public Capital Under Audit</span>
          <span className={styles.statVal}>{formatCurrency(totalPublicValue)}</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>Active Warranty Violations</span>
          <span className={styles.statVal} style={{ color: totalLiableViolations > 0 ? 'var(--accent-red)' : 'var(--accent-green)' }}>
            {totalLiableViolations} {totalLiableViolations === 1 ? 'Corridor' : 'Corridors'}
          </span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>Network Average PCI</span>
          <span className={styles.statVal}>{overallAvgHealth}/100</span>
        </div>
      </div>

      {/* Actionable Legal Notice if contractor is liable */}
      {totalLiableViolations > 0 && (
        <div className={styles.alertNotice}>
          <ShieldAlert size={22} />
          <div>
            <strong>Actionable Contractor Defect Liability Detected:</strong>
            <p style={{ marginTop: 4 }}>
              {contractorGroups.filter(c => c.liableCount > 0).map(c => c.name).join(', ')} constructed corridors that have deteriorated to POOR or CRITICAL condition while still covered under defect liability periods.
              Under public works contract regulations, the agency should issue formal defect remediation notices requiring the contractor to rectify pavement distress at their sole expense.
            </p>
          </div>
        </div>
      )}

      {/* Leaderboard Table Card */}
      <div className={styles.tableCard}>
        <div className="table-wrapper">
          <table className="table">
            <thead>
              <tr>
                <th>Rank</th>
                <th>Contractor Name</th>
                <th>Corridors</th>
                <th>Contract Value</th>
                <th>Average Health</th>
                <th>Warranty Status</th>
                <th>Rating</th>
                <th style={{ textAlign: 'right' }}>Corridor Audit</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '36px 0' }} className="text-muted">
                    Loading contractor audit profiles...
                  </td>
                </tr>
              ) : sortedContractors.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '36px 0' }} className="text-muted">
                    No contractor records found in system.
                  </td>
                </tr>
              ) : (
                sortedContractors.map((contractor, idx) => {
                  const isExpanded = expandedContractor === contractor.name
                  return (
                    <React.Fragment key={contractor.name}>
                      <tr 
                        className={`${styles.contractorRow} ${isExpanded ? styles.expanded : ''}`}
                        onClick={() => setExpandedContractor(isExpanded ? null : contractor.name)}
                      >
                        <td className="font-bold text-muted">#{idx + 1}</td>
                        <td className="font-semibold">{contractor.name}</td>
                        <td>{contractor.roads.length} segments</td>
                        <td className="font-mono text-xs">{formatCurrency(contractor.totalCost)}</td>
                        <td>
                          <div className="flex items-center gap-2">
                            <div style={{ width: 60, height: 6, background: 'var(--bg-tertiary)', borderRadius: 3, overflow: 'hidden' }}>
                              <div 
                                style={{ 
                                  height: '100%', 
                                  width: `${contractor.avgHealth}%`, 
                                  background: contractor.avgHealth >= 75 ? 'var(--accent-green)' : contractor.avgHealth >= 50 ? 'var(--accent-yellow)' : 'var(--accent-red)' 
                                }} 
                              />
                            </div>
                            <span className="text-xs font-semibold">{contractor.avgHealth}/100</span>
                          </div>
                        </td>
                        <td>
                          {contractor.liableCount > 0 ? (
                            <span 
                              className="badge" 
                              style={{ 
                                background: 'rgba(239, 68, 68, 0.1)', 
                                color: 'var(--accent-red)', 
                                borderColor: 'var(--accent-red)',
                                fontSize: 11
                              }}
                            >
                              <ShieldAlert size={12} style={{ display: 'inline', marginRight: 4 }} />
                              {contractor.liableCount} Liable
                            </span>
                          ) : contractor.activeWarrantyCount > 0 ? (
                            <span 
                              className="badge" 
                              style={{ 
                                background: 'rgba(34, 197, 94, 0.1)', 
                                color: 'var(--accent-green)', 
                                borderColor: 'var(--accent-green)',
                                fontSize: 11
                              }}
                            >
                              <ShieldCheck size={12} style={{ display: 'inline', marginRight: 4 }} />
                              Compliant
                            </span>
                          ) : (
                            <span className="badge" style={{ fontSize: 11 }}>Warranty Expired</span>
                          )}
                        </td>
                        <td>
                          <span 
                            className="badge"
                            style={{
                              background: contractor.rating === 'A' ? 'var(--accent-green)' : contractor.rating === 'B' ? '#344653' : contractor.rating === 'C' ? 'var(--accent-orange)' : 'var(--accent-red)',
                              color: '#FFFFFF',
                              fontWeight: 700,
                              fontSize: 11
                            }}
                          >
                            Grade {contractor.rating}
                          </span>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            onClick={(e) => {
                              e.stopPropagation()
                              setExpandedContractor(isExpanded ? null : contractor.name)
                            }}
                          >
                            {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                            {isExpanded ? 'Hide' : 'Details'}
                          </button>
                        </td>
                      </tr>

                      {/* Expandable corridor drawer */}
                      {isExpanded && (
                        <tr>
                          <td colSpan={8} style={{ padding: 0 }}>
                            <div className={styles.drawer}>
                              <div className="flex items-center justify-between">
                                <span className="font-semibold text-xs text-secondary uppercase">
                                  Corridors Assigned to {contractor.name} ({contractor.roads.length})
                                </span>
                              </div>

                              <div className={styles.drawerRoadsGrid}>
                                {contractor.roads.map(r => {
                                  const w = warrantyStatus(r)
                                  return (
                                    <div key={r.id} className={styles.drawerRoadCard}>
                                      <div className="flex items-center justify-between">
                                        <div className="font-semibold text-sm">{r.name}</div>
                                        <span 
                                          className="badge"
                                          style={{
                                            background: getStatusBg(r.status),
                                            color: getStatusColor(r.status),
                                            fontSize: 10,
                                            padding: '2px 6px'
                                          }}
                                        >
                                          {r.status} ({r.healthScore})
                                        </span>
                                      </div>

                                      <div className="text-muted text-xs">
                                        {r.city} · Tender: <strong>{r.tenderId || 'N/A'}</strong>
                                      </div>

                                      <div className="text-secondary text-xs">
                                        Contract Value: <strong>{r.contractCost ? formatCurrency(r.contractCost) : 'N/A'}</strong>
                                      </div>

                                      {w && (
                                        <div className="text-xs" style={{ marginTop: 2 }}>
                                          {w.contractorLiable ? (
                                            <span style={{ color: 'var(--accent-red)', fontWeight: 600 }}>
                                              ⚠️ Contractor Liable ({w.daysLeft} days warranty left)
                                            </span>
                                          ) : w.active ? (
                                            <span style={{ color: 'var(--accent-green)' }}>
                                              ✓ Warranty Active ({w.daysLeft} days left)
                                            </span>
                                          ) : (
                                            <span className="text-muted">Warranty Expired</span>
                                          )}
                                        </div>
                                      )}

                                      <div style={{ marginTop: 6 }}>
                                        <Link 
                                          href={`/dashboard/roads/${r.id}`}
                                          className="text-xs flex items-center gap-1"
                                          style={{ color: 'var(--accent-primary)', textDecoration: 'underline' }}
                                        >
                                          Open Road Profile <ArrowRight size={12} />
                                        </Link>
                                      </div>
                                    </div>
                                  )
                                })}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

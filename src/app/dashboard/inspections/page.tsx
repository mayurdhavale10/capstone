'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { PlusCircle, Search, Filter, ChevronDown, ChevronUp, Eye, AlertOctagon, Wrench, Calendar, MapPin } from 'lucide-react'
import { getStatusColor, getStatusBg } from '@/lib/utils'
import styles from './inspections.module.css'

interface InspectionItem {
  id: string
  roadId: string
  road: { name: string }
  inspector?: { name: string }
  date: string
  imageUrl?: string | null
  aiScore: number
  damageTypes: string
  severityLevel: string
  notes?: string | null
  weatherCond?: string | null
  trafficLoad?: string | null
  causeAnalysis?: string | null
  maintenanceEst?: number | null
}

export default function InspectionsPage() {
  const [inspections, setInspections] = useState<InspectionItem[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [severityFilter, setSeverityFilter] = useState('ALL')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/inspections')
      .then((res) => res.json())
      .then((data) => {
        setInspections(Array.isArray(data) ? data : [])
        setLoading(false)
      })
      .catch((err) => {
        console.error('Failed to load inspections:', err)
        setLoading(false)
      })
  }, [])

  const parseDamages = (raw: string): string[] => {
    try {
      const parsed = JSON.parse(raw)
      return Array.isArray(parsed) ? parsed : [raw]
    } catch {
      return raw ? [raw] : []
    }
  }

  const filteredInspections = inspections.filter((ins) => {
    const damages = parseDamages(ins.damageTypes).join(' ').toLowerCase()
    const roadName = (ins.road?.name || '').toLowerCase()
    const inspectorName = (ins.inspector?.name || '').toLowerCase()
    const notesText = (ins.notes || '').toLowerCase()
    const q = searchQuery.toLowerCase()

    const matchesSearch = !q || roadName.includes(q) || inspectorName.includes(q) || damages.includes(q) || notesText.includes(q)
    const matchesSeverity = severityFilter === 'ALL' || ins.severityLevel.toUpperCase() === severityFilter

    return matchesSearch && matchesSeverity
  })

  // KPI Calculations
  const totalCount = inspections.length
  const criticalCount = inspections.filter(i => i.severityLevel === 'CRITICAL' || i.severityLevel === 'HIGH').length
  const avgScore = totalCount > 0 
    ? Math.round(inspections.reduce((s, i) => s + i.aiScore, 0) / totalCount) 
    : 0
  const totalEstCost = inspections.reduce((s, i) => s + (i.maintenanceEst || 0), 0)

  return (
    <div className={styles.container}>
      {/* Page Header */}
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Inspection Audit Registry</h1>
          <p className={styles.subtitle}>
            Comprehensive ledger of pavement distress records and AI computer vision evaluations.
          </p>
        </div>
        <Link href="/dashboard/inspections/new" className="btn btn-primary">
          <PlusCircle size={16} /> New Inspection
        </Link>
      </div>

      {/* KPI Stats Bar */}
      <div className={styles.statsRow}>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>Total Inspections</span>
          <span className={styles.statVal}>{totalCount}</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>Severe / Critical Alerts</span>
          <span className={styles.statVal} style={{ color: criticalCount > 0 ? 'var(--accent-red)' : 'inherit' }}>
            {criticalCount}
          </span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>Average Pavement Score</span>
          <span className={styles.statVal}>{avgScore}%</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>Est. Total Repair Backlog</span>
          <span className={styles.statVal}>${totalEstCost.toLocaleString()}</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className={styles.controlsBar}>
        <div className={styles.filterGroup}>
          <input 
            type="text" 
            placeholder="Search by road, distress, or inspector..."
            className={styles.searchBox}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />

          <select 
            className={styles.filterSelect}
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
          >
            <option value="ALL">All Severities</option>
            <option value="CRITICAL">Critical Only</option>
            <option value="HIGH">High Severity</option>
            <option value="MODERATE">Moderate</option>
            <option value="LOW">Low / Normal</option>
          </select>
        </div>

        <div className="text-secondary text-xs">
          Showing <strong>{filteredInspections.length}</strong> of {totalCount} records
        </div>
      </div>

      {/* Table Card */}
      <div className={styles.tableCard}>
        <div className="table-wrapper">
          <table className="table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Road Asset</th>
                <th>Severity</th>
                <th>AI Health</th>
                <th>Observed Distresses</th>
                <th>Repair Estimate</th>
                <th>Inspector</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '36px 0' }} className="text-muted">
                    Loading inspection audit records...
                  </td>
                </tr>
              ) : filteredInspections.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '36px 0' }} className="text-muted">
                    No inspection records found matching your filters.
                  </td>
                </tr>
              ) : (
                filteredInspections.map((ins) => {
                  const isExpanded = expandedId === ins.id
                  const damages = parseDamages(ins.damageTypes)
                  return (
                    <React.Fragment key={ins.id}>
                      <tr>
                        <td className="text-secondary font-mono text-xs">
                          {new Date(ins.date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                        </td>
                        <td className="font-semibold">
                          <Link 
                            href={`/dashboard/roads/${ins.roadId}`}
                            style={{ color: 'var(--text-primary)', textDecoration: 'none' }}
                            className="hover:underline"
                          >
                            {ins.road?.name || 'Unknown Road'}
                          </Link>
                        </td>
                        <td>
                          <span className={`badge badge-${ins.severityLevel.toLowerCase()}`}>
                            {ins.severityLevel}
                          </span>
                        </td>
                        <td>
                          <span className="font-semibold">{ins.aiScore}%</span>
                        </td>
                        <td>
                          <div style={{ maxWidth: 260 }}>
                            {damages.slice(0, 3).map((d, i) => (
                              <span key={i} className={styles.distressTag}>{d}</span>
                            ))}
                            {damages.length > 3 && (
                              <span className="text-muted text-xs">+{damages.length - 3} more</span>
                            )}
                          </div>
                        </td>
                        <td className="font-semibold text-xs">
                          {ins.maintenanceEst ? `$${ins.maintenanceEst.toLocaleString()}` : '—'}
                        </td>
                        <td className="text-secondary text-xs">
                          {ins.inspector?.name || 'Field Auditor'}
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            onClick={() => setExpandedId(isExpanded ? null : ins.id)}
                            title="Toggle full inspection audit"
                          >
                            {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                            {isExpanded ? 'Collapse' : 'Details'}
                          </button>
                        </td>
                      </tr>

                      {/* Expandable row */}
                      {isExpanded && (
                        <tr>
                          <td colSpan={8} style={{ padding: 0 }}>
                            <div className={styles.detailDrawer}>
                              <div className="flex items-center justify-between">
                                <span className="font-semibold text-xs text-secondary uppercase">
                                  Engineering Diagnosis & Root-Cause Audit
                                </span>
                                <Link 
                                  href={`/dashboard/roads/${ins.roadId}`} 
                                  className="text-xs" 
                                  style={{ color: 'var(--accent-primary)', textDecoration: 'underline' }}
                                >
                                  View Full Road Profile &rarr;
                                </Link>
                              </div>

                              <div className="grid-3" style={{ gap: 16 }}>
                                <div>
                                  <div className="text-xs text-muted">Operating Context</div>
                                  <div className="text-xs" style={{ marginTop: 4 }}>
                                    <div><strong>Weather:</strong> {ins.weatherCond || 'Clear / Dry'}</div>
                                    <div><strong>Traffic Volume:</strong> {ins.trafficLoad || 'Normal Flow'}</div>
                                  </div>
                                </div>

                                <div style={{ gridColumn: 'span 2' }}>
                                  <div className="text-xs text-muted">Root-Cause Inference</div>
                                  <p className="text-xs text-secondary" style={{ marginTop: 4 }}>
                                    {ins.causeAnalysis || 'Standard pavement wear from cumulative axle load.'}
                                  </p>
                                </div>
                              </div>

                              {ins.notes && (
                                <div>
                                  <div className="text-xs text-muted">Field Inspector Observations:</div>
                                  <p className="text-xs text-secondary" style={{ marginTop: 2 }}>{ins.notes}</p>
                                </div>
                              )}

                              {ins.imageUrl && (
                                <div style={{ marginTop: 8 }}>
                                  <div className="text-xs text-muted" style={{ marginBottom: 6 }}>Field Photographic Evidence:</div>
                                  <div style={{ maxWidth: 280, maxHeight: 180, borderRadius: 6, overflow: 'hidden', border: '1px solid var(--border-primary)' }}>
                                    <img src={ins.imageUrl} alt="Pavement distress capture" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                  </div>
                                </div>
                              )}
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

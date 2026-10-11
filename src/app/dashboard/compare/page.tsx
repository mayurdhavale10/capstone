'use client'

import React, { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { 
  GitCompare, 
  AlertTriangle, 
  ShieldAlert, 
  Wrench, 
  Layers, 
  CheckCircle2, 
  Clock, 
  Calendar,
  FileText,
  DollarSign
} from 'lucide-react'
import { 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as RechartsTooltip, 
  Legend 
} from 'recharts'
import { getStatusColor, getStatusBg, formatCurrency, formatDate } from '@/lib/utils'
import { 
  assessRisk, 
  warrantyStatus, 
  priorityScore, 
  DRAINAGE_LABELS, 
  RAINFALL_LABELS, 
  SOIL_LABELS 
} from '@/lib/scoring'
import styles from './compare.module.css'

const ROAD_LINE_COLORS = ['#344653', '#E0564C', '#2A8068', '#647887']

export default function ComparePage() {
  const searchParams = useSearchParams()
  const [roads, setRoads] = useState<any[]>([])
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/roads?includeInspections=true')
      .then(res => res.json())
      .then(data => {
        const roadList = Array.isArray(data) ? data : []
        setRoads(roadList)
        setLoading(false)

        // Read preselected roads from query params or pick first two
        const paramRoad1 = searchParams.get('road1')
        const paramRoad2 = searchParams.get('road2')
        if (paramRoad1 || paramRoad2) {
          const preselected = [paramRoad1, paramRoad2].filter(Boolean) as string[]
          setSelectedIds(preselected)
        } else if (roadList.length >= 2) {
          // Default to the first two roads (e.g. Katraj–Kondhwa vs Fergusson College or Old Mumbai-Pune)
          setSelectedIds([roadList[0].id, roadList[1].id])
        } else if (roadList.length === 1) {
          setSelectedIds([roadList[0].id])
        }
      })
      .catch(err => {
        console.error('Failed to load roads:', err)
        setLoading(false)
      })
  }, [searchParams])

  const toggleRoad = (id: string) => {
    if (selectedIds.includes(id)) {
      if (selectedIds.length <= 1) return // Keep at least one selected
      setSelectedIds(selectedIds.filter(x => x !== id))
    } else {
      if (selectedIds.length >= 4) return // Maximum 4 roads
      setSelectedIds([...selectedIds, id])
    }
  }

  const selectedRoads = roads.filter(r => selectedIds.includes(r.id))

  // Parse damage types safely
  const parseDamages = (raw: string): string[] => {
    try {
      const parsed = JSON.parse(raw)
      return Array.isArray(parsed) ? parsed : [raw]
    } catch {
      return raw ? [raw] : []
    }
  }

  // Build Health-Over-Time Timeline Chart Data
  // Normalizes inspection progression: Built, Audit 1, Audit 2, Audit 3, Latest
  const maxAudits = Math.max(1, ...selectedRoads.map(r => (r.inspections || []).length))
  const timelineStages = ['Built']
  for (let i = 1; i <= maxAudits; i++) {
    timelineStages.push(i === maxAudits ? 'Latest' : `Audit ${i}`)
  }

  const chartData = timelineStages.map((stage, stageIdx) => {
    const point: Record<string, any> = { stage }
    selectedRoads.forEach(road => {
      const inspections = road.inspections || []
      if (stageIdx === 0) {
        point[road.name] = 100 // Built at 100 PCI
      } else if (stage === 'Latest') {
        point[road.name] = road.healthScore
      } else {
        const auditIndex = stageIdx - 1
        if (inspections[auditIndex]) {
          point[road.name] = inspections[auditIndex].aiScore
        } else {
          point[road.name] = road.healthScore
        }
      }
    })
    return point
  })

  // Pre-calculate road comparison metrics
  const roadMetrics = selectedRoads.map(road => {
    const inspections = road.inspections || []
    const allDistresses = inspections.flatMap((ins: any) => parseDamages(ins.damageTypes))
    
    // Count defects
    const defectCounts: Record<string, number> = {}
    allDistresses.forEach((d: string) => {
      defectCounts[d] = (defectCounts[d] || 0) + 1
    })

    const totalRepairCost = inspections.reduce((sum: number, ins: any) => sum + (ins.maintenanceEst || 0), 0)
    const risk = assessRisk(road, allDistresses)
    const warranty = warrantyStatus(road)
    const priority = priorityScore(road.healthScore, risk.score)

    return {
      road,
      allDistresses,
      defectCounts,
      totalRepairCost,
      risk,
      warranty,
      priority,
      age: Math.max(0, new Date().getFullYear() - new Date(road.constructedAt).getFullYear())
    }
  })

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Comparative Road Intelligence</h1>
          <p className={styles.subtitle}>
            Side-by-side performance benchmarking, degradation trajectories, defect density, and warranty liability audits.
          </p>
        </div>
      </div>

      <div className={styles.layoutGrid}>
        {/* Road Selector Sidebar */}
        <div className={styles.selectorCard}>
          <div className="flex items-center justify-between">
            <h3 style={{ fontSize: 15 }}>Select Corridors</h3>
            <span className="text-secondary text-xs">{selectedIds.length}/4 selected</span>
          </div>
          <div className={styles.selectorList}>
            {loading ? (
              <div className="text-muted text-xs text-center py-4">Loading road network...</div>
            ) : (
              roads.map(road => {
                const isSelected = selectedIds.includes(road.id)
                return (
                  <div 
                    key={road.id} 
                    className={`${styles.roadSelectItem} ${isSelected ? styles.selected : ''}`}
                    onClick={() => toggleRoad(road.id)}
                  >
                    <div>
                      <div className="font-semibold text-xs">{road.name}</div>
                      <div className="text-muted" style={{ fontSize: 11 }}>{road.city} · {road.lengthKm} km</div>
                    </div>
                    <span 
                      className="badge" 
                      style={{ 
                        background: getStatusBg(road.status), 
                        color: getStatusColor(road.status),
                        fontSize: 10,
                        padding: '2px 6px'
                      }}
                    >
                      {road.healthScore}
                    </span>
                  </div>
                )
              })
            )}
          </div>
          <div className="text-muted" style={{ fontSize: 11, lineHeight: 1.4 }}>
            Click any road to toggle it in the comparison matrix. Select up to 4 corridors simultaneously.
          </div>
        </div>

        {/* Comparison Content Area */}
        <div className={styles.contentArea}>
          {/* Health-over-Time Trajectory Chart */}
          <div className={styles.chartCard}>
            <div className={styles.chartHeader}>
              <div>
                <h3 style={{ fontSize: 16 }}>Health Degradation Curves Over Time</h3>
                <p className="text-secondary text-xs">
                  Normalized condition decline from original commissioning through successive computer vision inspection audits.
                </p>
              </div>
            </div>

            <div style={{ height: 320, width: '100%' }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 20, right: 30, left: -10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-primary)" opacity={0.5} />
                  <XAxis dataKey="stage" tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} axisLine={false} />
                  <YAxis domain={[0, 100]} tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} axisLine={false} tickLine={false} />
                  <RechartsTooltip 
                    contentStyle={{ 
                      background: 'var(--bg-card)', 
                      border: '1px solid var(--border-primary)', 
                      borderRadius: 6,
                      fontSize: 12
                    }}
                  />
                  <Legend verticalAlign="bottom" height={36} />
                  {selectedRoads.map((road, idx) => (
                    <Line 
                      key={road.id}
                      type="monotone" 
                      dataKey={road.name} 
                      stroke={ROAD_LINE_COLORS[idx % ROAD_LINE_COLORS.length]} 
                      strokeWidth={2.5} 
                      dot={{ r: 4 }} 
                      activeDot={{ r: 6 }}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Comparative Engineering Takeaways */}
          {roadMetrics.length >= 2 && (
            <div className={styles.takeawayBanner}>
              <div className={styles.takeawayTitle}>
                <GitCompare size={17} style={{ color: 'var(--accent-primary)' }} />
                <span>Comparative Engineering Audit Takeaways</span>
              </div>
              <ul className="text-secondary text-xs" style={{ margin: 0, paddingLeft: 18, lineHeight: 1.6 }}>
                <li>
                  <strong>Primary Maintenance Priority: </strong> 
                  {[...roadMetrics].sort((a, b) => b.priority - a.priority)[0].road.name} holds the highest urgent repair priority (
                  {[...roadMetrics].sort((a, b) => b.priority - a.priority)[0].priority}/100) due to severe composite defect density and active risk factors.
                </li>
                {roadMetrics.some(m => m.warranty?.contractorLiable) && (
                  <li style={{ color: 'var(--accent-red)' }}>
                    <strong>Warranty Claim Opportunity: </strong> 
                    {roadMetrics.filter(m => m.warranty?.contractorLiable).map(m => m.road.name).join(', ')} failed within their defect liability period. Repair notices should be issued to the respective contractors to recover public funds.
                  </li>
                )}
                <li>
                  <strong>Drainage vs Pavement Lifespan: </strong> 
                  Corridors with blocked side drains experience accelerated deterioration rates up to 2.4x higher than corridors on well-drained subgrades.
                </li>
              </ul>
            </div>
          )}

          {/* Side-by-Side Deep Comparison Matrix */}
          <div className={styles.matrixGrid}>
            {roadMetrics.map(({ road, defectCounts, totalRepairCost, risk, warranty, priority, age }, idx) => (
              <div key={road.id} className={styles.roadCard}>
                {/* Header */}
                <div className={styles.roadCardHeader}>
                  <div>
                    <div className="flex items-center gap-2">
                      <span 
                        style={{ 
                          width: 10, 
                          height: 10, 
                          borderRadius: '50%', 
                          background: ROAD_LINE_COLORS[idx % ROAD_LINE_COLORS.length],
                          display: 'inline-block' 
                        }} 
                      />
                      <h3 style={{ fontSize: 16 }}>{road.name}</h3>
                    </div>
                    <div className="text-secondary text-xs" style={{ marginTop: 2 }}>
                      {road.city}, {road.state} · {road.lengthKm.toFixed(1)} km
                    </div>
                  </div>
                  <div className="text-right">
                    <span 
                      className="badge" 
                      style={{ 
                        background: getStatusBg(road.status), 
                        color: getStatusColor(road.status),
                        fontSize: 12
                      }}
                    >
                      {road.status} ({road.healthScore})
                    </span>
                  </div>
                </div>

                {/* Section 1: Health & Risk Indices */}
                <div>
                  <div className={styles.sectionHeader}>Condition & Risk Scores</div>
                  <div className={styles.metricRow}>
                    <span className={styles.metricLabel}>Pavement Condition Index (PCI)</span>
                    <span className={styles.metricVal} style={{ color: getStatusColor(road.status) }}>
                      {road.healthScore}/100
                    </span>
                  </div>
                  <div className={styles.metricRow}>
                    <span className={styles.metricLabel}>Deterioration Risk Level</span>
                    <span className={styles.metricVal} style={{ color: risk.level === 'HIGH' ? 'var(--accent-red)' : risk.level === 'MEDIUM' ? 'var(--accent-orange)' : 'var(--accent-green)' }}>
                      {risk.level} ({risk.score}/100)
                    </span>
                  </div>
                  <div className={styles.metricRow}>
                    <span className={styles.metricLabel}>Composite Repair Priority</span>
                    <span className={styles.metricVal}>
                      <strong>{priority}</strong> / 100
                    </span>
                  </div>
                </div>

                {/* Section 2: Defect Counts */}
                <div>
                  <div className={styles.sectionHeader}>Detected Defect Frequency</div>
                  <div style={{ marginTop: 6 }}>
                    {Object.keys(defectCounts).length > 0 ? (
                      Object.entries(defectCounts).map(([type, count]) => (
                        <span key={type} className={styles.defectChip}>
                          {type}: <strong>{count}</strong>
                        </span>
                      ))
                    ) : (
                      <span className="text-secondary text-xs">No active defects recorded</span>
                    )}
                  </div>
                </div>

                {/* Section 3: Financial & Contractor Warranty */}
                <div>
                  <div className={styles.sectionHeader}>Contract & Financial Exposure</div>
                  <div className={styles.metricRow}>
                    <span className={styles.metricLabel}>Est. Repair Cost</span>
                    <span className={styles.metricVal} style={{ color: totalRepairCost > 0 ? 'var(--accent-red)' : 'inherit' }}>
                      {formatCurrency(totalRepairCost)}
                    </span>
                  </div>
                  <div className={styles.metricRow}>
                    <span className={styles.metricLabel}>Contractor</span>
                    <span className={styles.metricVal}>{road.contractorName || 'Not recorded'}</span>
                  </div>
                  <div className={styles.metricRow}>
                    <span className={styles.metricLabel}>Tender ID</span>
                    <span className={styles.metricVal}>{road.tenderId || '—'}</span>
                  </div>
                  <div className={styles.metricRow}>
                    <span className={styles.metricLabel}>Warranty Status</span>
                    <span className={styles.metricVal}>
                      {warranty ? (
                        warranty.contractorLiable ? (
                          <span style={{ color: 'var(--accent-red)', fontWeight: 700 }}>
                            Contractor Liable ({warranty.daysLeft}d left)
                          </span>
                        ) : warranty.active ? (
                          <span style={{ color: 'var(--accent-green)' }}>
                            Active ({warranty.daysLeft}d left)
                          </span>
                        ) : (
                          <span className="text-muted">Expired</span>
                        )
                      ) : (
                        '—'
                      )}
                    </span>
                  </div>
                </div>

                {/* Section 4: Site Conditions & Engineering */}
                <div>
                  <div className={styles.sectionHeader}>Site Conditions & Geometry</div>
                  <div className={styles.metricRow}>
                    <span className={styles.metricLabel}>Drainage</span>
                    <span className={styles.metricVal}>
                      {DRAINAGE_LABELS[road.drainageCondition] ?? road.drainageCondition}
                      {road.waterlogging && ' (Waterlogging)'}
                    </span>
                  </div>
                  <div className={styles.metricRow}>
                    <span className={styles.metricLabel}>Subgrade Soil</span>
                    <span className={styles.metricVal}>{SOIL_LABELS[road.soilType] ?? road.soilType}</span>
                  </div>
                  <div className={styles.metricRow}>
                    <span className={styles.metricLabel}>Rainfall Zone</span>
                    <span className={styles.metricVal}>{RAINFALL_LABELS[road.rainfallZone] ?? road.rainfallZone}</span>
                  </div>
                  <div className={styles.metricRow}>
                    <span className={styles.metricLabel}>Bituminous Layer</span>
                    <span className={styles.metricVal}>
                      {road.pavementThicknessMm ? `${road.pavementThicknessMm} mm` : '—'}
                    </span>
                  </div>
                  <div className={styles.metricRow}>
                    <span className={styles.metricLabel}>Material & Age</span>
                    <span className={styles.metricVal}>
                      {road.material} · {age} yrs
                    </span>
                  </div>
                </div>

                {/* Action Link */}
                <div style={{ marginTop: 'auto', paddingTop: 10 }}>
                  <Link 
                    href={`/dashboard/roads/${road.id}`} 
                    className="btn btn-secondary btn-sm w-full justify-center"
                  >
                    View Individual Road Profile &rarr;
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

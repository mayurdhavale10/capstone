'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { 
  ArrowLeft, 
  MapPin, 
  Calendar, 
  Truck, 
  Ruler, 
  Wrench, 
  AlertTriangle, 
  Layers, 
  PlusCircle, 
  BarChart3,
  Clock,
  ShieldAlert,
  FileText
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
  recommendActions,
  priorityScore,
  DRAINAGE_LABELS,
  RAINFALL_LABELS,
  SOIL_LABELS,
} from '@/lib/scoring'
import styles from './road-detail.module.css'

interface Inspection {
  id: string
  date: string
  aiScore: number
  damageTypes: string
  severityLevel: string
  notes?: string
  weatherCond?: string
  trafficLoad?: string
  causeAnalysis?: string
  maintenanceEst?: number
  inspector?: { name: string }
}

interface RoadDetail {
  id: string
  name: string
  location: string
  city: string
  state?: string
  lat: number
  lng: number
  lengthKm: number
  material: string
  constructedAt: string
  trafficVolume: string
  healthScore: number
  status: string
  description?: string
  drainageCondition: string
  waterlogging: boolean
  rainfallZone: string
  soilType: string
  pavementThicknessMm?: number | null
  contractorName?: string | null
  tenderId?: string | null
  contractCost?: number | null
  lastRepairAt?: string | null
  lastRepairType?: string | null
  defectLiabilityYears?: number | null
  inspections: Inspection[]
}

export default function RoadDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = params?.id as string

  const [road, setRoad] = useState<RoadDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    setLoading(true)
    fetch(`/api/roads/${id}`)
      .then(async (res) => {
        if (!res.ok) throw new Error('Failed to load road data')
        return res.json()
      })
      .then((data) => {
        setRoad(data)
        setLoading(false)
      })
      .catch((err) => {
        setError(err.message)
        setLoading(false)
      })
  }, [id])

  if (loading) {
    return (
      <div className={styles.container}>
        <div className="card text-center text-muted" style={{ padding: '60px 20px' }}>
          Loading road intelligence profile...
        </div>
      </div>
    )
  }

  if (error || !road) {
    return (
      <div className={styles.container}>
        <div className="card text-center" style={{ padding: '60px 20px' }}>
          <h3 style={{ color: 'var(--accent-red)', marginBottom: 12 }}>Road Not Found</h3>
          <p className="text-secondary" style={{ marginBottom: 20 }}>
            {error || 'Unable to locate road record.'}
          </p>
          <Link href="/dashboard/roads" className="btn btn-secondary">
            <ArrowLeft size={16} /> Back to Roads
          </Link>
        </div>
      </div>
    )
  }

  const constructionYear = new Date(road.constructedAt).getFullYear()
  const currentYear = new Date().getFullYear()
  const roadAge = Math.max(0, currentYear - constructionYear)

  // Parse damage types safely
  const parseDamages = (raw: string): string[] => {
    try {
      const parsed = JSON.parse(raw)
      return Array.isArray(parsed) ? parsed : [raw]
    } catch {
      return raw ? [raw] : []
    }
  }

  // Generate Deterioration Curve points
  const sortedInspections = [...road.inspections].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  )

  const chartData = [
    {
      label: `Built (${constructionYear})`,
      'Actual PCI': 100,
      'Design Baseline': 100
    }
  ]

  if (sortedInspections.length > 0) {
    sortedInspections.forEach((ins) => {
      const insYear = new Date(ins.date).getFullYear()
      const yearsSinceBuilt = Math.max(0, insYear - constructionYear)
      // Standard AASHTO baseline drops ~3-4 points per year for standard traffic
      const expectedBaseline = Math.max(20, Math.round(100 - yearsSinceBuilt * 3.8))
      chartData.push({
        label: new Date(ins.date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        'Actual PCI': ins.aiScore,
        'Design Baseline': expectedBaseline
      })
    })
  } else {
    // Show current baseline projection
    const expectedCurrent = Math.max(20, Math.round(100 - roadAge * 3.8))
    chartData.push({
      label: 'Current Year',
      'Actual PCI': road.healthScore,
      'Design Baseline': expectedCurrent
    })
  }

  // Aggregate observed distresses and root cause analysis
  const allDistresses = Array.from(
    new Set(sortedInspections.flatMap(i => parseDamages(i.damageTypes)))
  )

  const isDeterioratingFast = road.healthScore < (chartData[chartData.length - 1]['Design Baseline'] - 8)

  // Site-specific analysis (src/lib/scoring.ts)
  const risk = assessRisk(road, allDistresses)
  const warranty = warrantyStatus(road)
  const actions = recommendActions(road, risk)
  const priority = priorityScore(road.healthScore, risk.score)
  const riskColor = { HIGH: 'var(--accent-red)', MEDIUM: 'var(--accent-orange)', LOW: 'var(--accent-green)' }[risk.level]

  return (
    <div className={styles.container}>
      {/* Navigation & Header */}
      <div className="flex items-center justify-between">
        <Link href="/dashboard/roads" className="btn btn-secondary btn-sm">
          <ArrowLeft size={16} /> All Roads
        </Link>
        <div className={styles.actionsRow}>
          <Link 
            href={`/dashboard/compare`} 
            className="btn btn-secondary btn-sm"
          >
            <BarChart3 size={15} /> Compare Performance
          </Link>
          <Link 
            href={`/dashboard/inspections/new?roadId=${road.id}`} 
            className="btn btn-primary btn-sm"
          >
            <PlusCircle size={15} /> Run New Inspection
          </Link>
        </div>
      </div>

      {/* Main Road Header Card */}
      <div className={`card ${styles.headerCard}`}>
        <div className={styles.headerInfo}>
          <div className={styles.titleRow}>
            <h1 className={styles.roadTitle}>{road.name}</h1>
            <span 
              className="badge" 
              style={{ 
                background: getStatusBg(road.status), 
                color: getStatusColor(road.status),
                borderColor: getStatusColor(road.status),
                fontSize: 12,
                padding: '4px 10px'
              }}
            >
              PCI: {road.healthScore}/100 — {road.status}
            </span>
          </div>

          <div className={styles.metaRow}>
            <span className={styles.metaItem}>
              <MapPin size={14} /> {road.location}, {road.city} {road.state && `(${road.state})`}
            </span>
            <span className={styles.metaItem}>
              <Layers size={14} /> {road.material}
            </span>
            <span className={styles.metaItem}>
              <Ruler size={14} /> {road.lengthKm.toFixed(1)} km length
            </span>
            <span className={styles.metaItem}>
              <Calendar size={14} /> Built {constructionYear} ({roadAge} yrs old)
            </span>
            <span className={styles.metaItem}>
              <Truck size={14} /> {road.trafficVolume}
            </span>
          </div>
          {road.description && (
            <p className="text-secondary text-sm" style={{ marginTop: 6, maxWidth: 850 }}>
              {road.description}
            </p>
          )}
        </div>
      </div>

      {warranty?.contractorLiable && (
        <div className={styles.alertBanner}>
          <ShieldAlert size={20} />
          <div>
            <strong>Contractor liable for repairs.</strong> This road is {road.status} while still inside its
            defect liability period. {warranty.contractor}
            {warranty.tenderId && <> (tender {warranty.tenderId})</>} must repair it at their own cost
            until {formatDate(warranty.expiresAt)} ({warranty.daysLeft} days left).
          </div>
        </div>
      )}

      {/* Key Metric Blocks */}
      <div className={styles.statsGrid}>
        <div className={styles.statBox}>
          <span className={styles.statLabel}>Current PCI Rating</span>
          <div className="flex items-baseline gap-2">
            <span className={styles.statValue} style={{ color: getStatusColor(road.status) }}>
              {road.healthScore}
            </span>
            <span className="text-muted text-xs">/ 100</span>
          </div>
          <span className={styles.statSubtext}>
            {road.status === 'GOOD' ? 'Optimal condition' :
             road.status === 'FAIR' ? 'Preventative maintenance needed' :
             road.status === 'POOR' ? 'Substantial rehabilitation required' :
             'Structural failure risk'}
          </span>
        </div>

        <div className={styles.statBox}>
          <span className={styles.statLabel}>Total Inspections Logged</span>
          <span className={styles.statValue}>{road.inspections.length}</span>
          <span className={styles.statSubtext}>
            {road.inspections.length > 0 
              ? `Latest: ${new Date(road.inspections[0].date).toLocaleDateString()}`
              : 'No inspections yet'}
          </span>
        </div>

        <div className={styles.statBox}>
          <span className={styles.statLabel}>Deterioration Rate</span>
          <span 
            className={styles.statValue}
            style={{ color: isDeterioratingFast ? 'var(--accent-red)' : 'var(--accent-green)' }}
          >
            {isDeterioratingFast ? 'Accelerated' : 'Normal'}
          </span>
          <span className={styles.statSubtext}>
            {isDeterioratingFast 
              ? 'Degrading faster than design lifespan'
              : 'Tracking within standard life expectancy'}
          </span>
        </div>

        <div className={styles.statBox}>
          <span className={styles.statLabel}>Deterioration Risk</span>
          <div className="flex items-baseline gap-2">
            <span className={styles.statValue} style={{ color: riskColor }}>{risk.level}</span>
            <span className="text-muted text-xs">{risk.score}/100</span>
          </div>
          <span className={styles.statSubtext}>
            From drainage, rainfall, soil, traffic and age · Repair priority {priority}/100
          </span>
        </div>
      </div>

      {/* Degradation Curve Chart */}
      <div className={styles.chartCard}>
        <div className={styles.chartHeader}>
          <div>
            <div className={styles.chartTitle}>Pavement Condition Index (PCI) Degradation Trajectory</div>
            <p className="text-secondary text-xs">
              Comparison between observed inspection health and AASHTO standard lifecycle curve.
            </p>
          </div>
          <div className={styles.chartLegendCustom}>
            <span>
              <span className={styles.legendDot} style={{ background: 'var(--accent-primary)' }} />
              Observed AI PCI
            </span>
            <span>
              <span className={styles.legendDot} style={{ background: '#AFBEC9' }} />
              AASHTO Design Baseline
            </span>
          </div>
        </div>

        <div style={{ height: 280, width: '100%' }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 15, right: 25, left: -10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-primary)" opacity={0.5} />
              <XAxis dataKey="label" tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} axisLine={false} />
              <YAxis domain={[0, 100]} tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} axisLine={false} tickLine={false} />
              <RechartsTooltip 
                contentStyle={{ 
                  background: 'var(--bg-card)', 
                  border: '1px solid var(--border-primary)', 
                  borderRadius: 6,
                  fontSize: 12
                }}
              />
              <Legend verticalAlign="bottom" height={30} />
              <Line 
                type="monotone" 
                dataKey="Actual PCI" 
                stroke="var(--accent-primary)" 
                strokeWidth={2.5} 
                dot={{ r: 4, fill: 'var(--accent-primary)' }} 
                activeDot={{ r: 6 }}
              />
              <Line 
                type="monotone" 
                dataKey="Design Baseline" 
                stroke="#AFBEC9" 
                strokeWidth={1.5} 
                strokeDasharray="5 5" 
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Cause Analysis & Vulnerability Section */}
      <div className={styles.twoColLayout}>
        {/* Cause Investigation Card */}
        <div className={styles.causeCard}>
          <div className={styles.causeHeader}>
            <AlertTriangle size={17} style={{ color: isDeterioratingFast ? 'var(--accent-red)' : 'var(--text-primary)' }} />
            <span>Root-Cause & Vulnerability Audit</span>
          </div>

          <div className={styles.causeItem}>
            <div className={styles.causeName}>Primary Observed Distresses</div>
            <div className={styles.damageBadgeGroup} style={{ marginTop: 4 }}>
              {allDistresses.length > 0 ? (
                allDistresses.map((d, idx) => (
                  <span key={idx} className={styles.damageBadge}>{d}</span>
                ))
              ) : (
                <span className="text-secondary text-xs">No active structural distress detected.</span>
              )}
            </div>
          </div>

          {risk.factors.map((f) => (
            <div key={f.key} className={`${styles.causeItem} ${styles['risk' + f.level]}`}>
              <div className={styles.factorHeader}>
                <div className={styles.causeName}>{f.label}</div>
                <span className={styles.factorValue}>{f.value} · {f.level} risk</span>
              </div>
              <div className={styles.causeDesc}>{f.detail}</div>
            </div>
          ))}

          <div className={styles.causeItem}>
            <div className={styles.causeName}>Recommended Actions</div>
            <ol className={styles.actionList}>
              {actions.map((a, i) => <li key={i}>{a}</li>)}
            </ol>
          </div>
        </div>

        <div className={styles.sideColumn}>
        {/* Specifications & Audit Metadata */}
        <div className={styles.causeCard}>
          <div className={styles.causeHeader}>
            <Wrench size={17} />
            <span>Asset Specifications & Engineering Profile</span>
          </div>

          <table className="table" style={{ fontSize: 13 }}>
            <tbody>
              <tr>
                <td className="text-muted" style={{ width: '40%' }}>Surface Material</td>
                <td className="font-semibold">{road.material}</td>
              </tr>
              <tr>
                <td className="text-muted">Total Segment Length</td>
                <td>{road.lengthKm.toFixed(2)} Kilometers</td>
              </tr>
              <tr>
                <td className="text-muted">Traffic Classification</td>
                <td>{road.trafficVolume}</td>
              </tr>
              <tr>
                <td className="text-muted">Original Construction</td>
                <td>{constructionYear} ({roadAge} years in service)</td>
              </tr>
              <tr>
                <td className="text-muted">Geographic Jurisdiction</td>
                <td>{road.city}, {road.state || 'N/A'}</td>
              </tr>
              <tr>
                <td className="text-muted">Target Service Life</td>
                <td>20 Years (Standard Flexible Pavement)</td>
              </tr>
              <tr>
                <td className="text-muted">Current Service Life Consumed</td>
                <td>{Math.min(100, Math.round((roadAge / 20) * 100))}%</td>
              </tr>
              <tr>
                <td className="text-muted">Drainage</td>
                <td>{DRAINAGE_LABELS[road.drainageCondition] ?? road.drainageCondition}{road.waterlogging && ' · waterlogging reported'}</td>
              </tr>
              <tr>
                <td className="text-muted">Rainfall Zone</td>
                <td>{RAINFALL_LABELS[road.rainfallZone] ?? road.rainfallZone}</td>
              </tr>
              <tr>
                <td className="text-muted">Subgrade Soil</td>
                <td>{SOIL_LABELS[road.soilType] ?? road.soilType}</td>
              </tr>
              <tr>
                <td className="text-muted">Bituminous Layer</td>
                <td>{road.pavementThicknessMm != null ? `${road.pavementThicknessMm} mm` : 'Not recorded'}</td>
              </tr>
              <tr>
                <td className="text-muted">GPS Centerline</td>
                <td>
                  <Link href="/dashboard/map" style={{ color: 'var(--accent-primary)', textDecoration: 'underline' }}>
                    {road.lat.toFixed(4)}, {road.lng.toFixed(4)}
                  </Link>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Contract & Warranty */}
        <div className={styles.causeCard}>
          <div className={styles.causeHeader}>
            <FileText size={17} />
            <span>Contract & Warranty</span>
          </div>

          {road.contractorName ? (
            <table className="table" style={{ fontSize: 13 }}>
              <tbody>
                <tr>
                  <td className="text-muted" style={{ width: '40%' }}>Contractor</td>
                  <td className="font-semibold">{road.contractorName}</td>
                </tr>
                <tr>
                  <td className="text-muted">Tender ID</td>
                  <td>{road.tenderId || 'Not recorded'}</td>
                </tr>
                <tr>
                  <td className="text-muted">Contract Value</td>
                  <td>{road.contractCost != null ? formatCurrency(road.contractCost) : 'Not recorded'}</td>
                </tr>
                <tr>
                  <td className="text-muted">Last Works</td>
                  <td>
                    {road.lastRepairAt
                      ? `${road.lastRepairType || 'Repair'} — ${formatDate(road.lastRepairAt)}`
                      : `Original construction — ${formatDate(road.constructedAt)}`}
                  </td>
                </tr>
                <tr>
                  <td className="text-muted">Defect Liability Period</td>
                  <td>
                    {warranty ? (
                      <span style={{ color: warranty.contractorLiable ? 'var(--accent-red)' : warranty.active ? 'var(--accent-green)' : 'var(--text-secondary)', fontWeight: 600 }}>
                        {road.defectLiabilityYears} yrs · {warranty.active
                          ? `active until ${formatDate(warranty.expiresAt)}`
                          : `expired ${formatDate(warranty.expiresAt)}`}
                      </span>
                    ) : 'Not recorded'}
                  </td>
                </tr>
              </tbody>
            </table>
          ) : (
            <p className="text-secondary text-xs">
              No contractor recorded for this road. Add the contractor, tender ID and defect liability
              period to track whether failures fall under warranty.
            </p>
          )}
        </div>
        </div>
      </div>

      {/* Historical Inspection Log */}
      <div className="card">
        <div className="flex items-center justify-between" style={{ marginBottom: 16 }}>
          <div>
            <h3>Inspection History Log</h3>
            <p className="text-secondary text-xs">All past computer vision assessments and field audits for this asset.</p>
          </div>
          <Link href={`/dashboard/inspections/new?roadId=${road.id}`} className="btn btn-secondary btn-sm">
            <PlusCircle size={14} /> Add Inspection
          </Link>
        </div>

        {road.inspections.length === 0 ? (
          <div className={styles.emptyState}>
            <Clock size={32} />
            <div>No inspections recorded for this road yet.</div>
            <Link href={`/dashboard/inspections/new?roadId=${road.id}`} className="btn btn-primary btn-sm">
              Run Initial AI Inspection
            </Link>
          </div>
        ) : (
          <div className={styles.inspectionList}>
            {road.inspections.map((ins) => {
              const damages = parseDamages(ins.damageTypes)
              return (
                <div key={ins.id} className={styles.inspectionCard}>
                  <div className={styles.inspectionCardHeader}>
                    <div className="flex items-center gap-3">
                      <span 
                        className={`badge badge-${ins.severityLevel.toLowerCase()}`}
                        style={{ fontSize: 11 }}
                      >
                        {ins.severityLevel}
                      </span>
                      <span className="font-semibold text-sm">
                        {new Date(ins.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                      </span>
                      <span className="text-muted text-xs">
                        by {ins.inspector?.name || 'Field Inspector'}
                      </span>
                    </div>

                    <div className="flex items-center gap-4 text-xs">
                      <span className="font-semibold">
                        AI Score: <strong style={{ color: 'var(--text-primary)' }}>{ins.aiScore}%</strong>
                      </span>
                      {!!ins.maintenanceEst && (
                        <span className="text-secondary">
                          Est. Repair: <strong>{formatCurrency(ins.maintenanceEst)}</strong>
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs text-muted">Detected Distresses:</span>
                    {damages.map((d, i) => (
                      <span key={i} className={styles.damageBadge}>{d}</span>
                    ))}
                  </div>

                  {ins.causeAnalysis && (
                    <div className="text-xs text-secondary" style={{ background: 'var(--bg-primary)', padding: '8px 12px', borderRadius: 4 }}>
                      <strong style={{ color: 'var(--text-primary)' }}>Probable Cause: </strong>
                      {ins.causeAnalysis}
                    </div>
                  )}

                  {ins.notes && (
                    <div className="text-xs text-secondary">
                      <strong>Inspector Notes: </strong> {ins.notes}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

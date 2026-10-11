import { prisma } from '@/lib/prisma'
import Link from 'next/link'

export default async function DashboardPage() {
  const [
    totalRoads,
    totalInspections,
    roads,
    recentInspections,
  ] = await Promise.all([
    prisma.road.count(),
    prisma.inspection.count(),
    prisma.road.findMany({ select: { status: true, healthScore: true, lengthKm: true } }),
    prisma.inspection.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: { road: { select: { name: true } }, inspector: { select: { name: true } } },
    }),
  ])

  const criticalRoads = roads.filter((r) => r.status === 'CRITICAL').length
  const avgHealth = roads.length > 0
    ? Math.round(roads.reduce((sum, r) => sum + r.healthScore, 0) / roads.length)
    : 0
  const totalLength = roads.reduce((sum, r) => sum + r.lengthKm, 0)

  return (
    <div className="flex-col gap-6" style={{ display: 'flex' }}>
      <div className="flex items-center justify-between">
        <div>
          <h2>Dashboard Overview</h2>
          <p>System-wide road network intelligence summary.</p>
        </div>
        <Link href="/dashboard/inspections/new" className="btn btn-primary">
          New Inspection
        </Link>
      </div>

      <div className="grid-4">
        <div className="card stat-card">
          <div className="stat-label">Total Roads Managed</div>
          <div className="stat-value">{totalRoads}</div>
          <div className="stat-change">Total length: {totalLength.toFixed(1)} km</div>
        </div>

        <div className="card stat-card">
          <div className="stat-label">Average Health Score</div>
          <div className="stat-value">{avgHealth}/100</div>
          <div className="stat-change" style={{ color: 'var(--accent-green)' }}>System average across all roads</div>
        </div>

        <div className="card stat-card">
          <div className="stat-label">Critical Roads</div>
          <div className="stat-value" style={{ color: criticalRoads > 0 ? 'var(--accent-red)' : 'inherit' }}>
            {criticalRoads}
          </div>
          <div className="stat-change" style={{ color: 'var(--accent-red)' }}>Require immediate attention</div>
        </div>

        <div className="card stat-card">
          <div className="stat-label">Total Inspections</div>
          <div className="stat-value">{totalInspections}</div>
          <div className="stat-change">AI-analyzed reports submitted</div>
        </div>
      </div>

      <div className="grid-2">
        <div className="card">
          <div className="flex items-center justify-between" style={{ marginBottom: 16 }}>
            <h3>Recent Inspections</h3>
            <Link href="/dashboard/inspections" className="btn btn-secondary btn-sm">View All</Link>
          </div>
          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr>
                  <th>Road</th>
                  <th>Severity</th>
                  <th>AI Score</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {recentInspections.map((ins) => (
                  <tr key={ins.id}>
                    <td className="font-semibold">{ins.road.name}</td>
                    <td>
                      <span className={`badge badge-${ins.severityLevel.toLowerCase()}`}>
                        {ins.severityLevel}
                      </span>
                    </td>
                    <td>{ins.aiScore}%</td>
                    <td>{new Date(ins.date).toLocaleDateString()}</td>
                  </tr>
                ))}
                {recentInspections.length === 0 && (
                  <tr>
                    <td colSpan={4} style={{ textAlign: 'center', padding: '24px 0' }} className="text-muted">
                      No inspections found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between" style={{ marginBottom: 16 }}>
            <h3>Quick Actions</h3>
          </div>
          <div className="grid-2">
            <Link href="/dashboard/roads/new" className="card card-sm text-center" style={{ display: 'block', textDecoration: 'none' }}>
              <div className="font-semibold">Add New Road</div>
              <div className="text-xs text-muted mt-1">Register a new road</div>
            </Link>
            <Link href="/dashboard/map" className="card card-sm text-center" style={{ display: 'block', textDecoration: 'none' }}>
              <div className="font-semibold">Map View</div>
              <div className="text-xs text-muted mt-1">Geospatial overview</div>
            </Link>
            <Link href="/dashboard/compare" className="card card-sm text-center" style={{ display: 'block', textDecoration: 'none' }}>
              <div className="font-semibold">Compare Roads</div>
              <div className="text-xs text-muted mt-1">Side-by-side analysis</div>
            </Link>
            <Link href="/dashboard/analytics" className="card card-sm text-center" style={{ display: 'block', textDecoration: 'none' }}>
              <div className="font-semibold">Analytics</div>
              <div className="text-xs text-muted mt-1">System trends</div>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

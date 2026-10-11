import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { getStatusColor, getStatusBg } from '@/lib/utils'

export default async function RoadsPage() {
  const roads = await prisma.road.findMany({
    orderBy: { healthScore: 'asc' },
    include: {
      _count: { select: { inspections: true } }
    }
  })

  return (
    <div className="flex-col gap-6" style={{ display: 'flex' }}>
      <div className="flex items-center justify-between">
        <div>
          <h2>Road Network</h2>
          <p>Manage and monitor all registered roads.</p>
        </div>
        <Link href="/dashboard/roads/new" className="btn btn-primary">
          <span>+</span> Add Road
        </Link>
      </div>

      <div className="card">
        <div className="table-wrapper">
          <table className="table">
            <thead>
              <tr>
                <th>Road Name</th>
                <th>Location</th>
                <th>Status</th>
                <th>Health</th>
                <th>Length</th>
                <th>Inspections</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {roads.map((road) => (
                <tr key={road.id}>
                  <td className="font-semibold">{road.name}</td>
                  <td className="text-muted">{road.city}</td>
                  <td>
                    <span 
                      className="badge" 
                      style={{ 
                        background: getStatusBg(road.status), 
                        color: getStatusColor(road.status),
                        borderColor: getStatusColor(road.status)
                      }}
                    >
                      {road.status}
                    </span>
                  </td>
                  <td>
                    <div className="flex items-center gap-2">
                      <div style={{ width: 60, height: 6, background: 'var(--bg-tertiary)', borderRadius: 3, overflow: 'hidden' }}>
                        <div 
                          style={{ 
                            height: '100%', 
                            width: `${road.healthScore}%`, 
                            background: getStatusColor(road.status) 
                          }} 
                        />
                      </div>
                      <span className="text-xs font-semibold">{road.healthScore}</span>
                    </div>
                  </td>
                  <td>{road.lengthKm.toFixed(1)} km</td>
                  <td>{road._count.inspections}</td>
                  <td>
                    <Link href={`/dashboard/roads/${road.id}`} className="btn btn-secondary btn-sm">
                      View
                    </Link>
                  </td>
                </tr>
              ))}
              {roads.length === 0 && (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '24px 0' }} className="text-muted">
                    No roads registered in the system.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

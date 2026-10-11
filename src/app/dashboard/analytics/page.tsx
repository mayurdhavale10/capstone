'use client'

import { useEffect, useState } from 'react'
import { PieChart, Pie, Cell, Tooltip as RechartsTooltip, ResponsiveContainer, Legend } from 'recharts'

export default function AnalyticsPage() {
  const [roads, setRoads] = useState<any[]>([])
  
  useEffect(() => {
    fetch('/api/roads')
      .then(res => res.json())
      .then(data => setRoads(Array.isArray(data) ? data : []))
  }, [])

  const statusCount = roads.reduce((acc: any, road: any) => {
    acc[road.status] = (acc[road.status] || 0) + 1
    return acc
  }, {})

  const pieData = [
    { name: 'Good', value: statusCount['GOOD'] || 0, color: 'var(--accent-green)' },
    { name: 'Fair', value: statusCount['FAIR'] || 0, color: 'var(--accent-yellow)' },
    { name: 'Poor', value: statusCount['POOR'] || 0, color: 'var(--accent-orange)' },
    { name: 'Critical', value: statusCount['CRITICAL'] || 0, color: 'var(--accent-red)' },
  ].filter(d => d.value > 0)

  const leaderboard = [...roads].sort((a, b) => a.healthScore - b.healthScore) // Worst first

  return (
    <div className="flex-col gap-6" style={{ display: 'flex' }}>
      <div>
        <h2>System Analytics</h2>
        <p>Overall network health distribution and critical road rankings.</p>
      </div>

      <div className="grid-2">
        <div className="card flex-col gap-4">
          <h3>Health Distribution</h3>
          <div style={{ height: 350, width: '100%' }}>
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={80}
                    outerRadius={120}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <RechartsTooltip 
                    contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border-primary)', borderRadius: 8 }}
                  />
                  <Legend verticalAlign="bottom" height={36} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-muted">No data available</div>
            )}
          </div>
        </div>

        <div className="card flex-col gap-4">
          <h3>Road Leaderboard (Worst to Best)</h3>
          <div className="table-wrapper" style={{ maxHeight: 350, overflowY: 'auto' }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Rank</th>
                  <th>Road</th>
                  <th>Score</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {leaderboard.map((road, idx) => (
                  <tr key={road.id}>
                    <td className="font-bold text-muted">#{idx + 1}</td>
                    <td className="font-semibold">{road.name}</td>
                    <td>{road.healthScore}</td>
                    <td>
                      <span className={`badge badge-${road.status.toLowerCase()}`}>
                        {road.status}
                      </span>
                    </td>
                  </tr>
                ))}
                {leaderboard.length === 0 && (
                  <tr>
                    <td colSpan={4} className="text-center text-muted" style={{ padding: '24px 0' }}>No roads found</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}

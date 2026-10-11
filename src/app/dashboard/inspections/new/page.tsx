'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { formatCurrency } from '@/lib/utils'

export default function NewInspectionPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const initialRoadId = searchParams.get('roadId') || ''

  const [roads, setRoads] = useState<any[]>([])
  const [roadId, setRoadId] = useState(initialRoadId)
  const [image, setImage] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [aiResult, setAiResult] = useState<any>(null)
  const [error, setError] = useState('')
  
  // Form fields
  const [notes, setNotes] = useState('')
  const [weatherCond, setWeatherCond] = useState('Clear')
  const [trafficLoad, setTrafficLoad] = useState('Medium')
  const [drainageObserved, setDrainageObserved] = useState('')
  const [waterlogging, setWaterlogging] = useState(false)

  useEffect(() => {
    fetch('/api/roads')
      .then(res => res.json())
      .then(data => setRoads(Array.isArray(data) ? data : []))
      .catch(err => console.error('Failed to load roads', err))
  }, [])

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      setImage(event.target?.result as string)
      setAiResult(null)
    }
    reader.readAsDataURL(file)
  }

  const runAiAnalysis = async () => {
    if (!image) return
    setAnalyzing(true)
    setError('')
    
    try {
      const res = await fetch('/api/ai/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image })
      })
      
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Analysis failed')
      
      setAiResult(data)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setAnalyzing(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!roadId) return setError('Please select a road')
    if (!aiResult) return setError('Please run AI analysis first')

    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/inspections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roadId,
          imageUrl: image,
          aiScore: aiResult.aiScore,
          damageTypes: aiResult.damageTypes,
          severityLevel: aiResult.severity,
          notes,
          weatherCond,
          trafficLoad,
          // Only sent when observed, so the road's recorded condition isn't overwritten with a guess
          ...(drainageObserved && { drainageObserved, waterlogging }),
          causeAnalysis: aiResult.causeAnalysis,
          maintenanceEst: aiResult.maintenanceEst
        })
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to submit inspection')
      }

      router.push('/dashboard/inspections')
      router.refresh()
    } catch (err: any) {
      setError(err.message)
      setLoading(false)
    }
  }

  return (
    <div className="flex-col gap-6" style={{ display: 'flex', maxWidth: 1000, margin: '0 auto' }}>
      <div>
        <h2>Submit Inspection</h2>
        <p>Upload a road image and let AI analyze the pavement condition.</p>
      </div>

      <div className="grid-2">
        <div className="card flex-col gap-4">
          <h3>1. Image & AI Analysis</h3>
          
          <div className="form-group">
            <label className="form-label">Road Image</label>
            <input 
              type="file" 
              accept="image/*" 
              onChange={handleImageUpload} 
              className="input" 
            />
          </div>

          {image && (
            <div style={{ position: 'relative', width: '100%', height: 300, borderRadius: 'var(--radius-sm)', overflow: 'hidden', border: '1px solid var(--border-secondary)' }}>
              <img src={image} alt="Upload preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
          )}

          <button 
            type="button" 
            className="btn btn-secondary w-full justify-center" 
            onClick={runAiAnalysis}
            disabled={!image || analyzing}
          >
            {analyzing ? 'Analyzing with Roboflow...' : 'Run AI Analysis'}
          </button>

          {error && <div className="badge badge-critical text-sm" style={{ padding: '8px', width: '100%' }}>{error}</div>}
        </div>

        <div className="card flex-col gap-4">
          <h3>2. Inspection Details</h3>
          
          <form onSubmit={handleSubmit} className="flex-col gap-4">
            <div className="form-group">
              <label className="form-label">Target Road</label>
              <select 
                className="select" 
                value={roadId} 
                onChange={(e) => setRoadId(e.target.value)}
                required
              >
                <option value="">-- Select a Road --</option>
                {roads.map(r => (
                  <option key={r.id} value={r.id}>{r.name} ({r.city})</option>
                ))}
              </select>
            </div>

            {aiResult && (
              <div style={{ background: 'var(--bg-primary)', padding: 16, borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-secondary)' }}>
                <h4 style={{ marginBottom: 12 }}>AI Results</h4>
                {aiResult.simulated && (
                  <div className="badge badge-moderate" style={{ padding: '8px 10px', marginBottom: 12, whiteSpace: 'normal' }}>
                    Simulated result — the Roboflow model was not reached (missing API key or network error).
                    These numbers are sample data, not an analysis of your photo.
                  </div>
                )}
                <div className="grid-2" style={{ gap: 12, marginBottom: 12 }}>
                  <div>
                    <div className="text-xs text-muted">Severity</div>
                    <div className={`badge badge-${aiResult.severity.toLowerCase()}`}>{aiResult.severity}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted">AI Score</div>
                    <div className="font-bold">{aiResult.aiScore}%</div>
                  </div>
                </div>
                
                <div className="text-xs text-muted">Detected Damage Types:</div>
                <div className="flex gap-2" style={{ flexWrap: 'wrap', margin: '4px 0 12px' }}>
                  {aiResult.damageTypes.length > 0 ? (
                    aiResult.damageTypes.map((d: string) => (
                      <span key={d} className="badge" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-secondary)' }}>{d}</span>
                    ))
                  ) : (
                    <span className="text-sm text-secondary">None detected (Good condition)</span>
                  )}
                </div>

                <div className="text-xs text-muted">Probable Cause:</div>
                <p className="text-sm text-secondary" style={{ marginBottom: 12 }}>{aiResult.causeAnalysis}</p>
                
                <div className="text-xs text-muted">Est. Maintenance Cost:</div>
                <div className="font-bold" style={{ color: 'var(--accent-red)' }}>{formatCurrency(aiResult.maintenanceEst)}</div>
              </div>
            )}

            <div className="grid-2" style={{ gap: 16 }}>
              <div className="form-group">
                <label className="form-label">Weather Conditions</label>
                <select className="select" value={weatherCond} onChange={(e) => setWeatherCond(e.target.value)}>
                  <option>Clear</option>
                  <option>Rain</option>
                  <option>Snow</option>
                  <option>Cloudy</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Traffic Load</label>
                <select className="select" value={trafficLoad} onChange={(e) => setTrafficLoad(e.target.value)}>
                  <option>Low</option>
                  <option>Medium</option>
                  <option>High</option>
                  <option>Heavy/Commercial</option>
                </select>
              </div>
            </div>

            <div className="grid-2" style={{ gap: 16 }}>
              <div className="form-group">
                <label className="form-label">Drainage Observed</label>
                <select className="select" value={drainageObserved} onChange={(e) => setDrainageObserved(e.target.value)}>
                  <option value="">Not checked</option>
                  <option value="GOOD">Good — drains clear</option>
                  <option value="PARTIALLY_BLOCKED">Partially blocked</option>
                  <option value="BLOCKED">Blocked / silted</option>
                  <option value="NONE">No drainage</option>
                </select>
              </div>
              <label className="flex items-center gap-2 text-sm" style={{ alignSelf: 'end', paddingBottom: 10 }}>
                <input
                  type="checkbox"
                  checked={waterlogging}
                  disabled={!drainageObserved}
                  onChange={(e) => setWaterlogging(e.target.checked)}
                />
                Water pooling on road
              </label>
            </div>

            <div className="form-group">
              <label className="form-label">Inspector Notes (Optional)</label>
              <textarea 
                className="textarea" 
                placeholder="Add manual observations..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>

            <button 
              type="submit" 
              className="btn btn-primary w-full" 
              disabled={loading || !aiResult || !roadId}
              style={{ marginTop: 8 }}
            >
              {loading ? 'Saving...' : 'Submit Inspection Report'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

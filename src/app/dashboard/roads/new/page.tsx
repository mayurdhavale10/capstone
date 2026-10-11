'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Save, Sparkles, MapPin, Layers, Truck, Calendar, Ruler } from 'lucide-react'
import styles from './new-road.module.css'

export default function NewRoadPage() {
  const router = useRouter()

  const [name, setName] = useState('')
  const [location, setLocation] = useState('')
  const [city, setCity] = useState('')
  const [state, setState] = useState('')
  const [lat, setLat] = useState('')
  const [lng, setLng] = useState('')
  const [lengthKm, setLengthKm] = useState('')
  const [material, setMaterial] = useState('Asphalt Concrete')
  const [trafficVolume, setTrafficVolume] = useState('Urban Arterial (15,000 - 35,000 AADT)')
  const [constructedAt, setConstructedAt] = useState('2021-06-15')
  const [description, setDescription] = useState('')

  // Site conditions
  const [drainageCondition, setDrainageCondition] = useState('UNKNOWN')
  const [waterlogging, setWaterlogging] = useState(false)
  const [rainfallZone, setRainfallZone] = useState('MODERATE')
  const [soilType, setSoilType] = useState('UNKNOWN')
  const [pavementThicknessMm, setPavementThicknessMm] = useState('')

  // Contract & warranty
  const [contractorName, setContractorName] = useState('')
  const [tenderId, setTenderId] = useState('')
  const [contractCost, setContractCost] = useState('')
  const [lastRepairAt, setLastRepairAt] = useState('')
  const [lastRepairType, setLastRepairType] = useState('')
  const [defectLiabilityYears, setDefectLiabilityYears] = useState('')

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleFillDemoData = () => {
    setName('Nagar Road (Wagholi stretch)')
    setLocation('Kharadi Bypass to Wagholi, SH-60 KM 6.0–14.4')
    setCity('Pune')
    setState('MH')
    setLat('18.5806')
    setLng('73.9665')
    setLengthKm('8.4')
    setMaterial('Asphalt Concrete')
    setTrafficVolume('Heavy Industrial / Freight Corridor (> 35,000 AADT)')
    setConstructedAt('2014-08-10')
    setDescription('Multi-lane freight corridor towards Ahmednagar with heavy truck traffic and frequent monsoon waterlogging near Wagholi.')
    setDrainageCondition('PARTIALLY_BLOCKED')
    setWaterlogging(true)
    setRainfallZone('MODERATE')
    setSoilType('BLACK_COTTON')
    setPavementThicknessMm('40')
    setContractorName('Deccan Road Works')
    setTenderId('PWD/MH/2023/301')
    setContractCost('34000000')
    setLastRepairAt('2023-12-01')
    setLastRepairType('Bituminous overlay')
    setDefectLiabilityYears('3')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError(null)

    if (!name || !location || !city || !lat || !lng || !lengthKm) {
      setError('Please provide all required asset fields.')
      setSubmitting(false)
      return
    }

    try {
      const res = await fetch('/api/roads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          location,
          city,
          state,
          lat: parseFloat(lat),
          lng: parseFloat(lng),
          lengthKm: parseFloat(lengthKm),
          material,
          trafficVolume,
          constructedAt,
          description,
          drainageCondition,
          waterlogging,
          rainfallZone,
          soilType,
          pavementThicknessMm,
          contractorName,
          tenderId,
          contractCost,
          lastRepairAt,
          lastRepairType,
          defectLiabilityYears,
        })
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Failed to register road segment')
      }

      router.push(`/dashboard/roads/${data.id}`)
      router.refresh()
    } catch (err: any) {
      setError(err.message)
      setSubmitting(false)
    }
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Register Road Segment</h1>
          <p className={styles.subtitle}>
            Enter pavement design specifications, centerline GPS, and operational traffic parameters.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button 
            type="button" 
            onClick={handleFillDemoData}
            className={styles.presetBtn}
            title="Auto-fill with sample engineering corridor"
          >
            <Sparkles size={12} style={{ display: 'inline', marginRight: 4 }} />
            Populate Demo Preset
          </button>
          <Link href="/dashboard/roads" className="btn btn-secondary btn-sm">
            <ArrowLeft size={15} /> Cancel
          </Link>
        </div>
      </div>

      {error && (
        <div className="badge badge-critical" style={{ padding: '10px 14px', borderRadius: 6, fontSize: 13 }}>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className={styles.formCard}>
        {/* Basic Identification */}
        <div className="flex-col gap-3">
          <div className={styles.sectionTitle}>1. Asset Identification & Location</div>
          
          <div className="form-group">
            <label className="form-label">Road / Corridor Name *</label>
            <input 
              type="text" 
              className="input" 
              placeholder="e.g. State Highway 44 - Southern Bypass" 
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Segment Extents / Chainage *</label>
            <input 
              type="text" 
              className="input" 
              placeholder="e.g. Section KM 12.0 to 24.5" 
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              required
            />
          </div>

          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">City / Municipality *</label>
              <input 
                type="text" 
                className="input" 
                placeholder="e.g. Austin" 
                value={city}
                onChange={(e) => setCity(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">State / Province</label>
              <input 
                type="text" 
                className="input" 
                placeholder="e.g. TX" 
                value={state}
                onChange={(e) => setState(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* GPS Coordinates & Geometry */}
        <div className="flex-col gap-3">
          <div className={styles.sectionTitle}>2. Geospatial Position & Length</div>

          <div className="grid-3">
            <div className="form-group">
              <label className="form-label">Centerline Latitude *</label>
              <input 
                type="number" 
                step="any"
                className="input" 
                placeholder="e.g. 30.2672" 
                value={lat}
                onChange={(e) => setLat(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Centerline Longitude *</label>
              <input 
                type="number" 
                step="any"
                className="input" 
                placeholder="e.g. -97.7431" 
                value={lng}
                onChange={(e) => setLng(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Total Length (km) *</label>
              <input 
                type="number" 
                step="0.1"
                min="0.1"
                className="input" 
                placeholder="e.g. 12.5" 
                value={lengthKm}
                onChange={(e) => setLengthKm(e.target.value)}
                required
              />
            </div>
          </div>
        </div>

        {/* Material & Engineering Specifications */}
        <div className="flex-col gap-3">
          <div className={styles.sectionTitle}>3. Structural Profile & Traffic Volume</div>

          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Surface Material Type *</label>
              <select 
                className="select" 
                value={material} 
                onChange={(e) => setMaterial(e.target.value)}
              >
                <option value="Asphalt Concrete">Asphalt Concrete (Hot Mix Asphalt)</option>
                <option value="Portland Cement Concrete">Portland Cement Concrete (Rigid)</option>
                <option value="Stone Matrix Asphalt (SMA)">Stone Matrix Asphalt (SMA)</option>
                <option value="Bituminous Surface Treatment">Bituminous Surface Treatment (Chip Seal)</option>
                <option value="Composite (Asphalt over Concrete)">Composite (Asphalt over Concrete)</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Traffic Classification *</label>
              <select 
                className="select" 
                value={trafficVolume} 
                onChange={(e) => setTrafficVolume(e.target.value)}
              >
                <option value="Heavy Industrial / Freight Corridor (> 35,000 AADT)">Heavy Industrial / Freight Corridor (&gt; 35,000 AADT)</option>
                <option value="Urban Arterial (15,000 - 35,000 AADT)">Urban Arterial (15,000 - 35,000 AADT)</option>
                <option value="Commercial Collector (5,000 - 15,000 AADT)">Commercial Collector (5,000 - 15,000 AADT)</option>
                <option value="Residential / Local Access (< 5,000 AADT)">Residential / Local Access (&lt; 5,000 AADT)</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Original Construction Date *</label>
            <input 
              type="date" 
              className="input" 
              value={constructedAt}
              onChange={(e) => setConstructedAt(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Pavement Description & Notes</label>
            <textarea 
              className="textarea" 
              rows={3}
              placeholder="Provide background context on the corridor, local issues, or past maintenance treatments..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
        </div>

        {/* Site Conditions */}
        <div className="flex-col gap-3">
          <div className={styles.sectionTitle}>4. Drainage & Site Conditions</div>

          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Drainage Condition</label>
              <select className="select" value={drainageCondition} onChange={(e) => setDrainageCondition(e.target.value)}>
                <option value="GOOD">Good — drains clear</option>
                <option value="PARTIALLY_BLOCKED">Partially blocked</option>
                <option value="BLOCKED">Blocked / silted</option>
                <option value="NONE">No drainage</option>
                <option value="UNKNOWN">Not surveyed</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Rainfall Zone</label>
              <select className="select" value={rainfallZone} onChange={(e) => setRainfallZone(e.target.value)}>
                <option value="LOW">Low (&lt; 750 mm/yr)</option>
                <option value="MODERATE">Moderate (750–1500 mm/yr)</option>
                <option value="HIGH">High (1500–2500 mm/yr)</option>
                <option value="VERY_HIGH">Very high (&gt; 2500 mm/yr)</option>
              </select>
            </div>
          </div>

          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Subgrade Soil Type</label>
              <select className="select" value={soilType} onChange={(e) => setSoilType(e.target.value)}>
                <option value="ROCKY">Rocky</option>
                <option value="GRAVEL">Gravel / murrum</option>
                <option value="SANDY">Sandy</option>
                <option value="LOAMY">Loamy</option>
                <option value="CLAY">Clay</option>
                <option value="BLACK_COTTON">Black cotton (expansive)</option>
                <option value="UNKNOWN">Not surveyed</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Bituminous Layer Thickness (mm)</label>
              <input
                type="number"
                min="0"
                className="input"
                placeholder="e.g. 40"
                value={pavementThicknessMm}
                onChange={(e) => setPavementThicknessMm(e.target.value)}
              />
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={waterlogging} onChange={(e) => setWaterlogging(e.target.checked)} />
            Water pools on this road after rain (waterlogging)
          </label>
        </div>

        {/* Contract & Warranty */}
        <div className="flex-col gap-3">
          <div className={styles.sectionTitle}>5. Contract & Warranty (optional)</div>

          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Contractor Name</label>
              <input type="text" className="input" placeholder="e.g. Shree Infra Builders" value={contractorName} onChange={(e) => setContractorName(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Tender / Work Order ID</label>
              <input type="text" className="input" placeholder="e.g. PMC/RD/2024/117" value={tenderId} onChange={(e) => setTenderId(e.target.value)} />
            </div>
          </div>

          <div className="grid-3">
            <div className="form-group">
              <label className="form-label">Contract Value (₹)</label>
              <input type="number" min="0" className="input" placeholder="e.g. 42000000" value={contractCost} onChange={(e) => setContractCost(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Last Major Repair Date</label>
              <input type="date" className="input" value={lastRepairAt} onChange={(e) => setLastRepairAt(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Defect Liability Period (years)</label>
              <input type="number" min="0" max="10" className="input" placeholder="e.g. 3" value={defectLiabilityYears} onChange={(e) => setDefectLiabilityYears(e.target.value)} />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Last Repair Type</label>
            <input type="text" className="input" placeholder="e.g. Bituminous overlay, pothole patching" value={lastRepairType} onChange={(e) => setLastRepairType(e.target.value)} />
          </div>
          <p className="text-xs text-muted">
            The warranty runs from the last repair date (or construction date if none). If the road fails inside
            this period, RoadIQ flags the contractor as liable.
          </p>
        </div>

        <div className={styles.footerActions}>
          <Link href="/dashboard/roads" className="btn btn-secondary">
            Cancel
          </Link>
          <button 
            type="submit" 
            className="btn btn-primary"
            disabled={submitting}
          >
            <Save size={16} /> {submitting ? 'Registering Road...' : 'Save Road Segment'}
          </button>
        </div>
      </form>
    </div>
  )
}

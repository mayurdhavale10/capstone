'use client'

import { useState } from 'react'
import { Sliders, Cpu, ShieldAlert, Building2, Save, CheckCircle2 } from 'lucide-react'

export default function AdminSettingsPage() {
  const [agencyName, setAgencyName] = useState('Department of Transportation & Public Works')
  const [divisionCode, setDivisionCode] = useState('DIV-HIGHWAY-04')
  const [standardProtocol, setStandardProtocol] = useState('ASTM D6433 (Pavement Condition Index)')
  
  const [confidenceThreshold, setConfidenceThreshold] = useState(45)
  const [autoDeduction, setAutoDeduction] = useState(true)
  const [modelEndpoint, setModelEndpoint] = useState('road-damage-detection-sxw1k/1')
  
  const [costSqMeter, setCostSqMeter] = useState(24.50)
  const [criticalAlerts, setCriticalAlerts] = useState(true)

  const [saved, setSaved] = useState(false)

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault()
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  return (
    <div className="flex-col gap-6" style={{ display: 'flex', maxWidth: 840 }}>
      <div>
        <h2>System Calibration & Configuration</h2>
        <p>Configure ASTM pavement audit parameters, computer vision sensitivity, and agency profiles.</p>
      </div>

      {saved && (
        <div 
          className="badge" 
          style={{ 
            background: 'var(--accent-primary-light)', 
            color: 'var(--accent-primary)', 
            borderColor: 'var(--accent-primary)',
            padding: '10px 16px',
            fontSize: 13,
            display: 'flex',
            alignItems: 'center',
            gap: 8
          }}
        >
          <CheckCircle2 size={16} />
          Configuration parameters saved and applied across inference pipeline.
        </div>
      )}

      <form onSubmit={handleSave} className="flex-col gap-6" style={{ display: 'flex' }}>
        {/* Section 1: Agency Profile */}
        <div className="card flex-col gap-4">
          <div className="flex items-center gap-2" style={{ borderBottom: '1px solid var(--border-primary)', paddingBottom: 10 }}>
            <Building2 size={18} />
            <h3 style={{ fontSize: 16 }}>Agency Jurisdiction & Standards</h3>
          </div>

          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Agency / Municipality Name</label>
              <input 
                type="text" 
                className="input" 
                value={agencyName}
                onChange={(e) => setAgencyName(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Division Identifier</label>
              <input 
                type="text" 
                className="input" 
                value={divisionCode}
                onChange={(e) => setDivisionCode(e.target.value)}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Inspection & Pavement Audit Standard</label>
            <select 
              className="select"
              value={standardProtocol}
              onChange={(e) => setStandardProtocol(e.target.value)}
            >
              <option value="ASTM D6433 (Pavement Condition Index)">ASTM D6433 (Pavement Condition Index - PCI)</option>
              <option value="AASHTO PP 44 (Quantifying Cracks in Asphalt)">AASHTO PP 44 (Quantifying Cracks in Asphalt)</option>
              <option value="IRC 82:2015 (Maintenance of Bituminous Roads)">IRC 82:2015 (Maintenance of Bituminous Roads)</option>
            </select>
          </div>
        </div>

        {/* Section 2: AI Computer Vision Parameters */}
        <div className="card flex-col gap-4">
          <div className="flex items-center gap-2" style={{ borderBottom: '1px solid var(--border-primary)', paddingBottom: 10 }}>
            <Cpu size={18} />
            <h3 style={{ fontSize: 16 }}>Roboflow Computer Vision Pipeline</h3>
          </div>

          <div className="form-group">
            <label className="form-label">Active Model Endpoint</label>
            <input 
              type="text" 
              className="input font-mono text-xs" 
              value={modelEndpoint}
              onChange={(e) => setModelEndpoint(e.target.value)}
            />
          </div>

          <div className="form-group">
            <div className="flex justify-between items-center" style={{ marginBottom: 6 }}>
              <label className="form-label" style={{ margin: 0 }}>
                Confidence Threshold Cutoff: <strong>{confidenceThreshold}%</strong>
              </label>
              <span className="text-secondary text-xs">Recommended: 40-50%</span>
            </div>
            <input 
              type="range" 
              min="20" 
              max="80" 
              step="5"
              className="w-full"
              value={confidenceThreshold}
              onChange={(e) => setConfidenceThreshold(parseInt(e.target.value))}
            />
          </div>

          <div className="flex items-center gap-3" style={{ marginTop: 4 }}>
            <input 
              type="checkbox" 
              id="autoDeduction"
              checked={autoDeduction}
              onChange={(e) => setAutoDeduction(e.target.checked)}
              style={{ width: 16, height: 16, cursor: 'pointer' }}
            />
            <label htmlFor="autoDeduction" className="text-sm cursor-pointer">
              Automatically calculate ASTM PCI score deduction based on distress density and severity.
            </label>
          </div>
        </div>

        {/* Section 3: Cost Modeling & Health Thresholds */}
        <div className="card flex-col gap-4">
          <div className="flex items-center gap-2" style={{ borderBottom: '1px solid var(--border-primary)', paddingBottom: 10 }}>
            <Sliders size={18} />
            <h3 style={{ fontSize: 16 }}>Economic Modeling & Risk Alerts</h3>
          </div>

          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Base Resurfacing Cost ($ / m²)</label>
              <input 
                type="number" 
                step="0.5"
                className="input" 
                value={costSqMeter}
                onChange={(e) => setCostSqMeter(parseFloat(e.target.value) || 0)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Critical Deterioration Alerts</label>
              <div className="flex items-center gap-2" style={{ marginTop: 10 }}>
                <input 
                  type="checkbox" 
                  id="criticalAlerts"
                  checked={criticalAlerts}
                  onChange={(e) => setCriticalAlerts(e.target.checked)}
                  style={{ width: 16, height: 16, cursor: 'pointer' }}
                />
                <label htmlFor="criticalAlerts" className="text-sm cursor-pointer">
                  Trigger automated dispatch when PCI falls below 25.
                </label>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <button type="submit" className="btn btn-primary">
            <Save size={16} /> Save Settings
          </button>
        </div>
      </form>
    </div>
  )
}

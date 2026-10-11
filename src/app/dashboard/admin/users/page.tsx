'use client'

import { useState, useEffect } from 'react'
import { UserPlus, Shield, UserCheck, Eye, X, Check, Search } from 'lucide-react'
import styles from './users.module.css'

interface UserItem {
  id: string
  name: string | null
  email: string
  role: string
  createdAt: string
  _count?: {
    inspections: number
  }
}

export default function UsersAdminPage() {
  const [users, setUsers] = useState<UserItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)

  // New user form state
  const [newName, setNewName] = useState('')
  const [newEmail, setNewEmail] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [newRole, setNewRole] = useState('INSPECTOR')
  const [creating, setCreating] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const fetchUsers = () => {
    setLoading(true)
    fetch('/api/admin/users')
      .then(async (res) => {
        if (!res.ok) throw new Error('Failed to load user roster')
        return res.json()
      })
      .then((data) => {
        setUsers(Array.isArray(data) ? data : [])
        setLoading(false)
      })
      .catch((err) => {
        setError(err.message)
        setLoading(false)
      })
  }

  useEffect(() => {
    fetchUsers()
  }, [])

  const handleRoleChange = async (userId: string, newRoleValue: string) => {
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: userId, role: newRoleValue })
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to update role')
      }
      setUsers(users.map(u => u.id === userId ? { ...u, role: newRoleValue } : u))
    } catch (err: any) {
      alert(`Error updating role: ${err.message}`)
    }
  }

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)
    setCreating(true)

    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newName,
          email: newEmail,
          password: newPassword,
          role: newRole
        })
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to create user')

      setShowModal(false)
      setNewName('')
      setNewEmail('')
      setNewPassword('')
      setNewRole('INSPECTOR')
      fetchUsers()
    } catch (err: any) {
      setFormError(err.message)
    } finally {
      setCreating(false)
    }
  }

  const filteredUsers = users.filter(u => 
    !search || 
    (u.name || '').toLowerCase().includes(search.toLowerCase()) || 
    u.email.toLowerCase().includes(search.toLowerCase()) ||
    u.role.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Personnel & Access Control</h1>
          <p className={styles.subtitle}>
            Manage authenticated civil engineers, field inspectors, and agency viewers.
          </p>
        </div>
        <button 
          type="button" 
          className="btn btn-primary"
          onClick={() => setShowModal(true)}
        >
          <UserPlus size={16} /> Add Personnel
        </button>
      </div>

      <div className="card">
        <div className="flex items-center justify-between" style={{ marginBottom: 16 }}>
          <div className="flex items-center gap-2">
            <input 
              type="text" 
              placeholder="Search personnel by name or email..." 
              className="input" 
              style={{ minWidth: 280 }}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="text-secondary text-xs">
            Total Staff: <strong>{users.length}</strong>
          </div>
        </div>

        <div className="table-wrapper">
          <table className="table">
            <thead>
              <tr>
                <th>Personnel Name</th>
                <th>Email Address</th>
                <th>Assigned Role</th>
                <th>Inspections Logged</th>
                <th>Created</th>
                <th style={{ textAlign: 'right' }}>Modify Role</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '36px 0' }} className="text-muted">
                    Loading personnel records...
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '36px 0' }} className="text-muted">
                    No personnel found matching query.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr key={user.id}>
                    <td className="font-semibold">
                      {user.name || 'Unnamed Personnel'}
                    </td>
                    <td className="text-secondary font-mono text-xs">
                      {user.email}
                    </td>
                    <td>
                      <span 
                        className="badge"
                        style={{
                          background: user.role === 'ADMIN' ? '#344653' : user.role === 'INSPECTOR' ? '#E8EDF1' : '#F7F7F4',
                          color: user.role === 'ADMIN' ? '#FFFFFF' : '#344653',
                          border: '1px solid var(--border-primary)',
                          fontSize: 11,
                          padding: '3px 8px'
                        }}
                      >
                        {user.role}
                      </span>
                    </td>
                    <td className="text-xs">
                      {user._count?.inspections ?? 0} audits
                    </td>
                    <td className="text-secondary text-xs">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <select 
                        className={styles.roleSelect}
                        value={user.role}
                        onChange={(e) => handleRoleChange(user.id, e.target.value)}
                      >
                        <option value="ADMIN">ADMIN</option>
                        <option value="INSPECTOR">INSPECTOR</option>
                        <option value="VIEWER">VIEWER</option>
                      </select>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add User Modal */}
      {showModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalCard}>
            <div className="flex items-center justify-between">
              <h3 className={styles.modalTitle}>Add Engineering Personnel</h3>
              <button 
                type="button" 
                onClick={() => setShowModal(false)}
                className="btn btn-secondary btn-sm"
                style={{ padding: 4 }}
              >
                <X size={16} />
              </button>
            </div>

            {formError && (
              <div className="badge badge-critical" style={{ padding: '8px 12px' }}>
                {formError}
              </div>
            )}

            <form onSubmit={handleCreateUser} className="flex-col gap-3">
              <div className="form-group">
                <label className="form-label">Full Name</label>
                <input 
                  type="text" 
                  className="input" 
                  placeholder="e.g. Sarah Jenkins, PE" 
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Official Email</label>
                <input 
                  type="email" 
                  className="input" 
                  placeholder="s.jenkins@roadiq.gov" 
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Temporary Password</label>
                <input 
                  type="password" 
                  className="input" 
                  placeholder="••••••••" 
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Role Classification</label>
                <select 
                  className="select" 
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value)}
                >
                  <option value="ADMIN">Admin (Full system and personnel control)</option>
                  <option value="INSPECTOR">Inspector (Conduct AI audits & register roads)</option>
                  <option value="VIEWER">Viewer (Read-only intelligence access)</option>
                </select>
              </div>

              <div className="flex justify-end gap-2" style={{ marginTop: 12 }}>
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={() => setShowModal(false)}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn btn-primary"
                  disabled={creating}
                >
                  {creating ? 'Saving...' : 'Create Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

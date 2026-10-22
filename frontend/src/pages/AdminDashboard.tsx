import React, { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import { demoReports } from '../demoReports'
import './AdminDashboard.css'

type AdminDashboardProps = {
  readOnlyDemo?: boolean
}

export default function AdminDashboard({ readOnlyDemo = false }: AdminDashboardProps) {
  const [reports, setReports] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [requestStatus, setRequestStatus] = useState<'loading' | 'none' | 'pending' | 'error'>('loading')
  const [requestEmail, setRequestEmail] = useState('')
  const [organization, setOrganization] = useState('')
  const [requestReason, setRequestReason] = useState('')
  const [requestMessage, setRequestMessage] = useState('')
  const [requestError, setRequestError] = useState('')
  const [isSubmittingRequest, setIsSubmittingRequest] = useState(false)

  // 1. 載入所有通報資料
  const fetchReports = async () => {
    setLoading(true)
    setLoadError('')
    if (readOnlyDemo) {
      setReports(demoReports)
      setLoading(false)
      return
    }
    if (!supabase) {
      setLoadError('Supabase is not configured. Add the project URL and anon key to frontend/.env.')
      setLoading(false)
      return
    }

    const { data, error } = await supabase
      .from('reports')
      .select('*')
      .order('id', { ascending: false }) // 最新建立的排在最前面

    if (error) {
      console.error("Failed to load reports:", error)
      setLoadError('Unable to load reports. Confirm that the reports RLS policies are installed and your municipal account is approved.')
    } else {
      setReports(data || [])
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchReports()
  }, [readOnlyDemo])

  useEffect(() => {
    if (!readOnlyDemo) return
    if (!supabase) {
      setRequestStatus('error')
      setRequestError('Supabase is not configured. Access requests cannot be loaded.')
      return
    }

    let isMounted = true
    const loadAccessRequest = async () => {
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (userError || !user) {
        if (!isMounted) return
        console.error('Failed to verify the municipal user:', userError)
        setRequestStatus('error')
        setRequestError('Unable to verify your account. Please sign in again.')
        return
      }

      const { data, error } = await supabase
        .from('municipal_access_requests')
        .select('requested_at, email')
        .eq('user_id', user.id)
        .maybeSingle()

      if (!isMounted) return
      if (error) {
        console.error('Failed to load municipal access request:', error)
        setRequestStatus('error')
        setRequestError('Unable to check your request. Confirm the municipal access request migration has been applied.')
        return
      }

      setRequestStatus(data ? 'pending' : 'none')
      setRequestEmail(data?.email ?? user.email ?? '')
    }

    void loadAccessRequest()
    return () => {
      isMounted = false
    }
  }, [readOnlyDemo])

  const handleAccessRequest = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setRequestError('')
    setRequestMessage('')
    if (!supabase) {
      setRequestError('Supabase is not configured. Access requests cannot be submitted.')
      return
    }

    setIsSubmittingRequest(true)
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (userError) throw userError
      if (!user) throw new Error('Please sign in again before submitting an access request.')

      const { error } = await supabase
        .from('municipal_access_requests')
        .insert({
          user_id: user.id,
          organization: organization.trim(),
          reason: requestReason.trim(),
        })

      if (error) throw error
      setRequestStatus('pending')
      setRequestMessage('Your request has been submitted for administrator review. This does not grant access to real reports.')
    } catch (error) {
      console.error('Failed to submit municipal access request:', error)
      setRequestError(error instanceof Error
        ? error.message
        : 'Unable to submit your request. Please try again.')
    } finally {
      setIsSubmittingRequest(false)
    }
  }

  // 2. 更新通報狀態 (例如從 pending 改成 resolved)
  const handleStatusChange = async (id: number, newStatus: string) => {
    if (readOnlyDemo || !supabase) return
    const { error } = await supabase
      .from('reports')
      .update({ status: newStatus })
      .eq('id', id)

    if (error) {
      console.error('Failed to update report status:', error)
      alert(`Unable to update report: ${error.message}`)
    } else {
      // 重新整理列表
      fetchReports()
    }
  }

  // 3. 刪除通報
  const handleDelete = async (id: number) => {
    if (readOnlyDemo || !supabase) return
    if (!window.confirm("Are you sure you want to delete this report?")) return

    const { error } = await supabase
      .from('reports')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Failed to delete report:', error)
      alert(`Unable to delete report: ${error.message}`)
    } else {
      fetchReports()
    }
  }

  return (
    <div className="admin-dashboard">
      <div className="admin-dashboard-inner">
        <header className="admin-dashboard-heading">
          <p className="admin-dashboard-eyebrow"><span /> CONCEPCIÓN · CITY OPERATIONS</p>
          <h1>Municipality Admin Dashboard</h1>
          <p>Review and manage citizen reports across the city.</p>
        </header>

        {readOnlyDemo && (
          <>
            <div className="municipal-demo-banner" role="status">
              <strong>READ-ONLY DEMO</strong>
              <span>Sample records only. Sign in with an approved municipal account to access real reports and actions.</span>
            </div>
            <section className="municipal-access-request" aria-labelledby="access-request-title">
              <div>
                <h2 id="access-request-title">Need official city operations access?</h2>
                <p>Submit your organization and reason for access. An administrator must review your request; this form does not grant permissions.</p>
              </div>
              {requestStatus === 'pending' ? (
                <div>
                  <p className="access-request-pending" role="status">Request submitted · Awaiting administrator review</p>
                  {requestEmail && <p className="access-request-email">Application email: {requestEmail}</p>}
                  {requestMessage && <p className="access-request-success">{requestMessage}</p>}
                </div>
              ) : (
                <form className="access-request-form" onSubmit={handleAccessRequest}>
                  <label>
                    <span>ORGANIZATION</span>
                    <input
                      autoComplete="organization"
                      maxLength={160}
                      onChange={(event) => setOrganization(event.target.value)}
                      placeholder="City department or organization"
                      required
                      value={organization}
                    />
                  </label>
                  <label>
                    <span>WHY DO YOU NEED ACCESS?</span>
                    <textarea
                      maxLength={1000}
                      minLength={10}
                      onChange={(event) => setRequestReason(event.target.value)}
                      placeholder="Briefly describe your municipal role and intended use."
                      required
                      rows={3}
                      value={requestReason}
                    />
                  </label>
                  {requestError && <p className="access-request-error" role="alert">{requestError}</p>}
                  {requestMessage && <p className="access-request-success" role="status">{requestMessage}</p>}
                  <button
                    className="access-request-submit"
                    disabled={isSubmittingRequest || requestStatus === 'loading'}
                    type="submit"
                  >
                    {isSubmittingRequest ? 'Submitting...' : 'Request municipal access'}
                  </button>
                </form>
              )}
              {requestStatus === 'error' && !requestError && (
                <p className="access-request-error" role="alert">Unable to check your request status.</p>
              )}
            </section>
          </>
        )}

        {loadError && <p role="alert">{loadError}</p>}

        {loading ? (
          <p>Loading...</p>
        ) : loadError ? null : (
          <div className="admin-report-table-container">
            <table className="admin-report-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Time / Category</th>
                  <th>Reporter</th>
                  <th>Description</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {reports.length === 0 ? (
                  <tr>
                    <td className="admin-report-empty" colSpan={6}>Currently, there are no citizen reports.</td>
                  </tr>
                ) : (
                  reports.map((report) => (
                    <tr key={report.id}>
                      <td className="admin-report-id">#{report.id}</td>
                      <td>
                        <div className="admin-report-time">{report.time}</div>
                        <div className="admin-report-category">{report.category}</div>
                        {report.is_urgent_police && (
                          <span className="admin-report-urgent">Urgent Report</span>
                        )}
                      </td>
                      <td>
                        <div>{report.name}</div>
                        <div className="admin-report-phone">{report.phone}</div>
                      </td>
                      <td className="admin-report-description">
                        {report.text}
                      </td>
                      <td>
                        {readOnlyDemo ? (
                          <span className="demo-status">{report.status || 'pending'} · demo</span>
                        ) : (
                          <select
                            value={report.status || 'pending'}
                            onChange={(e) => handleStatusChange(report.id, e.target.value)}
                          >
                            <option value="pending">Pending (Processing)</option>
                            <option value="in-progress">In Progress (In Progress)</option>
                            <option value="resolved">Resolved (Resolved)</option>
                          </select>
                        )}
                      </td>
                      <td>
                        {readOnlyDemo
                          ? <span className="demo-status">No actions</span>
                          : (
                            <button
                              className="admin-report-delete"
                              onClick={() => handleDelete(report.id)}
                            >
                              Delete
                            </button>
                          )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
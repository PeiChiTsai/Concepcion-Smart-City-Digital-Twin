import React, { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import { demoReports } from '../demoReports'
import './AdminDashboard.css'
import { useI18n } from '../i18n'
import ReportLocationPopup from './ReportLocationPopup'
import ReportProgressPopup from './ReportProgressPopup'
import type { ProgressUpdate } from './ReportProgressPopup'
import DepartmentSelect from './DepartmentSelect'

const toDepartmentList = (value: unknown): string[] => (
  Array.isArray(value) ? value.map(String).filter(Boolean) : value ? [String(value)] : []
)

type AdminDashboardProps = {
  readOnlyDemo?: boolean
}

type ReportStatistics = {
  pending: number
  inProgress: number
  resolved: number
  urgent: number
}

const statusLabels: Record<string, string> = {
  pending: 'Pending',
  'in-progress': 'In progress',
  resolved: 'Resolved',
}

const formatDateTime = (value: unknown) => {
  if (!value) return ''
  const date = new Date(String(value))
  return Number.isNaN(date.getTime())
    ? String(value)
    : date.toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' })
}

export default function AdminDashboard({ readOnlyDemo = false }: AdminDashboardProps) {
  const { t } = useI18n()
  const [reports, setReports] = useState<any[]>([])
  const [mapReport, setMapReport] = useState<{ address: string; latitude: number; longitude: number } | null>(null)
  const [progressUpdates, setProgressUpdates] = useState<ProgressUpdate[]>([])
  const [progressReportId, setProgressReportId] = useState<number | null>(null)
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
      const { data: progressData, error: progressError } = await supabase
        .from('report_progress_updates')
        .select('id, report_id, author_email, note, status, created_at')
        .order('created_at', { ascending: false })
      if (progressError) {
        console.error('Failed to load progress updates:', progressError)
      } else {
        setProgressUpdates(progressData || [])
      }
    }
    setLoading(false)
  }

  const handleAddProgress = async (reportId: number, note: string) => {
    if (!supabase) return
    const { data: { user } } = await supabase.auth.getUser()
    const report = reports.find((item) => item.id === reportId)
    const { data, error } = await supabase
      .from('report_progress_updates')
      .insert({
        report_id: reportId,
        author_id: user?.id,
        author_email: user?.email ?? null,
        note,
        status: report?.status ?? null,
      })
      .select('id, report_id, author_email, note, status, created_at')
      .single()

    if (error) {
      console.error('Failed to add progress update:', error)
      alert(t('Unable to update report: {message}', { message: error.message }))
    } else if (data) {
      setProgressUpdates((current) => [data, ...current])
    }
  }

  const handleDeleteProgress = async (id: number) => {
    if (!supabase) return
    const { error } = await supabase.from('report_progress_updates').delete().eq('id', id)
    if (error) {
      console.error('Failed to delete progress update:', error)
      alert(t('Unable to delete report: {message}', { message: error.message }))
    } else {
      setProgressUpdates((current) => current.filter((update) => update.id !== id))
    }
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
      alert(t('Unable to update report: {message}', { message: error.message }))
    } else {
      // 重新整理列表
      fetchReports()
    }
  }

  const handleDepartmentChange = async (id: number, departments: string[]) => {
    if (readOnlyDemo || !supabase) return
    const { error } = await supabase
      .from('reports')
      .update({ department: departments })
      .eq('id', id)

    if (error) {
      console.error('Failed to update report departments:', error)
      alert(t('Unable to update report: {message}', { message: error.message }))
    } else {
      fetchReports()
    }
  }

  // 3. 刪除通報
  const handleDelete = async (id: number) => {
    if (readOnlyDemo || !supabase) return
    if (!window.confirm(t('Are you sure you want to delete this report?'))) return

    const { error } = await supabase
      .from('reports')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Failed to delete report:', error)
      alert(t('Unable to delete report: {message}', { message: error.message }))
    } else {
      fetchReports()
    }
  }

  const reportStatistics = reports.reduce<ReportStatistics>((counts, report) => {
    const status = String(report.status ?? 'pending').trim().toLowerCase().replace(/\s+/g, '-')
    if (status === 'resolved') counts.resolved += 1
    else if (status === 'in-progress') counts.inProgress += 1
    else counts.pending += 1

    if (
      report.emergency_notification_needed === true
      || report.emergency_notification_needed === 'true'
    ) counts.urgent += 1

    return counts
  }, { pending: 0, inProgress: 0, resolved: 0, urgent: 0 })

  const reportCategoryCounts = reports.reduce<Record<string, number>>((counts, report) => {
    const category = String(report.category ?? '').trim() || 'Uncategorized'
    counts[category] = (counts[category] ?? 0) + 1
    return counts
  }, {})
  const topReportCategories = Object.entries(reportCategoryCounts)
    .sort((first, second) => second[1] - first[1] || first[0].localeCompare(second[0]))
    .slice(0, 6)
  const maxCategoryCount = Math.max(1, ...topReportCategories.map(([, count]) => count))

  return (
    <div className="admin-dashboard">
      <div className="admin-dashboard-inner">
        <header className="admin-dashboard-heading">
          <p className="admin-dashboard-eyebrow"><span /> {t('CONCEPCIÓN · CITY OPERATIONS')}</p>
          <h1>{t('Municipality Admin Dashboard')}</h1>
          <p>{t('Review and manage citizen reports across the city.')}</p>
        </header>

        {readOnlyDemo && (
          <>
            <div className="municipal-demo-banner" role="status">
              <strong>{t('READ-ONLY DEMO')}</strong>
              <span>{t('Sample records only. Sign in with an approved municipal account to access real reports and actions.')}</span>
            </div>
            <section className="municipal-access-request" aria-labelledby="access-request-title">
              <div>
                <h2 id="access-request-title">{t('Need official city operations access?')}</h2>
                <p>{t('Submit your organization and reason for access. An administrator must review your request; this form does not grant permissions.')}</p>
              </div>
              {requestStatus === 'pending' ? (
                <div>
                  <p className="access-request-pending" role="status">{t('Request submitted · Awaiting administrator review')}</p>
                  {requestEmail && <p className="access-request-email">{t('Application email:')} {requestEmail}</p>}
                  {requestMessage && <p className="access-request-success">{t(requestMessage)}</p>}
                </div>
              ) : (
                <form className="access-request-form" onSubmit={handleAccessRequest}>
                  <label>
                    <span>{t('ORGANIZATION')}</span>
                    <input
                      autoComplete="organization"
                      maxLength={160}
                      onChange={(event) => setOrganization(event.target.value)}
                      placeholder={t('City department or organization')}
                      required
                      value={organization}
                    />
                  </label>
                  <label>
                    <span>{t('WHY DO YOU NEED ACCESS?')}</span>
                    <textarea
                      maxLength={1000}
                      minLength={10}
                      onChange={(event) => setRequestReason(event.target.value)}
                      placeholder={t('Briefly describe your municipal role and intended use.')}
                      required
                      rows={3}
                      value={requestReason}
                    />
                  </label>
                  {requestError && <p className="access-request-error" role="alert">{t(requestError)}</p>}
                  {requestMessage && <p className="access-request-success" role="status">{t(requestMessage)}</p>}
                  <button
                    className="access-request-submit"
                    disabled={isSubmittingRequest || requestStatus === 'loading'}
                    type="submit"
                  >
                    {isSubmittingRequest ? t('Submitting...') : t('Request municipal access')}
                  </button>
                </form>
              )}
              {requestStatus === 'error' && !requestError && (
                <p className="access-request-error" role="alert">{t('Unable to check your request status.')}</p>
              )}
            </section>
          </>
        )}

        {loadError && <p role="alert">{t(loadError)}</p>}

        {loading ? (
          <p>{t('Loading...')}</p>
        ) : loadError ? null : (
          <>
            <section className="admin-report-statistics" aria-label={t('Citizen report statistics')}>
              <div className="admin-stat-overview">
                <article className="admin-stat-card">
                  <span>{t('Total reports')}</span>
                  <strong>{reports.length.toLocaleString()}</strong>
                </article>
                <article className="admin-stat-card is-open">
                  <span>{t('Open reports')}</span>
                  <strong>{(reportStatistics.pending + reportStatistics.inProgress).toLocaleString()}</strong>
                </article>
                <article className="admin-stat-card is-resolved">
                  <span>{t('Resolved')}</span>
                  <strong>{reportStatistics.resolved.toLocaleString()}</strong>
                </article>
                <article className="admin-stat-card is-urgent">
                  <span>{t('Emergency notifications')}</span>
                  <strong>{reportStatistics.urgent.toLocaleString()}</strong>
                </article>
              </div>

              <div className="admin-stat-charts">
                <section className="admin-stat-chart" aria-label={t('Reports by status')}>
                  <div className="admin-stat-chart-heading">
                    <h2>{t('Reports by status')}</h2>
                    <span>{t('{count} total', { count: reports.length.toLocaleString() })}</span>
                  </div>
                  {([
                    { key: 'pending', label: t('Pending'), count: reportStatistics.pending },
                    { key: 'in-progress', label: t('In progress'), count: reportStatistics.inProgress },
                    { key: 'resolved', label: t('Resolved'), count: reportStatistics.resolved },
                  ]).map(({ key, label, count }) => (
                    <div className={`admin-stat-bar-row is-${key}`} key={key}>
                      <div className="admin-stat-bar-label">
                        <span>{label}</span>
                        <strong>{count.toLocaleString()}</strong>
                      </div>
                      <div className="admin-stat-bar-track">
                        <span style={{ width: `${reports.length ? (count / reports.length) * 100 : 0}%` }} />
                      </div>
                    </div>
                  ))}
                </section>

                <section className="admin-stat-chart" aria-label={t('Top report categories')}>
                  <div className="admin-stat-chart-heading">
                    <h2>{t('Top categories')}</h2>
                    <span>{t('Top {count}', { count: topReportCategories.length })}</span>
                  </div>
                  {topReportCategories.length ? topReportCategories.map(([category, count]) => (
                    <div className="admin-stat-category-row" key={category} title={t(category)}>
                      <div className="admin-stat-bar-label">
                        <span>{t(category)}</span>
                        <strong>{count.toLocaleString()}</strong>
                      </div>
                      <div className="admin-stat-bar-track">
                        <span style={{ width: `${(count / maxCategoryCount) * 100}%` }} />
                      </div>
                    </div>
                  )) : (
                    <p className="admin-stat-empty">{t('No report data available.')}</p>
                  )}
                </section>
              </div>
            </section>

            <div className="admin-report-table-container">
              <table className="admin-report-table">
                <thead>
                  <tr>
                    <th>{t('Report')}</th>
                    <th>{t('Category')}</th>
                    <th>{t('Location')}</th>
                    <th>{t('Description / Reporter')}</th>
                    <th>{t('Status / Actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {reports.length === 0 ? (
                    <tr>
                      <td className="admin-report-empty" colSpan={5}>{t('Currently, there are no citizen reports.')}</td>
                    </tr>
                  ) : (
                    reports.map((report) => (
                      <tr key={report.id}>
                        <td className="admin-report-when">
                          <div className="admin-report-id-row">
                            <span className="admin-report-id">#{report.id}</span>
                            {report.theme && <span className="admin-report-theme">{t(String(report.theme))}</span>}
                          </div>
                          <div className="admin-report-time">
                            {t('Reported')}: {formatDateTime(report.report_time) || t(String(report.time ?? '')) || '—'}
                          </div>
                          {report.event_time && (
                            <div className="admin-report-time">
                              {t('Occurred')}: {formatDateTime(report.event_time)}
                            </div>
                          )}
                          {report.emergency_notification_needed && (
                            <span className="admin-report-urgent">{t('Emergency notification needed')}</span>
                          )}
                        </td>
                        <td>
                          <div className="admin-report-category">{t(String(report.category ?? '')) || '—'}</div>
                          {readOnlyDemo ? (
                            <div className="admin-report-time">{toDepartmentList(report.department).map((item) => t(item)).join(', ') || '—'}</div>
                          ) : (
                            <DepartmentSelect
                              onChange={(departments) => handleDepartmentChange(report.id, departments)}
                              value={toDepartmentList(report.department)}
                            />
                          )}
                        </td>
                        <td className="admin-report-location">
                          {report.address && report.lat != null && report.lon != null ? (
                            <button
                              className="admin-report-location-link"
                              onClick={() => setMapReport({
                                address: report.address,
                                latitude: Number(report.lat),
                                longitude: Number(report.lon),
                              })}
                              title={t('Show on map')}
                              type="button"
                            >
                              {report.address}
                            </button>
                          ) : (report.address || '—')}
                        </td>
                        <td className="admin-report-description">
                          {t(String(report.text ?? ''))}
                          {report.additional_detail && (
                            <div className="admin-report-extra">
                              {t('Additional detail')}: {String(report.additional_detail)}
                            </div>
                          )}
                          <div className="admin-report-reporter">
                            {[report.name, report.phone, report.email].filter(Boolean).join(' · ')}
                          </div>
                        </td>
                        <td className="admin-report-actions">
                          {readOnlyDemo ? (
                            <span className="demo-status">{t(statusLabels[report.status || 'pending'] ?? String(report.status))} · demo</span>
                          ) : (
                            <>
                              <select
                                value={report.status || 'pending'}
                                onChange={(e) => handleStatusChange(report.id, e.target.value)}
                              >
                                <option value="pending">{t('Pending (Processing)')}</option>
                                <option value="in-progress">{t('In Progress (In Progress)')}</option>
                                <option value="resolved">{t('Resolved (Resolved)')}</option>
                              </select>
                              <div className="admin-report-progress">
                                {(() => {
                                  const latest = progressUpdates.find((update) => update.report_id === report.id)
                                  return latest
                                    ? <div className="admin-report-progress-latest" title={latest.note}>{latest.note}</div>
                                    : <div className="admin-report-muted">{t('No progress updates yet.')}</div>
                                })()}
                                <button
                                  className="admin-report-progress-button"
                                  onClick={() => setProgressReportId(report.id)}
                                  type="button"
                                >
                                  {t('Progress log')} ({progressUpdates.filter((update) => update.report_id === report.id).length})
                                </button>
                              </div>
                              <button
                                className="admin-report-delete"
                                onClick={() => handleDelete(report.id)}
                              >
                                {t('Delete')}
                              </button>
                            </>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
      {progressReportId !== null && (
        <ReportProgressPopup
          onAdd={(note) => handleAddProgress(progressReportId, note)}
          onClose={() => setProgressReportId(null)}
          onDelete={handleDeleteProgress}
          reportId={progressReportId}
          updates={progressUpdates.filter((update) => update.report_id === progressReportId)}
        />
      )}
      {mapReport && (
        <ReportLocationPopup
          address={mapReport.address}
          latitude={mapReport.latitude}
          longitude={mapReport.longitude}
          onClose={() => setMapReport(null)}
        />
      )}
    </div>
  )
}
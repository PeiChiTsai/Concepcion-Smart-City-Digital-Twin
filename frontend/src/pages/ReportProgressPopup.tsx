import { useState } from 'react'
import type { FormEvent } from 'react'
import { useI18n } from '../i18n'

export type ProgressUpdate = {
  id: number
  report_id: number
  author_email: string | null
  note: string
  status: string | null
  created_at: string
}

type ReportProgressPopupProps = {
  reportId: number
  updates: ProgressUpdate[]
  onAdd: (note: string) => Promise<void>
  onDelete: (id: number) => Promise<void>
  onClose: () => void
}

export default function ReportProgressPopup({
  reportId,
  updates,
  onAdd,
  onDelete,
  onClose,
}: ReportProgressPopupProps) {
  const { t } = useI18n()
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (!note.trim() || saving) return
    setSaving(true)
    try {
      await onAdd(note.trim())
      setNote('')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="report-location-popup-backdrop" onClick={onClose}>
      <div
        aria-label={t('Progress log')}
        aria-modal="true"
        className="report-location-popup report-progress-popup"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
      >
        <div className="report-location-popup-header">
          <span>{t('Progress log')} · #{reportId}</span>
          <button aria-label={t('Close')} onClick={onClose} type="button">×</button>
        </div>
        <form className="report-progress-form" onSubmit={handleSubmit}>
          <textarea
            maxLength={1000}
            onChange={(event) => setNote(event.target.value)}
            placeholder={t('Describe the current progress, e.g. crew dispatched, waiting for materials…')}
            required
            rows={3}
            value={note}
          />
          <button disabled={saving || !note.trim()} type="submit">
            {saving ? t('Saving...') : t('Add progress update')}
          </button>
        </form>
        <ul className="report-progress-list">
          {updates.length === 0 && <li className="admin-report-muted">{t('No progress updates yet.')}</li>}
          {updates.map((update) => (
            <li key={update.id}>
              <div className="admin-report-time">
                {new Date(update.created_at).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' })}
                {update.author_email ? ` · ${update.author_email}` : ''}
                <button
                  className="report-progress-delete"
                  onClick={() => { if (window.confirm(t('Delete this progress update?'))) void onDelete(update.id) }}
                  type="button"
                >
                  {t('Delete')}
                </button>
              </div>
              <div>{update.note}</div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

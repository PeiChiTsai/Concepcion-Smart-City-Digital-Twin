import { useEffect, useRef, useState } from 'react'
import { savDepartments } from '../i18nSav'
import { useI18n } from '../i18n'

type DepartmentSelectProps = {
  value: string[]
  onChange: (departments: string[]) => void
}

// Values are always the English names; labels are translated for display only.
export default function DepartmentSelect({ value, onChange }: DepartmentSelectProps) {
  const { t } = useI18n()
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState<string[]>(value)
  const rootRef = useRef<HTMLDivElement>(null)
  const draftRef = useRef(draft)
  draftRef.current = draft

  useEffect(() => {
    if (!open) setDraft(value)
  }, [value, open])

  const commit = () => {
    setOpen(false)
    const current = draftRef.current
    const changed = current.length !== value.length || current.some((item) => !value.includes(item))
    if (changed) onChange(current)
  }

  useEffect(() => {
    if (!open) return
    const handlePointerDown = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) commit()
    }
    document.addEventListener('mousedown', handlePointerDown)
    return () => document.removeEventListener('mousedown', handlePointerDown)
  })

  const options = [...savDepartments, ...value.filter((item) => !savDepartments.includes(item))]
  const toggle = (department: string) => setDraft((current) => (
    current.includes(department)
      ? current.filter((item) => item !== department)
      : [...current, department]
  ))

  return (
    <div className="department-select" ref={rootRef}>
      <button
        aria-expanded={open}
        className="department-select-trigger"
        onClick={() => (open ? commit() : setOpen(true))}
        type="button"
      >
        {value.length ? value.map((item) => t(item)).join(', ') : t('Select departments')}
        <span aria-hidden="true">▾</span>
      </button>
      {open && (
        <div className="department-select-menu" role="listbox" aria-multiselectable="true">
          {options.map((department) => (
            <label key={department}>
              <input
                checked={draft.includes(department)}
                onChange={() => toggle(department)}
                type="checkbox"
              />
              <span>{t(department)}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  )
}

'use client'

import { useState } from 'react'

type FormField = {
  name: string
  label: string
  type: 'text' | 'email' | 'tel' | 'textarea' | 'select' | 'checkbox'
  required?: boolean
  placeholder?: string
  options?: string[]
  width?: 'full' | 'half'
}

type Props = {
  formSlug: string
  fields: FormField[]
  submitLabel?: string
}

export function DynamicForm({ formSlug, fields, submitLabel = '送信する' }: Props) {
  const [formData, setFormData] = useState<Record<string, unknown>>({})
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState('')

  const handleChange = (name: string, value: unknown) => {
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setStatus('submitting')

    try {
      const res = await fetch('/api/form-submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ formSlug, data: formData }),
      })

      const result = await res.json()
      if (res.ok) {
        setStatus('success')
        setMessage(result.message)
        setFormData({})
      } else {
        setStatus('error')
        setMessage(result.error || '送信に失敗しました。')
      }
    } catch {
      setStatus('error')
      setMessage('送信中にエラーが発生しました。')
    }
  }

  if (status === 'success') {
    return (
      <div className="rounded-lg bg-green-50 p-8 text-center">
        <p className="text-lg font-medium text-green-800">{message}</p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="flex flex-wrap gap-6">
        {fields.map((field) => (
          <div
            key={field.name}
            className={field.width === 'half' ? 'w-full sm:w-[calc(50%-12px)]' : 'w-full'}
          >
            {field.type === 'checkbox' ? (
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={!!formData[field.name]}
                  onChange={(e) => handleChange(field.name, e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300"
                />
                <span className="text-sm">{field.label}</span>
              </label>
            ) : (
              <>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  {field.label}
                  {field.required && <span className="ml-1 text-red-500">*</span>}
                </label>
                {field.type === 'textarea' ? (
                  <textarea
                    value={(formData[field.name] as string) || ''}
                    onChange={(e) => handleChange(field.name, e.target.value)}
                    placeholder={field.placeholder}
                    required={field.required}
                    rows={4}
                    className="w-full rounded-lg border px-4 py-2 focus:border-pink-500 focus:outline-none focus:ring-1 focus:ring-pink-500"
                  />
                ) : field.type === 'select' ? (
                  <select
                    value={(formData[field.name] as string) || ''}
                    onChange={(e) => handleChange(field.name, e.target.value)}
                    required={field.required}
                    className="w-full rounded-lg border px-4 py-2 focus:border-pink-500 focus:outline-none focus:ring-1 focus:ring-pink-500"
                  >
                    <option value="">選択してください</option>
                    {field.options?.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type={field.type}
                    value={(formData[field.name] as string) || ''}
                    onChange={(e) => handleChange(field.name, e.target.value)}
                    placeholder={field.placeholder}
                    required={field.required}
                    className="w-full rounded-lg border px-4 py-2 focus:border-pink-500 focus:outline-none focus:ring-1 focus:ring-pink-500"
                  />
                )}
              </>
            )}
          </div>
        ))}
      </div>

      {status === 'error' && (
        <p className="text-sm text-red-600">{message}</p>
      )}

      <button
        type="submit"
        disabled={status === 'submitting'}
        className="rounded-full bg-pink-500 px-8 py-3 font-semibold text-white transition hover:bg-pink-600 disabled:opacity-50"
      >
        {status === 'submitting' ? '送信中...' : submitLabel}
      </button>
    </form>
  )
}

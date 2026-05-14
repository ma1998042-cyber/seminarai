'use client'

import { useState } from 'react'
import { ChevronRight, Loader2, CheckCircle } from 'lucide-react'
import { registerForEvent } from './actions'

export default function EventRegisterButton({ eventId }: { eventId: string }) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    const result = await registerForEvent(eventId, name, email)
    if (result.error) {
      setError(result.error)
    } else {
      setDone(true)
    }
    setLoading(false)
  }

  if (done) {
    return (
      <div className="flex-1 flex items-center justify-center gap-1.5 bg-green-50 text-green-700 text-sm font-medium py-2.5 rounded-lg">
        <CheckCircle className="w-4 h-4" />
        申込完了
      </div>
    )
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex-1 bg-indigo-600 text-white text-sm font-semibold py-2.5 rounded-lg hover:bg-indigo-700 transition-colors flex items-center justify-center gap-1"
      >
        申し込む
        <ChevronRight className="w-4 h-4" />
      </button>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="w-full space-y-2 pt-1">
      {error && <p className="text-xs text-red-600">{error}</p>}
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="お名前"
        required
        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400"
      />
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="メールアドレス"
        required
        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400"
      />
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="flex-1 py-2 text-sm border border-gray-200 rounded-lg text-gray-500 hover:bg-gray-50"
        >
          キャンセル
        </button>
        <button
          type="submit"
          disabled={loading}
          className="flex-1 bg-indigo-600 text-white text-sm font-semibold py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-1"
        >
          {loading && <Loader2 className="w-3 h-3 animate-spin" />}
          送信
        </button>
      </div>
    </form>
  )
}

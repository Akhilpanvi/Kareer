'use client'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { Trash2 } from 'lucide-react'
import { deleteStudent } from '@/app/actions/admin'

export function DeleteStudent({ id }: { id: string }) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [error, setError] = useState<string>()
  return (
    <div className="flex flex-col items-start gap-2">
      <button
        type="button"
        className="btn-outline py-1.5 text-xs text-red-600 hover:border-red-200 hover:bg-red-50"
        disabled={pending}
        onClick={() =>
          window.confirm('Delete this student? This removes their profile and platform data and cannot be undone.') &&
          start(async () => {
            const r = await deleteStudent(id)
            if (r?.error) setError(r.error)
            else router.push('/admin')
          })
        }
      >
        <Trash2 className="size-3.5" />
        {pending ? 'Deleting…' : 'Delete student'}
      </button>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  )
}

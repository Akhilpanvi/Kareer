'use client'
import { RefreshCw } from 'lucide-react'
import { ActionButton } from '@/components/forms'
import { syncEveryone } from '@/app/actions/admin'

export const SyncEveryone = () => (
  <ActionButton action={syncEveryone} className="btn-outline py-1.5 text-xs"><RefreshCw className="size-3.5" />Sync now</ActionButton>
)

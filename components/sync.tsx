'use client'
import { RefreshCw } from 'lucide-react'
import { ActionButton } from './forms'
import { syncNow } from '@/app/actions/profile'

export const SyncButton = () => (
  <ActionButton action={syncNow} className="btn-outline py-1.5 text-xs">
    <RefreshCw className="size-3.5" /> Sync now
  </ActionButton>
)

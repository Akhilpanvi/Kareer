'use client'
import { KeyRound, Power, Trash2 } from 'lucide-react'
import { ActionButton } from '@/components/forms'
import { deleteAdmin, resetAdminPassword, setAdminActive } from '@/app/actions/admin'

export function AdminRow({ id, active, self }: { id: string; active: boolean; self: boolean }) {
  const btn = 'btn-ghost px-2 py-1 text-xs'
  return (
    <div className="flex flex-wrap items-start justify-end gap-2">
      <ActionButton action={() => resetAdminPassword(id)} className={btn} confirm="Issue a new temporary password? This signs the account out everywhere.">
        <KeyRound className="size-3.5" />Reset password
      </ActionButton>
      {!self && (
        <>
          <ActionButton action={() => setAdminActive(id, !active)} className={btn} confirm={active ? 'Disable this admin account?' : undefined}>
            <Power className="size-3.5" />{active ? 'Disable' : 'Enable'}
          </ActionButton>
          <ActionButton action={() => deleteAdmin(id)} className={`${btn} text-red-600 hover:bg-red-50`} confirm="Remove this admin account? This cannot be undone.">
            <Trash2 className="size-3.5" />Remove
          </ActionButton>
        </>
      )}
    </div>
  )
}

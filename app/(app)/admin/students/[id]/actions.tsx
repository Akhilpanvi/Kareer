'use client'
import { KeyRound, Power, RefreshCw, RotateCcw } from 'lucide-react'
import { ActionButton } from '@/components/forms'
import { DeleteStudent } from '@/components/delete-student'
import { refreshStudent, resetPassword, resetRegistration, setActive } from '@/app/actions/admin'

export function StudentAdmin({ id, active }: { id: string; active: boolean }) {
  const btn = 'btn-outline py-1.5 text-xs'
  return (
    <div className="flex flex-wrap items-start gap-2">
      <ActionButton action={() => refreshStudent(id)} className={btn}><RefreshCw className="size-3.5" />Sync</ActionButton>
      <ActionButton action={() => resetPassword(id)} className={btn} confirm="Issue a new temporary password? The student will be signed out."><KeyRound className="size-3.5" />Reset password</ActionButton>
      <ActionButton action={() => setActive(id, !active)} className={btn} confirm={active ? 'Disable this account?' : undefined}><Power className="size-3.5" />{active ? 'Disable' : 'Enable'}</ActionButton>
      <ActionButton action={() => resetRegistration(id)} className={btn} confirm="Reset account setup? The student's password is removed and they must set up again at /register."><RotateCcw className="size-3.5" />Reset setup</ActionButton>
      <DeleteStudent id={id} />
    </div>
  )
}

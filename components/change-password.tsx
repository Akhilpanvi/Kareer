import { changePassword } from '@/app/actions/auth'
import { ActionForm } from './forms'
import { Card, Field } from './ui'

export function ChangePassword() {
  return (
    <Card title="Change password">
      <ActionForm action={changePassword} submit="Update password" reset>
        <Field label="Current password"><input name="current" type="password" required autoComplete="current-password" className="input" /></Field>
        <Field label="New password" hint="At least 10 characters. Other devices will be signed out."><input name="next" type="password" required minLength={10} autoComplete="new-password" className="input" /></Field>
        <Field label="Confirm new password"><input name="confirm" type="password" required minLength={10} autoComplete="new-password" className="input" /></Field>
      </ActionForm>
    </Card>
  )
}

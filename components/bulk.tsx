'use client'

export function SelectAll({ formId }: { formId: string }) {
  return (
    <input
      type="checkbox"
      aria-label="Select all students"
      className="size-4 rounded border-zinc-300"
      onChange={e => {
        document.querySelectorAll<HTMLInputElement>(`#${formId} input[name=ids]`).forEach(el => (el.checked = e.currentTarget.checked))
      }}
    />
  )
}

export function ConfirmSubmit({ confirm, className, children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { confirm: string }) {
  return (
    <button {...props} className={className} onClick={e => !window.confirm(confirm) && e.preventDefault()}>
      {children}
    </button>
  )
}

'use client'
import { useState } from 'react'
import { Check, Copy, ExternalLink } from 'lucide-react'
import { setPublicProfile } from '@/app/actions/profile'

export function PublicLink({ url, path, isPublic }: { url: string; path: string; isPublic: boolean }) {
  const [copied, setCopied] = useState(false)
  const [live, setLive] = useState(isPublic)
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <code className="min-w-0 flex-1 truncate rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs">{path}</code>
        <button type="button" onClick={() => navigator.clipboard.writeText(url).then(() => setCopied(true))} className="btn-outline px-2 py-2" aria-label="Copy link">
          {copied ? <Check className="size-4 text-emerald-600" /> : <Copy className="size-4" />}
        </button>
        <a href={url} target="_blank" rel="noopener noreferrer" className="btn-outline px-2 py-2" aria-label="Open public profile"><ExternalLink className="size-4" /></a>
      </div>
      <label className="flex items-center gap-2 text-sm text-zinc-700">
        <input type="checkbox" checked={live} className="size-4 rounded border-zinc-300" onChange={e => (setLive(e.target.checked), setPublicProfile(e.target.checked))} />
        Visible to anyone with the link
      </label>
      <p className="text-xs text-zinc-500">Shows your headline, skills, projects, certifications, achievements and coding stats. Never your email or phone.</p>
    </div>
  )
}

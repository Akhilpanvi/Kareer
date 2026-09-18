import 'server-only'
import { PLATFORMS } from './platforms'
import { REQUIRED } from './onboarding'

type Profile = {
  headline?: string | null
  bio?: string | null
  phone?: string | null
  cgpa?: number | null
  class10?: number | null
  class12?: number | null
  links?: { linkedin?: string | null; portfolio?: string | null; resume?: string | null } | null
  handles?: Record<string, string>
  skills?: unknown[]
  projects?: unknown[]
  certifications?: unknown[]
  achievements?: unknown[]
}

export type Item = { label: string; done: boolean; href: string; required?: boolean }

/** Everything a placement-ready Kloop profile should have, in the order we nudge for it. */
export function completion(u: Profile, stats: { platform: string; status?: string | null }[] = []) {
  const live = (p: string) => !!u.handles?.[p] && stats.find(s => s.platform === p)?.status !== 'not_found'
  const items: Item[] = [
    ...REQUIRED.map(p => ({ label: `${PLATFORMS[p].label} username`, done: live(p), href: '/profile', required: true })),
    { label: 'Resume link', done: !!u.links?.resume, href: '/profile', required: true },
    { label: 'Headline', done: !!u.headline, href: '/profile' },
    { label: 'About you', done: !!u.bio, href: '/profile' },
    { label: 'CGPA', done: u.cgpa != null, href: '/profile' },
    { label: 'Class X %', done: u.class10 != null, href: '/profile' },
    { label: 'Class XII %', done: u.class12 != null, href: '/profile' },
    { label: 'LinkedIn', done: !!u.links?.linkedin, href: '/profile' },
    { label: 'Phone number', done: !!u.phone, href: '/profile' },
    { label: '3 or more skills', done: (u.skills?.length ?? 0) >= 3, href: '/achievements' },
    { label: 'A project', done: (u.projects?.length ?? 0) > 0, href: '/achievements#projects' },
    { label: 'A certification', done: (u.certifications?.length ?? 0) > 0, href: '/achievements#certifications' },
    { label: 'An achievement', done: (u.achievements?.length ?? 0) > 0, href: '/achievements#achievements' },
  ]
  const done = items.filter(i => i.done).length
  return { items, done, total: items.length, percent: Math.round((done / items.length) * 100), missing: items.filter(i => !i.done) }
}

export const COMPLETION_FIELDS = 'headline bio phone cgpa class10 class12 links handles skills.name projects._id certifications._id achievements._id'

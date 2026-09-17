'use server'
import { revalidatePath } from 'next/cache'
import { after } from 'next/server'
import { requireUser } from '@/lib/auth'
import { attempt, date, Invalid, link, list, str, type State } from '@/lib/form'
import { COOLDOWN, PLATFORM_KEYS, recompute, refreshUser, syncHandles } from '@/lib/platforms'
import { PlatformStat } from '@/models/PlatformStat'
import { User } from '@/models/User'

const HANDLE = /^[A-Za-z0-9_.-]{1,40}$/
const LIMIT = 30

function done(userId: unknown, message: string): State {
  after(() => recompute(String(userId)))
  revalidatePath('/', 'layout')
  return { ok: message }
}

export async function updateProfile(_: State, fd: FormData) {
  return attempt(async () => {
    const me = await requireUser()
    const cgpa = str(fd, 'cgpa', 5)
    if (cgpa && !(+cgpa >= 0 && +cgpa <= 10)) throw new Invalid('CGPA must be between 0 and 10.')
    const handles: Record<string, string> = {}
    for (const p of PLATFORM_KEYS) {
      const h = str(fd, p, 60).replace(/^@/, '')
      if (h && !HANDLE.test(h)) throw new Invalid(`Enter only the ${p} username, not a link.`)
      if (h) handles[p] = h
    }
    await User.updateOne(
      { _id: me._id },
      {
        $set: {
          headline: str(fd, 'headline', 120),
          bio: str(fd, 'bio', 1000),
          phone: str(fd, 'phone', 20),
          cgpa: cgpa ? +cgpa : null,
          links: { linkedin: link(fd, 'linkedin'), portfolio: link(fd, 'portfolio') },
          handles,
        },
      },
    )
    await syncHandles(me._id, handles)
    after(() => refreshUser(me._id))
    return done(me._id, 'Profile saved.')
  })
}

const builders = {
  projects: (fd: FormData) => ({ title: str(fd, 'title', 120), description: str(fd, 'description', 600), tech: list(fd, 'tech'), url: link(fd, 'url'), repo: link(fd, 'repo'), date: date(fd, 'date') }),
  certifications: (fd: FormData) => ({ name: str(fd, 'name', 150), issuer: str(fd, 'issuer', 100), url: link(fd, 'url'), date: date(fd, 'date') }),
  achievements: (fd: FormData) => ({ title: str(fd, 'title', 150), description: str(fd, 'description', 400), date: date(fd, 'date') }),
}
export type Kind = keyof typeof builders

export async function addItem(kind: Kind, _: State, fd: FormData) {
  return attempt(async () => {
    const me = await requireUser()
    if (!builders[kind]) throw new Invalid('Unknown section.')
    const item = builders[kind](fd)
    if (!Object.values(item)[0]) throw new Invalid('Title/name is required.')
    const r = await User.updateOne({ _id: me._id, [`${kind}.${LIMIT - 1}`]: { $exists: false } }, { $push: { [kind]: { $each: [item], $position: 0 } } })
    if (!r.modifiedCount) throw new Invalid(`You can add up to ${LIMIT} entries.`)
    return done(me._id, 'Added.')
  })
}

export async function removeItem(kind: Kind, id: string) {
  const me = await requireUser()
  if (!builders[kind] || !/^[a-f0-9]{24}$/.test(id)) return
  await User.updateOne({ _id: me._id }, { $pull: { [kind]: { _id: id } } })
  done(me._id, '')
}

export async function addSkill(_: State, fd: FormData) {
  return attempt(async () => {
    const me = await requireUser()
    const level = str(fd, 'level', 20)
    if (!['beginner', 'intermediate', 'advanced'].includes(level)) throw new Invalid('Choose a level.')
    const names = list(fd, 'name').map(n => n.slice(0, 40))
    if (!names.length) throw new Invalid('Enter a skill.')
    const user = await User.findById(me._id).select('skills')
    if (!user) throw new Invalid('Not found.')
    const rest = user.skills.filter(s => !names.some(n => n.toLowerCase() === s.name?.toLowerCase()))
    if (rest.length + names.length > 40) throw new Invalid('You can list up to 40 skills.')
    user.set('skills', [...rest, ...names.map(name => ({ name, level }))])
    await user.save()
    return done(me._id, 'Skills updated.')
  })
}

export async function removeSkill(name: string) {
  const me = await requireUser()
  await User.updateOne({ _id: me._id }, { $pull: { skills: { name: String(name).slice(0, 40) } } })
  done(me._id, '')
}

export async function syncNow(): Promise<State> {
  const me = await requireUser()
  const last = await PlatformStat.findOne({ user: me._id }).sort({ checkedAt: -1 }).select('checkedAt').lean()
  if (!last) return { error: 'Add a platform username in your profile first.' }
  const wait = COOLDOWN - (Date.now() - +last.checkedAt!)
  const n = await refreshUser(me._id, true)
  if (!n) return { error: `Recently synced. Try again in ${Math.ceil(wait / 60_000)} min.` }
  revalidatePath('/', 'layout')
  return { ok: `Synced ${n} platform${n > 1 ? 's' : ''}.` }
}

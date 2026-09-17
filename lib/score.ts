type Profile = {
  headline?: string | null
  bio?: string | null
  cgpa?: number | null
  links?: { linkedin?: string | null; resume?: string | null; portfolio?: string | null } | null
  skills?: unknown[]
  projects?: unknown[]
  certifications?: unknown[]
  achievements?: unknown[]
}

const cap = (v: number, max: number) => Math.min(Math.max(v, 0), 1) * max

export function breakdown(p: Profile, m: Record<string, number> = {}) {
  return {
    profile: cap([p.headline, p.bio, p.links?.linkedin, p.links?.resume, p.cgpa].filter(Boolean).length / 5, 10),
    dsa: cap((m.lcSolved ?? 0) / 300, 20) + cap((m.lcHard ?? 0) / 30, 5) + cap(((m.ccRating ?? 0) - 1200) / 800, 5) + cap(((m.cfRating ?? 0) - 800) / 1000, 5),
    development: cap((m.ghRepos ?? 0) / 10, 8) + cap((m.ghContributions ?? 0) / 250, 7),
    projects: cap((p.projects?.length ?? 0) / 3, 15),
    credentials: cap((p.certifications?.length ?? 0) / 3, 10) + cap((p.achievements?.length ?? 0) / 2, 5),
    skills: cap((p.skills?.length ?? 0) / 8, 10),
  }
}

export const MAX = { profile: 10, dsa: 35, development: 15, projects: 15, credentials: 15, skills: 10 }

export const readiness = (p: Profile, m?: Record<string, number>) =>
  Math.round(Object.values(breakdown(p, m)).reduce((a, b) => a + b, 0))

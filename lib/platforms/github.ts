import { get, type Day, type Platform } from './types'

type Repo = { name: string; description: string | null; url: string; stars: number; language: string | null; color?: string | null; pushedAt: string }

const QUERY = `query($login:String!){user(login:$login){login name avatarUrl bio url followers{totalCount}
repositories(ownerAffiliations:OWNER,privacy:PUBLIC,isFork:false,first:100,orderBy:{field:PUSHED_AT,direction:DESC}){totalCount
nodes{name description url stargazerCount pushedAt primaryLanguage{name color}}}
contributionsCollection{contributionCalendar{totalContributions weeks{contributionDays{date contributionCount}}}}}}`

async function viaGraphQL(login: string, token: string) {
  const res = await get('https://api.github.com/graphql', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: QUERY, variables: { login } }),
  })
  const { data } = await res.json()
  const u = data?.user
  if (!u) return null
  const calendar: Day = {}
  for (const w of u.contributionsCollection.contributionCalendar.weeks)
    for (const d of w.contributionDays) if (d.contributionCount) calendar[d.date] = d.contributionCount
  return {
    profile: { name: u.name, avatar: u.avatarUrl, bio: u.bio, url: u.url, followers: u.followers.totalCount },
    total: u.repositories.totalCount as number,
    repos: u.repositories.nodes.map((r: any): Repo => ({
      name: r.name, description: r.description, url: r.url, stars: r.stargazerCount,
      language: r.primaryLanguage?.name ?? null, color: r.primaryLanguage?.color, pushedAt: r.pushedAt,
    })),
    contributions: u.contributionsCollection.contributionCalendar.totalContributions as number,
    calendar,
  }
}

async function viaRest(login: string) {
  const headers = { Accept: 'application/vnd.github+json' }
  const res = await get(`https://api.github.com/users/${login}`, { headers })
  if (res.status === 404) return null
  if (!res.ok) throw new Error(`GitHub responded ${res.status}`)
  const u = await res.json()
  const repos = await get(`https://api.github.com/users/${login}/repos?per_page=100&sort=pushed&type=owner`, { headers }).then(r => (r.ok ? r.json() : []))
  return {
    profile: { name: u.name, avatar: u.avatar_url, bio: u.bio, url: u.html_url, followers: u.followers },
    total: u.public_repos as number,
    repos: repos.filter((r: any) => !r.fork).map((r: any): Repo => ({
      name: r.name, description: r.description, url: r.html_url, stars: r.stargazers_count, language: r.language, pushedAt: r.pushed_at,
    })),
    contributions: null,
    calendar: null,
  }
}

export const github: Platform = {
  label: 'GitHub',
  unit: 'repositories',
  url: h => `https://github.com/${h}`,
  async fetch(handle) {
    const token = process.env.GITHUB_TOKEN
    const g = token ? await viaGraphQL(handle, token) : await viaRest(handle)
    if (!g) return null
    const stars = g.repos.reduce((s: number, r: Repo) => s + r.stars, 0)
    const langs: Record<string, number> = {}
    for (const r of g.repos) if (r.language) langs[r.language] = (langs[r.language] ?? 0) + 1
    return {
      data: {
        ...g.profile,
        repos: g.repos.slice(0, 8),
        stars,
        languages: Object.entries(langs).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([name, n]) => ({ name, n })),
        contributions: g.contributions,
        calendar: g.calendar,
      },
      metrics: { ghRepos: g.total, ghStars: stars, ...(g.contributions != null && { ghContributions: g.contributions }) },
      value: g.total,
    }
  },
}

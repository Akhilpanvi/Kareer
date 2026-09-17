import { get, type Platform } from './types'

export const codeforces: Platform = {
  label: 'Codeforces',
  unit: 'rating',
  url: h => `https://codeforces.com/profile/${h}`,
  async fetch(handle) {
    const info = await get(`https://codeforces.com/api/user.info?handles=${encodeURIComponent(handle)}`).then(r => r.json())
    if (info.status !== 'OK') return null
    const u = info.result[0]
    const rated = await get(`https://codeforces.com/api/user.rating?handle=${encodeURIComponent(handle)}`).then(r => r.json())
    const history = rated.status === 'OK' ? rated.result : []
    return {
      data: {
        rating: u.rating ?? 0,
        maxRating: u.maxRating ?? 0,
        rank: u.rank ?? 'unrated',
        avatar: u.titlePhoto,
        contests: history.length,
        history: history.slice(-12).map((c: any) => ({ name: c.contestName, rating: c.newRating, at: new Date(c.ratingUpdateTimeSeconds * 1000) })),
      },
      metrics: { cfRating: u.rating ?? 0 },
      value: u.rating ?? 0,
    }
  },
}

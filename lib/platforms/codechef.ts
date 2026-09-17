import { get, type Platform } from './types'

// No public API: parse the profile page
export const codechef: Platform = {
  label: 'CodeChef',
  unit: 'rating',
  url: h => `https://www.codechef.com/users/${h}`,
  async fetch(handle) {
    const res = await get(`https://www.codechef.com/users/${handle}`, { redirect: 'manual' })
    if (res.status !== 200) return null
    const html = await res.text()
    const num = (re: RegExp) => {
      const m = html.match(re)
      return m ? Number(m[1]) : null
    }
    const rating = num(/class="rating-number">\s*(\d+)/)
    if (rating == null) return null
    const stars = html.match(/class="rating-star">([\s\S]*?)<\/div>/)?.[1].match(/&#9733;|★/g)?.length ?? 0
    let history: { name: string; rating: number; at: string }[] = []
    try {
      const all = JSON.parse(html.match(/date_versus_rating":\{"all":(\[[\s\S]*?\])\s*[,}]/)?.[1] ?? '[]')
      history = all.map((c: any) => ({ name: c.name, rating: +c.rating, at: c.end_date }))
    } catch {}

    return {
      data: {
        rating,
        stars,
        highest: num(/Highest Rating\s*(\d+)/),
        globalRank: num(/href="\/ratings\/all">\s*<strong>\s*(\d+)/),
        countryRank: num(/href="\/ratings\/all\?filterBy=Country[^"]*">\s*<strong>\s*(\d+)/),
        solved: num(/Total Problems Solved:\s*(\d+)/),
        contests: history.length,
        history: history.slice(-12),
      },
      metrics: { ccRating: rating, ccStars: stars },
      value: rating,
    }
  },
}

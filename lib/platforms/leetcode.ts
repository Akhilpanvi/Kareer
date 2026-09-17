import { get, day, type Day, type Platform } from './types'

const QUERY = `query($u:String!){
allQuestionsCount{difficulty count}
matchedUser(username:$u){username profile{realName userAvatar ranking}
submitStatsGlobal{acSubmissionNum{difficulty count}}
languageProblemCount{languageName problemsSolved}
tagProblemCounts{advanced{tagName problemsSolved} intermediate{tagName problemsSolved} fundamental{tagName problemsSolved}}
badges{displayName} submissionCalendar}
userContestRanking(username:$u){rating attendedContestsCount topPercentage globalRanking}
recentAcSubmissionList(username:$u,limit:10){title titleSlug timestamp}}`

export const leetcode: Platform = {
  label: 'LeetCode',
  unit: 'problems solved',
  url: h => `https://leetcode.com/u/${h}`,
  async fetch(handle) {
    const res = await get('https://leetcode.com/graphql', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Referer: 'https://leetcode.com' },
      body: JSON.stringify({ query: QUERY, variables: { u: handle } }),
    })
    const { data } = await res.json()
    const u = data?.matchedUser
    if (!u) return null

    const count = (list: { difficulty: string; count: number }[]) => Object.fromEntries(list.map(d => [d.difficulty.toLowerCase(), d.count]))
    const solved = count(u.submitStatsGlobal.acSubmissionNum)
    const contest = data.userContestRanking
    const topics = (['advanced', 'intermediate', 'fundamental'] as const)
      .flatMap(level => u.tagProblemCounts[level].map((t: any) => ({ name: t.tagName, n: t.problemsSolved, level })))
      .filter(t => t.n)
      .sort((a, b) => b.n - a.n)

    const cutoff = Date.now() / 1000 - 366 * 86400
    const calendar: Day = {}
    for (const [ts, n] of Object.entries(JSON.parse(u.submissionCalendar || '{}') as Record<string, number>))
      if (+ts > cutoff) calendar[day(+ts * 1000)] = n

    return {
      data: {
        name: u.profile.realName,
        avatar: u.profile.userAvatar,
        ranking: u.profile.ranking,
        solved,
        totals: count(data.allQuestionsCount),
        contest: contest && { rating: Math.round(contest.rating), attended: contest.attendedContestsCount, top: contest.topPercentage },
        languages: u.languageProblemCount.filter((l: any) => l.problemsSolved).map((l: any) => ({ name: l.languageName, n: l.problemsSolved })).sort((a: any, b: any) => b.n - a.n).slice(0, 6),
        topics: topics.slice(0, 12),
        badges: u.badges.map((b: any) => b.displayName).slice(0, 12),
        recent: data.recentAcSubmissionList.map((s: any) => ({ title: s.title, url: `https://leetcode.com/problems/${s.titleSlug}/`, at: new Date(s.timestamp * 1000) })),
        calendar,
      },
      metrics: {
        lcSolved: solved.all ?? 0,
        lcHard: solved.hard ?? 0,
        ...(contest?.rating && { lcRating: Math.round(contest.rating) }),
      },
      value: solved.all ?? 0,
    }
  },
}

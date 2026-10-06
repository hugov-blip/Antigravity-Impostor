export type RecentTeam = { slug: string; name: string }

const KEY = 'multas:recent'

export function getRecentTeams(): RecentTeam[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '[]') as RecentTeam[]
  } catch {
    return []
  }
}

export function rememberTeam(team: RecentTeam) {
  const list = [team, ...getRecentTeams().filter((t) => t.slug !== team.slug)].slice(0, 5)
  localStorage.setItem(KEY, JSON.stringify(list))
}

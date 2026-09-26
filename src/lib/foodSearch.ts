import type { Food } from '../db/types'

const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()

/**
 * Matches every word of the query against the name, brand and aliases (so "dal toor", "chapati" and
 * "dahi" all work). Ranking: name starts with the query → a name word starts with it → alias match →
 * anywhere; your own foods win ties, then shorter names.
 */
export function searchFoods(foods: Food[], query: string, limit = 60): Food[] {
  const q = norm(query)
  if (!q) return []
  const tokens = q.split(' ')
  const scored: { food: Food; score: number }[] = []
  for (const food of foods) {
    const name = norm(food.name)
    const aliases = (food.aliases ?? []).map(norm)
    const hay = [name, norm(food.brand ?? ''), ...aliases].join(' ')
    if (!tokens.every((t) => hay.includes(t))) continue
    let score: number
    if (name.startsWith(q)) score = 0
    else if (name.split(' ').some((w) => w.startsWith(tokens[0]!))) score = 1
    else if (aliases.some((a) => a.startsWith(q) || a.split(' ').some((w) => w.startsWith(tokens[0]!)))) score = 2
    else score = 3
    if (food.source === 'custom') score -= 0.5
    scored.push({ food, score })
  }
  scored.sort((a, b) => a.score - b.score || a.food.name.length - b.food.name.length || a.food.name.localeCompare(b.food.name))
  return scored.slice(0, limit).map((s) => s.food)
}

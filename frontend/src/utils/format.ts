export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  })
}

export function formatDateShort(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export function todayISO(): string {
  return new Date().toISOString().slice(0, 10)
}

export function currentMonth(): string {
  return new Date().toISOString().slice(0, 7)
}

export function initials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('')
}

export const CATEGORY_COLORS: Record<string, string> = {
  Food: '#F97316',
  Transport: '#0EA5E9',
  Shopping: '#EC4899',
  Entertainment: '#8B5CF6',
  Bills: '#EF4444',
  Health: '#16A34A',
  Travel: '#06B6D4',
  Education: '#D97706',
  Salary: '#10B981',
  Other: '#64748B'
}

export function categoryColor(category: string): string {
  return CATEGORY_COLORS[category] ?? '#64748B'
}

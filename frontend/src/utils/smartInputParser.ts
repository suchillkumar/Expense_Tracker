export interface ParsedInput {
  amount: number | null
  description: string
  suggestedCategory: string | null
}

/** Keyword → Category mapping for auto-guessing */
const KEYWORD_MAP: Record<string, string> = {
  // Food
  coffee: 'Food', chai: 'Food', tea: 'Food', lunch: 'Food', dinner: 'Food',
  breakfast: 'Food', food: 'Food', restaurant: 'Food', pizza: 'Food',
  burger: 'Food', grocery: 'Food', groceries: 'Food', snack: 'Food',
  swiggy: 'Food', zomato: 'Food', cafe: 'Food', meal: 'Food',
  biryani: 'Food', chicken: 'Food', rice: 'Food', milk: 'Food',
  fruit: 'Food', fruits: 'Food', vegetables: 'Food',

  // Transport
  uber: 'Transport', taxi: 'Transport', bus: 'Transport', train: 'Transport',
  metro: 'Transport', fuel: 'Transport', gas: 'Transport', petrol: 'Transport',
  diesel: 'Transport', parking: 'Transport', ola: 'Transport', auto: 'Transport',
  cab: 'Transport', toll: 'Transport', rapido: 'Transport',

  // Shopping
  amazon: 'Shopping', flipkart: 'Shopping', clothes: 'Shopping',
  shoes: 'Shopping', shirt: 'Shopping', electronics: 'Shopping',
  shopping: 'Shopping', myntra: 'Shopping', mall: 'Shopping',
  dress: 'Shopping', watch: 'Shopping', bag: 'Shopping',

  // Entertainment
  movie: 'Entertainment', movies: 'Entertainment', netflix: 'Entertainment',
  spotify: 'Entertainment', game: 'Entertainment', concert: 'Entertainment',
  party: 'Entertainment', youtube: 'Entertainment', subscription: 'Entertainment',
  hotstar: 'Entertainment', prime: 'Entertainment',

  // Bills
  rent: 'Bills', electricity: 'Bills', water: 'Bills', wifi: 'Bills',
  internet: 'Bills', phone: 'Bills', insurance: 'Bills', bill: 'Bills',
  bills: 'Bills', recharge: 'Bills', emi: 'Bills', loan: 'Bills',

  // Health
  doctor: 'Health', hospital: 'Health', medicine: 'Health',
  pharmacy: 'Health', gym: 'Health', dental: 'Health', health: 'Health',
  medical: 'Health', clinic: 'Health', therapy: 'Health',

  // Travel
  flight: 'Travel', hotel: 'Travel', trip: 'Travel', vacation: 'Travel',
  airbnb: 'Travel', travel: 'Travel', booking: 'Travel', resort: 'Travel',
  holiday: 'Travel',

  // Education
  course: 'Education', book: 'Education', books: 'Education',
  tuition: 'Education', udemy: 'Education', exam: 'Education',
  school: 'Education', college: 'Education', education: 'Education',
  fees: 'Education', coaching: 'Education',

  // Salary / Income
  salary: 'Salary', freelance: 'Salary', bonus: 'Salary',
  dividend: 'Salary', interest: 'Salary', refund: 'Salary',
  income: 'Salary', payout: 'Salary',
}

/**
 * Parses a natural-language input string into amount, description, and suggested category.
 *
 * Examples:
 *   "coffee 150"        → { amount: 150, description: "coffee", suggestedCategory: "Food" }
 *   "150 groceries"     → { amount: 150, description: "groceries", suggestedCategory: "Food" }
 *   "uber ride 80 transport" → { amount: 80, description: "uber ride transport", suggestedCategory: "Transport" }
 *   "500"               → { amount: 500, description: "", suggestedCategory: null }
 */
export function parseSmartInput(raw: string): ParsedInput {
  const trimmed = raw.trim()
  if (!trimmed) {
    return { amount: null, description: '', suggestedCategory: null }
  }

  const tokens = trimmed.split(/\s+/)
  let amount: number | null = null
  const descriptionTokens: string[] = []

  for (const token of tokens) {
    // Try to parse as number — take the first valid number found
    if (amount === null) {
      const num = Number(token)
      if (!isNaN(num) && num > 0 && /^\d+(\.\d+)?$/.test(token)) {
        amount = num
        continue
      }
    }
    descriptionTokens.push(token)
  }

  const description = descriptionTokens.join(' ')

  // Try to guess category from description tokens
  let suggestedCategory: string | null = null
  for (const token of descriptionTokens) {
    const lower = token.toLowerCase().replace(/[^a-z]/g, '')
    if (lower && KEYWORD_MAP[lower]) {
      suggestedCategory = KEYWORD_MAP[lower]
      break
    }
  }

  return { amount, description, suggestedCategory }
}

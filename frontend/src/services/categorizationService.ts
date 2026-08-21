export interface CategorizationResult {
  category: string
  confidence: number
  ruleMatched?: string
}

const CATEGORY_RULES: Record<string, string[]> = {
  'Food & Dining': [
    'swiggy', 'zomato', 'restaurant', 'cafe', 'coffee', 'starbucks', 'mcdonalds', 'burger',
    'pizza', 'dominos', 'kfc', 'subway', 'dinner', 'lunch', 'breakfast', 'snack', 'bakery',
    'bistro', 'dhaba', 'bar', 'pub', 'dine', 'food'
  ],
  'Groceries': [
    'blinkit', 'zepto', 'instamart', 'bigbasket', 'supermarket', 'grocery', 'vegetables',
    'fruits', 'milk', 'dairy', 'provisions', 'dmart', 'reliance fresh', 'spencer', 'kirana'
  ],
  'Transportation': [
    'uber', 'ola', 'rapido', 'metro', 'bus', 'train', 'irctc', 'petrol', 'diesel', 'fuel',
    'shell', 'hp fuel', 'parking', 'toll', 'fastag', 'auto', 'taxi', 'cab'
  ],
  'Shopping': [
    'amazon', 'flipkart', 'myntra', 'ajio', 'zara', 'h&m', 'shopping', 'clothing', 'shoes',
    'electronics', 'croma', 'mall', 'retail', 'store', 'purchase', 'order'
  ],
  'Bills & Utilities': [
    'electricity', 'water bill', 'wifi', 'broadband', 'airtel', 'jio', 'vi', 'gas cylinder',
    'indane', 'recharge', 'mobile bill', 'dth', 'tata play', 'utility', 'bescom', 'cesc'
  ],
  'Entertainment': [
    'netflix', 'spotify', 'prime video', 'hotstar', 'cinema', 'pvr', 'inox', 'movie',
    'game', 'playstation', 'steam', 'concert', 'event', 'youtube premium', 'bookmyshow'
  ],
  'Healthcare': [
    'pharmacy', 'apollo', 'medplus', '1mg', 'doctor', 'hospital', 'clinic', 'medicine',
    'dental', 'lab test', 'health', 'fitness', 'gym', 'cult.fit'
  ],
  'Education': [
    'tuition', 'course', 'udemy', 'coursera', 'books', 'school', 'college', 'exam',
    'classes', 'training', 'certification'
  ],
  'Travel': [
    'flight', 'hotel', 'airbnb', 'makemytrip', 'goibibo', 'booking.com', 'resort', 'vacation',
    'trip', 'tour', 'indigo', 'air india', 'visa'
  ],
  'Rent': [
    'rent', 'maintenance', 'society fee', 'landlord', 'flat rent', 'house rent'
  ],
  'Salary': [
    'salary', 'payroll', 'stipend', 'dividend', 'interest', 'bonus', 'freelance', 'client payment', 'refund'
  ]
}

const CORRECTIONS_KEY = 'finflow_category_corrections'

function getCorrections(): Record<string, string> {
  try {
    const raw = localStorage.getItem(CORRECTIONS_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

export function saveCategoryCorrection(description: string, category: string): void {
  try {
    const corrections = getCorrections()
    corrections[description.toLowerCase().trim()] = category
    localStorage.setItem(CORRECTIONS_KEY, JSON.stringify(corrections))
  } catch {
    // Ignore localStorage error
  }
}

export function categorize(description: string): CategorizationResult {
  if (!description || !description.trim()) {
    return { category: 'Other', confidence: 0.5 }
  }

  const descLower = description.toLowerCase().trim()

  // 1. Check user corrections memory first
  const corrections = getCorrections()
  if (corrections[descLower]) {
    return { category: corrections[descLower], confidence: 0.99, ruleMatched: 'user_correction' }
  }

  // 2. Exact & Keyword Rule-based match
  for (const [category, keywords] of Object.entries(CATEGORY_RULES)) {
    for (const kw of keywords) {
      if (descLower.includes(kw)) {
        // Compute confidence based on match specificity
        const confidence = kw.length > 5 ? 0.96 : 0.88
        return { category, confidence, ruleMatched: kw }
      }
    }
  }

  // 3. Fallback NLP token heuristic
  const words = descLower.split(/\s+/)
  for (const word of words) {
    if (word.length >= 4) {
      for (const [category, keywords] of Object.entries(CATEGORY_RULES)) {
        if (keywords.some(kw => kw.startsWith(word) || word.startsWith(kw))) {
          return { category, confidence: 0.75, ruleMatched: 'fuzzy_token' }
        }
      }
    }
  }

  return { category: 'Other', confidence: 0.5 }
}

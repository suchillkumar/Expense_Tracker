import type { ColumnMapping, ImportRow, ParsedData, RawTransactionRow } from './types'

const FIELD_ALIASES: Record<string, string[]> = {
  date: ['date', 'transactiondate', 'transaction_date', 'txndate', 'postdate', 'post_date', 'valuedate', 'value_date', 'bookingdate', 'booking_date', 'transdate', 'trndate', 'trandate', 'datetxn', 'txn_date', 'dt', 'posted'],
  description: ['description', 'narration', 'particulars', 'details', 'memo', 'remarks', 'reference', 'ref', 'desc', 'transactiondetails', 'transaction_details', 'payee', 'merchant', 'store', 'vendor', 'name', 'transaction', 'txndesc'],
  amount: ['amount', 'transactionamount', 'transaction_amount', 'txnamount', 'txn_amount', 'value', 'sum', 'total', 'txnamt'],
  type: ['type', 'transactiontype', 'transaction_type', 'txntype', 'txn_type', 'dr_cr', 'drcr', 'entry_type', 'entrytype'],
  category: ['category', 'group', 'tag', 'label', 'classification', 'type'],
  notes: ['notes', 'note', 'remark', 'remarks', 'comment', 'comments', 'description2', 'additional'],
  tags: ['tags', 'tag', 'labels', 'keywords'],
  debit: ['debit', 'debitamount', 'debit_amount', 'dr', 'dramount', 'dr_amount', 'withdrawal', 'debits', 'debitamt'],
  credit: ['credit', 'creditamount', 'credit_amount', 'cr', 'cramount', 'cr_amount', 'deposit', 'credits', 'creditamt']
}

export function suggestColumnMapping(headers: string[]): ColumnMapping {
  const mapping: ColumnMapping = {
    date: '',
    description: '',
    amount: '',
    type: '',
    category: '',
    notes: '',
    tags: '',
    debit: '',
    credit: ''
  }

  for (const header of headers) {
    const normalized = header.toLowerCase().replace(/[^a-z]/g, '')
    for (const [field, aliases] of Object.entries(FIELD_ALIASES)) {
      if (aliases.includes(normalized)) {
        if (!mapping[field as keyof ColumnMapping]) {
          mapping[field as keyof ColumnMapping] = header
        }
        break
      }
    }
  }

  if (!mapping.amount && (mapping.debit || mapping.credit)) {
    mapping.amount = mapping.debit || mapping.credit
  }

  return mapping
}

export function parseAmount(raw: string): number {
  if (!raw) return 0
  let cleaned = raw.replace(/[₹$€£\s]/g, '').trim()
  cleaned = cleaned.replace(/,/g, '')
  const num = parseFloat(cleaned)
  return isNaN(num) ? 0 : Math.abs(num)
}

export function detectType(raw: string, amount: number): 'income' | 'expense' {
  const lower = raw.toLowerCase().trim()
  if (['income', 'credit', 'cr', 'deposit', 'salary', 'refund', 'credit', '+'].some(k => lower.includes(k))) {
    return 'income'
  }
  if (['expense', 'debit', 'dr', 'withdrawal', 'payment', 'charge', 'fee', '−', '-'].some(k => lower.includes(k))) {
    return 'expense'
  }
  if (amount < 0) return 'expense'
  return 'expense'
}

export function parseDate(raw: string): string {
  if (!raw) return new Date().toISOString().slice(0, 10)
  const trimmed = raw.trim()

  const isoMatch = trimmed.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/)
  if (isoMatch) {
    return `${isoMatch[1]}-${isoMatch[2].padStart(2, '0')}-${isoMatch[3].padStart(2, '0')}`
  }

  const slashDash = trimmed.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/)
  if (slashDash) {
    let [, day, month, year] = slashDash
    if (year.length === 2) year = (parseInt(year) > 50 ? '19' : '20') + year
    if (parseInt(day) > 12) {
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
    }
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
  }

  const monthNames = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec']
  const written = trimmed.match(/^(\d{1,2})\s+([a-z]+)\w*\s+(\d{4})$/i)
  if (written) {
    const day = written[1].padStart(2, '0')
    const monthIdx = monthNames.findIndex(m => written[2].toLowerCase().startsWith(m))
    if (monthIdx >= 0) return `${written[3]}-${String(monthIdx + 1).padStart(2, '0')}-${day}`
  }

  const written2 = trimmed.match(/^([a-z]+)\w*\s+(\d{1,2}),?\s+(\d{4})$/i)
  if (written2) {
    const monthIdx = monthNames.findIndex(m => written2[1].toLowerCase().startsWith(m))
    if (monthIdx >= 0) return `${written2[3]}-${String(monthIdx + 1).padStart(2, '0')}-${written2[2].padStart(2, '0')}`
  }

  const d = new Date(trimmed)
  if (!isNaN(d.getTime())) {
    return d.toISOString().slice(0, 10)
  }

  return new Date().toISOString().slice(0, 10)
}

export function classifyCategory(description: string, existingCategories: readonly string[]): string {
  const lower = description.toLowerCase()
  const rules: [RegExp, string][] = [
    [/salary|payroll|wage|stipend/i, 'Salary'],
    [/food|grocery|grocer|restaurant|cafe|coffee|swiggy|zomato|pizza|burger|mcdonald|starbucks|subway|kfc/i, 'Food'],
    [/uber|ola|lyft|taxi|metro|bus|train|fuel|petrol|diesel|parking|toll|flight|airline|travel/i, 'Transport'],
    [/shop|mall|amazon|flipkart|clothing|shoe|electronics|fashion|store|market|walmart|target/i, 'Shopping'],
    [/movie|netflix|spotify|disney|hbo|game|gaming|cinema|concert|theater|theatre|entertainment|youtube|prime/i, 'Entertainment'],
    [/electric|electricity|water|gas|internet|wifi|phone|mobile|rent|insurance|maintenance|utility|bill|telecom/i, 'Bills'],
    [/hospital|doctor|pharmacy|medicine|health|medical|clinic|dental|prescription|lab|diagnostic/i, 'Health'],
    [/hotel|motel|airbnb|booking|trip|vacation|tour|travel|flight|tourism|resort/i, 'Travel'],
    [/school|college|university|course|tuition|book|education|training|certification|exam|udemy|coursera/i, 'Education'],
    [/atm|withdrawal|transfer|send|pay|bill|recharge|subscription/i, 'Other'],
  ]

  for (const [pattern, category] of rules) {
    if (pattern.test(lower) && existingCategories.includes(category)) {
      return category
    }
  }
  return 'Other'
}

export function mapRawToImportRow(
  raw: RawTransactionRow,
  mapping: ColumnMapping,
  index: number,
  existingCategories: readonly string[]
): ImportRow {
  const errors: string[] = []

  const dateRaw = mapping.date ? (raw[mapping.date] || '') : ''
  const date = parseDate(dateRaw)
  if (!dateRaw) errors.push('Missing date')

  const description = mapping.description ? (raw[mapping.description] || raw[Object.keys(raw)[0]] || 'Imported transaction') : (raw[Object.keys(raw)[0]] || 'Imported transaction')

  let amount = 0
  let type: 'income' | 'expense' = 'expense'

  if (mapping.debit || mapping.credit) {
    const debitRaw = mapping.debit ? (raw[mapping.debit] || '') : ''
    const creditRaw = mapping.credit ? (raw[mapping.credit] || '') : ''
    const debitAmt = parseAmount(debitRaw)
    const creditAmt = parseAmount(creditRaw)

    if (debitAmt > 0 && creditAmt > 0) {
      amount = Math.max(debitAmt, creditAmt)
      type = creditAmt > debitAmt ? 'income' : 'expense'
    } else if (debitAmt > 0) {
      amount = debitAmt
      type = 'expense'
    } else if (creditAmt > 0) {
      amount = creditAmt
      type = 'income'
    }
  } else {
    const amountRaw = mapping.amount ? (raw[mapping.amount] || '') : ''
    amount = parseAmount(amountRaw)
    const typeRaw = mapping.type ? (raw[mapping.type] || '') : ''
    type = detectType(typeRaw, amount)
  }

  if (amount <= 0) errors.push('Invalid amount')

  const categoryRaw = mapping.category ? (raw[mapping.category] || '') : ''
  const category = categoryRaw && existingCategories.includes(categoryRaw)
    ? categoryRaw
    : classifyCategory(description, existingCategories)

  const notes = mapping.notes ? (raw[mapping.notes] || '') : ''
  const tagsRaw = mapping.tags ? (raw[mapping.tags] || '') : ''
  const tags = tagsRaw.split(/[,;|]/).map(t => t.trim().replace(/^#/, '')).filter(Boolean)

  return {
    date,
    description,
    amount,
    type,
    category,
    notes,
    tags,
    accountName: '',
    originalRow: index,
    errors
  }
}

export function normalizeAll(
  data: ParsedData,
  mapping: ColumnMapping,
  existingCategories: readonly string[]
): ImportRow[] {
  return data.rows.map((row, i) => mapRawToImportRow(row, mapping, i + 1, existingCategories))
}

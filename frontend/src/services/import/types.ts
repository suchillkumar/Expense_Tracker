export interface RawTransactionRow {
  [key: string]: string
}

export interface ParsedData {
  headers: string[]
  rows: RawTransactionRow[]
  sheetNames?: string[]
  selectedSheet?: string
  fileName: string
  fileType: string
}

export interface ImportRow {
  date: string
  description: string
  amount: number
  type: 'income' | 'expense'
  category: string
  notes: string
  tags: string[]
  accountName: string
  originalRow: number
  errors: string[]
}

export interface ColumnMapping {
  date: string
  description: string
  amount: string
  type: string
  category: string
  notes: string
  tags: string
  debit: string
  credit: string
}

export interface ImportResult {
  imported: number
  skipped: number
  failed: number
  errors: { row: number; message: string }[]
}

import { Transaction } from '../../types'
import type { ImportRow } from './types'

function fingerprint(row: ImportRow): string {
  return `${row.date}|${row.description.toLowerCase().trim()}|${row.amount}`
}

function txFingerprint(tx: Transaction): string {
  const date = tx.date.slice(0, 10)
  const desc = tx.description.toLowerCase().trim()
  const amt = tx.amount
  return `${date}|${desc}|${amt}`
}

export interface DuplicateCheckResult {
  duplicates: Set<number>
  internalDuplicates: Set<number>
}

export function detectDuplicates(
  rows: ImportRow[],
  existingTransactions: Transaction[]
): DuplicateCheckResult {
  const existingSet = new Set<string>()
  existingTransactions.forEach(tx => {
    existingSet.add(txFingerprint(tx))
  })

  const duplicates = new Set<number>()
  const seen = new Set<string>()

  rows.forEach((row, i) => {
    const fp = fingerprint(row)
    if (existingSet.has(fp)) {
      duplicates.add(i)
    }
    if (seen.has(fp)) {
      duplicates.add(i)
    }
    seen.add(fp)
  })

  const internalDuplicates = new Set<number>()
  const seenInternal = new Set<string>()
  rows.forEach((row, i) => {
    const fp = fingerprint(row)
    if (seenInternal.has(fp)) {
      internalDuplicates.add(i)
    }
    seenInternal.add(fp)
  })

  return { duplicates, internalDuplicates }
}

export function generateErrorCSV(rows: ImportRow[]): string {
  const lines = ['Row,Date,Description,Amount,Errors']
  rows.forEach(row => {
    if (row.errors.length > 0) {
      lines.push(`${row.originalRow},"${row.date}","${row.description}",${row.amount},"${row.errors.join('; ')}"`)
    }
  })
  return lines.join('\n')
}

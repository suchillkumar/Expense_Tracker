import type { ParsedData, RawTransactionRow } from './types'

function readFileAsArrayBuffer(file: File): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as ArrayBuffer)
    reader.onerror = reject
    reader.readAsArrayBuffer(file)
  })
}

function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsText(file)
  })
}

function readFileAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

export function detectFileType(file: File): string {
  const ext = file.name.split('.').pop()?.toLowerCase() || ''
  const mime = file.type.toLowerCase()

  if (ext === 'csv' || ext === 'tsv' || mime === 'text/csv' || mime === 'text/tab-separated-values') return 'csv'
  if (ext === 'xlsx' || ext === 'xls' || mime.includes('spreadsheet') || mime.includes('excel')) return 'excel'
  if (ext === 'json' || mime === 'application/json') return 'json'
  if (ext === 'pdf' || mime === 'application/pdf') return 'pdf'
  if (['jpg', 'jpeg', 'png', 'webp', 'heic'].includes(ext) || mime.startsWith('image/')) return 'image'
  if (ext === 'txt' || ext === 'text' || mime === 'text/plain') return 'txt'
  return ext || 'txt'
}

const MAX_FILE_SIZE = 20 * 1024 * 1024

export function validateFileSize(file: File): string | null {
  if (file.size > MAX_FILE_SIZE) {
    return `File too large (${(file.size / 1024 / 1024).toFixed(1)}MB). Maximum size is 20MB.`
  }
  return null
}

function parseCSVText(text: string): { headers: string[]; rows: RawTransactionRow[] } {
  const rows: string[][] = []
  let current: string[] = []
  let field = ''
  let inQuotes = false

  const isTab = text.includes('\t') && !text.includes(',')
  const delimiter = isTab ? '\t' : ','

  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"'
          i++
        } else {
          inQuotes = false
        }
      } else {
        field += ch
      }
    } else if (ch === '"') {
      inQuotes = true
    } else if (ch === delimiter) {
      current.push(field.trim())
      field = ''
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++
      current.push(field.trim())
      field = ''
      if (current.some(c => c !== '')) rows.push(current)
      current = []
    } else {
      field += ch
    }
  }
  current.push(field.trim())
  if (current.some(c => c !== '')) rows.push(current)

  if (rows.length === 0) return { headers: [], rows: [] }

  const headers = rows[0]
  const data = rows.slice(1).map(row => {
    const obj: RawTransactionRow = {}
    headers.forEach((h, i) => { obj[h] = row[i] || '' })
    return obj
  })

  return { headers, rows: data }
}

export async function parseCSV(file: File): Promise<ParsedData> {
  const text = await readFileAsText(file)
  const { headers, rows } = parseCSVText(text)
  return { headers, rows, fileName: file.name, fileType: 'csv' }
}

export async function parseCSVTextInput(text: string, fileName = 'pasted-data'): Promise<ParsedData> {
  const { headers, rows } = parseCSVText(text)
  return { headers, rows, fileName, fileType: 'csv' }
}

export async function parseExcel(file: File): Promise<ParsedData> {
  const XLSX = await import('xlsx')
  const buffer = await readFileAsArrayBuffer(file)
  const workbook = XLSX.read(buffer, { type: 'array' })

  const sheetNames = workbook.SheetNames
  const selectedSheet = sheetNames[0]
  const sheet = workbook.Sheets[selectedSheet]
  const json = XLSX.utils.sheet_to_json<Record<string, string>>(sheet, { defval: '' })

  if (json.length === 0) return { headers: [], rows: [], sheetNames, selectedSheet, fileName: file.name, fileType: 'excel' }

  const headers = Object.keys(json[0])
  const rows: RawTransactionRow[] = json.map(row => {
    const obj: RawTransactionRow = {}
    headers.forEach(h => { obj[h] = String(row[h] ?? '') })
    return obj
  })

  return { headers, rows, sheetNames, selectedSheet, fileName: file.name, fileType: 'excel' }
}

export async function parseJSON(file: File): Promise<ParsedData> {
  const text = await readFileAsText(file)
  return parseJSONText(text, file.name)
}

export function parseJSONText(text: string, fileName = 'pasted-data'): ParsedData {
  try {
    const data = JSON.parse(text)
    const arr = Array.isArray(data) ? data : data.transactions || data.data || data.records || [data]
    if (arr.length === 0) return { headers: [], rows: [], fileName, fileType: 'json' }

    const first = arr[0]
    const headers = Object.keys(first)
    const rows: RawTransactionRow[] = arr.map((item: any) => {
      const obj: RawTransactionRow = {}
      headers.forEach(h => { obj[h] = String(item[h] ?? '') })
      return obj
    })

    return { headers, rows, fileName, fileType: 'json' }
  } catch {
    return { headers: [], rows: [], fileName, fileType: 'json' }
  }
}

export async function parsePDF(file: File): Promise<ParsedData> {
  const pdfjsLib = await import('pdfjs-dist')
  pdfjsLib.GlobalWorkerOptions.workerSrc = ''

  const buffer = await readFileAsArrayBuffer(file)
  const pdf = await pdfjsLib.getDocument({ data: buffer }).promise

  let allText = ''
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i)
    const content = await page.getTextContent()
    const strings = content.items.map((item: any) => item.str)
    allText += strings.join(' ') + '\n'
  }

  return parseTextContent(allText, file.name, 'pdf')
}

export async function parseImage(file: File, onProgress?: (progress: number) => void): Promise<ParsedData> {
  const Tesseract = await import('tesseract.js')
  const dataURL = await readFileAsDataURL(file)

  const result = await Tesseract.recognize(dataURL, 'eng', {
    logger: (m: any) => {
      if (m.status === 'recognizing text' && onProgress) {
        onProgress(Math.round(m.progress * 100))
      }
    }
  })

  return parseTextContent(result.data.text, file.name, 'image')
}

export async function parseText(file: File): Promise<ParsedData> {
  const text = await readFileAsText(file)
  return parseTextContent(text, file.name, 'txt')
}

export function parseTextInput(text: string): ParsedData {
  return parseTextContent(text, 'pasted-data', 'txt')
}

function parseTextContent(text: string, fileName: string, fileType: string): ParsedData {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean)
  if (lines.length === 0) return { headers: [], rows: [], fileName, fileType }

  const headerKeywords = ['date', 'description', 'amount', 'type', 'category', 'debit', 'credit', 'narration', 'particulars', 'balance']
  const firstLine = lines[0].toLowerCase()
  const hasHeader = headerKeywords.some(k => firstLine.includes(k))

  if (hasHeader) {
    const delimiter = lines[0].includes('\t') ? '\t' : lines[0].includes(',') ? ',' : /\s{2,}/.test(lines[0]) ? /\s{2,}/ : ','
    const headers = typeof delimiter === 'string'
      ? lines[0].split(delimiter).map(h => h.trim())
      : lines[0].split(delimiter).map(h => h.trim())

    const rows: RawTransactionRow[] = lines.slice(1).map(line => {
      const values = typeof delimiter === 'string'
        ? line.split(delimiter).map(v => v.trim())
        : line.split(delimiter).map(v => v.trim())
      const obj: RawTransactionRow = {}
      headers.forEach((h, i) => { obj[h] = values[i] || '' })
      return obj
    })

    return { headers, rows, fileName, fileType }
  }

  return smartParseTransactions(text, fileName, fileType)
}

function smartParseTransactions(text: string, fileName: string, fileType: string): ParsedData {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean)
  const transactions: RawTransactionRow[] = []
  const datePattern = /(\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{2,4}|\d{4}[\/\-.]\d{1,2}[\/\-.]\d{1,2}|(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\w*\s+\d{1,2},?\s*\d{4}|\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\w*\s+\d{4})/i
  const amountPattern = /[₹$€£]?\s*[\d,]+\.?\d*/g
  const signPattern = /(?:dr|debit|withdrawal|debit|−|-)\s*/i
  const creditPattern = /(?:cr|credit|deposit|credit|\+)\s*/i

  for (const line of lines) {
    const dateMatch = line.match(datePattern)
    if (!dateMatch) continue

    const amountMatches = line.match(amountPattern)
    if (!amountMatches || amountMatches.length === 0) continue

    let amount = parseFloat(amountMatches[0].replace(/[₹$€£,\s]/g, ''))
    if (isNaN(amount) || amount === 0) continue

    const isCredit = creditPattern.test(line.substring(line.indexOf(dateMatch[0]) + dateMatch[0].length))
    const isDebit = signPattern.test(line.substring(line.indexOf(dateMatch[0]) + dateMatch[0].length))

    if (isDebit && !isCredit) amount = Math.abs(amount)

    const dateStr = dateMatch[0]
    const rest = line.replace(dateStr, '').replace(amountPattern, '').trim()
    const description = rest || 'Imported transaction'

    transactions.push({
      date: dateStr,
      description,
      amount: String(amount),
      type: isCredit ? 'income' : 'expense'
    })
  }

  if (transactions.length === 0) {
    return { headers: [], rows: [], fileName, fileType }
  }

  return {
    headers: ['date', 'description', 'amount', 'type'],
    rows: transactions,
    fileName,
    fileType
  }
}

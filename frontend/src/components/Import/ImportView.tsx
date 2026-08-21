import { useCallback, useMemo, useState } from 'react'
import { useExpense } from '../../context/ExpenseContext'
import { Transaction } from '../../types'
import { FileUploadZone } from './FileUploadZone'
import { ColumnMapper } from './ColumnMapper'
import { ImportPreview } from './ImportPreview'
import type { ColumnMapping, ImportRow, ParsedData } from '../../services/import/types'
import { detectFileType, validateFileSize, parseCSV, parseCSVTextInput, parseExcel, parseJSON, parseJSONText, parsePDF, parseImage, parseText, parseTextInput } from '../../services/import/parsers'
import { suggestColumnMapping, normalizeAll } from '../../services/import/normalizer'
import { detectDuplicates, generateErrorCSV } from '../../services/import/duplicates'

type Step = 'upload' | 'mapping' | 'preview' | 'importing' | 'done'

const STEPS: { key: Step; label: string; icon: string }[] = [
  { key: 'upload',     label: 'Upload',        icon: '📤' },
  { key: 'mapping',    label: 'Map Columns',   icon: '🔗' },
  { key: 'preview',    label: 'Preview & Edit', icon: '👁' },
  { key: 'importing',  label: 'Import',        icon: '⚙' },
  { key: 'done',       label: 'Done',          icon: '✓' },
]

export function ImportView() {
  const { importTransactions, notify, transactions } = useExpense()
  const [step, setStep] = useState<Step>('upload')
  const [parsing, setParsing] = useState(false)
  const [parseError, setParseError] = useState('')
  const [parsedData, setParsedData] = useState<ParsedData | null>(null)
  const [mapping, setMapping] = useState<ColumnMapping>({
    date: '', description: '', amount: '', type: '', category: '',
    notes: '', tags: '', debit: '', credit: ''
  })
  const [importRows, setImportRows] = useState<ImportRow[]>([])
  const [importResult, setImportResult] = useState<{ imported: number; skipped: number; failed: number } | null>(null)
  const [progress, setProgress] = useState(0)
  const [ocrProgress, setOcrProgress] = useState(0)
  const [pasteText, setPasteText] = useState('')
  const [importMode, setImportMode] = useState<'all' | 'new_only'>('all')

  const reset = () => {
    setStep('upload')
    setParsedData(null)
    setImportRows([])
    setImportResult(null)
    setParseError('')
    setProgress(0)
    setOcrProgress(0)
    setPasteText('')
  }

  const processFile = useCallback(async (file: File) => {
    const sizeErr = validateFileSize(file)
    if (sizeErr) { setParseError(sizeErr); return }
    setParsing(true)
    setParseError('')
    try {
      const fileType = detectFileType(file)
      let data: ParsedData
      switch (fileType) {
        case 'csv':   data = await parseCSV(file); break
        case 'excel': data = await parseExcel(file); break
        case 'json':  data = await parseJSON(file); break
        case 'pdf':   data = await parsePDF(file); break
        case 'image': data = await parseImage(file, setOcrProgress); break
        case 'txt':   data = await parseText(file); break
        default:      data = await parseCSV(file); break
      }
      if (data.rows.length === 0) {
        setParseError('No transactions found in this file. Please check the format.')
        setParsing(false)
        return
      }
      setParsedData(data)
      setMapping(suggestColumnMapping(data.headers))
      setStep('mapping')
    } catch (err) {
      setParseError(err instanceof Error ? err.message : 'Failed to parse file')
    }
    setParsing(false)
  }, [])

  const processText = useCallback(async () => {
    if (!pasteText.trim()) return
    setParsing(true)
    setParseError('')
    try {
      let data: ParsedData
      const trimmed = pasteText.trim()
      if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
        data = parseJSONText(trimmed)
      } else {
        data = await parseCSVTextInput(trimmed)
      }
      if (data.rows.length === 0) {
        const txtData = parseTextInput(trimmed)
        if (txtData.rows.length > 0) data = txtData
        else { setParseError('No transactions found. Try CSV, JSON, or tab-separated data.'); setParsing(false); return }
      }
      setParsedData(data)
      setMapping(suggestColumnMapping(data.headers))
      setStep('mapping')
    } catch (err) {
      setParseError(err instanceof Error ? err.message : 'Failed to parse text')
    }
    setParsing(false)
  }, [pasteText])

  const runNormalization = useCallback(() => {
    if (!parsedData) return
    setImportRows(normalizeAll(parsedData, mapping, []))
    setStep('preview')
  }, [parsedData, mapping])

  const dupResult = useMemo(() => {
    if (importRows.length === 0) return { duplicates: new Set<number>(), internalDuplicates: new Set<number>() }
    return detectDuplicates(importRows, transactions)
  }, [importRows, transactions])

  const doImport = async () => {
    setStep('importing')
    setProgress(0)
    const toImport: Omit<Transaction, 'id'>[] = []
    const errors: { row: number; message: string }[] = []
    const skippedIndices = new Set<number>()

    importRows.forEach((row, i) => {
      if (importMode === 'new_only' && dupResult.duplicates.has(i)) {
        skippedIndices.add(i); return
      }
      toImport.push({
        description: row.description,
        amount: row.amount,
        type: row.type,
        category: row.category,
        date: new Date(row.date).toISOString(),
        paymentMethod: 'Cash',
        notes: row.notes.trim() || undefined,
      })
    })

    const chunkSize = 50
    let imported = 0
    for (let i = 0; i < toImport.length; i += chunkSize) {
      const chunk = toImport.slice(i, i + chunkSize)
      try { imported += await importTransactions(chunk) }
      catch { errors.push({ row: i, message: 'Chunk import failed' }) }
      setProgress(Math.round(((i + chunk.length) / toImport.length) * 100))
    }

    setImportResult({ imported, skipped: skippedIndices.size, failed: errors.length })
    setStep('done')
    if (imported > 0) notify(`Imported ${imported} transactions`, 'info')
  }

  const stepIndex = STEPS.findIndex(s => s.key === step)
  const validRows = importRows.filter(r => r.errors.length === 0)

  const downloadErrors = () => {
    const blob = new Blob([generateErrorCSV(importRows)], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = 'import-errors.csv'; a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-5 max-w-5xl mx-auto">
      {/* ── Header ── */}
      <div>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl gradient-ocean flex items-center justify-center text-white text-base shadow-sm shadow-gray-200/50">
            📦
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">Universal Import</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              Import from CSV, Excel, PDF, images, JSON, or any text format
            </p>
          </div>
        </div>
      </div>

      {/* ── Stepper ── */}
      <div className="glass-card rounded-2xl px-5 py-3.5 shadow-sm">
        <div className="flex items-center justify-between">
          {STEPS.map((s, i) => (
            <div key={s.key} className="flex items-center">
              <div className="flex items-center gap-2">
                <div className={`
                  w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold
                  transition-all duration-400 ease-out
                  ${i < stepIndex
                    ? 'bg-green-600 text-white shadow-sm shadow-gray-200/50'
                    : i === stepIndex
                      ? 'gradient-primary text-white shadow-md shadow-sky-500/10'
                      : 'bg-gray-100 text-gray-400'
                  }
                `}>
                  {i < stepIndex ? '✓' : s.icon}
                </div>
                <span className={`text-[11px] font-semibold hidden sm:block transition-colors duration-300 ${
                  i <= stepIndex ? 'text-gray-700' : 'text-gray-400'
                }`}>{s.label}</span>
              </div>
              {i < STEPS.length - 1 && (
                <div className={`w-8 sm:w-14 h-[2px] mx-2.5 rounded-full transition-all duration-500 ${
                  i < stepIndex ? 'bg-green-300' : 'bg-gray-200'
                }`} />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* ── Step: Upload ── */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {step === 'upload' && (
        <div className="space-y-4">
          <div className="glass-card rounded-2xl p-6 shadow-sm">
            {parsing ? (
              <div className="text-center py-16">
                <div className="w-16 h-16 mx-auto mb-5 rounded-2xl gradient-primary flex items-center justify-center shadow-lg shadow-sky-500/10">
                  <span className="text-2xl text-white">⚙</span>
                </div>
                <p className="text-sm font-semibold text-gray-700">
                  {ocrProgress > 0 ? 'OCR Processing...' : 'Analyzing file...'}
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  {ocrProgress > 0 ? `Extracting text from image ${ocrProgress}%` : 'Reading and parsing your data'}
                </p>
                {ocrProgress > 0 && (
                  <div className="mt-5 w-64 mx-auto">
                    <div className="bg-gray-200 rounded-full h-2 overflow-hidden">
                      <div className="h-full rounded-full gradient-primary progress-bar" style={{ width: `${ocrProgress}%` }} />
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <>
                <FileUploadZone onFileSelected={processFile} />
                {parseError && (
                  <div className="mt-4 flex items-start gap-2.5 text-sm text-red-600 bg-red-50 rounded-xl px-4 py-3 border border-red-200">
                    <span className="text-red-500 mt-0.5 shrink-0">⚠</span>
                    <span className="text-xs">{parseError}</span>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Paste area */}
          <div className="glass-card rounded-2xl p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl gradient-slate-subtle flex items-center justify-center text-base">📋</div>
              <div>
                <p className="text-sm font-semibold text-gray-700">Or paste transaction data</p>
                <p className="text-[11px] text-gray-400">CSV, JSON, tab-separated, or plain text</p>
              </div>
            </div>
            <textarea
              value={pasteText}
              onChange={(e) => setPasteText(e.target.value)}
              className="w-full h-40 font-mono text-xs border border-gray-200 rounded-xl p-4 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-400 resize-none bg-gray-50 transition-all duration-200 placeholder:text-gray-400"
              placeholder={`date,description,amount,type,category\n2024-01-15,Groceries,42.50,expense,Food\n2024-01-16,Salary,3500.00,income,Salary`}
            />
            {pasteText.trim() && (
              <button onClick={processText}
                className="mt-3 px-5 py-2 rounded-xl gradient-primary text-white text-xs font-semibold shadow-sm shadow-sky-500/10 flex items-center gap-1.5">
                <span>🚀</span> Parse Data
              </button>
            )}
          </div>

          {/* Format cards */}
          <div className="glass-card rounded-2xl p-6 shadow-sm">
            <p className="text-[10px] font-bold text-gray-400 mb-3.5 uppercase tracking-wider">Supported Formats</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {[
                { icon: '📊', label: 'CSV / TSV', desc: 'Comma or tab separated', bg: 'bg-gray-50 hover:bg-sky-50' },
                { icon: '📗', label: 'Excel',      desc: 'XLS & XLSX spreadsheets', bg: 'bg-gray-50 hover:bg-green-50' },
                { icon: '📄', label: 'PDF',         desc: 'Bank statements & receipts', bg: 'bg-gray-50 hover:bg-amber-50' },
                { icon: '🖼',  label: 'Images',     desc: 'JPG, PNG, WEBP + OCR',   bg: 'bg-gray-50 hover:bg-purple-50' },
                { icon: '🔧', label: 'JSON',        desc: 'API exports & structured', bg: 'bg-gray-50 hover:bg-cyan-50' },
                { icon: '📝', label: 'Text',         desc: 'Any transaction data',    bg: 'bg-gray-50 hover:bg-gray-100' },
              ].map((f, i) => (
                <div key={f.label}
                  className={`flex items-start gap-3 p-3.5 rounded-xl ${f.bg} border border-gray-100 cursor-default transition-all duration-300`}
                  style={{ animationDelay: `${i * 50}ms` }}>
                  <span className="text-lg shrink-0 mt-0.5">{f.icon}</span>
                  <div>
                    <p className="text-[11px] font-semibold text-gray-700">{f.label}</p>
                    <p className="text-[10px] text-gray-400 mt-0.5 leading-relaxed">{f.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* ── Step: Mapping ── */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {step === 'mapping' && parsedData && (
        <div className="space-y-4">
          <div className="glass-card rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl gradient-ocean-subtle flex items-center justify-center text-base shadow-sm">📊</div>
                <div>
                  <p className="text-sm font-bold text-gray-900">{parsedData.fileName}</p>
                  <p className="text-[11px] text-gray-400 mt-0.5">
                    {parsedData.rows.length} rows · {parsedData.headers.length} columns detected
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={reset}
                  className="px-4 py-2 rounded-xl border border-gray-200 text-xs font-semibold text-gray-600 bg-white hover:bg-gray-100 transition-all duration-200">
                  ← Start Over
                </button>
                <button onClick={runNormalization}
                  className="px-5 py-2 rounded-xl gradient-primary text-white text-xs font-semibold shadow-sm shadow-sky-500/10 transition-all duration-200">
                  Continue →
                </button>
              </div>
            </div>
          </div>

          <ColumnMapper sourceHeaders={parsedData.headers} mapping={mapping} onChange={setMapping} />

          {/* Data preview */}
          <div className="glass-card rounded-2xl p-5 shadow-sm">
            <p className="text-[10px] font-bold text-gray-400 mb-3 uppercase tracking-wider">Data Preview</p>
            <div className="overflow-x-auto rounded-xl border border-gray-200">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-gray-50">
                    {parsedData.headers.slice(0, 8).map(h => (
                      <th key={h} className="py-2.5 px-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {parsedData.rows.slice(0, 5).map((row, i) => (
                    <tr key={i} className="hover:bg-sky-50/20 transition-colors duration-150">
                      {parsedData.headers.slice(0, 8).map(h => (
                        <td key={h} className="py-2 px-3 text-[11px] text-gray-600 max-w-[120px] truncate">{row[h] || '—'}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* ── Step: Preview ── */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {step === 'preview' && (
        <div className="space-y-4">
          <div className="glass-card rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl gradient-primary-subtle flex items-center justify-center text-base shadow-sm">👁</div>
                <div>
                  <p className="text-sm font-bold text-gray-900">Import Verification & Preview</p>
                  <div className="flex flex-wrap items-center gap-3 mt-1.5 text-xs">
                    <span className="bg-gray-100 text-gray-700 px-2 py-0.5 rounded-md font-bold">
                      Total Records: {importRows.length}
                    </span>
                    <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-md font-bold">
                      Valid: {validRows.length - dupResult.duplicates.size}
                    </span>
                    <span className="bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-md font-bold">
                      Duplicates: {dupResult.duplicates.size}
                    </span>
                    <span className="bg-red-50 text-red-700 border border-red-200 px-2 py-0.5 rounded-md font-bold">
                      Invalid: {importRows.length - validRows.length}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex gap-2">
                <button onClick={() => setStep('mapping')}
                  className="px-4 py-2 rounded-xl border border-gray-200 text-xs font-semibold text-gray-600 bg-white hover:bg-gray-100 transition-all duration-200">
                  ← Back
                </button>
                <button onClick={doImport}
                  className="px-5 py-2 rounded-xl gradient-success text-white text-xs font-semibold shadow-sm shadow-gray-200/50 flex items-center gap-1.5 transition-all duration-200">
                  <span>✓</span>                   Import {validRows.length} Transactions
                </button>
              </div>
            </div>

            {/* Import mode */}
            {dupResult.duplicates.size > 0 && (
              <div className="mt-4 p-4 bg-amber-50 rounded-xl border border-amber-200">
                <p className="text-[11px] font-bold text-amber-800 mb-2.5 uppercase tracking-wide">Import Mode</p>
                <div className="flex flex-wrap gap-2">
                  {[
                    { key: 'all' as const,      label: 'Import all', count: importRows.length, icon: '📦' },
                    { key: 'new_only' as const, label: 'New only',   count: importRows.length - dupResult.duplicates.size, icon: '✨' },
                  ].map(opt => (
                    <button key={opt.key} onClick={() => setImportMode(opt.key)}
                      className={`px-4 py-2 rounded-lg text-[11px] font-semibold border transition-all duration-200 flex items-center gap-1.5 ${
                        importMode === opt.key
                          ? 'bg-amber-600 text-white border-amber-600 shadow-sm shadow-amber-200/50'
                          : 'bg-white text-gray-600 border-gray-200 hover:border-amber-300'
                      }`}>
                      <span>{opt.icon}</span> {opt.label} ({opt.count})
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="glass-card rounded-2xl p-5 shadow-sm">
            <ImportPreview
              rows={importRows}
              duplicates={dupResult.duplicates}
              internalDuplicates={dupResult.internalDuplicates}
              onChange={setImportRows}
            />
          </div>

        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* ── Step: Importing ── */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {step === 'importing' && (
        <div className="glass-card rounded-2xl p-16 text-center shadow-sm">
          <div className="w-16 h-16 mx-auto mb-5 rounded-2xl gradient-primary flex items-center justify-center shadow-lg shadow-sky-500/10">
            <span className="text-2xl text-white">⚙</span>
          </div>
          <p className="text-base font-bold text-gray-900 mb-0.5">Importing transactions...</p>
          <p className="text-xs text-gray-400 mb-6">Please don't close this page</p>
          <div className="w-72 mx-auto">
            <div className="bg-gray-200 rounded-full h-2.5 overflow-hidden">
              <div className="h-full rounded-full gradient-success progress-bar shadow-sm" style={{ width: `${progress}%` }} />
            </div>
            <p className="text-[11px] text-gray-400 mt-2 font-semibold">{progress}% complete</p>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* ── Step: Done ── */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {step === 'done' && importResult && (
        <div className="glass-card rounded-2xl p-12 text-center shadow-sm">
          <div className="w-20 h-20 mx-auto mb-5 rounded-2xl gradient-success flex items-center justify-center shadow-lg shadow-gray-200/50">
            <span className="text-4xl text-white">✓</span>
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-0.5">Import Complete</h3>
          <p className="text-xs text-gray-400 mb-7">Your transactions have been imported successfully</p>

          <div className="flex items-center justify-center gap-10 mb-8">
            <div className="text-center">
              <p className="text-3xl font-semibold text-green-600 tabular-nums">{importResult.imported}</p>
              <p className="text-xs text-[#64748B] dark:text-[#94A3B8] font-medium uppercase tracking-wider mt-1">Imported</p>
            </div>
            {importResult.skipped > 0 && (
              <div className="text-center">
                <p className="text-3xl font-semibold text-amber-500 tabular-nums">{importResult.skipped}</p>
                <p className="text-xs text-[#64748B] dark:text-[#94A3B8] font-medium uppercase tracking-wider mt-1">Skipped</p>
              </div>
            )}
            {importResult.failed > 0 && (
              <div className="text-center">
                <p className="text-3xl font-semibold text-red-500 tabular-nums">{importResult.failed}</p>
                <p className="text-xs text-[#64748B] dark:text-[#94A3B8] font-medium uppercase tracking-wider mt-1">Failed</p>
              </div>
            )}
          </div>

          <div className="flex items-center justify-center gap-3">
            <button onClick={reset}
              className="px-6 py-2.5 rounded-xl gradient-primary text-white text-sm font-semibold shadow-sm shadow-sky-500/10 transition-all duration-200">
              Import More
            </button>
            {importResult.failed > 0 && (
              <button onClick={downloadErrors}
                className="px-5 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 bg-white hover:bg-gray-100 flex items-center gap-1.5 transition-all duration-200">
                <span>📥</span> Error Report
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

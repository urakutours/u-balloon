/**
 * CSV parse / generate utilities.
 * - BOM-aware (read & write)
 * - RFC 4180 double-quote escaping
 * - Header-row-to-object mapping
 */

// ---------------------------------------------------------------------------
// Parse
// ---------------------------------------------------------------------------

/**
 * Parse a CSV string (BOM-aware) into an array of plain objects.
 * The first row is treated as the header row.
 */
export function parseCsv(text: string): Record<string, string>[] {
  // Strip BOM
  const cleaned = text.startsWith('\uFEFF') ? text.slice(1) : text

  // Split into raw lines, keeping track of quoted newlines
  const rows = splitCsvRows(cleaned)
  if (rows.length < 2) return []

  const headers = parseCsvLine(rows[0])
  const result: Record<string, string>[] = []

  for (let i = 1; i < rows.length; i++) {
    const line = rows[i].trim()
    if (!line) continue
    const values = parseCsvLine(line)
    const row: Record<string, string> = {}
    headers.forEach((header, j) => {
      row[header.trim()] = (values[j] ?? '').trim()
    })
    result.push(row)
  }

  return result
}

/**
 * Split a CSV text into rows, respecting quoted fields that may contain newlines.
 */
function splitCsvRows(text: string): string[] {
  const rows: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (ch === '"') {
      if (inQuotes && text[i + 1] === '"') {
        current += '"'
        i++
      } else {
        inQuotes = !inQuotes
        current += ch
      }
    } else if ((ch === '\n' || (ch === '\r' && text[i + 1] === '\n')) && !inQuotes) {
      if (ch === '\r') i++ // consume \n
      rows.push(current)
      current = ''
    } else {
      current += ch
    }
  }
  if (current) rows.push(current)
  return rows
}

/**
 * Parse a single CSV line into field values.
 */
function parseCsvLine(line: string): string[] {
  const fields: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
    } else if (ch === ',' && !inQuotes) {
      fields.push(current)
      current = ''
    } else {
      current += ch
    }
  }
  fields.push(current)
  return fields
}

// ---------------------------------------------------------------------------
// Generate
// ---------------------------------------------------------------------------

export type CsvColumn = {
  key: string
  label: string
}

/**
 * Convert an array of objects to a BOM-prefixed UTF-8 CSV string.
 * Null/undefined values become empty strings; values containing commas,
 * quotes, or newlines are double-quote escaped.
 */
export function toCsv(data: Record<string, unknown>[], columns: CsvColumn[]): string {
  const BOM = '\uFEFF'
  const escape = (val: unknown): string => {
    if (val === null || val === undefined) return '""'
    const s = String(val).replace(/"/g, '""')
    return `"${s}"`
  }
  const header = columns.map(c => escape(c.label)).join(',')
  const rows = data.map(row => columns.map(c => escape(row[c.key])).join(','))
  return BOM + [header, ...rows].join('\n')
}

/**
 * Return a BOM-prefixed CSV header-only template.
 */
export function toCsvTemplate(columns: CsvColumn[]): string {
  const BOM = '\uFEFF'
  const header = columns.map(c => `"${c.label}"`).join(',')
  return BOM + header + '\n'
}

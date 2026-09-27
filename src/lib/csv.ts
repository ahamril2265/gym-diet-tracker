export type CsvCell = string | number | boolean | null | undefined

/** RFC 4180 field: quote when it contains a comma, quote, CR or LF; double inner quotes. */
export function csvField(v: CsvCell): string {
  if (v === null || v === undefined) return ''
  const s = String(v)
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

/** Header + rows → CSV text with CRLF line endings (what Excel and Google Sheets expect). */
export function toCsv(header: string[], rows: CsvCell[][]): string {
  return [header, ...rows].map((r) => r.map(csvField).join(',')).join('\r\n') + '\r\n'
}

import * as XLSX from 'xlsx'

export function exportExpenses(expenses, filename = 'DD-Cottages-Expenses') {
  const rows = expenses.map((entry) => ({
    Date: entry.entry_date || '',
    Property: entry.property || '',
    Description: entry.description || '',
    Amount: Number(entry.amount || 0),
  }))

  const sheet = XLSX.utils.json_to_sheet(rows.length ? rows : [{ Notice: 'No expenses match this view.' }])
  sheet['!cols'] = [
    { wch: 14 },
    { wch: 22 },
    { wch: 32 },
    { wch: 16 },
  ]

  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, sheet, 'Expenses')
  XLSX.writeFile(workbook, `${filename}-${new Date().toISOString().slice(0, 10)}.xlsx`)
}

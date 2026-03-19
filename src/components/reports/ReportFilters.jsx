import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const MONTHS = [
  'Janeiro','Fevereiro','Março','Abril','Maio','Junho',
  'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'
];

const now = new Date();
const years = Array.from({ length: 3 }, (_, i) => now.getFullYear() - i);

export default function ReportFilters({
  reportType, setReportType,
  selectedMonth, setSelectedMonth,
  selectedDay, setSelectedDay,
  selectedYear, setSelectedYear,
}) {
  return (
    <div className="space-y-3">
      <div className="flex gap-2 flex-wrap">
        {['day','month','year'].map(t => (
          <button
            key={t}
            onClick={() => setReportType(t)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              reportType === t ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground hover:bg-muted'
            }`}
          >
            {t === 'day' ? 'Diário' : t === 'month' ? 'Mensal' : 'Anual'}
          </button>
        ))}
      </div>
      <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
        {(reportType === 'day' || reportType === 'month') && (
          <Select value={String(selectedMonth)} onValueChange={v => setSelectedMonth(Number(v))}>
            <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
            <SelectContent>
              {MONTHS.map((m, i) => <SelectItem key={i} value={String(i)}>{m}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
        {reportType === 'day' && (
          <Select value={String(selectedDay)} onValueChange={v => setSelectedDay(Number(v))}>
            <SelectTrigger className="w-24"><SelectValue placeholder="Dia" /></SelectTrigger>
            <SelectContent>
              {Array.from({ length: 31 }, (_, i) => i + 1).map(d => (
                <SelectItem key={d} value={String(d)}>{String(d).padStart(2,'0')}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <Select value={String(selectedYear)} onValueChange={v => setSelectedYear(Number(v))}>
          <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
          <SelectContent>
            {years.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
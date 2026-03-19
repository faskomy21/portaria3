import React, { useState, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Search, User, X } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Autocomplete de moradores.
 * Props:
 *  - residents: array de moradores [{id, name, apartment_number, block_name, ...}]
 *  - value: resident_id selecionado
 *  - onChange: (resident_id, resident) => void
 *  - placeholder: string (opcional)
 *  - className: string (opcional)
 */
export default function ResidentSearch({ residents = [], value, onChange, placeholder = 'Digite o nome do morador...', className }) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(0);
  const containerRef = useRef(null);
  const inputRef = useRef(null);

  // Mostra o nome do selecionado quando não está editando
  const selectedResident = residents.find(r => r.id === value);

  // Quando o valor externo muda (ex: reset do form), limpa a query
  useEffect(() => {
    if (!value) setQuery('');
  }, [value]);

  const filtered = query.trim().length === 0
    ? []
    : residents.filter(r => {
        const q = query.toLowerCase();
        return (
          r.name?.toLowerCase().includes(q) ||
          r.apartment_number?.toLowerCase().includes(q) ||
          r.block_name?.toLowerCase().includes(q)
        );
      }).slice(0, 10);

  function handleSelect(resident) {
    onChange(resident.id, resident);
    setQuery('');
    setOpen(false);
  }

  function handleClear() {
    onChange('', null);
    setQuery('');
    setOpen(false);
    inputRef.current?.focus();
  }

  function handleInputChange(e) {
    setQuery(e.target.value);
    setOpen(true);
    setHighlighted(0);
    if (!e.target.value) onChange('', null);
  }

  function handleKeyDown(e) {
    if (!open || filtered.length === 0) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setHighlighted(h => Math.min(h + 1, filtered.length - 1)); }
    if (e.key === 'ArrowUp') { e.preventDefault(); setHighlighted(h => Math.max(h - 1, 0)); }
    if (e.key === 'Enter') { e.preventDefault(); if (filtered[highlighted]) handleSelect(filtered[highlighted]); }
    if (e.key === 'Escape') setOpen(false);
  }

  // Fecha ao clicar fora
  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <Input
          ref={inputRef}
          value={selectedResident && !open ? selectedResident.name : query}
          onChange={handleInputChange}
          onFocus={() => { if (query) setOpen(true); }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="pl-9 pr-9"
          autoComplete="off"
        />
        {(value || query) && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Selected badge */}
      {selectedResident && !open && (
        <p className="text-xs text-muted-foreground mt-1 pl-1">
          {selectedResident.block_name} — Apt {selectedResident.apartment_number}
        </p>
      )}

      {/* Dropdown */}
      {open && filtered.length > 0 && (
        <div className="absolute z-50 top-full mt-1 w-full bg-popover border border-border rounded-xl shadow-lg overflow-hidden">
          {filtered.map((r, i) => (
            <button
              key={r.id}
              type="button"
              onMouseDown={(e) => { e.preventDefault(); handleSelect(r); }}
              className={cn(
                'w-full flex items-center gap-3 px-4 py-2.5 text-left text-sm transition-colors',
                i === highlighted ? 'bg-primary/10 text-primary' : 'hover:bg-muted'
              )}
              onMouseEnter={() => setHighlighted(i)}
            >
              <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <User className="h-4 w-4 text-primary" />
              </div>
              <div className="min-w-0">
                <p className="font-medium truncate">{r.name}</p>
                <p className="text-xs text-muted-foreground">{r.block_name} — Apt {r.apartment_number}</p>
              </div>
            </button>
          ))}
        </div>
      )}

      {open && query.trim().length > 0 && filtered.length === 0 && (
        <div className="absolute z-50 top-full mt-1 w-full bg-popover border border-border rounded-xl shadow-lg px-4 py-3 text-sm text-muted-foreground">
          Nenhum morador encontrado para "{query}"
        </div>
      )}
    </div>
  );
}
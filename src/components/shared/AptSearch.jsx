import React, { useState, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';

export default function AptSearch({ apartments, value, onChange, disabled }) {
  const [query, setQuery] = useState(value || '');
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);

  // sync external value
  useEffect(() => {
    setQuery(value || '');
  }, [value]);

  // close on outside click
  useEffect(() => {
    function handleClick(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const suggestions = apartments.filter(a =>
    a.number.toLowerCase().includes(query.toLowerCase())
  ).slice(0, 20);

  function handleInput(e) {
    const val = e.target.value;
    setQuery(val);
    onChange(val); // permite valor livre também
    setOpen(true);
  }

  function handleSelect(apt) {
    setQuery(apt.number);
    onChange(apt.number);
    setOpen(false);
  }

  return (
    <div ref={containerRef} className="relative">
      <Input
        placeholder="Digite ou selecione o apartamento"
        value={query}
        onChange={handleInput}
        onFocus={() => setOpen(true)}
        disabled={disabled}
        autoComplete="off"
      />
      {open && suggestions.length > 0 && (
        <ul className="absolute z-20 w-full mt-1 bg-card border border-border rounded-lg shadow-lg max-h-48 overflow-y-auto">
          {suggestions.map(apt => (
            <li
              key={apt.id}
              onMouseDown={() => handleSelect(apt)}
              className={`px-3 py-2 text-sm cursor-pointer hover:bg-muted transition-colors ${apt.number === value ? 'bg-primary/10 font-medium' : ''}`}
            >
              {apt.number}{apt.floor ? ` — ${apt.floor}º andar` : ''}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
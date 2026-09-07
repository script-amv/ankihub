import { useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { Check, ChevronDown, Search } from 'lucide-react';

type Option<T extends string> = { value: T; label: string; depth?: number };
type Props<T extends string> = {
  label: string; value: T; options: Option<T>[]; onChange: (value: T) => void;
  searchable?: boolean; disabled?: boolean; icon?: ReactNode;
};

export function Dropdown<T extends string>({ label, value, options, onChange, searchable = false, disabled = false, icon }: Props<T>) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const [above, setAbove] = useState(false);
  const [listHeight, setListHeight] = useState(310);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const list = useRef<HTMLDivElement>(null);
  const filtered = options.filter(o => o.label.toLocaleLowerCase().includes(query.toLocaleLowerCase()));
  const selected = options.find(o => o.value === value);

  function close(restoreFocus = false) {
    setOpen(false);
    if (restoreFocus) trigger.current?.focus();
  }
  function show() {
    const rect = trigger.current?.getBoundingClientRect();
    if (rect) {
      const below = window.innerHeight - rect.bottom;
      const openAbove = below < 330 && rect.top > below;
      setAbove(openAbove);
      setListHeight(Math.max(70, Math.min(310, (openAbove ? rect.top : below) - (searchable ? 75 : 35))));
    }
    setQuery(''); setActive(Math.max(0, options.findIndex(o => o.value === value))); setOpen(true);
  }
  function choose(option: Option<T>) { onChange(option.value); close(true); }
  useEffect(() => {
    if (!open) return;
    (searchable ? input.current : list.current)?.focus();
    const outside = (event: PointerEvent) => { if (!root.current?.contains(event.target as Node)) setOpen(false); };
    document.addEventListener('pointerdown', outside);
    const resize = () => setOpen(false);
    window.addEventListener('resize', resize);
    return () => { document.removeEventListener('pointerdown', outside); window.removeEventListener('resize', resize); };
  }, [open, searchable]);
  useEffect(() => {
    if (open) document.getElementById(`${id}-option-${active}`)?.scrollIntoView({ block: 'nearest' });
  }, [active, open, id]);

  function keyDown(event: KeyboardEvent) {
    if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); close(true); return; }
    if (event.key === 'Tab') { setOpen(false); trigger.current?.focus(); return; }
    const max = filtered.length - 1;
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault(); setActive(i => Math.max(0, Math.min(max, i + (event.key === 'ArrowDown' ? 1 : -1))));
    } else if (!searchable && (event.key === 'Home' || event.key === 'End')) {
      event.preventDefault(); setActive(event.key === 'Home' ? 0 : Math.max(0, max));
    } else if (event.key === 'Enter' || (!searchable && event.key === ' ')) {
      event.preventDefault(); if (filtered[active]) choose(filtered[active]);
    }
  }

  return <div className={`dropdown ${open ? 'is-open' : ''}`} ref={root}
    onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setOpen(false); }}>
    <button ref={trigger} type="button" className="dropdown-trigger" disabled={disabled} aria-label={label}
      aria-haspopup="listbox" aria-expanded={open} aria-controls={open ? `${id}-list` : undefined}
      onClick={() => open ? close() : show()}
      onKeyDown={event => { if (event.key === 'ArrowDown' || event.key === 'ArrowUp') { event.preventDefault(); show(); } }}>
      {icon}<span>{selected?.label ?? label}</span><ChevronDown size={13} className="dropdown-chevron"/>
    </button>
    {open && <div className="dropdown-panel" style={above ? { top: 'auto', bottom: 'calc(100% + 8px)' } : undefined} onKeyDown={keyDown}>
      {searchable && <div className="dropdown-search"><Search size={14}/><input ref={input} role="combobox"
        aria-label="Search decks" aria-autocomplete="list" aria-expanded={open} aria-controls={`${id}-list`}
        aria-activedescendant={filtered[active] ? `${id}-option-${active}` : undefined}
        value={query} onChange={event => { setQuery(event.target.value); setActive(0); }} placeholder="Search decks…"/></div>}
      <div className="dropdown-list" role="listbox" aria-label={label} id={`${id}-list`} ref={list}
        style={{ maxHeight: listHeight }}
        tabIndex={searchable ? undefined : -1} aria-activedescendant={!searchable && filtered[active] ? `${id}-option-${active}` : undefined}>
        {filtered.map((option, i) => <div key={option.value} id={`${id}-option-${i}`} role="option"
          aria-selected={option.value === value} className={`dropdown-option ${i === active ? 'active' : ''}`}
          onMouseEnter={() => setActive(i)} onMouseDown={event => event.preventDefault()} onClick={() => choose(option)}>
          <span style={{ paddingLeft: query ? 0 : Math.min(option.depth ?? 0, 5) * 12 }} title={option.label}>{option.label}</span>
          {option.value === value && <Check size={14}/>}</div>)}
      </div>
      {!filtered.length && <p className="dropdown-empty" role="status">No decks found</p>}
    </div>}
  </div>;
}

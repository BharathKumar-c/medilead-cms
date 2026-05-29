import { useState } from 'react';
import { Search, ChevronDown } from 'lucide-react';

const MultiCheckboxSelect = ({ options: rawOptions, selected = [], onChange, placeholder = 'Select...' }) => {
  const options = rawOptions || [];
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const allSelected = options.length > 0 && selected.length === options.length;
  const someSelected = selected.length > 0 && !allSelected;

  const filteredOptions = options.filter(opt => {
    const label = typeof opt === 'string' ? opt : (opt.name || opt.label || opt);
    return label.toLowerCase().includes(search.toLowerCase());
  });

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      setOpen(false);
      setSearch('');
    } else if (e.key === 'Tab') {
      setOpen(false);
      setSearch('');
    }
  };

  const handleSelectAll = () => {
    if (allSelected) {
      onChange([]);
    } else {
      onChange(options.map(opt =>
        typeof opt === 'string' ? opt : (opt.name || opt.value || opt)
      ));
    }
  };

  const handleIndividualChange = (val) => {
    if (selected.includes(val)) {
      onChange(selected.filter(s => s !== val));
    } else {
      onChange([...selected, val]);
    }
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => { setOpen(!open); if (!open) setTimeout(() => document.getElementById('multi-search-input')?.focus(), 50); }}
        onKeyDown={handleKeyDown}
        className={`w-full px-4 py-3 border rounded-lg font-body-md text-left flex items-center justify-between bg-surface-container-lowest transition-all ${open ? 'border-secondary ring-2 ring-secondary/20' : 'border-outline-variant'}`}
        data-testid="multi-select-trigger"
      >
        <span className={selected.length === 0 ? 'text-on-surface-variant/50' : 'text-on-surface'}>
          {selected.length === 0 ? (placeholder || 'Select...') : allSelected ? 'All Departments' : `${selected.length} selected`}
        </span>
        <ChevronDown className={`w-4 h-4 text-on-surface-variant transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute z-20 mt-1 w-full bg-surface-container-lowest border border-outline-variant rounded-lg shadow-lg" data-testid="multi-select-dropdown">
          {/* Search input */}
          <div className="relative p-2 border-b border-outline-variant">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-on-surface-variant" />
            <input
              id="multi-search-input"
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search..."
              className="w-full pl-7 pr-3 py-1.5 border border-outline-variant rounded-lg font-body-sm text-on-surface bg-surface-container-lowest focus:outline-none focus:border-secondary transition-all"
              onKeyDown={(e) => { if (e.key === 'Escape') { setOpen(false); setSearch(''); } }}
              onClick={(e) => e.stopPropagation()}
              autoFocus
              data-testid="multi-search-input"
            />
          </div>
          <div className="max-h-48 overflow-y-auto">
            {/* "All Departments" option */}
            {options.length > 0 && (
              <label className="flex items-center gap-3 px-4 py-2.5 hover:bg-surface-container cursor-pointer transition-colors border-b border-outline-variant/50" data-testid="all-departments-option">
                <input
                  type="checkbox"
                  checked={allSelected}
                  ref={(el) => { if (el) el.indeterminate = someSelected; }}
                  onChange={handleSelectAll}
                  className="w-4 h-4 rounded border-outline-variant text-primary focus:ring-primary/20"
                  data-testid="all-departments-checkbox"
                />
                <span className="text-sm text-on-surface font-bold">All Departments</span>
                {allSelected && <span className="text-xs text-on-surface-variant ml-auto">{options.length} selected</span>}
              </label>
            )}
            {/* Individual options */}
            {filteredOptions.length === 0 ? (
              <p className="px-4 py-3 text-sm text-on-surface-variant">No options available</p>
            ) : filteredOptions.map((opt) => {
              const label = typeof opt === 'string' ? opt : (opt.name || opt.label || opt);
              const val = typeof opt === 'string' ? opt : (opt.name || opt.value || opt);
              const isSelected = selected.includes(val);
              return (
                <label key={val} className="flex items-center gap-3 px-4 py-2.5 hover:bg-surface-container cursor-pointer transition-colors" data-testid={`option-${val}`}>
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => handleIndividualChange(val)}
                    className="w-4 h-4 rounded border-outline-variant text-primary focus:ring-primary/20"
                    data-testid={`checkbox-${val}`}
                  />
                  <span className="text-sm text-on-surface">{label}</span>
                </label>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default MultiCheckboxSelect;

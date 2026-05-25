import {useState, useRef, useEffect, useCallback} from 'react';
import {ChevronDown, X, Search} from 'lucide-react';

const SearchableSelect = ({
  options = [],
  value = '',
  onChange,
  placeholder = 'Select an option',
  label,
  error,
  required,
  disabled,
  onClear,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeIndex, setActiveIndex] = useState(-1); // -1 = search input has focus

  const containerRef = useRef(null);
  const inputRef = useRef(null);
  const listRef = useRef(null);
  const itemRefs = useRef([]); // one ref per filtered option

  /* ── close on outside click ─────────────────────────────────────── */
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
        setSearchTerm('');
        setActiveIndex(-1);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  /* ── reset search + active index when dropdown closes ───────────── */
  useEffect(() => {
    if (!isOpen) {
      setSearchTerm('');
      setActiveIndex(-1);
    }
  }, [isOpen]);

  /* ── reset active index whenever the filtered list changes ──────── */
  useEffect(() => {
    setActiveIndex(-1);
  }, [searchTerm]);

  /* ── scroll the highlighted item into view ───────────────────────── */
  useEffect(() => {
    if (activeIndex >= 0 && itemRefs.current[activeIndex]) {
      itemRefs.current[activeIndex].scrollIntoView({block: 'nearest'});
    }
  }, [activeIndex]);

  /* ── derived list ────────────────────────────────────────────────── */
  const filtered = options.filter((opt) => {
    const lbl = typeof opt === 'string' ? opt : opt.label;
    return lbl.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const selectedLabel = (() => {
    const opt = options.find((o) =>
      typeof o === 'string' ? o === value : String(o.value) === String(value),
    );
    return opt ? (typeof opt === 'string' ? opt : opt.label) : '';
  })();

  /* ── actions ─────────────────────────────────────────────────────── */
  const handleSelect = (opt) => {
    onChange(typeof opt === 'string' ? opt : opt.value);
    setIsOpen(false);
    setSearchTerm('');
    setActiveIndex(-1);
    // Return focus to the trigger so Tab continues to the next field
    containerRef.current?.querySelector('[role="combobox"]')?.focus();
  };

  const handleClear = (e) => {
    e.stopPropagation();
    onChange('');
    setSearchTerm('');
    setActiveIndex(-1);
    if (onClear) onClear();
    // After clearing, keep focus on the trigger
    containerRef.current?.querySelector('[role="combobox"]')?.focus();
  };

  const handleToggle = () => {
    if (disabled) return;
    const opening = !isOpen;
    setIsOpen(opening);
    if (opening) setTimeout(() => inputRef.current?.focus(), 50);
  };

  /* ── keyboard handler for the trigger (closed state) ────────────── */
  const handleTriggerKeyDown = useCallback((e) => {
    if (disabled) return;
    switch (e.key) {
      case 'Enter':
      case ' ': {
        e.preventDefault();
        handleToggle();
        break;
      }
      case 'ArrowDown': {
        e.preventDefault();
        if (!isOpen) handleToggle();
        break;
      }
      default:
        break;
    }
  }, [disabled, isOpen]);

  /* ── keyboard handler (attached to the search input) ────────────── */
  const handleKeyDown = useCallback(
    (e) => {
      if (!isOpen) return;

      switch (e.key) {
        case 'ArrowDown': {
          e.preventDefault();
          // Move from search box (−1) or wrap around from last item
          setActiveIndex((prev) => (prev < filtered.length - 1 ? prev + 1 : 0));
          break;
        }
        case 'ArrowUp': {
          e.preventDefault();
          setActiveIndex((prev) => {
            if (prev <= 0) {
              // Jump back to search input
              inputRef.current?.focus();
              return -1;
            }
            return prev - 1;
          });
          break;
        }
        case 'Enter': {
          e.preventDefault();
          if (activeIndex >= 0 && filtered[activeIndex]) {
            handleSelect(filtered[activeIndex]);
          }
          break;
        }
        case 'Tab': {
          // Select highlighted item (if any) then close dropdown.
          // Don't preventDefault — let the browser's native Tab
          // move focus to the next interactive element naturally.
          if (activeIndex >= 0 && filtered[activeIndex]) {
            onChange(
              typeof filtered[activeIndex] === 'string'
                ? filtered[activeIndex]
                : filtered[activeIndex].value,
            );
          }
          setIsOpen(false);
          setSearchTerm('');
          setActiveIndex(-1);
          break;
        }
        case 'Escape': {
          e.preventDefault();
          setIsOpen(false);
          containerRef.current?.querySelector('[role="combobox"]')?.focus();
          break;
        }
        default:
          break;
      }
    },
    [isOpen, activeIndex, filtered, onChange, handleSelect],
  );

  /* ── layout helpers ──────────────────────────────────────────────── */
  const hasClear = Boolean(value && !disabled);
  const rightPadding = hasClear ? 'pr-[4.5rem]' : 'pr-10';

  return (
    <div ref={containerRef} className="relative">
      {label && (
        <label className="flex items-center gap-1 font-caption text-on-surface-variant uppercase mb-1.5 leading-none">
          {label}
          {required && (
            <span className="text-error text-base font-bold leading-none">
              *
            </span>
          )}
        </label>
      )}

      {/* ── Trigger row ───────────────────────────────────────────────── */}
      <div
        onClick={handleToggle}
        onKeyDown={!isOpen ? handleTriggerKeyDown : undefined}
        role="combobox"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-label={label || placeholder}
        tabIndex={disabled ? -1 : 0}
        className={`
          relative w-full flex items-center
          px-4 py-3 ${rightPadding}
          border rounded-lg
          font-body-md text-on-surface bg-surface-container-lowest
          cursor-pointer transition-all
          focus:outline-none focus:ring-2
          ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
          ${
            error
              ? 'border-error focus:border-error focus:ring-error/20'
              : 'border-outline-variant focus:border-secondary focus:ring-secondary/20'
          }
        `}>
        {isOpen ? (
          <input
            ref={inputRef}
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search..."
            className="flex-1 min-w-0 bg-transparent outline-none font-body-md text-on-surface placeholder:text-on-surface-variant/50"
            onClick={(e) => e.stopPropagation()}
            autoFocus
          />
        ) : (
          <span
            className={`flex-1 min-w-0 truncate ${
              selectedLabel ? 'text-on-surface' : 'text-on-surface-variant/50'
            }`}>
            {selectedLabel || placeholder}
          </span>
        )}

        {/* Right-side icon cluster */}
        <span className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
          {hasClear && (
            <button
              tabIndex={-1}
              onClick={handleClear}
              className="flex items-center justify-center w-5 h-5 rounded-full hover:bg-surface-container-high transition-colors"
              title="Clear">
              <X className="w-3.5 h-3.5 text-on-surface-variant" />
            </button>
          )}
          {isOpen ? (
            <Search className="w-4 h-4 text-on-surface-variant pointer-events-none" />
          ) : (
            <ChevronDown className="w-4 h-4 text-on-surface-variant pointer-events-none" />
          )}
        </span>
      </div>

      {/* ── Dropdown list ─────────────────────────────────────────────── */}
      {isOpen && (
        <div
          ref={listRef}
          role="listbox"
          className="absolute z-50 w-full mt-1 bg-surface-container-lowest border border-outline-variant rounded-lg shadow-lg max-h-48 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="px-4 py-3 font-body-sm text-on-surface-variant text-center">
              No options found
            </div>
          ) : (
            filtered.map((opt, i) => {
              const optValue = typeof opt === 'string' ? opt : opt.value;
              const optLabel = typeof opt === 'string' ? opt : opt.label;
              const isSelected = String(optValue) === String(value);
              const isActive = i === activeIndex;

              return (
                <button
                  key={i}
                  ref={(el) => (itemRefs.current[i] = el)}
                  role="option"
                  aria-selected={isSelected}
                  tabIndex={-1}
                  onMouseEnter={() => setActiveIndex(i)}
                  onMouseLeave={() => setActiveIndex(-1)}
                  onClick={() => handleSelect(opt)}
                  className={`w-full text-left px-4 py-2.5 font-body-md transition-colors focus:outline-none
                    ${
                      isSelected
                        ? 'bg-secondary/10 text-secondary font-bold'
                        : isActive
                          ? 'bg-surface-container-high text-on-surface'
                          : 'text-on-surface hover:bg-surface-container-high'
                    }`}>
                  {optLabel}
                </button>
              );
            })
          )}
        </div>
      )}

      {error && <p className="font-caption text-error mt-1">{error}</p>}
    </div>
  );
};

export default SearchableSelect;

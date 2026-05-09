import { useState, useRef, useEffect } from "react";
import { Globe, CaretDown, Check } from "@phosphor-icons/react";
import { LANGUAGES, DEFAULT_LANGUAGE_CODE, type Language } from "@/lib/languages";

interface Props {
  value: string;
  onChange: (code: string) => void;
  label?: string;
}

export default function LanguageSelector({ value, onChange, label }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const selected: Language =
    LANGUAGES.find((l) => l.code === value) ??
    LANGUAGES.find((l) => l.code === DEFAULT_LANGUAGE_CODE)!;

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div className="space-y-2">
      {label && (
        <p className="text-xs uppercase tracking-[0.15em] text-neutral-500">{label}</p>
      )}
      <div ref={ref} className="relative w-fit">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="flex items-center gap-2.5 bg-neutral-50 border border-neutral-300 rounded-full pl-3.5 pr-3 py-2 text-sm text-neutral-900 hover:bg-neutral-100 transition-colors"
          aria-haspopup="listbox"
          aria-expanded={open}
        >
          <Globe weight="fill" className="w-4 h-4 text-neutral-600 shrink-0" />
          <span className="font-normal">
            {selected.nativeName}
          </span>
          <span className="text-neutral-500 text-xs">({selected.name})</span>
          <CaretDown
            weight="fill"
            className={`w-3.5 h-3.5 text-neutral-500 transition-transform ${open ? "rotate-180" : ""}`}
          />
        </button>

        {open && (
          <div
            className="absolute left-0 top-full mt-2 z-50 min-w-[220px] max-h-72 overflow-y-auto rounded-2xl bg-white border border-neutral-200 shadow-lg py-1"
            role="listbox"
          >
            {LANGUAGES.map((lang) => {
              const isSelected = lang.code === value;
              return (
                <button
                  key={lang.code}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => {
                    onChange(lang.code);
                    setOpen(false);
                  }}
                  dir={lang.rtl ? "rtl" : undefined}
                  className={`w-full flex items-center justify-between gap-3 px-4 py-2.5 text-sm transition-colors ${
                    isSelected
                      ? "bg-neutral-100 text-neutral-900"
                      : "text-neutral-700 hover:bg-neutral-50"
                  }`}
                >
                  <span className="flex flex-col items-start gap-0.5 text-left">
                    <span className="font-normal">{lang.nativeName}</span>
                    <span className="text-xs text-neutral-500">{lang.name}</span>
                  </span>
                  {isSelected && (
                    <Check weight="bold" className="w-3.5 h-3.5 text-neutral-900 shrink-0" />
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

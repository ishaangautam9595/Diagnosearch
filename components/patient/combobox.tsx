"use client";
import { Fragment, useEffect, useId, useRef, useState } from "react";
import { useDebounced } from "@/lib/client/use-debounced";
import { cn } from "@/lib/utils";

export interface ComboOption { key: string; primary: string; secondary?: string; /** Heading shown above the first option of each group. */ group?: string }

/** Accessible, debounced remote-search combobox shared by location and test search. */
export function RemoteCombobox<T>({
  endpoint, fetcher, debounceMs = 250, minChars, placeholder, icon, toOption, onPick, initialText = "", clearOnPick = false, ariaLabel, inputClassName, minCharsHint,
}: {
  /** Simple JSON endpoint returning { items }. Ignored if `fetcher` is given. */
  endpoint?: string;
  /** Custom async source (e.g. several services merged). */
  fetcher?: (q: string, signal: AbortSignal) => Promise<T[]>;
  debounceMs?: number;
  minChars: number;
  placeholder: string;
  icon: React.ReactNode;
  toOption: (item: T) => ComboOption;
  onPick: (item: T) => void;
  initialText?: string;
  clearOnPick?: boolean;
  ariaLabel: string;
  inputClassName?: string;
  minCharsHint?: string;
}) {
  const id = useId();
  const [text, setText] = useState(initialText);
  const [items, setItems] = useState<T[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState("");
  const debounced = useDebounced(text, debounceMs);
  const box = useRef<HTMLDivElement>(null);

  // Adopt a new externally-provided text (e.g. saved location loaded) during render, not in an effect.
  const [prevInitial, setPrevInitial] = useState(initialText);
  if (prevInitial !== initialText) { setPrevInitial(initialText); setText(initialText); }

  useEffect(() => {
    const q = debounced.trim();
    if (!open || q.length < minChars) return;
    const ctrl = new AbortController();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    const source: Promise<T[]> = fetcher
      ? fetcher(q, ctrl.signal)
      : fetch(`${endpoint}?q=${encodeURIComponent(q)}`, { signal: ctrl.signal }).then((r) => (r.ok ? r.json() : { items: [] })).then((d: { items: T[] }) => d.items);
    source
      .then((list) => { setItems(list); setSearched(q); setActive(0); })
      .catch(() => {})
      .finally(() => setLoading(false));
    return () => ctrl.abort();
  }, [debounced, open, endpoint, fetcher, minChars]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => { if (!box.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const pick = (item: T) => {
    onPick(item);
    setOpen(false);
    setText(clearOnPick ? "" : toOption(item).primary);
    setItems([]);
  };
  const showList = open && text.trim().length >= minChars;

  return (
    <div ref={box} className="relative">
      <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-primary-dark">{icon}</span>
      <input
        role="combobox"
        aria-label={ariaLabel}
        aria-expanded={showList}
        aria-controls={`${id}-list`}
        aria-autocomplete="list"
        aria-activedescendant={showList && items[active] ? `${id}-opt-${active}` : undefined}
        autoComplete="off"
        value={text}
        placeholder={placeholder}
        className={cn("h-12 w-full rounded-xl border border-border bg-white pl-10 pr-3 text-sm placeholder:text-[#6b7785] focus-visible:border-primary-dark", inputClassName)}
        onChange={(e) => { setText(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => Math.min(a + 1, items.length - 1)); }
          else if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
          else if (e.key === "Enter" && showList && items[active]) { e.preventDefault(); pick(items[active]); }
          else if (e.key === "Escape") setOpen(false);
        }}
      />
      {open && !showList && minCharsHint ? (
        <div className="absolute z-30 mt-1 w-full rounded-xl border border-border bg-white p-3 text-sm text-muted shadow-lg">{minCharsHint}</div>
      ) : null}
      {showList ? (
        <ul id={`${id}-list`} role="listbox" className="absolute z-30 mt-1 max-h-72 w-full overflow-auto rounded-xl border border-border bg-white p-1 shadow-lg">
          {items.map((it, i) => {
            const o = toOption(it);
            const heading = o.group && o.group !== (i > 0 ? toOption(items[i - 1]).group : undefined) ? o.group : null;
            return (
              <Fragment key={o.key}>
              {heading ? <li role="presentation" className="px-3 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wide text-muted">{heading}</li> : null}
              <li
                id={`${id}-opt-${i}`}
                role="option"
                aria-selected={i === active}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => pick(it)}
                onMouseEnter={() => setActive(i)}
                className={cn("cursor-pointer rounded-lg px-3 py-2 text-sm", i === active && "bg-mint")}
              >
                <div className="font-medium">{o.primary}</div>
                {o.secondary ? <div className="text-xs text-muted">{o.secondary}</div> : null}
              </li>
              </Fragment>
            );
          })}
          {!loading && items.length === 0 && searched ? <li className="px-3 py-2 text-sm text-muted">No matches found</li> : null}
          {loading ? <li className="px-3 py-2 text-sm text-muted">Searching…</li> : null}
        </ul>
      ) : null}
    </div>
  );
}

"use client";

import { useCallback, useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Coins,
  FileText,
  LayoutGrid,
  Loader2,
  Search,
  TrendingUp,
  Video,
  X,
  Zap,
} from "lucide-react";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import type { DeskSearchResult, DeskSearchResultType } from "@/lib/dashboard-search";

const DEBOUNCE_MS = 400;
const MIN_QUERY_LENGTH = 2;

const TYPE_LABELS: Record<DeskSearchResultType, string> = {
  page: "Page",
  coin: "Coin",
  article: "Article",
  insight: "Insight",
  video: "Video",
};

function ResultIcon({ type }: { type: DeskSearchResultType }) {
  const className = "dash-search-result-icon";
  switch (type) {
    case "coin":
      return <Coins className={className} strokeWidth={1.5} />;
    case "insight":
      return <Zap className={className} strokeWidth={1.5} />;
    case "video":
      return <Video className={className} strokeWidth={1.5} />;
    case "article":
      return <FileText className={className} strokeWidth={1.5} />;
    case "page":
      return <LayoutGrid className={className} strokeWidth={1.5} />;
    default:
      return <TrendingUp className={className} strokeWidth={1.5} />;
  }
}

function SearchSkeleton() {
  return (
    <ul className="dash-search-list" aria-hidden="true">
      {Array.from({ length: 3 }).map((_, index) => (
        <li key={index} className="dash-search-skeleton">
          <span className="dash-search-skeleton-icon" />
          <span className="dash-search-skeleton-lines">
            <span className="dash-search-skeleton-line dash-search-skeleton-line--title" />
            <span className="dash-search-skeleton-line dash-search-skeleton-line--sub" />
          </span>
        </li>
      ))}
    </ul>
  );
}

export function DeskSearch() {
  const router = useRouter();
  const listboxId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const requestIdRef = useRef(0);

  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState<DeskSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchedTerm, setSearchedTerm] = useState<string | null>(null);
  const [fetchError, setFetchError] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  const trimmedQuery = query.trim();
  const debouncedQuery = useDebouncedValue(trimmedQuery, DEBOUNCE_MS);
  const isDebouncing = trimmedQuery !== debouncedQuery && trimmedQuery.length >= MIN_QUERY_LENGTH;
  const isSearching = loading || isDebouncing;
  const hasFreshResults =
    !isSearching && searchedTerm === debouncedQuery && debouncedQuery.length >= MIN_QUERY_LENGTH;

  const resetSearch = useCallback(() => {
    setQuery("");
    setResults([]);
    setSearchedTerm(null);
    setFetchError(false);
    setActiveIndex(-1);
  }, []);

  const closePanel = useCallback(() => {
    setOpen(false);
  }, []);

  useEffect(() => {
    if (debouncedQuery.length < MIN_QUERY_LENGTH) {
      setResults([]);
      setLoading(false);
      setSearchedTerm(null);
      setFetchError(false);
      setActiveIndex(-1);
      return;
    }

    const requestId = ++requestIdRef.current;
    const controller = new AbortController();
    setLoading(true);
    setFetchError(false);

    void (async () => {
      try {
        const res = await fetch(`/api/dashboard/search?q=${encodeURIComponent(debouncedQuery)}`, {
          signal: controller.signal,
        });

        if (controller.signal.aborted || requestId !== requestIdRef.current) return;

        if (!res.ok) {
          setResults([]);
          setSearchedTerm(debouncedQuery);
          setFetchError(true);
          return;
        }

        const data = (await res.json()) as { results?: DeskSearchResult[] };
        if (controller.signal.aborted || requestId !== requestIdRef.current) return;

        setResults(data.results ?? []);
        setSearchedTerm(debouncedQuery);
        setActiveIndex(-1);
      } catch (error) {
        if (controller.signal.aborted || requestId !== requestIdRef.current) return;
        if (error instanceof DOMException && error.name === "AbortError") return;

        setResults([]);
        setSearchedTerm(debouncedQuery);
        setFetchError(true);
      } finally {
        if (requestId === requestIdRef.current) {
          setLoading(false);
        }
      }
    })();

    return () => controller.abort();
  }, [debouncedQuery]);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, []);

  const showPanel = open && trimmedQuery.length > 0;
  const hasResults = results.length > 0;

  const handleResultSelect = useCallback(() => {
    closePanel();
    resetSearch();
  }, [closePanel, resetSearch]);

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Escape") {
      if (trimmedQuery) {
        resetSearch();
        return;
      }
      closePanel();
      inputRef.current?.blur();
      return;
    }

    if (!showPanel || !hasFreshResults || !hasResults) return;

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((current) => (current + 1) % results.length);
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((current) => (current <= 0 ? results.length - 1 : current - 1));
      return;
    }

    if (event.key === "Enter") {
      event.preventDefault();
      const target = activeIndex >= 0 ? results[activeIndex] : results[0];
      if (!target) return;
      handleResultSelect();
      router.push(target.href);
    }
  };

  return (
    <div ref={rootRef} className="dash-search-wrap">
      <div className={`dash-search-field ${open ? "dash-search-field--open" : ""}`}>
        <Search className="dash-search-icon" strokeWidth={1.5} aria-hidden="true" />
        <input
          ref={inputRef}
          type="text"
          inputMode="search"
          enterKeyHint="search"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder="Search desk…"
          className="dash-search-input"
          role="combobox"
          aria-expanded={showPanel}
          aria-controls={listboxId}
          aria-autocomplete="list"
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
        />
        {isSearching && trimmedQuery.length >= MIN_QUERY_LENGTH ? (
          <Loader2 className="dash-search-spinner" strokeWidth={1.5} aria-hidden="true" />
        ) : trimmedQuery ? (
          <button
            type="button"
            onClick={() => {
              resetSearch();
              inputRef.current?.focus();
            }}
            className="dash-search-clear"
            aria-label="Clear search"
          >
            <X className="h-3.5 w-3.5" strokeWidth={1.5} />
          </button>
        ) : null}
      </div>

      {showPanel ? (
        <div className="dash-search-panel" role="listbox" id={listboxId}>
          {trimmedQuery.length < MIN_QUERY_LENGTH ? (
            <p className="dash-search-hint">Type at least {MIN_QUERY_LENGTH} characters to search the desk.</p>
          ) : null}

          {trimmedQuery.length >= MIN_QUERY_LENGTH && isSearching ? <SearchSkeleton /> : null}

          {hasFreshResults && hasResults ? (
            <ul className="dash-search-list">
              {results.map((result, index) => (
                <li key={result.id}>
                  <Link
                    href={result.href}
                    role="option"
                    aria-selected={index === activeIndex}
                    className={`dash-search-item ${index === activeIndex ? "dash-search-item--active" : ""}`}
                    onMouseEnter={() => setActiveIndex(index)}
                    onClick={handleResultSelect}
                  >
                    <span className="dash-search-item-icon-wrap">
                      <ResultIcon type={result.type} />
                    </span>
                    <span className="dash-search-item-copy">
                      <span className="dash-search-item-title">{result.title}</span>
                      {result.subtitle ? (
                        <span className="dash-search-item-sub">{result.subtitle}</span>
                      ) : null}
                    </span>
                    <span className="dash-search-item-type">{TYPE_LABELS[result.type]}</span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : null}

          {hasFreshResults && !hasResults && !fetchError ? (
            <div className="dash-search-empty">
              <Search className="dash-search-empty-icon" strokeWidth={1.5} aria-hidden="true" />
              <p className="dash-search-empty-title">No matches found</p>
              <p className="dash-search-empty-sub">
                Nothing on the desk matched &ldquo;{debouncedQuery}&rdquo;. Try a coin, article title, or page name.
              </p>
            </div>
          ) : null}

          {hasFreshResults && fetchError ? (
            <div className="dash-search-empty">
              <p className="dash-search-empty-title">Search unavailable</p>
              <p className="dash-search-empty-sub">Could not load results right now. Please try again.</p>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

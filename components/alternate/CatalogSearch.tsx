"use client";

import { useRef, useState, type ReactNode } from "react";
import { nouns } from "@/lib/copy";
import { alternate } from "@/lib/alternate-copy";
import { Counted } from "@/components/ui/Counted";
import styles from "@/app/alternate/alternate.module.css";

type Entry = { code: string; title: string; content: ReactNode };

// Arabic spelling variants and optional course-code spaces should not make
// an otherwise correct query fail. All six cards are already local.
function normalize(value: string) {
  return value
    .toLocaleLowerCase("ar")
    .normalize("NFKD")
    .replace(/[\u064B-\u065F\u0670\u0640]/g, "")
    .replace(/[أإآ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/\s/g, "");
}

export function CatalogSearch({
  entries,
  gridClassName = "",
}: {
  entries: Entry[];
  gridClassName?: string;
}) {
  const [query, setQuery] = useState("");
  const input = useRef<HTMLInputElement>(null);
  const term = normalize(query);
  const visible = entries.filter((entry) =>
    normalize(`${entry.code} ${entry.title}`).includes(term),
  );

  function clearSearch() {
    setQuery("");
    input.current?.focus();
  }

  return (
    <div>
      <div className={styles.searchRow} data-reveal>
        <div className={styles.searchField}>
          <label htmlFor="alternate-course-search">
            {alternate.catalog.searchLabel}
          </label>
          <input
            ref={input}
            id="alternate-course-search"
            name="course-search"
            type="search"
            dir="auto"
            autoComplete="off"
            spellCheck={false}
            aria-describedby="alternate-search-hint"
            placeholder={alternate.catalog.searchPlaceholder}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          <p className={styles.searchHint} id="alternate-search-hint">
            {alternate.catalog.searchHint.before}{" "}
            <bdi dir="ltr" className="font-mono" translate="no">
              {alternate.catalog.searchHint.code}
            </bdi>{" "}
            {alternate.catalog.searchHint.after}
          </p>
        </div>
        <div className={styles.resultCount}>
          <p role="status" aria-live="polite" aria-atomic="true">
            <span className="sr-only">{alternate.results}: </span>
            <Counted n={visible.length} forms={nouns.course} />
          </p>
          {query ? (
            <button
              type="button"
              className={styles.searchClear}
              onClick={clearSearch}
            >
              {alternate.catalog.clear}
            </button>
          ) : null}
        </div>
      </div>
      {visible.length ? (
        <div className={`${styles.courseGrid} ${gridClassName}`} data-reveal>
          {visible.map((entry) => (
            <div key={entry.code}>{entry.content}</div>
          ))}
        </div>
      ) : (
        <div className={styles.empty}>
          <h3>{alternate.catalog.emptyTitle}</h3>
          <p>{alternate.catalog.emptyBody}</p>
          <button
            type="button"
            className={styles.textLink}
            onClick={clearSearch}
          >
            {alternate.catalog.clear}
          </button>
        </div>
      )}
    </div>
  );
}

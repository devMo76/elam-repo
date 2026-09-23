"use client";

import {
  useId,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { alternateTwo } from "@/lib/alternate-two-copy";
import styles from "@/app/alternate-2/alternate-two.module.css";

/** A real course explorer: panels use the same curriculum as course pages. */
export function CourseExplorer({
  entries,
}: {
  entries: { code: string; content: ReactNode }[];
}) {
  const [active, setActive] = useState(0);
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  const id = useId();

  function navigate(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    let next = index;
    // The visual order is right to left; physical arrow keys follow it.
    if (event.key === "ArrowLeft") next = (index + 1) % entries.length;
    else if (event.key === "ArrowRight")
      next = (index - 1 + entries.length) % entries.length;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = entries.length - 1;
    else return;
    event.preventDefault();
    setActive(next);
    tabs.current[next]?.focus();
  }

  if (!entries.length) return null;
  return (
    <div className={styles.explorer}>
      <div className={styles.explorerTop}>
        <p>{alternateTwo.explorer.heading}</p>
        <div
          className={styles.tabs}
          role="tablist"
          aria-label={alternateTwo.explorer.label}
        >
          {entries.map((entry, index) => (
            <button
              key={entry.code}
              ref={(element) => {
                tabs.current[index] = element;
              }}
              type="button"
              role="tab"
              id={`${id}-tab-${index}`}
              aria-controls={`${id}-panel-${index}`}
              aria-selected={active === index}
              tabIndex={active === index ? 0 : -1}
              onClick={() => setActive(index)}
              onKeyDown={(event) => navigate(event, index)}
            >
              <bdi dir="ltr" translate="no">
                {entry.code}
              </bdi>
            </button>
          ))}
        </div>
      </div>
      <div className={styles.explorerPanels}>
        {entries.map((entry, index) => (
          <div
            key={entry.code}
            role="tabpanel"
            id={`${id}-panel-${index}`}
            aria-labelledby={`${id}-tab-${index}`}
            aria-hidden={active !== index}
            inert={active !== index}
            data-active={active === index}
            tabIndex={active === index ? 0 : -1}
            className={styles.explorerPanel}
          >
            {entry.content}
          </div>
        ))}
      </div>
    </div>
  );
}

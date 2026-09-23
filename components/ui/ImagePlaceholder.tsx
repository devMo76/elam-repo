import { ImageSquare } from "@phosphor-icons/react/dist/ssr";
import { placeholder } from "@/lib/copy";

/**
 * A deliberately unfinished-looking image slot.
 *
 * Replaces the seeded stock photography that stood here previously. Random
 * photographs read as real content and quietly set expectations the site
 * cannot meet; a dashed placeholder cannot be mistaken for a finished asset,
 * and makes the remaining work visible on the page itself.
 *
 * `label` names the intended asset so the slot documents its own replacement.
 */
export function ImagePlaceholder({
  label,
  className = "",
}: {
  label?: string;
  className?: string;
}) {
  return (
    <div
      className={`flex items-center justify-center rounded-card border-2 border-dashed border-hairline bg-tint ${className}`}
    >
      <div className="px-6 py-8 text-center">
        <ImageSquare
          size={32}
          aria-hidden
          className="mx-auto text-muted opacity-70"
        />
        <p className="mt-3 text-sm text-muted">{placeholder.image}</p>
        {label ? (
          <p className="mt-1 font-mono text-xs text-muted opacity-70" dir="ltr">
            {label}
          </p>
        ) : null}
      </div>
    </div>
  );
}

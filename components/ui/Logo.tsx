import Image from "next/image";

/**
 * Horizontal lockup: book mark beside the wordmark.
 *
 * The supplied brand asset (importants/elam_logo.jpg) is a stacked lockup on
 * an opaque white background, and stacked artwork cannot fit a 72px header. So
 * it is preprocessed into PNGs with real alpha, split at the whitespace gap
 * between the mark and the wordmark.
 *
 * One variant each, since the site is light-only. The dark-remapped PNGs the
 * build script also produces are unused; see docs/asset-swap-list.md.
 *
 * Both carry empty alt: the containing link supplies the accessible name, and
 * a logo announced twice is worse than one announced once.
 */
export function Logo({ className = "h-9" }: { className?: string }) {
  return (
    <span className={`flex items-center gap-2.5 ${className}`}>
      <span className="relative block aspect-[224/258] h-full">
        <Image
          src="/elam-mark.png"
          alt=""
          fill
          sizes="48px"
          priority
          className="object-contain"
        />
      </span>

      <span className="relative block aspect-[421/136] h-[52%]">
        <Image
          src="/elam-wordmark.png"
          alt=""
          fill
          sizes="110px"
          priority
          className="object-contain"
        />
      </span>
    </span>
  );
}

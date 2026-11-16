import Link from "next/link";
import { footer, site } from "@/lib/copy";
import { Logo } from "@/components/ui/Logo";

/**
 * Columned footer. No version stamps, no build strings, no locale or time
 * strips, all of which read as devtool fixtures on a marketing page.
 *
 * Shared support contacts and the single policy page remain available across
 * public pages. Contact values are isolated from surrounding Arabic text.
 */
export function SiteFooter() {
  return (
    <footer className="bg-surface">
      <div className="mx-auto max-w-[1400px] px-4 py-16 md:px-8">
        <div className="grid gap-10 md:grid-cols-12">
          <div className="md:col-span-4">
            <Link href="/" aria-label={site.name} className="inline-block">
              <Logo className="h-11" />
            </Link>
            <p className="mt-4 max-w-[36ch] text-sm text-muted">
              {footer.disclaimer}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-8 md:col-span-8 md:grid-cols-4">
            {footer.columns.map((col) => (
              <div key={col.title}>
                <h3 className="text-sm font-semibold text-ink">{col.title}</h3>
                <ul className="mt-4 space-y-3">
                  {col.links.map((link) => (
                    <li key={link.label}>
                      <Link
                        href={link.href}
                        className="inline-flex min-h-11 max-w-full items-center text-sm text-muted transition-colors hover:text-accent"
                      >
                        <bdi dir={"direction" in link ? link.direction : "auto"} className="[overflow-wrap:anywhere]">{link.label}</bdi>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}

import Link from "next/link";
import Image from "next/image";
import {
  PlayCircle,
  Translate,
  SealCheck,
} from "@phosphor-icons/react/dist/ssr";
import { hero, cta } from "@/lib/copy";
import { Button } from "@/components/ui/Button";
import motion from "./HeroMotion.module.css";

const pointIcons = [PlayCircle, Translate, SealCheck];

export function Hero({ animated = false }: { animated?: boolean }) {
  return (
    <section
      className={`relative isolate overflow-hidden border-b border-hairline ${animated ? motion.hero : ""}`}
    >
      <HeroBackdrop />

      <div className="mx-auto w-full max-w-[1400px] px-4 pt-12 pb-16 md:px-8 md:pt-16 md:pb-24">
        <div className="grid items-center gap-14 lg:grid-cols-[minmax(0,46ch)_minmax(0,31rem)] lg:justify-center lg:gap-16">
          <div className="max-w-[42ch]">
            <h1
              data-hero="title"
              className="text-4xl leading-[1.28] font-bold text-balance text-ink md:text-5xl lg:text-[3.5rem]"
            >
              {hero.headline}
            </h1>

            <p data-hero="lead" className="mt-6 text-lg text-body md:text-xl">
              {hero.subtext}
            </p>

            <div
              data-hero="actions"
              className="mt-9 flex flex-wrap items-center gap-x-8 gap-y-4"
            >
              <Button href="#catalog">{cta.browse}</Button>
              <Link
                href="#vetting"
                className="text-base font-medium text-accent underline-offset-4 transition-colors hover:underline"
              >
                {hero.anchorLabel}
              </Link>
            </div>

            <ul className="mt-10 flex flex-col gap-3.5 border-t border-hairline pt-7">
              {hero.points.map((point, i) => {
                const Icon = pointIcons[i];
                return (
                  <li
                    data-hero="point"
                    key={point}
                    className="flex items-center gap-2 text-sm text-muted"
                  >
                    <Icon
                      size={20}
                      weight="duotone"
                      aria-hidden
                      className="shrink-0 text-accent"
                    />
                    {point}
                  </li>
                );
              })}
            </ul>
          </div>

          <HeroFrame />
        </div>
      </div>
    </section>
  );
}

function HeroFrame() {
  const corners = "rounded-card rounded-ss-frame";

  return (
    <div data-hero="image" className="relative mx-auto w-full max-w-150">
      <div
        aria-hidden
        className={`absolute -top-3 -inset-e-3 h-full w-full bg-accent md:-top-7 md:-inset-e-7 ${corners}`}
      />

      <div className={`relative aspect-3/2 w-full overflow-hidden ${corners}`}>
        <Image
          src="/website_eng_building.webp"
          alt=""
          fill
          priority
          sizes="(min-width: 1024px) 544px, 100vw"
          className="object-cover"
        />
      </div>
    </div>
  );
}

function HeroBackdrop() {
  const arc = "M-80,525 C300,660 620,405 900,435 C1160,462 1290,600 1520,525";

  return (
    <div aria-hidden className="absolute inset-0 -z-10">
      <div className="absolute inset-0 bg-linear-to-b from-tint/70 to-surface" />

      <svg
        viewBox="0 0 1440 640"
        preserveAspectRatio="none"
        className="absolute inset-0 hidden h-full w-full lg:block"
      >
        <g>
          <path d={`${arc} L1520,740 L-80,740 Z`} fill="var(--tint)" />
          <path
            data-hero="curve"
            d={arc}
            fill="none"
            stroke="var(--accent)"
            strokeOpacity="0.22"
            strokeWidth="1.5"
            vectorEffect="non-scaling-stroke"
          />
        </g>
      </svg>
    </div>
  );
}

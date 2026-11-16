import { createElement, type CSSProperties } from "react";

// The fixture serves local images directly; production retains next/image.
export default function TestImage({ src, alt, fill, className, style, sizes }: {
  src: string | { src: string }; alt: string; fill?: boolean; priority?: boolean;
  className?: string; style?: CSSProperties; sizes?: string;
}) {
  return createElement("img", { src: typeof src === "string" ? src : src.src, alt, className, sizes,
    style: fill ? { position: "absolute", inset: 0, width: "100%", height: "100%", ...style } : style });
}

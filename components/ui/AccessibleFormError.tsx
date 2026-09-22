"use client";

import { useEffect, useRef } from "react";

export function AccessibleFormError({
  children,
  className,
  id,
}: {
  children: string;
  className?: string;
  id?: string;
}) {
  const errorRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    errorRef.current?.focus();
  }, [children]);

  return (
    <p className={className} id={id} ref={errorRef} role="alert" tabIndex={-1}>
      {children}
    </p>
  );
}

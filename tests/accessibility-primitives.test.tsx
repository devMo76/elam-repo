import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { AccessibleFormError } from "@/components/ui/AccessibleFormError";

describe("accessibility primitives", () => {
  it("renders a focusable live form-error summary", () => {
    const html = renderToStaticMarkup(
      <AccessibleFormError>راجع الحقول المحددة.</AccessibleFormError>,
    );

    expect(html).toContain('role="alert"');
    expect(html).toContain('tabindex="-1"');
  });
});

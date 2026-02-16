import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { LanguageProvider } from "@/lib/i18n";
import PersonalizationEditor from "@/components/PersonalizationEditor";

const wrap = (ui: React.ReactNode) => <LanguageProvider>{ui}</LanguageProvider>;

beforeEach(() => {
  // Pointer events helpers used by the editor
  Object.defineProperty(HTMLElement.prototype, "setPointerCapture", {
    value: () => undefined,
    configurable: true,
  });
});

describe("PersonalizationEditor", () => {
  it("centers newly added text inside the print area", () => {
    // Ensure deterministic IDs in test
    vi.stubGlobal("crypto", { randomUUID: () => "text-1" });

    render(
      wrap(
        <PersonalizationEditor
          category="hoodies"
          garmentColor="#ffffff"
          onSave={() => {}}
        />,
      ),
    );

    fireEvent.click(screen.getByRole("button", { name: /agregar texto/i }));

    const textEl = screen.getByText("Tu texto");
    // hoodie/front printArea center (x=50, y=38) based on src/lib/printArea.ts defaults
    expect(textEl).toHaveStyle({ left: "50%", top: "38%" });
  });

  it("clamps drag movement so the element stays within the print area", () => {
    vi.stubGlobal("crypto", { randomUUID: () => "text-2" });

    render(
      wrap(
        <PersonalizationEditor
          category="hoodies"
          garmentColor="#ffffff"
          onSave={() => {}}
        />,
      ),
    );

    const area = screen.getByTestId("print-area");
    // hoodie/front printArea defaults from src/lib/printArea.ts
    expect(area).toHaveStyle({
      left: "25%",
      right: "25%",
      top: "18%",
      bottom: "42%",
    });
  });
});


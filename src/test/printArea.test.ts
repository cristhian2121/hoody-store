import { describe, it, expect } from "vitest";
import { clampCenterToPrintArea, getPrintArea, getPrintAreaCenter } from "@/lib/printArea";

describe("printArea", () => {
  it("returns a center inside the area", () => {
    const area = getPrintArea("hoodies", "front");
    const center = getPrintAreaCenter(area);
    expect(center.x).toBeGreaterThanOrEqual(area.xMin);
    expect(center.x).toBeLessThanOrEqual(area.xMax);
    expect(center.y).toBeGreaterThanOrEqual(area.yMin);
    expect(center.y).toBeLessThanOrEqual(area.yMax);
  });

  it("clamps a center point to area bounds", () => {
    const area = { xMin: 25, xMax: 75, yMin: 20, yMax: 60 };
    expect(clampCenterToPrintArea({ x: 0, y: 0 }, area)).toEqual({ x: 25, y: 20 });
    expect(clampCenterToPrintArea({ x: 100, y: 100 }, area)).toEqual({ x: 75, y: 60 });
  });

  it("clamps considering element size (keeps bounding box inside)", () => {
    const area = { xMin: 25, xMax: 75, yMin: 20, yMax: 60 };
    const size = { width: 20, height: 10 }; // 20% wide, 10% tall

    // left/top overflow → clamp to min + half size
    expect(clampCenterToPrintArea({ x: 0, y: 0 }, area, size)).toEqual({
      x: 35, // 25 + 10
      y: 25, // 20 + 5
    });

    // right/bottom overflow → clamp to max - half size
    expect(clampCenterToPrintArea({ x: 100, y: 100 }, area, size)).toEqual({
      x: 65, // 75 - 10
      y: 55, // 60 - 5
    });
  });
});


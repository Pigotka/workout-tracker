import { describe, expect, it } from "vitest";
import { restPreview, type RestLift } from "./prescription";

const squat: RestLift = { name: "Squat", catalogId: "squat", setDone: 3, setTotal: 3 };
const leg: RestLift = { name: "Leg Press", catalogId: "leg-press", setDone: 0, setTotal: 4 };

describe("restPreview", () => {
  it("previews the next planned lift after the last set", () => {
    const preview = restPreview({ current: squat, next: leg, afterNextName: "Curl" });
    expect(preview.name).toBe("Leg Press");
    expect(preview.series).toBe("0/4");
    expect(preview.thenName).toBe("Curl");
    expect(preview.stay).toBe(false);
    expect(preview.offerExtra).toBe(true);
  });

  it("previews an extra set only after Extra is chosen", () => {
    const preview = restPreview({ current: squat, next: leg, extra: true });
    expect(preview.name).toBe("Squat");
    expect(preview.series).toBe("Extra 3");
    expect(preview.thenName).toBe("Leg Press");
    expect(preview.stay).toBe(true);
  });

  it("keeps the current lift while planned sets remain", () => {
    const preview = restPreview({ current: { ...squat, setDone: 1 }, next: leg });
    expect(preview.name).toBe("Squat");
    expect(preview.series).toBe("1/3");
    expect(preview.thenName).toBe("Leg Press");
    expect(preview.stay).toBe(true);
    expect(preview.offerExtra).toBe(false);
  });

  it("previews the end of the workout when nothing follows", () => {
    const preview = restPreview({ current: squat });
    expect(preview.name).toBe("Workout complete");
    expect(preview.stay).toBe(false);
    expect(preview.offerExtra).toBe(true);
  });
});

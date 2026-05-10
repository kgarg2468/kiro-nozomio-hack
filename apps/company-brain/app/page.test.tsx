import { afterEach, describe, expect, it, vi } from "vitest";
import HomePage from "./page";
import OfficePage from "./office/page";
import { assembleBrainForEmployee } from "@/lib/brain";

vi.mock("@/components/demo-cockpit", () => ({
  DemoCockpit: () => null
}));

vi.mock("@/components/big-screen-office", () => ({
  BigScreenOffice: () => null
}));

vi.mock("@/lib/brain", () => ({
  assembleBrainForEmployee: vi.fn(async (employeeId: string, mode: string, source: string) => ({
    employeeId,
    mode,
    source
  })),
  demoMode: vi.fn((value: string | string[] | undefined) => {
    const normalized = Array.isArray(value) ? value[0] : value;
    return normalized === "live" || normalized === "hybrid" || normalized === "fixture"
      ? normalized
      : "fixture";
  }),
  liveSource: vi.fn((value: string | string[] | undefined) => {
    const normalized = Array.isArray(value) ? value[0] : value;
    return normalized === "convex" ? "convex" : "providers";
  })
}));

const mockedAssembleBrainForEmployee = vi.mocked(assembleBrainForEmployee);

describe("top-level data mode pages", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("passes selected live mode into the cockpit state", async () => {
    const element = await HomePage({
      searchParams: Promise.resolve({ mode: "live", source: "convex" })
    });

    expect(mockedAssembleBrainForEmployee).toHaveBeenCalledWith("sam", "live", "convex");
    expect(element.props.initialState).toEqual({
      employeeId: "sam",
      mode: "live",
      source: "convex"
    });
    expect(element.props.liveSource).toBe("convex");
  });

  it("passes selected fixture mode into the office state", async () => {
    const element = await OfficePage({
      searchParams: Promise.resolve({ mode: "fixture" })
    });

    expect(mockedAssembleBrainForEmployee).toHaveBeenCalledWith("sam", "fixture", "providers");
    expect(element.props.state).toEqual({
      employeeId: "sam",
      mode: "fixture",
      source: "providers"
    });
    expect(element.props.liveSource).toBe("providers");
  });
});

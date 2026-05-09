import { afterEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route";
import { assembleBrainForEmployee } from "@/lib/brain";

vi.mock("@/lib/brain", () => ({
  assembleBrainForEmployee: vi.fn(async (employeeId: string, mode: string, source: string) => ({
    employeeId,
    mode,
    source
  })),
  demoMode: vi.fn((value: string | null) =>
    value === "live" || value === "hybrid" || value === "fixture" ? value : "fixture"
  ),
  employeeIdParam: vi.fn((value: string | null) => value?.trim() || "sam"),
  liveSource: vi.fn((value: string | null) => (value === "convex" ? "convex" : "providers"))
}));

const mockedAssembleBrainForEmployee = vi.mocked(assembleBrainForEmployee);

describe("GET /api/brain", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("passes query mode and employee id into brain assembly", async () => {
    const response = await GET(
      new Request("http://localhost/api/brain?mode=live&source=convex&employeeId=alice")
    );

    expect(mockedAssembleBrainForEmployee).toHaveBeenCalledWith("alice", "live", "convex");
    await expect(response.json()).resolves.toEqual({
      employeeId: "alice",
      mode: "live",
      source: "convex"
    });
  });

  it("defaults to fixture mode and Sam when query params are missing", async () => {
    const response = await GET(new Request("http://localhost/api/brain"));

    expect(mockedAssembleBrainForEmployee).toHaveBeenCalledWith("sam", "fixture", "providers");
    await expect(response.json()).resolves.toEqual({
      employeeId: "sam",
      mode: "fixture",
      source: "providers"
    });
  });
});

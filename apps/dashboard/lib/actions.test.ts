import { describe, expect, it } from "vitest";
import { resolveLocalMutationToken } from "./action-token";

describe("dashboard coordinator actions", () => {
  it("prefers KIRO_LOCAL_TOKEN and accepts TEMPO_LOCAL_TOKEN for compatibility", () => {
    expect(
      resolveLocalMutationToken({
        KIRO_LOCAL_TOKEN: "kiro-token",
        TEMPO_LOCAL_TOKEN: "tempo-token"
      })
    ).toBe("kiro-token");
    expect(resolveLocalMutationToken({ TEMPO_LOCAL_TOKEN: "tempo-token" })).toBe(
      "tempo-token"
    );
  });
});

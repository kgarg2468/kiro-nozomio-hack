import { action } from "./_generated/server";
import { api } from "./_generated/api";

export const seedDemoEvent = action({
  args: {},
  handler: async (ctx) => {
    await ctx.runMutation(api.onboarding.upsertContextEvent, {
      external_id: "evt-seed",
      stage: "assemble",
      title: "Company brain seed event",
      body: "Kiro is ready to stream onboarding context.",
      citation_external_ids: []
    });
    return { ok: true };
  }
});

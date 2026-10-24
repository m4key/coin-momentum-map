import { QueryClient } from "@tanstack/react-query";
import { createMemoryHistory, createRouter, rootRouteId } from "@tanstack/react-router";
import { describe, expect, it } from "vitest";

import { routeTree } from "@/routeTree.gen";

// Match routes without running loaders or rendering: loaders may need a server or
// network the test run lacks, and jsdom never loads the stylesheets React waits on.
describe("App routing", () => {
  it("matches a page for / instead of falling back to not found", () => {
    const router = createRouter({ routeTree, context: { queryClient: new QueryClient() } });

    const matches = router.matchRoutes("/");

    expect(matches.at(-1)?.routeId).not.toBe(rootRouteId);
  });
  it("keeps Risk Screener available and removes standalone Charts", () => {
    const router = createRouter({ routeTree, context: { queryClient: new QueryClient() } });
    expect(router.matchRoutes("/risk").at(-1)?.routeId).toBe("/risk");
    expect(router.matchRoutes("/charts").at(-1)?.routeId).toBe(rootRouteId);
  });
  it("redirects the disabled Dashboard to Crypto Screener", async () => {
    const router = createRouter({ routeTree, history: createMemoryHistory({ initialEntries: ["/dashboard"] }), context: { queryClient: new QueryClient() } });
    await router.load();
    expect(router.state.location.pathname).toBe("/");
  });
});

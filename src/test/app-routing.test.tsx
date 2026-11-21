import { QueryClient } from "@tanstack/react-query";
import { createRouter, rootRouteId } from "@tanstack/react-router";
import { describe, expect, it } from "vitest";

import { routeTree } from "@/routeTree.gen";

describe("App routing", () => {
  const router = createRouter({ routeTree, context: { queryClient: new QueryClient() } });

  it("matches a page for / instead of falling back to not found", () => {
    const matches = router.matchRoutes("/");
    expect(matches.at(-1)?.routeId).not.toBe(rootRouteId);
  });

  it("matches a page for /dashboard", () => {
    const matches = router.matchRoutes("/dashboard");
    expect(matches.at(-1)?.routeId).not.toBe(rootRouteId);
  });

  it("matches a page for /sell", () => {
    const matches = router.matchRoutes("/sell");
    expect(matches.at(-1)?.routeId).not.toBe(rootRouteId);
  });

  it("matches a page for /profile", () => {
    const matches = router.matchRoutes("/profile");
    expect(matches.at(-1)?.routeId).not.toBe(rootRouteId);
  });

  it("matches a page for /notifications", () => {
    const matches = router.matchRoutes("/notifications");
    expect(matches.at(-1)?.routeId).not.toBe(rootRouteId);
  });

  it("matches a page for /auctions", () => {
    const matches = router.matchRoutes("/auctions");
    expect(matches.at(-1)?.routeId).not.toBe(rootRouteId);
  });

  it("matches a page for /auth", () => {
    const matches = router.matchRoutes("/auth");
    expect(matches.at(-1)?.routeId).not.toBe(rootRouteId);
  });
});

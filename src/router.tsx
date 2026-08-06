import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";
import { RouteLoader } from "./components/RouteLoader";

export const getRouter = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { staleTime: 60_000, gcTime: 5 * 60_000 } },
  });

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreload: "intent",
    defaultPreloadDelay: 50,
    defaultPreloadStaleTime: 0,
    // Keep the current page on screen for short navigations instead of
    // flashing the bare page background, then show a branded loader.
    defaultPendingMs: 600,
    defaultPendingMinMs: 300,
    defaultPendingComponent: RouteLoader,
  });

  return router;
};

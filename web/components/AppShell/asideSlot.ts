"use client";

import { createContext, useContext } from "react";

/**
 * The shell's layout element, which holds `main`. Notatoversikt portals its `<aside>` into it, so the
 * aside lands right after `main` as its sibling (DOM order header → main → aside) while staying in the
 * overview's React tree (context and Tabs state flow through the portal). Null until mounted.
 */
export const AsideSlotContext = createContext<HTMLElement | null>(null);

export function useAsideSlot(): HTMLElement | null {
  return useContext(AsideSlotContext);
}

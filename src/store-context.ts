import { createContext, useContext } from "react";
import type { Action, Store } from "./types";
import type { Dispatch } from "react";

export const StoreContext = createContext<{
  store: Store;
  dispatch: Dispatch<Action>;
} | null>(null);

export function useStore() {
  const value = useContext(StoreContext);
  if (!value) throw new Error("StoreContext missing");
  return value;
}

import { createContext, useContext } from "react";
import type { Dispatch } from "react";
import type { CloudControls } from "./use-cloud-sync";
import type { Action, Store } from "./types";

export const StoreContext = createContext<{
  store: Store;
  dispatch: Dispatch<Action>;
  cloud: CloudControls;
} | null>(null);

export function useStore() {
  const value = useContext(StoreContext);
  if (!value) throw new Error("StoreContext missing");
  return value;
}

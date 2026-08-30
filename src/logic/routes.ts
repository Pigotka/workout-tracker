import type { Route } from "../types";
import { assertNever } from "./util";

export function parseHash(hash: string): Route {
  const raw = hash.replace(/^#/, "").replace(/^\/+/, "");
  const parts = raw.split("/").filter(Boolean);
  if (parts.length === 0) return { name: "home" };
  const head = parts[0];
  if (head === "history") return { name: "history" };
  if (head === "programs" && parts[1]) return { name: "program-edit", id: decodeURIComponent(parts[1]) };
  if (head === "programs") return { name: "programs" };
  if (head === "workout" && parts[1] === "exercise" && parts[2]) {
    return { name: "exercise", id: decodeURIComponent(parts[2]) };
  }
  if (head === "workout") return { name: "workout" };
  return { name: "home" };
}

export function hashFor(route: Route): string {
  switch (route.name) {
    case "home":
      return "#/";
    case "history":
      return "#/history";
    case "programs":
      return "#/programs";
    case "program-edit":
      return `#/programs/${encodeURIComponent(route.id)}`;
    case "workout":
      return "#/workout";
    case "exercise":
      return `#/workout/exercise/${encodeURIComponent(route.id)}`;
    default:
      return assertNever(route);
  }
}

export function go(route: Route): void {
  const next = hashFor(route);
  if (window.location.hash !== next) {
    window.location.hash = next;
  }
}

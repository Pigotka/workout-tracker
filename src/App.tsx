import { useEffect, useReducer } from "react";
import { BottomNav } from "./components/BottomNav";
import { useHash, useInstallPrompt } from "./hooks";
import { parseHash } from "./logic/routes";
import { loadStore, saveStore } from "./logic/storage";
import { reduce } from "./logic/store";
import { assertNever } from "./logic/util";
import { ExerciseScreen } from "./screens/ExerciseScreen";
import { HistoryScreen } from "./screens/HistoryScreen";
import { HomeScreen } from "./screens/HomeScreen";
import { ProgramEditScreen } from "./screens/ProgramEditScreen";
import { ProgramsScreen } from "./screens/ProgramsScreen";
import { SetupScreen } from "./screens/SetupScreen";
import { WorkoutScreen } from "./screens/WorkoutScreen";
import { StoreContext } from "./store-context";
import type { Route } from "./types";

export function App() {
  const [store, dispatch] = useReducer(reduce, undefined, () => loadStore(window.localStorage));
  const hash = useHash();
  const route = parseHash(hash);
  const install = useInstallPrompt();

  useEffect(() => {
    saveStore(window.localStorage, store);
  }, [store]);

  const inSession = route.name === "workout" || route.name === "exercise";

  let body;
  switch (route.name) {
    case "home":
      body = <HomeScreen />;
      break;
    case "history":
      body = <HistoryScreen />;
      break;
    case "programs":
      body = <ProgramsScreen />;
      break;
    case "program-edit":
      body = <ProgramEditScreen id={route.id} />;
      break;
    case "setup":
      body = <SetupScreen programId={route.id} />;
      break;
    case "workout":
      body = <WorkoutScreen />;
      break;
    case "exercise":
      body = <ExerciseScreen exerciseId={route.id} />;
      break;
    default:
      assertNever(route);
  }

  return (
    <StoreContext.Provider value={{ store, dispatch }}>
      <div className={inSession ? "app-shell session" : "app-shell"}>
        {install.available && route.name === "home" ? (
          <button type="button" className="install-banner" onClick={install.prompt}>
            Install on this phone
          </button>
        ) : null}
        {body}
        {inSession ? null : <BottomNav current={navTab(route)} />}
      </div>
    </StoreContext.Provider>
  );
}

function navTab(route: Route): "home" | "history" | "programs" {
  switch (route.name) {
    case "history":
      return "history";
    case "programs":
    case "program-edit":
      return "programs";
    case "home":
    case "setup":
    case "workout":
    case "exercise":
      return "home";
    default:
      return assertNever(route);
  }
}

import { useEffect, useState } from "react";
import { Glyph } from "../components/Glyph";
import { alternateGroups, lastOfProgram, pickChoices } from "../logic/prescription";
import { go } from "../logic/routes";
import { useStore } from "../store-context";

export function SetupScreen({ programId }: { programId: string }) {
  const { store, dispatch } = useStore();
  const program = store.programs.find((item) => item.id === programId);
  const last = program ? lastOfProgram(store.sessions, program.id) : undefined;
  const [choices, setChoices] = useState(() => (program ? pickChoices(program, last) : {}));

  useEffect(() => {
    if (!program) go({ name: "home" });
  }, [program]);

  if (!program) return null;

  const groups = alternateGroups(program);

  const start = () => {
    dispatch({
      type: "start-workout",
      programId: program.id,
      now: Date.now(),
      sessionId: crypto.randomUUID(),
      choices,
    });
    go({ name: "workout" });
  };

  return (
    <div className="screen">
      <header className="session-head">
        <button type="button" className="icon-btn" onClick={() => go({ name: "home" })} aria-label="Back">
          ←
        </button>
        <h1 className="inline-title">Today</h1>
        <span />
      </header>
      <p className="lede">Pick which alternate to do. After you start, it stays locked. Reps stay as set in the plan.</p>

      {groups.map((group) => (
        <section key={group.group} className="setup-block">
          <p className="eyebrow">Alternate</p>
          <div className="setup-choices">
            {group.members.map((exercise) => {
              const selected = choices[group.group] === exercise.id;
              return (
                <button
                  key={exercise.id}
                  type="button"
                  className={selected ? "setup-pick on" : "setup-pick"}
                  onClick={() => setChoices({ ...choices, [group.group]: exercise.id })}
                >
                  <Glyph id={exercise.icon} size="md" />
                  <span>{exercise.name}</span>
                </button>
              );
            })}
          </div>
        </section>
      ))}

      <button type="button" className="btn-primary" onClick={start}>
        Start workout
      </button>
    </div>
  );
}

import { useEffect, useState } from "react";
import { Glyph } from "../components/Glyph";
import {
  alternateGroups,
  formatScheme,
  lastOfProgram,
  pickChoices,
  pickSchemes,
  schemeKey,
  schemesOf,
} from "../logic/prescription";
import { go } from "../logic/routes";
import { useStore } from "../store-context";
import type { Program, RepScheme } from "../types";

export function SetupScreen({ programId }: { programId: string }) {
  const { store, dispatch } = useStore();
  const program = store.programs.find((item) => item.id === programId);
  const last = program ? lastOfProgram(store.sessions, program.id) : undefined;
  const [choices, setChoices] = useState(() => (program ? pickChoices(program, last) : {}));
  const [schemes, setSchemes] = useState(() => (program ? pickSchemes(program, last) : {}));

  useEffect(() => {
    if (!program) go({ name: "home" });
  }, [program]);

  if (!program) return null;

  const groups = alternateGroups(program);
  const schemeBlocks = uniqueSchemeBlocks(program);

  const start = () => {
    dispatch({
      type: "start-workout",
      programId: program.id,
      now: Date.now(),
      sessionId: crypto.randomUUID(),
      choices,
      schemes,
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
      <p className="lede">Pick the variants for this session. After you start, they stay locked.</p>

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

      {schemeBlocks.map((block) => (
        <section key={block.key} className="setup-block">
          <p className="eyebrow">{block.name} · rozpis</p>
          <div className="chip-row">
            {block.schemes.map((scheme) => (
              <button
                key={scheme.id}
                type="button"
                className={schemes[block.key] === scheme.id ? "chip on" : "chip"}
                onClick={() => setSchemes({ ...schemes, [block.key]: scheme.id })}
              >
                {formatScheme(scheme)}
              </button>
            ))}
          </div>
        </section>
      ))}

      <button type="button" className="btn-primary" onClick={start}>
        Start workout
      </button>
    </div>
  );
}

function uniqueSchemeBlocks(program: Program): { key: string; name: string; schemes: RepScheme[] }[] {
  const seen = new Set<string>();
  const blocks: { key: string; name: string; schemes: RepScheme[] }[] = [];
  for (const exercise of program.exercises) {
    const list = schemesOf(exercise);
    if (list.length < 2) continue;
    const key = schemeKey(exercise);
    if (seen.has(key)) continue;
    seen.add(key);
    blocks.push({ key, name: exercise.name, schemes: list });
  }
  return blocks;
}

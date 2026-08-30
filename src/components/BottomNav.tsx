import type { ReactNode } from "react";
import { go } from "../logic/routes";

export function BottomNav({ current }: { current: "home" | "history" | "programs" }) {
  return (
    <nav className="bottom-nav">
      <NavBtn
        label="Train"
        active={current === "home"}
        onClick={() => go({ name: "home" })}
        icon={
          <svg viewBox="0 0 24 24" className="nav-svg">
            <path
              d="M4 10h16M6 10v10h12V10M12 4l8 6H4z"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        }
      />
      <NavBtn
        label="Log"
        active={current === "history"}
        onClick={() => go({ name: "history" })}
        icon={
          <svg viewBox="0 0 24 24" className="nav-svg">
            <rect x="4" y="5" width="16" height="15" rx="2" fill="none" stroke="currentColor" strokeWidth="1.8" />
            <path d="M8 3v4M16 3v4M4 10h16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        }
      />
      <NavBtn
        label="Plans"
        active={current === "programs"}
        onClick={() => go({ name: "programs" })}
        icon={
          <svg viewBox="0 0 24 24" className="nav-svg">
            <path
              d="M5 7h14M5 12h14M5 17h10"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
          </svg>
        }
      />
    </nav>
  );
}

function NavBtn({
  label,
  active,
  onClick,
  icon,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  icon: ReactNode;
}) {
  return (
    <button type="button" className={active ? "nav-btn active" : "nav-btn"} onClick={onClick}>
      {icon}
      {label}
    </button>
  );
}

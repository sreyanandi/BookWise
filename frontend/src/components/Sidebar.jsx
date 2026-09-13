import {
  LayoutGrid, Grid3x3, Library, Heart, Settings, HelpCircle, LogOut, Compass,
  Smile, Search, Route,
} from "lucide-react";

const MAIN_LINKS = [
  { label: "Dashboard", icon: LayoutGrid },
  { label: "Category", icon: Grid3x3 },
  { label: "Quiz", icon: Compass },
  { label: "Mood", icon: Smile },
  { label: "Discover", icon: Search },
  { label: "Journey", icon: Route },
  { label: "My Library", icon: Library },
  { label: "Favorite", icon: Heart },
];

const SUB_LINKS = [
  { label: "Setting", icon: Settings },
  { label: "Help", icon: HelpCircle },
];

export default function Sidebar({ active, onSelect, onCloseMobileMenu }) {
  function handleSelect(label) {
    onSelect(label);
    if (onCloseMobileMenu) onCloseMobileMenu();
  }

  return (
    <aside className="flex flex-col justify-between h-full px-5 py-6 bg-card">
      <nav className="flex flex-col gap-1">
        {MAIN_LINKS.map(({ label, icon: Icon }) => {
          const isActive = label === active;
          return (
            <button
              key={label}
              onClick={() => handleSelect(label)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-left transition-colors cursor-pointer ${
                isActive
                  ? "text-maroon font-semibold bg-maroon/[0.06]"
                  : "text-ink-muted hover:text-ink"
              }`}
            >
              <Icon size={17} strokeWidth={isActive ? 2.4 : 2} />
              {label}
            </button>
          );
        })}

        <div className="h-px bg-line my-3" />

        {SUB_LINKS.map(({ label, icon: Icon }) => (
          <button
            key={label}
            onClick={() => handleSelect(label)}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-left text-ink-muted hover:text-ink transition-colors cursor-pointer"
          >
            <Icon size={17} />
            {label}
          </button>
        ))}
      </nav>

      <button
        onClick={() => handleSelect("Log Out")}
        className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-left text-ink-muted hover:text-ink transition-colors cursor-pointer"
      >
        <LogOut size={17} />
        Log Out
      </button>
    </aside>
  );
}

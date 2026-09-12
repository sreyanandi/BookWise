import { useState } from "react";
import { Search, User, Edit3, Check, Loader2 } from "lucide-react";
import logo from "../assets/logo-black.png";

export default function TopBar({ query, onQueryChange, onSubmit, userName, onSaveName, isLoading }) {
  const [isEditingName, setIsEditingName] = useState(false);
  const [tempName, setTempName] = useState(userName || "");

  function handleSave() {
    const trimmed = tempName.trim();
    if (trimmed && onSaveName) {
      onSaveName(trimmed);
    }
    setIsEditingName(false);
  }

  return (
    <header className="flex items-center gap-6 px-8 py-5">
      {/* Logo */}
      <div className="flex items-center gap-2 shrink-0">
        <img src={logo} alt="" className="w-5 h-5 object-contain" />
        <span className="font-display font-bold text-lg">BookWise</span>
      </div>

      {/* Search */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit();
        }}
        className="flex-1 max-w-md"
      >
        <div className="flex items-center gap-2 bg-cream rounded-full px-4 py-2.5 transition-all">
          {isLoading ? (
            <Loader2 size={16} className="text-accent animate-spin shrink-0" />
          ) : (
            <Search size={16} className="text-ink-muted shrink-0" />
          )}
          <input
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder="Search book name, author, edition"
            className="flex-1 bg-transparent outline-none text-sm placeholder:text-ink-muted"
          />
          {isLoading && (
            <span className="text-[11px] text-accent font-medium pr-1 animate-pulse">Loading…</span>
          )}
        </div>
      </form>

      {/* Profile */}
      <div className="flex items-center gap-3 ml-auto shrink-0">

        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-full bg-cream flex items-center justify-center text-ink-muted shrink-0">
            <User size={16} />
          </div>

          {isEditingName ? (
            <div className="flex items-center gap-1.5 bg-cream px-2.5 py-1 rounded-lg border border-line">
              <input
                type="text"
                autoFocus
                value={tempName}
                onChange={(e) => setTempName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSave();
                  if (e.key === "Escape") setIsEditingName(false);
                }}
                placeholder="Your name"
                className="text-sm bg-transparent outline-none w-28 text-ink font-medium"
              />
              <button
                type="button"
                onClick={handleSave}
                aria-label="Save name"
                className="text-maroon hover:opacity-80 p-0.5"
              >
                <Check size={14} />
              </button>
            </div>
          ) : (
            <button
              onClick={() => {
                setTempName(userName || "");
                setIsEditingName(true);
              }}
              title="Click to change name"
              className="flex items-center gap-1.5 text-sm font-medium text-ink hover:text-maroon transition-colors group cursor-pointer"
            >
              <span>{userName || "Set Your Name"}</span>
              <Edit3 size={12} className="opacity-0 group-hover:opacity-100 transition-opacity text-ink-muted" />
            </button>
          )}
        </div>
      </div>
    </header>
  );
}

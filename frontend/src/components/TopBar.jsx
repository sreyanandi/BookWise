import { useState } from "react";
import { Search, User, Edit3, Check, Loader2, Menu, X } from "lucide-react";
import logo from "../assets/logo-black.png";

export default function TopBar({
  query,
  onQueryChange,
  onSubmit,
  userName,
  onSaveName,
  isLoading,
  onToggleMobileMenu,
  isMobileMenuOpen,
}) {
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
    <header className="flex items-center gap-3 sm:gap-6 px-4 sm:px-8 py-3.5 sm:py-5">
      {/* Mobile Menu Toggle Button */}
      <button
        onClick={onToggleMobileMenu}
        className="md:hidden p-1.5 rounded-lg text-ink hover:bg-cream transition-colors cursor-pointer shrink-0"
        aria-label="Toggle navigation menu"
      >
        {isMobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
      </button>

      {/* Logo */}
      <div className="flex items-center gap-2 shrink-0">
        <img src={logo} alt="" className="w-5 h-5 object-contain" />
        <span className="font-display font-bold text-base sm:text-lg">BookWise</span>
      </div>

      {/* Search */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit();
        }}
        className="flex-1 max-w-md"
      >
        <div className="flex items-center gap-2 bg-cream rounded-full px-3.5 sm:px-4 py-2 sm:py-2.5 transition-all">
          {isLoading ? (
            <Loader2 size={15} className="text-accent animate-spin shrink-0" />
          ) : (
            <Search size={15} className="text-ink-muted shrink-0" />
          )}
          <input
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder="Search book, author..."
            className="flex-1 bg-transparent outline-none text-xs sm:text-sm placeholder:text-ink-muted min-w-0"
          />
          {isLoading && (
            <span className="text-[11px] text-accent font-medium pr-1 animate-pulse hidden sm:inline">Loading…</span>
          )}
        </div>
      </form>

      {/* Profile */}
      <div className="flex items-center gap-2 sm:gap-3 ml-auto shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-cream flex items-center justify-center text-ink-muted shrink-0">
            <User size={15} />
          </div>

          {isEditingName ? (
            <div className="flex items-center gap-1 bg-cream px-2 py-1 rounded-lg border border-line">
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
                className="text-xs sm:text-sm bg-transparent outline-none w-20 sm:w-28 text-ink font-medium"
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
              className="flex items-center gap-1.5 text-xs sm:text-sm font-medium text-ink hover:text-maroon transition-colors group cursor-pointer"
            >
              <span className="max-w-[80px] sm:max-w-none truncate">{userName || "Set Name"}</span>
              <Edit3 size={12} className="hidden sm:inline opacity-0 group-hover:opacity-100 transition-opacity text-ink-muted" />
            </button>
          )}
        </div>
      </div>
    </header>
  );
}


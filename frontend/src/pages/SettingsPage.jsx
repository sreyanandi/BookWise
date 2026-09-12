import { useState } from "react";

export default function SettingsPage({ userName, onSaveName, onClearData }) {
  const [name, setName] = useState(userName);
  const [saved, setSaved] = useState(false);

  function handleSave() {
    onSaveName(name.trim() || "Reader");
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  }

  return (
    <div className="space-y-8 max-w-md">
      <div>
        <h1 className="font-display text-xl font-bold">Settings</h1>
        <p className="text-ink-muted text-sm mt-1">Manage your profile and data.</p>
      </div>

      <div>
        <label className="text-sm font-medium">Display name</label>
        <div className="flex gap-2 mt-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your Name"
            className="flex-1 border border-line rounded-xl px-4 py-2.5 text-sm outline-none focus:border-maroon"
          />
          <button
            onClick={handleSave}
            className="bg-accent hover:bg-accent-dark text-white text-sm font-medium px-5 rounded-xl transition-colors"
          >
            Save
          </button>
        </div>
        {saved && <p className="text-xs text-ink-muted mt-2">Saved.</p>}
      </div>

      <div className="border-t border-line pt-6">
        <h2 className="text-sm font-medium">Data</h2>
        <p className="text-ink-muted text-xs mt-1 mb-3">
          Favorites, reading history, and your Reading Journey are stored only in this browser.
        </p>
        <button
          onClick={onClearData}
          className="text-sm font-medium text-maroon border border-line hover:border-maroon rounded-xl px-4 py-2 transition-colors"
        >
          Clear favorites, history & journey
        </button>
      </div>
    </div>
  );
}

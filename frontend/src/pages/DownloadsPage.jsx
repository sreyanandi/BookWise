import { Download } from "lucide-react";

export default function DownloadsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-xl font-bold">Downloads</h1>
        <p className="text-ink-muted text-sm mt-1">
          Books you've downloaded for offline reading show up here.
        </p>
      </div>
      <div className="border border-dashed border-line rounded-2xl py-16 flex flex-col items-center gap-3 text-ink-muted">
        <Download size={28} />
        <p className="text-sm">No downloads yet.</p>
      </div>
    </div>
  );
}

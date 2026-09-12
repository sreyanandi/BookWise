const FAQS = [
  {
    q: "How are recommendations chosen?",
    a: "We blend two signals: genre and style similarity from book metadata, and collaborative patterns from real reader ratings, highlighting books that readers with similar taste loved.",
  },
  {
    q: "How does Mood and Search by description work?",
    a: "Your text is matched against book themes and descriptions using full-text search and vector scoring, finding titles that match the tone or plot you describe.",
  },
  {
    q: "What is the Reading Journey?",
    a: "A personal bookshelf organizing Currently Reading, Want to Read, and Finished titles. You can move books between shelves and rate anything you finish.",
  },
  {
    q: "Why do I see multiple books from the same series?",
    a: "Sequels share strong similarities with earlier books. We include relevant sequels while deduplicating repeats so you can still discover new standalone titles.",
  },
  {
    q: "Where is my favorites list stored?",
    a: "Locally in your browser. Your reading lists, favorites, and history remain private on your own device.",
  },
  {
    q: "What does the 'Read' button do?",
    a: "It opens an external book search for that exact title and author to help you find digital or print copies online.",
  },
];

export default function HelpPage() {
  return (
    <div className="space-y-6 max-w-lg">
      <div>
        <h1 className="font-display text-xl font-bold">Help</h1>
        <p className="text-ink-muted text-sm mt-1">Common questions about how BookWise works.</p>
      </div>
      <div className="space-y-3">
        {FAQS.map((item) => (
          <details key={item.q} className="border border-line rounded-xl px-4 py-3 group">
            <summary className="text-sm font-medium cursor-pointer list-none flex items-center justify-between">
              {item.q}
              <span className="text-ink-muted group-open:rotate-45 transition-transform">+</span>
            </summary>
            <p className="text-sm text-ink-muted mt-2 leading-relaxed">{item.a}</p>
          </details>
        ))}
      </div>
    </div>
  );
}

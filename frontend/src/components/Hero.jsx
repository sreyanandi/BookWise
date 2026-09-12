import { BookOpen } from "lucide-react";

export default function Hero({ name, onShowLatest }) {
  return (
    <section className="flex items-center justify-between gap-6 bg-cream rounded-2xl px-8 py-7">
      <div>
        <h1 className="font-display text-2xl font-bold">
          {name ? `Hello, ${name}!` : "Welcome to your Library!"}
        </h1>
        <p className="text-ink-muted mt-1.5 max-w-xs text-sm">
          Selection of the best books, just for you
        </p>
        <button
          onClick={onShowLatest}
          className="mt-5 bg-accent hover:bg-accent-dark text-white text-sm font-medium px-5 py-2.5 rounded-full transition-colors"
        >
          Show latest
        </button>
      </div>

      {/* Small hand-built illustration: a book with a few floating pages/shapes
          around it, standing in for the reference's open-book graphic. */}
      <svg
        viewBox="0 0 160 120"
        className="w-36 h-28 shrink-0 hidden sm:block"
        aria-hidden="true"
      >
        <ellipse cx="80" cy="105" rx="55" ry="8" fill="#e9ddd0" />
        <path d="M20 40 L80 55 L80 95 L20 80 Z" fill="#f4a259" />
        <path d="M140 40 L80 55 L80 95 L140 80 Z" fill="#5b8dd6" />
        <path d="M20 40 L80 25 L140 40 L80 55 Z" fill="#f6efe9" stroke="#e2924a" strokeWidth="1.5" />
        <rect x="30" y="10" width="14" height="18" rx="2" fill="#8dd6c0" transform="rotate(-12 37 19)" />
        <rect x="115" y="8" width="14" height="18" rx="2" fill="#f4a259" transform="rotate(14 122 17)" />
        <circle cx="80" cy="12" r="6" fill="#e2924a" />
      </svg>
    </section>
  );
}

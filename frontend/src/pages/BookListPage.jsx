import RecommendedCard from "../components/RecommendedCard";

export default function BookListPage({ title, subtitle, books, emptyMessage, onSelectBook, favorites, onToggleFavorite }) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-xl font-bold">{title}</h1>
        <p className="text-ink-muted text-sm mt-1">{subtitle}</p>
      </div>

      {books.length === 0 ? (
        <div className="border border-dashed border-line rounded-2xl py-16 text-center text-ink-muted text-sm">
          {emptyMessage}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {books.map((book) => (
            <RecommendedCard
              key={book.book_id}
              book={book}
              onClick={() => onSelectBook(book.title)}
              isFavorite={favorites.some((f) => f.book_id === book.book_id)}
              onToggleFavorite={() => onToggleFavorite(book)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

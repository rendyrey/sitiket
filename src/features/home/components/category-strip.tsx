const categories = ["LIVE MUSIC", "COMMUNITY", "SPORT", "COMEDY", "GOOD TIMES"];

export default function CategoryStrip() {
  return (
    <section
      className="overflow-hidden bg-lime py-4 text-black sm:py-5"
      aria-label="Event categories"
    >
      <ul className="category-row site-container">
        {categories.map((category, index) => (
          <li key={category}>
            <span>{category}</span>
            {index < categories.length - 1 && <i aria-hidden="true">✦</i>}
          </li>
        ))}
      </ul>
    </section>
  );
}

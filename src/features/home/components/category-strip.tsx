const categories = ["LIVE MUSIC", "COMMUNITY", "SPORT", "COMEDY", "GOOD TIMES"];

export default function CategoryStrip() {
  return (
    <section className="bg-lime py-5 text-black" aria-label="Event categories">
      <div className="marquee-row">
        {categories.map((category, index) => (
          <span className="contents" key={category}>
            <span>{category}</span>
            {index < categories.length - 1 && <i aria-hidden="true">✦</i>}
          </span>
        ))}
      </div>
    </section>
  );
}

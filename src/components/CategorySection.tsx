import type { CategorySummary } from "../types";
import MetricCard from "./MetricCard";

export default function CategorySection({
  category,
}: {
  category: CategorySummary;
}) {
  return (
    <section className="category" id={category.id}>
      <header className="category-header">
        <h2>{category.title}</h2>
        <p>{category.description}</p>
        <span className="cat-score">
          Category average: {category.averageScore}/100
        </span>
      </header>
      <div className="grid">
        {category.metrics.map((m) => (
          <MetricCard key={m.instrument.id} metric={m} />
        ))}
      </div>
    </section>
  );
}

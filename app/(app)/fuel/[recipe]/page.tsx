import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { requireProfile } from "@/lib/session";
import { getMeal, mealImage } from "@/content/meals";
import { LogPortion } from "@/features/nutrition/components/log-portion";
import { copy } from "@/content/copy";

export default async function RecipePage({
  params,
}: {
  params: Promise<{ recipe: string }>;
}) {
  const { recipe } = await params;
  const meal = getMeal(recipe);
  if (!meal) notFound();
  const { today } = await requireProfile();
  const image = mealImage(meal.slug);

  return (
    <main>
      <div className="relative h-[240px] overflow-hidden bg-line">
        {image ? (
          <Image src={image} alt="" fill priority sizes="(max-width: 520px) 100vw, 520px" className="object-cover" />
        ) : null}
        <Link
          href="/fuel"
          aria-label="Back to Fuel"
          className="absolute left-4 top-[52px] flex h-11 w-11 items-center justify-center rounded-full bg-bg"
        >
          <ChevronLeft size={20} strokeWidth={2} aria-hidden="true" />
        </Link>
      </div>
      <h1 className="px-4 pt-6 text-title font-bold tracking-[-0.8px]">{meal.name}</h1>
      <p className="mx-4 mt-[6px] text-body text-muted">
        {meal.kcal} kcal, {meal.protein} g protein a portion.{meal.kind === "batch" ? ` ${copy.fuel.portions}.` : ""}
      </p>
      <LogPortion
        day={today}
        name={meal.name}
        kcal={meal.kcal}
        protein={meal.protein}
      />

      <h2 className="mx-4 mt-8 text-section font-bold tracking-[-0.3px]">Ingredients</h2>
      <ul className="mx-4 mt-3 rounded-list bg-card px-[18px] py-1">
        {meal.ingredients.map((i, idx) => (
          <li
            key={i.name}
            className={`flex min-h-12 items-center justify-between gap-3 ${idx < meal.ingredients.length - 1 ? "border-b border-line" : ""}`}
          >
            <span className="text-body">{i.name}</span>
            <span className="text-small text-muted">{i.amount ?? ""}</span>
          </li>
        ))}
      </ul>

      <h2 className="mx-4 mt-8 text-section font-bold tracking-[-0.3px]">{copy.fuel.steps}</h2>
      <ol className="mx-4 mt-3 flex list-decimal flex-col gap-3 pl-5 text-body">
        {meal.steps.map((s) => (
          <li key={s}>{s}</li>
        ))}
      </ol>
      {meal.note ? <p className="mx-4 mt-4 text-small text-muted">{meal.note}</p> : null}
    </main>
  );
}

import Image from "next/image";
import { requireProfile } from "@/lib/session";
import { weekStart } from "@/lib/dates";
import { batchMeals, quickMeals, mealImage, fuelHeaderImage, batchPlan } from "@/content/meals";
import { snacks, snackImage, formatKcal } from "@/content/snacks";
import { buildShoppingList, picksNeeded } from "@/features/nutrition/shopping-list";
import { formatAmount, recipesBySlug } from "@/features/nutrition/shopping-adapter";
import {
  FuelPicks,
  ShoppingList,
  type ListGroup,
} from "@/features/nutrition/components/fuel-picks";
import { QuickBuys, type QuickBuy } from "@/features/nutrition/components/quick-buys";
import { MyRecipes } from "@/features/nutrition/components/my-recipes";
import { copy } from "@/content/copy";

export const metadata = { title: "Fuel" };

export default async function FuelPage() {
  const { supabase, today } = await requireProfile();
  const ws = weekStart(today);

  const [picksRow, checksRow, mine] = await Promise.all([
    supabase.from("user_flags").select("value").eq("key", `fuel_picks:${ws}`).maybeSingle(),
    supabase.from("user_flags").select("value").eq("key", `shop:${ws}`).maybeSingle(),
    supabase.from("saved_foods").select("id,name,kcal,protein_g").order("name"),
  ]);

  const pickedValue = picksRow.data?.value as { slugs?: string[] } | null;
  const checkedValue = checksRow.data?.value as { checked?: string[] } | null;
  const picked = (pickedValue?.slugs ?? []).filter((s) => batchMeals.some((m) => m.slug === s));

  const bySlug = recipesBySlug();
  const groups: ListGroup[] = buildShoppingList(
    picked.flatMap((slug) => {
      const recipe = bySlug.get(slug);
      return recipe ? [{ recipe }] : [];
    }),
  ).map((g) => ({
    group: g.group,
    items: g.items.map((i) => ({
      id: i.id,
      name: i.name,
      amountLabel: formatAmount(i.amount, i.unit),
    })),
  }));

  const pickedMeals = picked.flatMap((slug) => batchMeals.filter((m) => m.slug === slug));
  const planKcal = pickedMeals.reduce((s, m) => s + m.kcal * m.portions, 0);
  const planPortions = pickedMeals.reduce((s, m) => s + m.portions, 0);

  const quick: QuickBuy[] = [
    ...quickMeals.map((m) => ({
      slug: m.slug,
      name: m.name,
      detail: `Quick meal. ${m.kcal} kcal, ${m.protein} g protein`,
      kcal: m.kcal,
      protein: m.protein,
      image: mealImage(m.slug),
    })),
    ...snacks.map((s) => ({
    slug: s.slug,
    name: s.name.replace(/ \/ high-protein yogurt, plain/, "").replace(/, 1%/, ""),
    detail: `${s.amount}. ${formatKcal(s.kcal)} kcal, ${s.protein} g protein`,
    kcal: Array.isArray(s.kcal) ? Math.round((s.kcal[0] + s.kcal[1]) / 2) : s.kcal,
    protein: s.protein,
    image: snackImage(s.slug),
    })),
  ];

  return (
    <main>
      <div className="relative mt-0 h-[220px] overflow-hidden bg-line">
        <Image
          src={fuelHeaderImage}
          alt=""
          fill
          priority
          sizes="(max-width: 520px) 100vw, 520px"
          className="object-cover"
        />
      </div>
      <h1 className="px-4 pt-6 text-title font-bold tracking-[-0.8px]">{copy.fuel.title}</h1>
      <p className="mx-4 mt-[6px] text-body text-muted">{batchPlan.summary.split(". Rotate")[0]}.</p>

      <FuelPicks
        weekStart={ws}
        maxPicks={picksNeeded(true)}
        picked={picked}
        meals={batchMeals.map((m) => ({
          slug: m.slug,
          name: m.name,
          kcal: m.kcal,
          protein: m.protein,
          image: mealImage(m.slug),
        }))}
      />
      <p className="mx-4 mt-3 text-caption text-muted">{copy.fuel.pickTwo}. {copy.fuel.pickThursday}. {copy.fuel.fridge}</p>

      <ShoppingList
        weekStart={ws}
        groups={groups}
        checked={checkedValue?.checked ?? []}
        totalKcal={planKcal}
        portions={planPortions}
      />

      <div className="mx-4 mt-8 flex items-baseline justify-between">
        <h2 className="text-section font-bold tracking-[-0.3px]">{copy.fuel.quickBuys}</h2>
        <span className="text-small text-muted">Rimi, Maxima, Lidl</span>
      </div>
      <QuickBuys items={quick} />

      <MyRecipes recipes={mine.data ?? []} day={today} />

    </main>
  );
}

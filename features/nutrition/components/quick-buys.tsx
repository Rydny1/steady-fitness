import Image from "next/image";

export type QuickBuy = {
  slug: string;
  name: string;
  detail: string;
  kcal: number;
  protein: number;
  image: string | null;
};

// A shopping reference. Tapping does nothing: to log one, use the Log screen.
export function QuickBuys({ items }: { items: QuickBuy[] }) {
  return (
    <ul className="mx-4 mt-[14px] grid grid-cols-2 gap-x-3 gap-y-[18px]">
      {items.map((q) => (
        <li key={q.slug}>
          <span className="relative block aspect-square overflow-hidden rounded-tile bg-line">
            {q.image ? (
              <Image src={q.image} alt="" fill sizes="(max-width: 520px) 45vw, 230px" className="object-cover" />
            ) : null}
          </span>
          <span className="mt-2 block text-[clamp(14px,4.1vw,16px)] font-semibold">{q.name}</span>
          <span className="block text-[clamp(13px,3.8vw,14px)] text-muted">{q.detail}</span>
        </li>
      ))}
    </ul>
  );
}

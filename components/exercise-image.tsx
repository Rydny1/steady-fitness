import Image from "next/image";
import { exerciseImage } from "@/content/exercises";
import { cn } from "@/lib/utils";

/** Two-frame strip for photographed moves, one drawing for the rest. Placeholder is --line. */
export function ExerciseImage({
  slug,
  name,
  className,
  sizes = "(max-width: 520px) 100vw, 520px",
  single = false,
}: {
  slug: string;
  name: string;
  className?: string;
  sizes?: string;
  /** Only the first frame (thumbnails). */
  single?: boolean;
}) {
  const img = exerciseImage(slug);
  if (img.kind === "drawing") {
    return (
      <div className={cn("relative overflow-hidden bg-line", className)}>
        <Image src={img.src} alt={name} fill sizes={sizes} className="object-contain" unoptimized />
      </div>
    );
  }
  const frames = single ? [img.frames[0]] : img.frames;
  return (
    <div className={cn("relative grid overflow-hidden bg-line", single ? "grid-cols-1" : "grid-cols-2", className)}>
      {frames.map((src, i) => (
        <div key={src} className="relative">
          <Image
            src={src}
            alt={i === 0 ? `${name}, start` : `${name}, end`}
            fill
            sizes={single ? sizes : "(max-width: 520px) 50vw, 260px"}
            className="object-cover"
          />
        </div>
      ))}
    </div>
  );
}

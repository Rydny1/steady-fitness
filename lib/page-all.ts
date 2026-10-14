import "server-only";

// PostgREST returns at most 1000 rows per request. Page through a query until it is exhausted.
const PAGE = 1000;

export async function pageAll<T>(
  run: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown }>,
): Promise<T[]> {
  const out: T[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await run(from, from + PAGE - 1);
    if (error || !data) throw new Error("paged query failed");
    out.push(...data);
    if (data.length < PAGE) break;
  }
  return out;
}

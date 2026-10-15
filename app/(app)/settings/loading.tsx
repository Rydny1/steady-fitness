// Shown instantly while the page's data loads, so a tab switch never looks frozen.
export default function Loading() {
  return (
    <div aria-busy="true" aria-label="Loading" className="mx-4 flex flex-col gap-3 pt-[max(16px,env(safe-area-inset-top))]">
      <div className="skeleton h-8 w-40" />
      <div className="skeleton h-[180px]" />
      <div className="skeleton h-[120px]" />
      <div className="skeleton h-[120px]" />
    </div>
  );
}

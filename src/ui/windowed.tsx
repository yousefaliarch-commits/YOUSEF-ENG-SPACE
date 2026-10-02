// Long lists render in steps: the first `step` items at once, the next ones just before the member scrolls to them
// (an IntersectionObserver 800 px ahead of the end), as an interruptible transition so mounting never blocks a scroll frame.
// Items are grouped into memoized chunks: when the window grows, only the new chunk renders, not every card above it.
// The DOM stays light, so scrolling, layout and style recalculation stay inside the frame budget with hundreds of posts.
// Where IntersectionObserver is missing (tests, very old WebViews) everything renders at once, as before.
import { memo, startTransition, useEffect, useRef, useState } from "react";

const Chunk = memo(({ items, from, to, render }: any) => <>{items.slice(from, to).map(render)}</>);

export function Windowed({ items, render, step = 8 }: any) {
  const [n, setN] = useState(step); const end = useRef<any>(null);
  const io = typeof IntersectionObserver !== "undefined"; const shown = io ? Math.min(n, items.length) : items.length; const more = io && n < items.length;
  useEffect(() => {
    if (!more || !end.current) return;
    const ob = new IntersectionObserver((es) => { if (es.some((e) => e.isIntersecting)) startTransition(() => setN((k) => k + step)); }, { rootMargin: "800px 0px" });
    ob.observe(end.current); return () => ob.disconnect();
  }, [more, n]);
  const chunks = []; for (let i = 0; i < shown; i += step) chunks.push(<Chunk key={i} items={items} from={i} to={Math.min(i + step, shown)} render={render} />);
  return <>{chunks}{more && <div ref={end} aria-hidden="true" className="h-px" />}</>;
}

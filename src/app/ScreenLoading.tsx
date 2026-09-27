// Shown for the moment a lazily loaded screen (the CV review, the admin console) takes to arrive on first open.
export const ScreenLoading = () => (
  <div role="status" aria-live="polite" className="min-h-[50dvh] grid place-items-center">
    <div className="flex flex-col items-center gap-3 text-ink-3 text-[13px]">
      <span aria-hidden="true" className="size-6 rounded-full border-2 border-line-2 border-t-accent animate-spin motion-reduce:animate-none" />
      <span>جارٍ التحميل…</span>
    </div>
  </div>
);

// «شكل الواجهة» in Settings → المظهر: كلاسيك (flat) or ناعم (Soft UI). The switch is instant and saved on this device
// (src/ui/ui-style.ts); light / dark stays its own choice, so all four looks can be compared on the phone.
import { Box, Layers } from "lucide-react";
import { setUiStyle, useUiStyle, type UiStyle } from "../../ui/ui-style";

const OPTIONS: { id: UiStyle; label: string; Icon: typeof Box }[] = [
  { id: "classic", label: "كلاسيك", Icon: Layers },
  { id: "soft", label: "ناعم", Icon: Box },
];

export function UiStylePicker({ toast }: { toast: (m: string) => void }) {
  const style = useUiStyle();
  return (
    <div className="mt-3" data-ui-style>
      <h3 className="text-[12px] text-ink-2 mb-1.5">شكل الواجهة</h3>
      <div role="radiogroup" aria-label="شكل الواجهة" className="flex p-1 rounded-full bg-canvas border border-line-2">
        {OPTIONS.map(({ id, label, Icon }) => {
          const on = style === id;
          return (
            <button
              key={id}
              type="button"
              role="radio"
              aria-checked={on}
              data-ui-style-option={id}
              onClick={() => {
                setUiStyle(id);
                toast(id === "soft" ? "الشكل الناعم: الأزرار بارزة والخانات محفورة" : "الشكل الكلاسيك");
              }}
              className={`press flex-1 h-9 inline-flex items-center justify-center gap-1.5 rounded-full text-[12.5px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${on ? "bg-elevated text-ink" : "text-ink-2"}`}
            >
              <Icon size={14} className={on ? "text-accent" : ""} />
              {label}
            </button>
          );
        })}
      </div>
      <p className="mt-2 text-[10.5px] text-ink-3 leading-snug">
        الناعم: ما يُضغط بارز، وما يحمل قيمة محفور، والمنشورات والقوائم مسطحة لتبقى القراءة والتمرير سريعين.
      </p>
    </div>
  );
}

import { useEffect, useRef, useState } from "react";
import {
  Image as ImageIcon, LockKeyhole, X
} from "lucide-react";
import { maskMoney } from "../domain/taxonomy";
import { UGC, tr } from "../i18n/i18n";
import { loadImageEl, ocrOpen, ocrPrep, withTimeout } from "./ocr";
import { MAX_INPUT, blobToDataUrl, compressImage } from "./compress";

// =====================================================================
//  Images — community post photos and profile pictures
//  · Every image is re-encoded on the device (src/lib/compress.ts: ≤ 1600 px, WebP / JPEG, ~150–250 KB) and loses its EXIF block,
//    so no location, camera or date travels with it; the upload-media function strips metadata again on the server.
//  · Post images are read on the device before publishing: if they show money figures, site supervisors never see them and
//    company accounts see a notice instead (the same rule as amounts written in text). An image that could not be read is
//    treated the same way — the safe side.
//  · Profile photos are cropped square, 256 px, shown only on PUBLIC items and never larger than 48 px — a small account mark,
//    never clickable, never expandable. Anonymous items never carry a photo.
// =====================================================================
export const PHOTO_MAX = 48;

export const IMAGE_ERRORS = { big: "الصورة كبيرة جدًا — اختر صورة أصغر من 25 ميجابايت", small: "الصورة صغيرة جدًا — 120 بكسل على الأقل في كل اتجاه", decode: "تعذّرت قراءة الصورة — استخدم JPG أو PNG أو WebP", none: "لم تُختر صورة" };

export const imageError = (e?: any) => IMAGE_ERRORS[(e && e.message) || "decode"] || IMAGE_ERRORS.decode;

// Every picker goes through here: the on-device pipeline (src/lib/compress.ts) resizes, strips metadata and encodes WebP / JPEG
// in the 150–250 KB band. The blob is what gets uploaded; the data URL is the preview (and the stored copy in demo mode).
export async function processImage(file?: any, { square = false, profile }: any = {}) {
  if (!file) throw new Error("none"); if (file.size > MAX_INPUT) throw new Error("big");
  const out = await compressImage(file, square ? "avatar" : profile || "photo");
  return { src: await blobToDataUrl(out.blob), blob: out.blob, mime: out.mime, w: out.w, h: out.h, tone: out.tone, bytes: out.bytes };
}

// Reads the image once (Arabic + English, sparse text) and keeps only one bit: are there money figures in it?
export async function scanImageForMoney(src?: any, onStep?: any) {
  const img = await loadImageEl(src); const c = ocrPrep(img, 0, 0, img.naturalWidth, img.naturalHeight, Math.min(1800, Math.max(1000, img.naturalWidth)), "gray"); let w = null;
  try { w = await ocrOpen("ara+eng", onStep); await w.setParameters({ tessedit_pageseg_mode: "11" }); const r: any = await withTimeout(w.recognize(c), 60000); const text = (r && r.data && r.data.text) || ""; return { money: maskMoney(text) !== text }; }
  finally { c.width = 0; c.height = 0; try { if (w) await w.terminate(); } catch (e) {} }
}

// "show" or "hidden": engineers see every image; restricted viewers see only images read as free of money figures
export const imageAccess = (image?: any, access?: any) => (!image ? null : access === "full" || image.money === false || image.state === "shown" ? "show" : "hidden");

export const imageRatio = (image?: any) => Math.min(1.91, Math.max(0.8, (image.w || 4) / (image.h || 3)));
 // 4:5 … 1.91:1, like professional feeds

// The image inside a post: fixed aspect box (no layout jump), average-colour placeholder, fade-in, tap to view full screen
export function PostImage({ image, app }: any) {
  const [loaded, setLoaded] = useState(false); const vis = imageAccess(image, app.moneyAccess);
  // the server decides in cloud mode: no src means this account may not see the image yet (state: unchecked / money / moving)
  if (!image.src && image.state === "moving") return <div className="mt-3 p-3 rounded-xl bg-canvas/60 border border-line text-[12px] text-ink-2 flex items-center gap-2"><ImageIcon size={13} className="shrink-0 text-ink-3" />صورة يجري تجهيزها — تظهر بعد قليل</div>;
  if (!image.src) return <HiddenFigure app={app} what={image.state === "money" ? "صورة فيها أرقام مالية" : "صورة لم يراجعها فريق EngSpace بعد"} />;
  if (vis === "hidden") return <HiddenFigure app={app} what={image.money === true ? "صورة فيها أرقام مالية" : "صورة لم يكتمل فحصها"} />;
  const r = imageRatio(image); const cropped = Math.abs(r - (image.w || 4) / (image.h || 3)) > 0.01;
  return (
    <button type="button" onClick={(e) => { e.stopPropagation(); app.viewImage(image); }} aria-label={image.alt ? `${tr("عرض الصورة كاملة")}: ${image.alt}` : "عرض الصورة كاملة"} className="post-img group relative mt-3 block w-full overflow-hidden rounded-xl border border-line focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent" style={{ aspectRatio: String(r), background: image.tone || "rgb(var(--elevated))" }}>
      <img src={image.src} alt={image.alt || ""} translate="no" loading="lazy" decoding="async" draggable={false} onLoad={() => setLoaded(true)} className={`absolute inset-0 w-full h-full object-cover transition-[opacity,transform] duration-500 group-hover:scale-[1.015] ${loaded ? "opacity-100" : "opacity-0"}`} />
      {cropped && <span className="absolute bottom-2 end-2 inline-flex items-center gap-1 h-6 px-2 rounded-full bg-black/55 text-white text-[10.5px] backdrop-blur-sm"><ImageIcon size={11} /> الصورة كاملة</span>}
    </button>
  );
}

// Full-screen viewer for post images (profile photos never open here)
export function ImageViewer({ image, onClose }: any) {
  const box = useRef<any>(null); const close = useRef<any>(onClose); close.current = onClose;
  useEffect(() => { const prev = document.activeElement as HTMLElement | null; try { if (box.current) box.current.focus({ preventScroll: true }); } catch (e) {} const onKey = (e?: any) => { if (e.key === "Escape") close.current(); }; window.addEventListener("keydown", onKey); return () => { window.removeEventListener("keydown", onKey); try { if (prev && prev.isConnected && prev.focus) prev.focus({ preventScroll: true }); } catch (e) {} }; }, []);
  return (
    <div ref={box} tabIndex={-1} className="viewer-in absolute inset-0 z-40 flex flex-col bg-black/95 backdrop-blur-md focus:outline-none" role="dialog" aria-modal="true" aria-label="عرض الصورة">
      <div className="shrink-0 flex items-center justify-between gap-2 px-3 pt-[calc(var(--sat)+8px)] pb-2 text-white">{image.alt ? <span {...UGC} className="text-[12px] text-white/70 truncate">{image.alt}</span> : <span className="text-[12px] text-white/70 truncate">صورة من المنشور</span>}<button type="button" aria-label="إغلاق" onClick={onClose} className="grid place-items-center w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"><X size={20} /></button></div>
      <button type="button" aria-label="إغلاق الصورة" onClick={onClose} className="relative flex-1 min-h-0 w-full focus:outline-none"><img src={image.src} alt={image.alt || ""} translate="no" draggable={false} className="viewer-img absolute inset-0 m-auto max-w-full max-h-full object-contain" /></button>
      <p className="shrink-0 px-4 pb-[max(1rem,var(--sab))] pt-2 text-center text-[11px] text-white/55">بيانات الموقع والكاميرا أُزيلت من هذه الصورة قبل نشرها</p>
    </div>
  );
}

// A picker the composer and the account screens share: a hidden file input behind a real button
export function useImagePicker(onFile?: any) {
  const ref = useRef<any>(null);
  const input = <input ref={ref} type="file" accept="image/jpeg,image/png,image/webp,image/gif,image/avif" className="sr-only" tabIndex={-1} aria-hidden="true" onChange={(e) => { const f = e.target.files && e.target.files[0]; e.target.value = ""; if (f) onFile(f); }} />;
  return [input, () => { if (ref.current) ref.current.click(); }] as const;
}

// In place of an individual figure the viewer may not see (company accounts: never an individual's number; supervisors: no money at all)
export const HiddenFigure = ({ app, what }: any) => <div className="mt-2 p-3 rounded-xl bg-canvas/60 border border-line text-[12px] leading-relaxed text-ink-2 flex items-start gap-2"><LockKeyhole size={13} className="shrink-0 mt-0.5 text-ink-3" /><span>{what} — {app.moneyAccess === "none" ? "الأرقام المالية لا تظهر لحسابات مشرفي المواقع." : "الأرقام الفردية وجهة صاحبها لا تظهر لحسابات الشركات، والمتوسطات متاحة في «السوق»."}</span></div>;

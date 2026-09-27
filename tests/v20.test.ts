// v20 logic tests: characters per theme (light / dark), male vs female designs, post images (who may see them) and profile
// Ported from the prototype suite logic-test-v20.js — the checks are unchanged; the page scope is now tests/harness.
import { test, expect } from "vitest";
import * as H from "./harness";
const { C, store } = H;
const src = H.src;
const names = ["charPalette", "SPEC_META", "CHAR_SPECS", "FACE", "Avatar", "ModeCtx", "useMode", "authorOf", "pickAuthor", "AUTHOR_FIELDS", "DEMO_PERSONA", "DEFAULT_PERSONA", "imageAccess", "imageRatio", "PHOTO_MAX", "IMAGE_ERRORS", "imageError", "POSTS0", "normalizeSeedPosts", "snapshotFor", "JOBS", "maskMoney", "PostImage", "ImageViewer", "useImagePicker", "processImage", "scanImageForMoney", "Monogram"];

test("v20 · characters per theme (light / dark), male vs female designs, post images (who may see them) and profile", async () => {
let pass = 0, fail = 0; const ok = (c, m) => { if (c) { pass++; console.log("  ✓ " + m); } else { fail++; console.log("  ✗ " + m); } };
names.forEach((n) => { if (C[n] === undefined) { fail++; console.log("  ✗ missing export " + n); } });
const L = (hsl) => Number(/,(\d+)%\)$/.exec(hsl)[1]);

console.log("— characters follow the theme —");
const dk = C.charPalette(205, "dark"), lt = C.charPalette(205, "light");
ok(L(dk.bg1) < 25 && L(dk.bg0) < 10 && L(lt.bg1) > 90 && L(lt.bg0) > 80, "dark: a deep field · light: a pale tinted field that sits on the light surface");
ok(L(lt.glow) < L(dk.glow) && L(lt.glow) <= 45, "light mode deepens the specialty colour so lines keep contrast on white");
ok(dk.badge === "#0b0b0f" && lt.badge === "#ffffff" && /15,23,42/.test(lt.edge), "employer badge and helmet outlines switch with the theme");
ok(C.CHAR_SPECS.every((s) => ["dark", "light"].every((m) => Object.values<any>(C.charPalette(C.SPEC_META[s].hue, m)).every((v) => v !== undefined))), "every specialty has a complete palette in both modes");
ok(C.ModeCtx && C.useMode() === "dark", "a theme context reaches every character (each phone in the device previews provides its own)");

console.log("— clearly male and female —");
ok(C.FACE.m !== C.FACE.f && /3\.1-7\.5 3\.1/.test(C.FACE.m), "male: squarer jaw · female: tapered face (separate outlines)");
const beards = C.CHAR_SPECS.filter((s) => C.SPEC_META[s].beard); ok(beards.length >= 5 && beards.includes("supervisor") && beards.includes("owner"), `beards, stubble or a moustache for men in ${beards.length} specialties`);
const anonF = C.authorOf({ ...C.DEMO_PERSONA, gender: "female" }, "anon"), anonM = C.authorOf({ ...C.DEMO_PERSONA, gender: "male" }, "anon");
ok(anonF.gender === "female" && anonF.look === "hood" && anonM.look === undefined, "female characters carry their look (hood by default); male ones none");

console.log("— post images: who sees them —");
ok(C.imageAccess({ money: true }, "full") === "show" && C.imageAccess({ money: null }, "full") === "show", "engineers see every image");
ok(C.imageAccess({ money: true }, "none") === "hidden" && C.imageAccess({ money: true }, "aggregate") === "hidden", "an image with money figures is hidden from site supervisors and company accounts");
ok(C.imageAccess({ money: null }, "none") === "hidden" && C.imageAccess({}, "aggregate") === "hidden", "an image that could not be read is treated as having figures (the safe side)");
ok(C.imageAccess({ money: false }, "none") === "show" && C.imageAccess({ money: false }, "aggregate") === "show", "an image read as free of figures shows for everyone");
ok(C.imageRatio({ w: 1200, h: 800 }) === 1.5 && C.imageRatio({ w: 600, h: 1800 }) === 0.8 && C.imageRatio({ w: 3000, h: 800 }) === 1.91, "feed frame between 4:5 and 1.91:1 — tall and panoramic images are cropped in the feed, shown whole in the viewer");
ok(C.maskMoney("Net pay: 14,750 EGP") !== "Net pay: 14,750 EGP" && C.maskMoney("Section 250 × 600 mm · L = 6.00 m") === "Section 250 × 600 mm · L = 6.00 m", "the scan rule: amounts count, drawing dimensions do not");
const seed = C.normalizeSeedPosts(C.POSTS0).find((p) => p.image); ok(seed && /^data:image\/svg\+xml/.test(seed.image.src) && seed.image.money === false && seed.image.alt && seed.image.w === 1200, "a seed post shows a real engineering drawing (inline, described, free of figures)");
ok(C.snapshotFor("post", seed.id, { posts: C.normalizeSeedPosts(C.POSTS0), jobs: C.JOBS }).image === seed.image.src, "a reported post keeps its image for the moderator");
ok(Object.keys(C.IMAGE_ERRORS).every((k) => C.imageError(new Error(k)) === C.IMAGE_ERRORS[k]) && C.imageError(new Error("x")) === C.IMAGE_ERRORS.decode, "every image failure has a clear Arabic message");

console.log("— profile photo: public only, small, inert —");
const withPhoto = { ...C.DEMO_PERSONA, photo: "data:image/jpeg;base64,AAAA", showPhoto: true };
const pub = C.authorOf(withPhoto, "public"), an = C.authorOf(withPhoto, "anon");
ok(pub.photo === withPhoto.photo, "the photo travels with public items");
ok(!("photo" in an) && !C.pickAuthor(an).photo, "an anonymous item never carries the photo");
ok(C.authorOf({ ...withPhoto, showPhoto: false }, "public").photo === undefined, "switching the photo off shows the initials again on public items");
ok(C.DEFAULT_PERSONA.showPhoto === true && C.DEFAULT_PERSONA.photo === null && C.AUTHOR_FIELDS.includes("photo"), "photo shown by default once added; none by default");
ok(C.PHOTO_MAX === 48, "a profile photo is never drawn larger than 48 px — an account mark, not a picture to open");
const mono = C.Monogram({ name: "أحمد سامي", photo: withPhoto.photo, size: 88 }); const img = mono.props.children.find((k) => k && k.type === "img");
ok(mono.props.style.width === 48 && img && img.props.draggable === false && /pointer-events-none/.test(img.props.className) && !mono.props.onClick, "rendered at 48 px, not draggable, not clickable, no preview handler");


  expect(fail, `${fail} failed check(s) — see the ✗ lines in the log`).toBe(0);
});

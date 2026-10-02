import { createRoot } from "react-dom/client";
import "@fontsource/ibm-plex-sans-arabic/400.css";
import "@fontsource/ibm-plex-sans-arabic/500.css";
import "@fontsource/ibm-plex-sans-arabic/600.css";
import "@fontsource/ibm-plex-sans-arabic/700.css";
import "@fontsource/space-grotesk/400.css";
import "@fontsource/space-grotesk/500.css";
import "@fontsource/space-grotesk/600.css";
import "@fontsource/space-grotesk/700.css";
import "./styles/app.css";
import { App, ErrorBoundary, installPressFeedback } from "./app/App";
import { initNative } from "./native/native";

installPressFeedback();
const el = document.getElementById("root")!;
let root = null;
const mount = () => { root = createRoot(el); root.render(<ErrorBoundary><App /></ErrorBoundary>); };
mount();
initNative();

// Development only (compiled out of production builds): lets the in-page UI crawler (tools/crawl-ui.js) restart the app from a
// clean state on a new deep link without reloading the page
if (import.meta.env.DEV) window.__engspaceDev = { mount, unmount: () => { if (root) root.unmount(); root = null; } };

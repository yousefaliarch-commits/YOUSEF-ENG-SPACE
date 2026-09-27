// Page-level globals the app keeps on window: the shared stores (lib/runtime), the i18n debug handle, and the phone preview's
// live-reload hook (set by the local phone server during device testing, absent otherwise).
export {};
declare global {
  interface Window {
    __LIVE?: any;
    __i18n?: any;
    __engspaceBuildChanged?: () => boolean;
  }
}

export const flushSync = (f) => f();
export const createPortal = (node) => node;
const ReactDOM = { flushSync, createPortal };
export default ReactDOM;

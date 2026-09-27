// Automatic-runtime JSX (what the TSX compiles to) mapped onto the stub's classic element shape: jsx() carries one child,
// jsxs() a static list — exactly what createElement(type, props, ...kids) would have received.
import { Fragment } from "./react";
export { Fragment };
export const jsx = (type, props) => { if (type == null) throw new Error(`jsx got ${type}`); const { children, ...rest } = props || {}; return { $el: true, type, props: { ...rest, children: children === undefined ? [] : [children] } }; };
export const jsxs = (type, props) => { if (type == null) throw new Error(`jsxs got ${type}`); const { children, ...rest } = props || {}; return { $el: true, type, props: { ...rest, children: children || [] } }; };
export const jsxDEV = (type, props, _key, isStatic) => (isStatic ? jsxs(type, props) : jsx(type, props));

/**
 * perry-react — React-compatible API for Perry native desktop apps.
 *
 * This package acts as a drop-in replacement for both `react` and `react-dom`
 * when used with Perry's `packageAliases` mechanism:
 *
 *   "perry": {
 *     "packageAliases": {
 *       "react":              "perry-react",
 *       "react/jsx-runtime":  "perry-react",
 *       "react-dom":          "perry-react",
 *       "react-dom/client":   "perry-react"
 *     }
 *   }
 *
 * Phase 1: synchronous reconciler, no Concurrent Mode, no Suspense.
 */

import {
  App,
  VStack, HStack, ZStack,
  Text, Button, TextField, SecureField,
  Toggle, Slider, Spacer, Divider,
  Image, ImageFile,
  Picker, Form, LazyVStack,
  State,
  widgetAddChild, widgetClearChildren, widgetSetHidden,
  textSetColor, textSetFontSize, textSetFontFamily,
  buttonSetBordered,
} from "perry/ui"

// ─── Element Descriptors ────────────────────────────────────────────────────

/**
 * A React element descriptor — the value returned by `createElement` / JSX.
 * At runtime this is a plain object; Perry's `any` type handles the boxing.
 */
export type ReactElement = {
  type: any
  props: any
  key: any
}

// ─── Hook Storage ────────────────────────────────────────────────────────────
//
// Perry TypeScript compiles to native code, so we use parallel plain arrays
// (not classes/closures) for maximum compatibility with Perry's type system.
//
// Supports up to 64 hooks per render root — plenty for Phase 1 apps.

const HOOK_LIMIT = 64

// Hook values indexed by hook call order within a render pass
let _vals: any[] = []
let _sigs: any[] = []          // Perry State handles — one per useState slot
let _initCount = 0              // number of hooks initialised so far
let _idx = 0                   // current hook index during a render pass

// Re-render machinery
let _rootWidget: any = null    // Perry VStack that holds the whole component tree
let _renderFn: any = null      // () => ReactElement — the root component lambda

// ─── Internal helpers ────────────────────────────────────────────────────────

/**
 * Full synchronous re-render.
 * Called by useState setters (via Perry State.onChange) after the initial
 * render is complete and the App event loop is running.
 */
function _scheduleRerender(): void {
  if (_rootWidget === null || _renderFn === null) { return }
  widgetClearChildren(_rootWidget)
  _idx = 0
  const rootEl = _renderFn()
  const w = _buildWidget(rootEl)
  if (w !== null) {
    widgetAddChild(_rootWidget, w)
  }
}

function _buildWidget(element: any): any {
  if (element === null || element === undefined) {
    return null
  }

  // Primitive text — React allows rendering strings and numbers directly
  if (typeof element === "string") {
    return Text(element)
  }
  if (typeof element === "number") {
    return Text(element.toString())
  }

  // ReactElement
  const type = element.type
  const props = element.props !== null && element.props !== undefined ? element.props : {}
  const children = props.children !== undefined ? props.children : null

  // Fragment — render children in a VStack wrapper
  if (type === "__Fragment" || type === null) {
    const box = VStack(0, [])
    _appendChildren(box, children)
    return box
  }

  // Component function — call it and recurse
  if (typeof type === "function") {
    const childEl = type(props)
    return _buildWidget(childEl)
  }

  // HTML intrinsic element
  if (typeof type === "string") {
    return _buildIntrinsic(type, props, children)
  }

  return null
}

function _appendChildren(parent: any, children: any): void {
  if (children === null || children === undefined) { return }
  if (typeof children === "string" || typeof children === "number") {
    const w = _buildWidget(children)
    if (w !== null) { widgetAddChild(parent, w) }
    return
  }
  if (Array.isArray(children)) {
    for (let i = 0; i < children.length; i++) {
      const w = _buildWidget(children[i])
      if (w !== null) { widgetAddChild(parent, w) }
    }
    return
  }
  // Single ReactElement child
  const w = _buildWidget(children)
  if (w !== null) { widgetAddChild(parent, w) }
}

function _childrenText(children: any): string {
  if (children === null || children === undefined) { return "" }
  if (typeof children === "string") { return children }
  if (typeof children === "number") { return children.toString() }
  if (Array.isArray(children)) {
    let out = ""
    for (let i = 0; i < children.length; i++) {
      out = out + _childrenText(children[i])
    }
    return out
  }
  return ""
}

function _buildIntrinsic(tag: string, props: any, children: any): any {
  const style = props.style !== null && props.style !== undefined ? props.style : {}
  const isRowFlex = style.flexDirection === "row"

  // ── Layout containers ────────────────────────────────────────────────────
  if (tag === "div" || tag === "section" || tag === "main" ||
      tag === "nav" || tag === "header" || tag === "footer" ||
      tag === "article") {
    const container = isRowFlex ? HStack(8, []) : VStack(8, [])
    _appendChildren(container, children)
    _applyContainerStyle(container, style)
    return container
  }

  if (tag === "span") {
    // Inline — use HStack to flow children horizontally
    const container = HStack(0, [])
    _appendChildren(container, children)
    return container
  }

  if (tag === "form") {
    const container = VStack(8, [])
    _appendChildren(container, children)
    return container
  }

  if (tag === "ul" || tag === "ol") {
    const container = VStack(4, [])
    _appendChildren(container, children)
    return container
  }

  if (tag === "li") {
    const text = _childrenText(children)
    if (text !== "") {
      return Text("• " + text)
    }
    const container = HStack(4, [])
    _appendChildren(container, children)
    return container
  }

  // ── Text elements ────────────────────────────────────────────────────────
  if (tag === "p" || tag === "h1" || tag === "h2" || tag === "h3" ||
      tag === "h4" || tag === "h5" || tag === "h6" || tag === "label") {
    const textContent = _childrenText(children)
    const t = Text(textContent)
    if (tag === "h1") { textSetFontSize(t, 28) }
    else if (tag === "h2") { textSetFontSize(t, 22) }
    else if (tag === "h3") { textSetFontSize(t, 18) }
    _applyTextStyle(t, style)
    return t
  }

  // ── Interact controls ────────────────────────────────────────────────────
  if (tag === "button") {
    const label = _childrenText(children)
    const onClick = props.onClick !== undefined ? props.onClick : null
    if (onClick !== null) {
      return Button(label, onClick)
    }
    return Button(label, () => {})
  }

  if (tag === "input") {
    const inputType = props.type !== undefined ? props.type : "text"
    if (inputType === "checkbox") {
      const onChange = props.onChange !== undefined ? props.onChange : null
      const checked = props.checked !== undefined ? props.checked : false
      if (onChange !== null) {
        return Toggle(props.label !== undefined ? props.label : "", (v: boolean) => {
          onChange({ target: { value: v, checked: v } })
        })
      }
      return Toggle(props.label !== undefined ? props.label : "", (_v: boolean) => {})
    }
    if (inputType === "range") {
      const min = props.min !== undefined ? props.min : 0
      const max = props.max !== undefined ? props.max : 100
      const val = props.value !== undefined ? props.value : 0
      const onChange = props.onChange !== undefined ? props.onChange : null
      if (onChange !== null) {
        return Slider(min, max, val, (v: number) => {
          onChange({ target: { value: v } })
        })
      }
      return Slider(min, max, val, (_v: number) => {})
    }
    if (inputType === "password") {
      const placeholder = props.placeholder !== undefined ? props.placeholder : ""
      const onChange = props.onChange !== undefined ? props.onChange : null
      if (onChange !== null) {
        return SecureField(placeholder, (v: string) => {
          onChange({ target: { value: v } })
        })
      }
      return SecureField(placeholder, (_v: string) => {})
    }
    // text / email / number / search
    const placeholder = props.placeholder !== undefined ? props.placeholder : ""
    const onChange = props.onChange !== undefined ? props.onChange : null
    if (onChange !== null) {
      return TextField(placeholder, (v: string) => {
        onChange({ target: { value: v } })
      })
    }
    return TextField(placeholder, (_v: string) => {})
  }

  if (tag === "select") {
    const onChange = props.onChange !== undefined ? props.onChange : null
    if (onChange !== null) {
      return Picker((v: number) => { onChange({ target: { value: v } }) })
    }
    return Picker((_v: number) => {})
  }

  if (tag === "textarea") {
    const placeholder = props.placeholder !== undefined ? props.placeholder : ""
    const onChange = props.onChange !== undefined ? props.onChange : null
    if (onChange !== null) {
      return TextField(placeholder, (v: string) => {
        onChange({ target: { value: v } })
      })
    }
    return TextField(placeholder, (_v: string) => {})
  }

  if (tag === "img") {
    const src = props.src !== undefined ? props.src : ""
    return ImageFile(src)
  }

  if (tag === "hr") {
    return Divider()
  }

  if (tag === "a") {
    // Render as a button-style link; href is ignored in native
    const label = _childrenText(children)
    const onClick = props.onClick !== undefined ? props.onClick : null
    if (onClick !== null) {
      return Button(label, onClick)
    }
    return Text(label)
  }

  // ── Stubs ────────────────────────────────────────────────────────────────
  // video, audio, iframe, canvas — stub as VStack with warning emitted at
  // compile time (not runtime, since Perry lacks console.warn in UI mode)
  if (tag === "video" || tag === "audio" || tag === "iframe" ||
      tag === "canvas" || tag === "table") {
    const container = VStack(0, [])
    return container
  }

  // Generic / unknown element — fall back to VStack
  const container = VStack(0, [])
  _appendChildren(container, children)
  return container
}

function _applyContainerStyle(_widget: any, _style: any): void {
  // Phase 1: opacity / hidden are the most useful
  if (_style.display === "none") {
    widgetSetHidden(_widget, 1)
  }
}

function _applyTextStyle(_widget: any, style: any): void {
  if (style.fontSize !== undefined) {
    const sz = typeof style.fontSize === "number"
      ? style.fontSize
      : parseFloat(style.fontSize)
    textSetFontSize(_widget, sz)
  }
  if (style.color !== undefined) {
    const c = _parseColor(style.color)
    textSetColor(_widget, c[0], c[1], c[2], c[3])
  }
  if (style.fontFamily !== undefined) {
    textSetFontFamily(_widget, style.fontFamily)
  }
}

function _parseColor(colorStr: string): number[] {
  // Very simple: handle rgb(r,g,b) and #RRGGBB
  if (colorStr.startsWith("#") && colorStr.length === 7) {
    const r = parseInt(colorStr.substring(1, 3), 16) / 255
    const g = parseInt(colorStr.substring(3, 5), 16) / 255
    const b = parseInt(colorStr.substring(5, 7), 16) / 255
    return [r, g, b, 1.0]
  }
  // Default: black
  return [0, 0, 0, 1]
}

// ─── React core exports ──────────────────────────────────────────────────────

/**
 * createElement — classic React.createElement call (also used by the
 * classic JSX transform: <div> → React.createElement("div", …)).
 */
export function createElement(type: any, props: any, ...children: any[]): ReactElement {
  const p = props !== null && props !== undefined ? props : {}
  if (children.length === 1) {
    p.children = children[0]
  } else if (children.length > 1) {
    p.children = children
  }
  return { type, props: p, key: p.key !== undefined ? p.key : null }
}

// ─── New JSX Transform runtime ───────────────────────────────────────────────
// These are auto-imported by Perry's JSX transform as `__jsx` / `__jsxs`.

export function jsx(type: any, props: any): ReactElement {
  return { type, props: props !== null && props !== undefined ? props : {}, key: null }
}

export function jsxs(type: any, props: any): ReactElement {
  return jsx(type, props)
}

/** Sentinel used to represent <></> fragments in the element tree. */
export const Fragment: any = "__Fragment"

// ─── Hooks ───────────────────────────────────────────────────────────────────

/**
 * useState — returns a [value, setter] pair backed by a Perry reactive State.
 * Calling the setter triggers a full synchronous re-render of the root tree.
 */
export function useState(initial: any): any[] {
  const idx = _idx
  _idx++

  if (idx >= _initCount) {
    // First time this hook is visited — initialise the slot
    _vals.push(initial)
    const sig = State(0)
    sig.onChange(() => { _scheduleRerender() })
    _sigs.push(sig)
    _initCount++
  }

  const val = _vals[idx]
  const sig = _sigs[idx]

  const setter = (newVal: any) => {
    _vals[idx] = newVal
    sig.set(sig.value + 1)
  }

  return [val, setter]
}

/**
 * useReducer — simple reducer hook.
 */
export function useReducer(reducer: any, initialState: any): any[] {
  const [state, setState] = useState(initialState) as any[]
  const dispatch = (action: any) => {
    const nextState = reducer(state, action)
    setState(nextState)
  }
  return [state, dispatch]
}

/**
 * useEffect — Phase 1: runs the effect once after the first render.
 * Dependency tracking deferred to Phase 2.
 */
export function useEffect(fn: any, _deps: any): void {
  const idx = _idx
  _idx++

  if (idx >= _initCount) {
    _vals.push(false)
    _sigs.push(null)
    _initCount++
    fn()
  }
}

/**
 * useLayoutEffect — same as useEffect for Phase 1 (no layout phase distinction).
 */
export function useLayoutEffect(fn: any, deps: any): void {
  useEffect(fn, deps)
}

/**
 * useRef — mutable ref object; .current persists across renders.
 */
export function useRef(initial: any): any {
  const idx = _idx
  _idx++

  if (idx >= _initCount) {
    _vals.push({ current: initial })
    _sigs.push(null)
    _initCount++
  }

  return _vals[idx]
}

/**
 * useMemo — Phase 1: recomputes on every render (no dep tracking).
 */
export function useMemo(fn: any, _deps: any): any {
  return fn()
}

/**
 * useCallback — Phase 1: returns the function as-is.
 */
export function useCallback(fn: any, _deps: any): any {
  return fn
}

// ─── Context API ─────────────────────────────────────────────────────────────
//
// Phase 1: single-level context (no provider nesting).

type Context = {
  defaultValue: any
  currentValue: any
}

export function createContext(defaultValue: any): Context {
  return { defaultValue, currentValue: defaultValue }
}

export function useContext(ctx: Context): any {
  return ctx.currentValue
}

// ─── Component wrappers ──────────────────────────────────────────────────────

/**
 * memo — Phase 1: no memoization, just returns the component.
 */
export function memo(component: any): any {
  return component
}

/**
 * forwardRef — Phase 1: ignores the ref, returns the component.
 */
export function forwardRef(render: any): any {
  return (props: any) => render(props, null)
}

// ─── React namespace (default export) ────────────────────────────────────────
//
// Users who write `import React from 'react'` and use `React.createElement`,
// `React.useState`, etc. get this object as the default export.

const React: any = {
  createElement,
  useState,
  useReducer,
  useEffect,
  useLayoutEffect,
  useRef,
  useMemo,
  useCallback,
  createContext,
  useContext,
  memo,
  forwardRef,
  Fragment,
}

export default React

// ─── StrictMode / Suspense pass-throughs ─────────────────────────────────────

export function StrictMode(props: any): ReactElement {
  return { type: Fragment, props, key: null }
}

export function Suspense(props: any): ReactElement {
  return { type: Fragment, props, key: null }
}

// ─── react-dom / react-dom/client exports ────────────────────────────────────
//
// Also exported here so that a single packageAliases entry covers both
// `react-dom` and `react-dom/client`.

export type RootOptions = {
  title?: string
  width?: number
  height?: number
}

export type Root = {
  render: (element: ReactElement) => void
  unmount: () => void
}

/**
 * createRoot — creates a Perry native window and synchronous render root.
 *
 * The `container` argument mirrors react-dom's API but is ignored in Perry;
 * window options are taken from the second argument instead.
 *
 * Usage:
 *   const root = createRoot(document.getElementById('root'), { title: "My App", width: 400, height: 300 })
 *   root.render(<App />)
 *
 * `root.render` does the initial widget build and then starts Perry's event
 * loop (blocking). Re-renders are driven by useState setters via Perry's
 * reactive State.onChange mechanism.
 */
export function createRoot(_container: any, options: RootOptions): Root {
  const title = options !== null && options !== undefined && options.title !== undefined
    ? options.title : "Perry App"
  const width = options !== null && options !== undefined && options.width !== undefined
    ? options.width : 800
  const height = options !== null && options !== undefined && options.height !== undefined
    ? options.height : 600

  // Root widget — a plain VStack that holds the entire component tree.
  // Cleared and rebuilt on every re-render.
  const rootWidget = VStack(0, [])
  _rootWidget = rootWidget

  return {
    render: (element: ReactElement) => {
      // NaN-box the ReactElement (I64 struct) into any (F64) before passing to _buildWidget.
      // Without this, the dynamic closure call path raw-bitcasts I64 → subnormal F64.
      const elemAny: any = element
      // Store the NaN-boxed version so re-renders (_scheduleRerender) also get F64.
      _renderFn = () => elemAny

      // Initial render pass
      _idx = 0
      const w = _buildWidget(elemAny)
      if (w !== null) {
        widgetAddChild(rootWidget, w)
      }

      // Start Perry's native event loop.  This call blocks until the window
      // is closed.  All subsequent re-renders happen synchronously inside the
      // event loop via State.onChange callbacks registered by useState.
      App({ title, width, height, body: rootWidget })
    },
    unmount: () => {
      widgetClearChildren(rootWidget)
    },
  }
}

/**
 * render — legacy ReactDOM.render API.
 */
export function render(element: ReactElement, _container: any): void {
  createRoot(_container, {}).render(element)
}

/**
 * Default export as `ReactDOM` namespace for `import ReactDOM from 'react-dom'`.
 */
export const ReactDOM: any = { createRoot, render }

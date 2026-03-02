# perry-react

**React-compatible renderer for Perry native desktop apps.**

Write standard React/JSX components. Run `perry compile`. Get a native macOS (and eventually iOS, Android, GTK4, Win32) binary — no Electron, no WebView, no browser engine.

```tsx
import { useState } from "react"
import { createRoot } from "react-dom/client"

function App() {
  const [count, setCount] = useState(0)
  return (
    <div>
      <h1>Hello from native!</h1>
      <p>Count: {count}</p>
      <button onClick={() => setCount(count + 1)}>+</button>
    </div>
  )
}

const root = createRoot(null, { title: "My App", width: 480, height: 600 })
root.render(<App />)
```

This is **React Native for Perry** — same programming model, hooks, JSX, and component composition. The target is native desktop, not the web.

---

## How it works

Perry is a TypeScript-to-native compiler (TypeScript → HIR → Cranelift JIT → native binary). It has no DOM, no V8, no browser engine. `perry-react` bridges React's component model to Perry's imperative widget system.

### The import alias trick

No changes to your source code are needed. A single block in `package.json` redirects `react` and `react-dom` imports to `perry-react` at the compiler's module-resolution stage:

```json
{
  "perry": {
    "packageAliases": {
      "react":             "perry-react",
      "react/jsx-runtime": "perry-react",
      "react-dom":         "perry-react",
      "react-dom/client":  "perry-react"
    }
  }
}
```

Perry intercepts these imports before codegen. Your components never know they're not running against react-dom.

### JSX → HIR → native widgets

Perry's parser handles `.tsx` files natively. `<div>children</div>` is lowered directly to HIR `Expr::Call(jsxs, ["div", { children: [...] }])` — no Babel, no transpiler step. The `jsx`/`jsxs` functions in this package construct plain `{ type, props, key }` descriptor objects, compiled to native heap objects via Cranelift.

`_buildWidget` walks the element tree and maps each descriptor to a Perry widget handle:

| HTML element | Perry widget | Notes |
|---|---|---|
| `div` (default) | `VStack` | vertical flex |
| `div` + `style={{ flexDirection: "row" }}` | `HStack` | horizontal flex |
| `p`, `h1`–`h6`, `span` | `Text` | font size set for headings |
| `button` | `Button` | `onClick` wired |
| `input[type=text\|email]` | `TextField` | `onChange` → synthetic event |
| `input[type=password]` | `SecureField` | |
| `input[type=checkbox]` | `Toggle` | |
| `input[type=range]` | `Slider` | |
| `select` | `Picker` | |
| `img` | `Image` | `src` passed through |
| `hr` | `Divider` | |
| `ul`, `ol` | `VStack` | |
| `form`, `section`, `article`, etc. | `VStack` | semantic → layout |
| `a` | `Button` | `href` ignored, `onClick` wired |
| `video`, `audio`, `canvas` | `VStack` (stub) | |

### State and re-renders

`useState` is backed by a Perry reactive `State` object. Calling a setter:
1. Updates the value in our `_vals` array
2. Increments a Perry State counter (triggering `onChange`)
3. `onChange` fires `_scheduleRerender`:
   - Clears all children from the root widget
   - Re-runs the component tree from scratch
   - Re-attaches the rebuilt widgets

This is a full-tree rebuild on every state change — simpler than React's fiber reconciler but correct for Phase 1.

---

## Quick start

```bash
# 1. Clone this package next to your project, or install from path
git clone https://github.com/PerryTS/react perry-react

# 2. Create your project
mkdir my-app && cd my-app
```

`package.json`:
```json
{
  "name": "my-app",
  "main": "src/main.tsx",
  "perry": {
    "packageAliases": {
      "react":             "perry-react",
      "react/jsx-runtime": "perry-react",
      "react-dom":         "perry-react",
      "react-dom/client":  "perry-react"
    }
  }
}
```

`src/main.tsx`:
```tsx
import { createRoot } from "react-dom/client"
import { App } from "./App"

const root = createRoot(null, { title: "My App", width: 480, height: 600 })
root.render(<App />)
```

```bash
# 3. Compile and run
perry compile src/main.tsx -o my-app
./my-app
```

---

## Supported React APIs

### Hooks
| Hook | Status | Notes |
|---|---|---|
| `useState` | ✅ | Backed by Perry State |
| `useEffect` | ⚠️ | Runs once after first render; deps ignored |
| `useLayoutEffect` | ⚠️ | Alias for useEffect |
| `useRef` | ✅ | Mutable ref object persists across renders |
| `useMemo` | ⚠️ | Recomputes every render (no dep tracking) |
| `useCallback` | ⚠️ | Returns fn as-is (no memoization) |
| `useReducer` | ✅ | Built on useState |
| `useContext` | ✅ | Single-level context (no provider nesting) |

### Component model
| Feature | Status |
|---|---|
| Function components | ✅ |
| Props | ✅ |
| Children | ✅ |
| Conditional rendering (`&&`, ternary) | ✅ |
| List rendering (`.map()`) | ✅ (key ignored) |
| `Fragment` (`<>…</>`) | ✅ |
| `memo` | ⚠️ (no memoization, returns component) |
| `forwardRef` | ⚠️ (ref ignored) |
| `StrictMode` | ⚠️ (passes through) |
| `Suspense` | ⚠️ (passes through) |

### Styling
- **Inline `style={{}}` props** — supported. A subset of CSS properties map to Perry widget setters.
- **`className`** — not supported. Perry has no CSS engine.

Supported inline style properties:
`flexDirection`, `display: none`, `fontSize`, `color`, `fontFamily`, `backgroundColor`, `opacity`, `borderRadius`, `width`, `height`, `padding`

### Events
| React prop | Status |
|---|---|
| `onClick` | ✅ |
| `onChange` | ✅ (synthetic `{ target: { value } }`) |
| `onMouseEnter` / `onMouseLeave` | ✅ |
| `onDoubleClick` | ✅ |
| `onFocus` / `onBlur` | ❌ No Perry equivalent |
| `onKeyDown` / `onKeyUp` | ❌ No Perry equivalent |

---

## Limitations

### `className` — the central blocker

Modern React apps use `className` for virtually all styling. Perry has no CSS parser, no cascade engine, no class selector matching. **If your app relies on `className` it will not render correctly.** Inline `style={{}}` is the only styling mechanism.

### Hook state is global (Phase 1)

Hook storage uses a single global array indexed by call order. This means **a component used more than once will have all instances sharing the same state slots** — clicking a counter in one instance affects all others. A proper per-fiber hook store is the key Phase 2 engineering task.

### No third-party component libraries

MUI, Radix, Shadcn, Ant Design, React Hook Form, React Router, React Query — all depend on DOM APIs or `className`. None work in Phase 1.

### No CSS-in-JS

styled-components, emotion, Stitches inject `<style>` tags into a DOM that doesn't exist.

### No `useEffect` cleanup or dep arrays

`useEffect(fn, deps)` runs `fn` exactly once and never re-runs. Cleanup functions returned from effects are not called.

### `element.toString()` on numbers

Perry does not implement `Number.prototype.toString()` via the standard method dispatch path. Use `String(value)` or string interpolation (`"" + value`) rather than `value.toString()` in component code.

---

## Architecture: compared to React Native

| | React Native | perry-react (Phase 1) |
|---|---|---|
| Target | iOS / Android | macOS (Perry native) |
| Styling | StyleSheet API (no CSS) | Inline `style={{}}` (no CSS) |
| Component libraries | react-native-* ecosystem | None yet |
| Reconciler | Fiber (production) | Full-tree rebuild (Phase 1) |
| Hook storage | Per fiber instance | Global (Phase 1 limitation) |
| Bridge | JS ↔ native async bridge | Direct Cranelift → native |
| Status | Production, 10 years | Phase 1 proof of concept |

The strategic parallel is intentional. React Native succeeded by accepting no CSS and building a native-first ecosystem. `perry-react` follows the same path.

---

## Compiler changes required (Perry internals)

Four NaN-boxing fixes were needed in Perry's Cranelift codegen. See `CLAUDE.md` for full details.

---

## Roadmap

### Phase 1 — done ✅
Core hooks, element-to-widget mapping, inline styles, basic events, full-tree re-render.

### Phase 2
- Per-component-instance hook storage (fiber-like tree)
- `useEffect` dependency tracking and cleanup
- Compile-time Tailwind utility class mapper (200 common classes → Perry setters)
- Proper synthetic event objects
- `perry-router`: simple navigation

### Phase 3
- Yoga layout engine integration (real flexbox)
- CSS cascade engine (static + dynamic)
- `perry-react-*` native component library ecosystem

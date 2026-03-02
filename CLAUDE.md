# CLAUDE.md — perry-react engineering notes

This file documents every non-obvious decision, bug, and fix made during the implementation of `perry-react`. It exists so future sessions can pick up where this left off without re-discovering the same things.

---

## Project layout

```
perry-react/
  src/index.ts          — the entire renderer: createElement, hooks, reconciler,
                          element→widget mapping, createRoot
  demo/
    src/main.tsx        — entry point: createRoot + root.render(<App />)
    src/App.tsx         — counter + text-input demo component
    package.json        — packageAliases wiring
    main                — compiled binary (gitignored)
  package.json          — perry-react package manifest
```

The renderer (`src/index.ts`) is a single file by design. Perry's native module system requires a single entry point and the whole thing compiles to one `.o`.

---

## How the import alias works

`demo/package.json`:
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

Perry reads this in `compile.rs` around line 934–937. Before codegen, the compiler substitutes the alias target wherever it sees the aliased package name. This is the same mechanism used for `@prisma/client → perry-prisma` etc. No source code changes needed in user components.

`perry-react` is declared as a native module (`"nativeModule": true` in its `package.json`). Perry adds it to the same `NATIVE_MODULES` list as `perry/ui`, which means it's compiled and linked as native Perry TypeScript, not run through V8.

---

## JSX transform path

Perry's parser handles `.tsx` natively (SWC-based). The JSX lowering is in `perry/crates/perry-hir/src/lower.rs`, function `lower_jsx_element` (~line 10209).

```
<div style={s}>              →  Expr::Call {
  <h1>text</h1>                   callee: ExternFuncRef("jsxs"),
  <p>{count}</p>                  args: [
</div>                              "div",
                                    Expr::Object([
                                      ("style", s),
                                      ("children", Expr::Array([
                                        Expr::Call(ExternFuncRef("jsx"), ["h1", ...]),
                                        Expr::Call(ExternFuncRef("jsx"), ["p",  ...]),
                                      ]))
                                    ])
                                  ]
                                }
```

- Single child → stored directly as `children` value (not wrapped in array)
- Multiple children → `Expr::Array([...])` for the `children` prop
- `jsx` for 0–1 children, `jsxs` for 2+ children (React convention)

`ExternFuncRef("jsx")` resolves to `__wrapper_jsx` at link time — the wrapper Perry generates for every exported function in a native module. The wrapper ABI is `(i64 closure_ptr, f64 arg0, f64 arg1, ...) -> f64`.

---

## NaN-boxing in Perry

Every JS value is stored as a 64-bit NaN-boxed float (`f64`). The encoding:

```
Normal float:   standard IEEE 754 f64 (exponent not all-1s)
Pointer:        0x7FFD_0000_0000_0000 | (ptr & 0x0000_FFFF_FFFF_FFFF)
String:         0x7FFC_0000_0000_0000 | str_ptr
Integer:        0x7FFE_0000_0000_0000 | (i32 as u32)
Undefined:      0x7FFF_8000_0000_0001
Null:           0x7FFF_8000_0000_0002
Bool true:      0x7FFF_0000_0000_0001
Bool false:     0x7FFF_0000_0000_0000
```

Key helpers in `codegen.rs`:
- `inline_nanbox_pointer(builder, I64_ptr) -> F64` — masks lower 48 bits, ORs POINTER_TAG, bitcasts
- `ensure_i64(builder, F64_val) -> I64` — strips top 16 bits via `& 0x0000_FFFF_FFFF_FFFF`
- `ensure_f64(builder, val) -> F64` — raw bitcast I64→F64 or identity; **does NOT NaN-box**

`ensure_i64` is safe for both properly NaN-boxed pointers and raw-bitcast subnormals because the mask strips the tag either way. This is why the array fix (Fix 5 below) doesn't break existing callers.

---

## The four Perry compiler fixes

All changes are in `perry/crates/perry-codegen/src/codegen.rs`.

### Fix 1 — `js_native_call_method` receiver (~line 28179)

**Problem**: When compiling `obj.someMethod(args)`, the object value was passed raw to `js_native_call_method`. If the object was an I64 (raw pointer), the runtime's `value.is_pointer()` check failed because the POINTER_TAG wasn't set.

**Fix**:
```rust
let obj_val = if obj_val_type == types::I64 {
    inline_nanbox_pointer(builder, obj_val_raw)
} else {
    obj_val_raw
};
```

### Fix 2 — `js_native_call_method` arguments (~line 28220)

**Problem**: Arguments pushed into the stack slot for `js_native_call_method` were also not NaN-boxed. A ReactElement (I64) passed as an argument would arrive in the runtime as `typeof "number"` instead of `typeof "object"`.

**Fix**: Same pattern per argument:
```rust
let arg_val = if arg_val_type == types::I64 {
    inline_nanbox_pointer(builder, arg_val_raw)
} else {
    arg_val_raw
};
```

### Fix 3 — `Stmt::Let` union/`any` assignment (~line 16558)

**Problem**: When assigning an I64 value to an `any`-typed variable (the `is_union` branch of `Stmt::Let`), the codegen did a raw bitcast I64→F64. This produces a subnormal float — a valid float but with no NaN-box tag. Any later `typeof` or `is_pointer()` check would classify it as a number.

This was the root cause of: `const elemAny: any = element` being needed in `createRoot.render`. Without the explicit `: any` annotation Perry would pass the I64 `ReactElement` struct directly through the dynamic closure call path as a subnormal.

**Fix**:
```rust
} else if is_union {
    let val_type = builder.func.dfg.value_type(val);
    if val_type == types::I64 {
        inline_nanbox_pointer(builder, val)  // was: raw bitcast
    } else if val_type == types::I32 {
        builder.ins().fcvt_from_sint(types::F64, val)
    } else {
        val
    }
```

### Fix 5 — `Expr::Array` return value (~lines 31253, 31325, 31352)

**Problem**: All three code paths that return an array pointer from `Expr::Array` codegen (empty array, `js_array_from_jsvalue`, `js_array_from_f64`) used a raw bitcast:
```rust
Ok(builder.ins().bitcast(types::F64, MemFlags::new(), arr_ptr))
```

This produces a subnormal float — no POINTER_TAG. When an array was stored as an object field (e.g. `props.children = [h1, h2, p, ...]`), reading it back via `js_dynamic_object_get_property` returned a value with `typeof "number"`. `Array.isArray` would fail. `_appendChildren` treated the entire children array as a primitive value and tried to render it directly as text — producing the `0.0000000…` display in the window.

**Fix** (applied at all three sites):
```rust
Ok(inline_nanbox_pointer(builder, arr_ptr))  // was: raw bitcast
```

`ensure_i64` at call sites that need the raw pointer already masks away the top 16 bits (`& 0x0000_FFFF_FFFF_FFFF`), so this fix doesn't break any existing native FFI calls that pass arrays to functions expecting `i64`.

### Fix 4 — NOT applied

Applying `inline_nanbox_pointer` to ALL I64 arguments in the dynamic closure call path (~line 28292) was tried and reverted. It crashes because some I64 arguments through that path are plain integers (e.g. `sig.set(sig.value + 1)`) — NaN-boxing an integer as a pointer sends garbage to the native State setter. The dynamic closure call path has lost type information by the time codegen runs there, so we cannot distinguish pointers from integers. The TypeScript-level workaround (`const elemAny: any = element`) is used instead to trigger Fix 3 at the right locations.

---

## The `const elemAny: any = element` pattern

This shows up in `createRoot.render` and is not accidental:

```typescript
render: (element: ReactElement) => {
  const elemAny: any = element   // <-- intentional
  _renderFn = () => elemAny
  _idx = 0
  const w = _buildWidget(elemAny)
```

`element: ReactElement` is an I64 in Perry's ABI (it's a named struct type). `_buildWidget` expects `any` (F64). The dynamic closure call path for within-module calls does a raw bitcast I64→F64 for I64 arguments — producing a subnormal float. Without the explicit `: any` annotation, the first call to `_buildWidget` receives a subnormal, `typeof element` returns `"number"`, and the entire component tree is replaced with the float rendered as text.

`const elemAny: any = element` triggers Fix 3 (the `is_union` branch of `Stmt::Let`), which NaN-boxes the I64 pointer with POINTER_TAG before storing it in the `any`-typed local. `_renderFn = () => elemAny` then captures the properly tagged F64, so re-renders in `_scheduleRerender` also work correctly.

---

## How to rebuild after Perry changes

The `perry` binary at `/usr/local/bin/perry` is a symlink to `target/release/perry`. Always rebuild release:

```bash
cd /Users/amlug/projects/perry
cargo build -p perry --release    # ~50s
```

Then recompile the demo:
```bash
cd /Users/amlug/projects/perry-react/demo
perry compile src/main.tsx -o main
./main
```

A debug build (`cargo build -p perry`) updates `target/debug/perry` but NOT the installed binary — a common source of "my fix didn't work" confusion in this session.

---

## Hook storage — the Phase 1 limitation

The current hook system is a global pair of arrays:

```typescript
let _vals: any[] = []   // current values
let _sigs: any[] = []   // Perry State handles (one per useState slot)
let _initCount = 0
let _idx = 0            // reset to 0 before each render pass
```

`_idx` is incremented once per hook call and reset to 0 before rendering. This works correctly for a single component tree where each component appears exactly once. It breaks when:

- A component function is called more than once (two `<Counter />` instances share the same `_vals` slots)
- A component is conditionally rendered (slot indices shift between renders)

The fix is a proper per-node hook store, keyed by position in the component tree (a "fiber key"). That requires a fiber tree data structure, which is Phase 2.

---

## `_scheduleRerender` — the nuclear reconciler

```typescript
function _scheduleRerender(): void {
  if (_rootWidget === null || _renderFn === null) { return }
  widgetClearChildren(_rootWidget)
  _idx = 0
  const rootEl = _renderFn()
  const w = _buildWidget(rootEl)
  if (w !== null) { widgetAddChild(_rootWidget, w) }
}
```

On every state change, the entire native widget tree is destroyed and rebuilt. Perry's `widgetClearChildren` releases the old widget handles. `_buildWidget` walks the new element tree and creates fresh handles. This is O(n) in the component tree size and O(n) in the number of Perry FFI calls.

For typical settings/form UIs this is imperceptible. For large lists it may be visible. Phase 2 introduces keyed reconciliation: only diff and update the changed subtrees.

---

## What was confirmed working

Running `./demo/main`:
- Window opens with correct title, width, height
- `h1`, `h2`, `p` render with correct text and font sizes
- `div` with `style={{ flexDirection: "row" }}` renders as `HStack`
- `button` renders with `onClick` wired
- `input[type=text]` renders as `TextField` with `onChange` → synthetic event
- `useState` triggers `_scheduleRerender` on setter call
- Counter increments/decrements/resets correctly
- Text input updates greeting reactively

---

## Known issues not yet fixed

1. **`number.toString()` in `_childrenText`** — Perry's dynamic method dispatch for primitive number values may not correctly dispatch `.toString()`. Use `String(n)` or `"" + n` in component code for now. The subnormal-float display bug was a symptom of this when the children array was misclassified as a number, but even with that fixed, `(someNumber).toString()` may behave unexpectedly.

2. **Per-instance hook state** — as described above.

3. **`useEffect` deps** — not tracked; effect runs once only.

4. **`key` prop** — parsed by JSX lowering but stripped before props are passed (correct React behavior), but the reconciler doesn't use keys for ordered list diffing because it does full rebuilds.

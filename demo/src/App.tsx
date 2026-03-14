import { useState, useReducer, useEffect, useRef, createContext, useContext } from "react"

// ─── Context ──────────────────────────────────────────────────────────────────

const ThemeContext = createContext("light")

// ─── Custom Hooks ─────────────────────────────────────────────────────────────

function useToggle(initial: boolean): any[] {
  const [value, setValue] = useState(initial)
  const toggle = () => setValue(!value)
  return [value, toggle]
}

function useCounter(initial: number, step: number): any[] {
  const [count, setCount] = useState(initial)
  const inc = () => setCount(count + step)
  const dec = () => setCount(count - step)
  const reset = () => setCount(initial)
  return [count, inc, dec, reset]
}

// ─── Shared Components ────────────────────────────────────────────────────────

function SectionHeader(props: any) {
  return (
    <div>
      <hr />
      <h2>{props.title}</h2>
      <p style={{ color: "#666666" }}>{props.subtitle}</p>
    </div>
  )
}

function Counter(props: any) {
  const [count, setCount] = useState(0)
  return (
    <div>
      <p>{props.label + ": " + count}</p>
      <div style={{ flexDirection: "row" }}>
        <button onClick={() => setCount(count - 1)}>-</button>
        <button onClick={() => setCount(count + 1)}>+</button>
      </div>
    </div>
  )
}

function FragmentPair(props: any) {
  return (
    <>
      <p>{props.a}</p>
      <p>{props.b}</p>
    </>
  )
}

function ThemedBox() {
  const theme = useContext(ThemeContext)
  return <p>{"ThemedBox sees: " + theme}</p>
}

// ─── Callback Drill Components ────────────────────────────────────────────────

function GrandChild(props: any) {
  return (
    <button onClick={() => props.onAction("clicked by GrandChild")}>
      GrandChild Button
    </button>
  )
}

function Child(props: any) {
  return (
    <div>
      <p>Child component</p>
      <GrandChild onAction={props.onAction} />
    </div>
  )
}

// ─── Todo Reducer ─────────────────────────────────────────────────────────────

type Todo = {
  id: number
  text: string
  done: boolean
}

type TodoState = {
  todos: Todo[]
  nextId: number
}

function todoReducer(state: TodoState, action: any): TodoState {
  if (action.type === "add") {
    const newTodos: Todo[] = []
    for (let i = 0; i < state.todos.length; i++) {
      newTodos.push(state.todos[i])
    }
    newTodos.push({ id: state.nextId, text: action.text, done: false })
    return { todos: newTodos, nextId: state.nextId + 1 }
  }
  if (action.type === "toggle") {
    const newTodos: Todo[] = []
    for (let i = 0; i < state.todos.length; i++) {
      const t = state.todos[i]
      if (t.id === action.id) {
        newTodos.push({ id: t.id, text: t.text, done: !t.done })
      } else {
        newTodos.push(t)
      }
    }
    return { todos: newTodos, nextId: state.nextId }
  }
  if (action.type === "remove") {
    const newTodos: Todo[] = []
    for (let i = 0; i < state.todos.length; i++) {
      if (state.todos[i].id !== action.id) {
        newTodos.push(state.todos[i])
      }
    }
    return { todos: newTodos, nextId: state.nextId }
  }
  return state
}

// ─── Section 1: Counter ───────────────────────────────────────────────────────

function CounterSection() {
  const [count, setCount] = useState(0)
  return (
    <div>
      <SectionHeader title="1. Counter" subtitle="useState + buttons" />
      <p>{"Count: " + count}</p>
      <div style={{ flexDirection: "row" }}>
        <button onClick={() => setCount(count - 1)}>-</button>
        <button onClick={() => setCount(count + 1)}>+</button>
        <button onClick={() => setCount(0)}>Reset</button>
      </div>
    </div>
  )
}

// ─── Section 2: Form Inputs ──────────────────────────────────────────────────

function FormSection() {
  const [text, setText] = useState("")
  const [password, setPassword] = useState("")
  const [checked, setChecked] = useState(false)
  const [slider, setSlider] = useState(50)
  const [selection, setSelection] = useState(0)
  const [area, setArea] = useState("")

  return (
    <div>
      <SectionHeader title="2. Form Inputs" subtitle="text, password, checkbox, range, select, textarea" />

      <label>{"Text: " + text}</label>
      <input type="text" placeholder="Type here" onChange={(e: any) => setText(e.target.value)} />

      <label>{"Password length: " + password.length}</label>
      <input type="password" placeholder="Password" onChange={(e: any) => setPassword(e.target.value)} />

      <label>{"Checked: " + (checked ? "yes" : "no")}</label>
      <input type="checkbox" onChange={(e: any) => setChecked(e.target.checked)} />

      <label>{"Slider: " + slider}</label>
      <input type="range" min={0} max={100} value={slider} onChange={(e: any) => setSlider(e.target.value)} />

      <label>{"Selection: " + selection}</label>
      <select onChange={(e: any) => setSelection(e.target.value)} />

      <label>{"Textarea: " + area}</label>
      <textarea placeholder="Multi-line" onChange={(e: any) => setArea(e.target.value)} />
    </div>
  )
}

// ─── Section 3: Computed Values ───────────────────────────────────────────────

function ComputedSection() {
  const [items, setItems] = useState(3)
  const [price, setPrice] = useState(10)

  const total = items * price
  const discounted = total > 50 ? total * 0.9 : total

  return (
    <div>
      <SectionHeader title="3. Computed Values" subtitle="Derived state during render" />
      <p>{"Items: " + items}</p>
      <div style={{ flexDirection: "row" }}>
        <button onClick={() => setItems(items > 0 ? items - 1 : 0)}>- Item</button>
        <button onClick={() => setItems(items + 1)}>+ Item</button>
      </div>
      <p>{"Price per item: " + price}</p>
      <div style={{ flexDirection: "row" }}>
        <button onClick={() => setPrice(price > 1 ? price - 1 : 1)}>- Price</button>
        <button onClick={() => setPrice(price + 1)}>+ Price</button>
      </div>
      <p>{"Total: " + total}</p>
      <p>{total > 50 ? "Discount applied! Final: " + discounted : "No discount (need > 50)"}</p>
    </div>
  )
}

// ─── Section 4: Conditional Rendering ─────────────────────────────────────────

function ConditionalSection() {
  const [showA, setShowA] = useState(true)
  const [mode, setMode] = useState(0)

  const modeLabel = mode === 0 ? "Off" : mode === 1 ? "Loading" : "Ready"

  return (
    <div>
      <SectionHeader title="4. Conditional Rendering" subtitle="Ternary, null, mode cycling" />
      <div style={{ flexDirection: "row" }}>
        <button onClick={() => setShowA(!showA)}>Toggle A/B</button>
        <button onClick={() => setMode((mode + 1) % 3)}>Cycle Mode</button>
      </div>
      {showA ? <p>Section A is visible</p> : <p>Section B is visible</p>}
      <p>{"Mode: " + modeLabel}</p>
      {mode === 2 ? <p>Ready content shown!</p> : null}
    </div>
  )
}

// ─── Section 5: Fragments ─────────────────────────────────────────────────────

function FragmentSection() {
  return (
    <div>
      <SectionHeader title="5. Fragments" subtitle="<>...</> syntax" />
      <FragmentPair a="Fragment item 1" b="Fragment item 2" />
      <FragmentPair a="Another pair A" b="Another pair B" />
    </div>
  )
}

// ─── Section 6: useRef ────────────────────────────────────────────────────────

function RefSection() {
  const renderCount = useRef(0)
  const [dummy, setDummy] = useState(0)

  renderCount.current = renderCount.current + 1

  return (
    <div>
      <SectionHeader title="6. useRef" subtitle="Persistent mutable ref across renders" />
      <p>{"Render count: " + renderCount.current}</p>
      <button onClick={() => setDummy(dummy + 1)}>Force Re-render</button>
    </div>
  )
}

// ─── Section 7: useEffect ─────────────────────────────────────────────────────

function EffectSection() {
  const effectRan = useRef(false)
  const [dummy, setDummy] = useState(0)

  useEffect(() => {
    effectRan.current = true
  }, [])

  return (
    <div>
      <SectionHeader title="7. useEffect" subtitle="Run-once effect (sets ref, no setState)" />
      <p>{"Effect ran: " + (effectRan.current ? "yes" : "no")}</p>
      <button onClick={() => setDummy(dummy + 1)}>Re-render to check</button>
    </div>
  )
}

// ─── Section 8: Custom Hooks ──────────────────────────────────────────────────

function CustomHookSection() {
  const [visible, toggleVisible] = useToggle(true)
  const [count, inc, dec, reset] = useCounter(0, 5)

  return (
    <div>
      <SectionHeader title="8. Custom Hooks" subtitle="useToggle + useCounter(step=5)" />
      <button onClick={toggleVisible as any}>Toggle Visibility</button>
      {visible ? <p>I am visible!</p> : <p>(hidden)</p>}
      <p>{"Stepped counter: " + count}</p>
      <div style={{ flexDirection: "row" }}>
        <button onClick={dec as any}>-5</button>
        <button onClick={inc as any}>+5</button>
        <button onClick={reset as any}>Reset</button>
      </div>
    </div>
  )
}

// ─── Section 9: useReducer Todo ───────────────────────────────────────────────

function TodoSection() {
  const initialState: TodoState = { todos: [], nextId: 1 }
  const [state, dispatch] = useReducer(todoReducer, initialState)
  const [todoInput, setTodoInput] = useState("")

  const addTodo = () => {
    if (todoInput.length > 0) {
      dispatch({ type: "add", text: todoInput })
    }
  }

  return (
    <div>
      <SectionHeader title="9. useReducer Todo" subtitle="Add, toggle done, remove" />
      <div style={{ flexDirection: "row" }}>
        <input type="text" placeholder="New task" onChange={(e: any) => setTodoInput(e.target.value)} />
        <button onClick={addTodo}>Add</button>
      </div>
      <p>{"Tasks: " + state.todos.length}</p>
      <ul>
        {state.todos.map((todo: Todo, _i: number) => (
          <li key={todo.id}>
            <div style={{ flexDirection: "row" }}>
              <p>{(todo.done ? "[x] " : "[ ] ") + todo.text}</p>
              <button onClick={() => dispatch({ type: "toggle", id: todo.id })}>Toggle</button>
              <button onClick={() => dispatch({ type: "remove", id: todo.id })}>Remove</button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}

// ─── Section 10: List Rendering ───────────────────────────────────────────────

function ListRenderingSection() {
  const [items, setItems] = useState(["Apple", "Banana", "Cherry"])
  const [listInput, setListInput] = useState("")

  const addItem = () => {
    if (listInput.length > 0) {
      const newItems: string[] = []
      for (let i = 0; i < items.length; i++) {
        newItems.push(items[i])
      }
      newItems.push(listInput)
      setItems(newItems)
    }
  }

  const removeItem = (index: number) => {
    const newItems: string[] = []
    for (let i = 0; i < items.length; i++) {
      if (i !== index) {
        newItems.push(items[i])
      }
    }
    setItems(newItems)
  }

  return (
    <div>
      <SectionHeader title="10. List Rendering" subtitle=".map() with dynamic add/remove" />
      <div style={{ flexDirection: "row" }}>
        <input type="text" placeholder="New item" onChange={(e: any) => setListInput(e.target.value)} />
        <button onClick={addItem}>Add</button>
      </div>
      <p>{"Items: " + items.length}</p>
      <ul>
        {items.map((item: string, i: number) => (
          <li key={i}>
            <div style={{ flexDirection: "row" }}>
              <p>{item}</p>
              <button onClick={() => removeItem(i)}>X</button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}

// ─── Section 11: Context ──────────────────────────────────────────────────────

function ContextSection() {
  const [dark, setDark] = useState(false)

  // Manually mutate context value (no Provider tree in Phase 1)
  ThemeContext.currentValue = dark ? "dark" : "light"

  return (
    <div>
      <SectionHeader title="11. Context" subtitle="createContext + useContext (manual mutation)" />
      <button onClick={() => setDark(!dark)}>
        {"Toggle Theme (current: " + (dark ? "dark" : "light") + ")"}
      </button>
      <ThemedBox />
    </div>
  )
}

// ─── Section 12: Callback Chain ───────────────────────────────────────────────

function CallbackChainSection() {
  const [message, setMessage] = useState("(no message)")

  return (
    <div>
      <SectionHeader title="12. Callback Chain" subtitle="Parent -> Child -> GrandChild prop drilling" />
      <p>{"Parent received: " + message}</p>
      <Child onAction={(msg: string) => setMessage(msg)} />
    </div>
  )
}

// ─── Section 13: Dual Counter [EXPECTED BREAKAGE] ─────────────────────────────

function DualCounterSection() {
  return (
    <div>
      <SectionHeader title="13. Dual Counter [EXPECTED BREAK]" subtitle="Two Counter instances share global hooks" />
      <Counter label="Counter A" />
      <Counter label="Counter B" />
    </div>
  )
}

// ─── Section 14: Conditional Hook [EXPECTED BREAKAGE] ─────────────────────────

function ConditionalHookSection() {
  const [showInner, setShowInner] = useState(false)

  return (
    <div>
      <SectionHeader title="14. Conditional Hook [EXPECTED BREAK]" subtitle="Toggling stateful child corrupts hook indices" />
      <button onClick={() => setShowInner(!showInner)}>
        {showInner ? "Hide Inner Counter" : "Show Inner Counter"}
      </button>
      {showInner ? <Counter label="Conditional" /> : null}
    </div>
  )
}

// ─── Root App ─────────────────────────────────────────────────────────────────

export function App() {
  return (
    <div>
      <h1>Perry React WorkBench</h1>
      <p>14 sections testing React patterns against perry-react Phase 1</p>
      <CounterSection />
      <FormSection />
      <ComputedSection />
      <ConditionalSection />
      <FragmentSection />
      <RefSection />
      <EffectSection />
      <CustomHookSection />
      <TodoSection />
      <ListRenderingSection />
      <ContextSection />
      <CallbackChainSection />
      <DualCounterSection />
      <ConditionalHookSection />
    </div>
  )
}

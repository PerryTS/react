import { useState } from "react"

export function App() {
  const [count, setCount] = useState(0)
  const [name, setName] = useState("")

  const increment = () => setCount(count + 1)
  const decrement = () => setCount(count - 1)
  const reset = () => setCount(0)

  const greeting = name.length > 0 ? "Hello, " + name + "!" : "Hello, stranger!"

  return (
    <div>
      <h1>Perry React Demo</h1>

      <h2>Counter</h2>
      <p>Count: {count}</p>
      <div style={{ flexDirection: "row" }}>
        <button onClick={decrement}>-</button>
        <button onClick={increment}>+</button>
        <button onClick={reset}>Reset</button>
      </div>

      <h2>Text Input</h2>
      <input
        type="text"
        placeholder="Enter your name"
        onChange={(e) => setName(e.target.value)}
      />
      <p>{greeting}</p>
    </div>
  )
}

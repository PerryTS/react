import { createRoot } from "react-dom/client"
import { App } from "./App"

const root = createRoot(null, {
  title: "Perry React WorkBench",
  width: 800,
  height: 1200,
})

root.render(<App />)

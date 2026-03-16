import { createRoot } from "react-dom/client"
import { App } from "./App"

const root = createRoot(null, {
  title: "Perry Kanban Board",
  width: 1400,
  height: 800,
})

root.render(<App />)

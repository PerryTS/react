import { createRoot } from "react-dom/client"
import { App } from "./App"

const root = createRoot(null, {
  title: "Perry React Demo",
  width: 480,
  height: 600,
})

root.render(<App />)

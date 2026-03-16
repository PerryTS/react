import { useState } from "react"

// ─── Data ────────────────────────────────────────────────────────────────────

type Card = {
  id: number
  title: string
  column: string
  priority: string
  assignee: string
}

const COL_NAMES: string[] = ["Backlog", "To Do", "In Progress", "Review", "Done"]
const PEOPLE: string[] = ["Alice", "Bob", "Carol", "Dave", "Eve"]

function makeCards(): Card[] {
  const titles: string[] = [
    "Implement OAuth2 login",
    "Fix navbar z-index on mobile",
    "Add dark mode toggle",
    "Write API rate limiter",
    "Refactor database schema",
    "Create onboarding tour",
    "Add WebSocket support",
    "Design settings page",
    "Write auth unit tests",
    "Optimize image pipeline",
    "Add CSV export feature",
    "Fix memory leak in worker",
    "Component library docs",
    "Migrate CI/CD pipeline",
    "Add push notifications",
  ]
  const priorities: string[] = ["urgent", "high", "medium", "low"]
  const cards: Card[] = []
  for (let i = 0; i < titles.length; i++) {
    cards.push({
      id: i + 1,
      title: titles[i],
      column: COL_NAMES[i % 5],
      priority: priorities[i % 4],
      assignee: PEOPLE[i % 5],
    })
  }
  return cards
}

const INITIAL_CARDS: Card[] = makeCards()
let _nextId = 50

// ─── Pure Components (no hooks) ─────────────────────────────────────────────

function CardRow(props: any) {
  const card: Card = props.card
  const sel: boolean = props.selected

  // Compute column index from card.column (don't rely on .map() index)
  let colIdx = 0
  for (let i = 0; i < COL_NAMES.length; i++) {
    if (COL_NAMES[i] === card.column) { colIdx = i }
  }

  return (
    <div>
      <p>{card.title}</p>
      <p style={{ color: "#888888", fontSize: 11 }}>
        {card.assignee + " | " + card.priority}
      </p>
      <div style={{ flexDirection: "row" }}>
        {colIdx > 0
          ? <button onClick={() => props.onMove(card.id, COL_NAMES[colIdx - 1])}>Left</button>
          : null}
        {colIdx < 4
          ? <button onClick={() => props.onMove(card.id, COL_NAMES[colIdx + 1])}>Right</button>
          : null}
        <button onClick={() => props.onSelect(card.id)}>
          {sel ? "Close" : "View"}
        </button>
      </div>
      <hr />
    </div>
  )
}

function ColumnPanel(props: any) {
  const col: string = props.column
  const cards: Card[] = props.cards

  return (
    <div>
      <h3>{col + " (" + cards.length + ")"}</h3>
      {cards.map((c: Card) => (
        <CardRow
          key={c.id}
          card={c}
          selected={props.selectedId === c.id}
          onMove={props.onMove}
          onSelect={props.onSelect}
        />
      ))}
      <button onClick={() => props.onAdd(col)}>+ Add Card</button>
    </div>
  )
}

function DetailPanel(props: any) {
  const card: Card = props.card

  // Find column index for move buttons
  let colIdx = 0
  for (let i = 0; i < COL_NAMES.length; i++) {
    if (COL_NAMES[i] === card.column) { colIdx = i }
  }

  return (
    <div>
      <h2>{"Card #" + card.id}</h2>
      <h3>{card.title}</h3>
      <p>{"Column: " + card.column}</p>
      <p>{"Priority: " + card.priority}</p>
      <p>{"Assignee: " + card.assignee}</p>
      <div style={{ flexDirection: "row" }}>
        {colIdx > 0
          ? <button onClick={() => props.onMove(card.id, COL_NAMES[colIdx - 1])}>Move Left</button>
          : null}
        {colIdx < 4
          ? <button onClick={() => props.onMove(card.id, COL_NAMES[colIdx + 1])}>Move Right</button>
          : null}
        <button onClick={() => props.onDelete(card.id)}>Delete</button>
        <button onClick={props.onClose}>Close</button>
      </div>
    </div>
  )
}

// ─── App (all hooks here) ───────────────────────────────────────────────────

export function App() {
  const [cards, setCards] = useState(INITIAL_CARDS)
  const [selectedId, setSelectedId] = useState(0)
  const [addingCol, setAddingCol] = useState("")
  const [newTitle, setNewTitle] = useState("")

  // ── Actions ──

  const moveCard = (id: number, toCol: string) => {
    const next: Card[] = []
    for (let i = 0; i < cards.length; i++) {
      const c = cards[i]
      if (c.id === id) {
        next.push({ id: c.id, title: c.title, column: toCol, priority: c.priority, assignee: c.assignee })
      } else {
        next.push(c)
      }
    }
    setCards(next)
  }

  const addCard = () => {
    if (newTitle.length > 0 && addingCol.length > 0) {
      _nextId = _nextId + 1
      const next: Card[] = []
      for (let i = 0; i < cards.length; i++) {
        next.push(cards[i])
      }
      next.push({
        id: _nextId,
        title: newTitle,
        column: addingCol,
        priority: "medium",
        assignee: PEOPLE[_nextId % 5],
      })
      setCards(next)
      setAddingCol("")
    }
  }

  const deleteCard = (id: number) => {
    const next: Card[] = []
    for (let i = 0; i < cards.length; i++) {
      if (cards[i].id !== id) {
        next.push(cards[i])
      }
    }
    setCards(next)
    setSelectedId(0)
  }

  const toggleSelect = (id: number) => {
    setSelectedId(selectedId === id ? 0 : id)
  }

  // ── Derived data ──

  const getColCards = (col: string): Card[] => {
    const result: Card[] = []
    for (let i = 0; i < cards.length; i++) {
      if (cards[i].column === col) {
        result.push(cards[i])
      }
    }
    return result
  }

  let doneCount = 0
  for (let i = 0; i < cards.length; i++) {
    if (cards[i].column === "Done") { doneCount++ }
  }

  let selectedCard: any = null
  for (let i = 0; i < cards.length; i++) {
    if (cards[i].id === selectedId) { selectedCard = cards[i] }
  }

  // ── Render ──

  return (
    <div>
      <h1>Kanban Board</h1>
      <div style={{ flexDirection: "row" }}>
        <p>{"Total: " + cards.length}</p>
        <p>{"  Done: " + doneCount}</p>
      </div>
      <hr />

      <div style={{ flexDirection: "row" }}>
        {COL_NAMES.map((col: string) => (
          <ColumnPanel
            key={col}
            column={col}
            cards={getColCards(col)}
            selectedId={selectedId}
            onMove={moveCard}
            onSelect={toggleSelect}
            onAdd={setAddingCol}
          />
        ))}
      </div>

      {addingCol.length > 0 ? (
        <div>
          <hr />
          <h3>{"Add card to: " + addingCol}</h3>
          <input type="text" placeholder="Card title" onChange={(e: any) => setNewTitle(e.target.value)} />
          <div style={{ flexDirection: "row" }}>
            <button onClick={addCard}>Add Card</button>
            <button onClick={() => setAddingCol("")}>Cancel</button>
          </div>
        </div>
      ) : null}

      {selectedCard !== null ? (
        <div>
          <hr />
          <DetailPanel
            card={selectedCard}
            onMove={moveCard}
            onDelete={deleteCard}
            onClose={() => setSelectedId(0)}
          />
        </div>
      ) : null}
    </div>
  )
}

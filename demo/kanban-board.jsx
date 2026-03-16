import { useState, useRef, useCallback, useEffect, useMemo } from "react";

// ─── Data ────────────────────────────────────────────────────────────────────

const PRIORITIES = { urgent: "Urgent", high: "High", medium: "Medium", low: "Low" };
const PRIORITY_COLORS = {
  urgent: "#FF3B30",
  high: "#FF9500",
  medium: "#5856D6",
  low: "#34C759",
};

const LABELS = [
  { id: "bug", name: "Bug", color: "#FF453A" },
  { id: "feature", name: "Feature", color: "#30D158" },
  { id: "design", name: "Design", color: "#BF5AF2" },
  { id: "infra", name: "Infra", color: "#FF9F0A" },
  { id: "docs", name: "Docs", color: "#64D2FF" },
  { id: "perf", name: "Performance", color: "#FFD60A" },
];

const AVATARS = [
  { id: "u1", name: "Alice", hue: 210 },
  { id: "u2", name: "Bob", hue: 30 },
  { id: "u3", name: "Carol", hue: 150 },
  { id: "u4", name: "Dave", hue: 330 },
  { id: "u5", name: "Eve", hue: 270 },
];

const INITIAL_COLUMNS = [
  { id: "backlog", title: "Backlog", icon: "📋" },
  { id: "todo", title: "To Do", icon: "📌" },
  { id: "progress", title: "In Progress", icon: "⚡" },
  { id: "review", title: "In Review", icon: "🔍" },
  { id: "done", title: "Done", icon: "✅" },
];

let _id = 100;
const uid = () => `card-${++_id}`;
const now = () => Date.now();

function randomCards() {
  const titles = [
    "Implement OAuth2 login flow",
    "Fix navbar z-index on mobile",
    "Add dark mode toggle",
    "Write API rate limiter",
    "Refactor database schema",
    "Create onboarding tour",
    "Add WebSocket support",
    "Design settings page",
    "Write unit tests for auth",
    "Optimize image pipeline",
    "Add CSV export feature",
    "Fix memory leak in worker",
    "Create component library docs",
    "Migrate to new CI/CD",
    "Add push notifications",
    "Implement search with filters",
    "Add keyboard shortcuts",
    "Fix Safari layout bug",
    "Add activity feed",
    "Create admin dashboard",
  ];
  const cols = INITIAL_COLUMNS.map((c) => c.id);
  return titles.map((title, i) => ({
    id: uid(),
    title,
    description:
      i % 3 === 0
        ? "This task needs careful planning and coordination with the team before implementation begins."
        : i % 3 === 1
          ? "Quick win — should be straightforward to implement."
          : "",
    column: cols[i % cols.length],
    priority: ["urgent", "high", "medium", "low"][i % 4],
    labels: [LABELS[i % LABELS.length].id, ...(i % 5 === 0 ? [LABELS[(i + 2) % LABELS.length].id] : [])],
    assignee: AVATARS[i % AVATARS.length].id,
    createdAt: now() - (titles.length - i) * 3600000,
    subtasks: i % 4 === 0
      ? [
          { id: `st-${i}-1`, text: "Research approach", done: true },
          { id: `st-${i}-2`, text: "Write implementation", done: i > 10 },
          { id: `st-${i}-3`, text: "Add tests", done: false },
        ]
      : i % 4 === 2
        ? [
            { id: `st-${i}-1`, text: "Draft design", done: true },
            { id: `st-${i}-2`, text: "Get feedback", done: false },
          ]
        : [],
    comments: i % 3 === 0
      ? [
          {
            id: `cm-${i}-1`,
            userId: AVATARS[(i + 1) % AVATARS.length].id,
            text: "I can pick this up next sprint.",
            at: now() - 7200000,
          },
        ]
      : [],
  }));
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,500;0,9..40,700;1,9..40,400&family=JetBrains+Mono:wght@400;600&display=swap');

*, *::before, *::after { margin:0; padding:0; box-sizing:border-box; }

:root {
  --bg: #0E0F13;
  --surface: #16171D;
  --surface2: #1E1F27;
  --surface3: #262730;
  --border: #2A2B36;
  --border2: #35364A;
  --text: #E8E9ED;
  --text2: #9B9DB0;
  --text3: #636580;
  --accent: #6C5CE7;
  --accent2: #A78BFA;
  --danger: #FF3B30;
  --radius: 12px;
  --font: 'DM Sans', -apple-system, sans-serif;
  --mono: 'JetBrains Mono', monospace;
}

body { background: var(--bg); color: var(--text); font-family: var(--font); }

.app {
  display: flex; flex-direction: column;
  height: 100vh; overflow: hidden;
}

/* ── Header ── */
.header {
  display: flex; align-items: center; gap: 16px;
  padding: 16px 24px;
  border-bottom: 1px solid var(--border);
  background: var(--surface);
  flex-shrink: 0;
}
.header h1 {
  font-size: 20px; font-weight: 700;
  background: linear-gradient(135deg, var(--accent2), #6C5CE7, #EC4899);
  -webkit-background-clip: text; -webkit-text-fill-color: transparent;
  letter-spacing: -0.5px;
}
.header-actions { display: flex; gap: 8px; margin-left: auto; align-items: center; }

/* ── Filter bar ── */
.filter-bar {
  display: flex; gap: 8px; padding: 12px 24px;
  border-bottom: 1px solid var(--border);
  background: var(--surface);
  flex-shrink: 0;
  flex-wrap: wrap;
  align-items: center;
}
.search-box {
  display: flex; align-items: center; gap: 8px;
  background: var(--surface2); border: 1px solid var(--border);
  border-radius: 8px; padding: 6px 12px;
  min-width: 220px;
}
.search-box input {
  background: none; border: none; color: var(--text);
  font-family: var(--font); font-size: 13px;
  outline: none; width: 100%;
}
.search-box input::placeholder { color: var(--text3); }
.filter-chip {
  display: flex; align-items: center; gap: 4px;
  padding: 5px 10px; border-radius: 6px;
  font-size: 12px; font-weight: 500;
  cursor: pointer; transition: all 0.15s;
  border: 1px solid var(--border);
  background: var(--surface2); color: var(--text2);
  user-select: none;
}
.filter-chip.active {
  background: var(--accent); color: #fff;
  border-color: var(--accent);
}
.filter-chip:hover { border-color: var(--border2); }

/* ── Board ── */
.board {
  display: flex; gap: 16px;
  padding: 20px 24px;
  overflow-x: auto; flex: 1;
  align-items: flex-start;
}
.board::-webkit-scrollbar { height: 6px; }
.board::-webkit-scrollbar-thumb { background: var(--border2); border-radius: 3px; }

/* ── Column ── */
.column {
  min-width: 290px; max-width: 290px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  display: flex; flex-direction: column;
  max-height: calc(100vh - 160px);
  transition: box-shadow 0.2s;
}
.column.drag-over {
  box-shadow: 0 0 0 2px var(--accent), 0 8px 32px rgba(108,92,231,0.15);
}
.col-header {
  display: flex; align-items: center; gap: 8px;
  padding: 14px 14px 10px;
  font-weight: 700; font-size: 13px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--text2);
  flex-shrink: 0;
}
.col-count {
  background: var(--surface3); color: var(--text3);
  font-size: 11px; font-weight: 600;
  padding: 1px 7px; border-radius: 10px;
  font-family: var(--mono);
}
.col-cards {
  padding: 6px 10px 10px;
  overflow-y: auto; flex: 1;
  display: flex; flex-direction: column; gap: 8px;
}
.col-cards::-webkit-scrollbar { width: 4px; }
.col-cards::-webkit-scrollbar-thumb { background: var(--border); border-radius: 2px; }

/* ── Card ── */
.card {
  background: var(--surface2);
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 12px;
  cursor: grab;
  transition: all 0.18s ease;
  position: relative;
}
.card:hover {
  border-color: var(--border2);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0,0,0,0.25);
}
.card.dragging {
  opacity: 0.4;
  transform: scale(0.97);
}
.card-priority {
  width: 4px; height: 100%;
  position: absolute; left: 0; top: 0;
  border-radius: 10px 0 0 10px;
}
.card-title {
  font-size: 13.5px; font-weight: 500;
  line-height: 1.4;
  margin-left: 6px; margin-bottom: 8px;
  color: var(--text);
}
.card-labels {
  display: flex; gap: 4px; flex-wrap: wrap;
  margin-left: 6px; margin-bottom: 8px;
}
.card-label {
  font-size: 10px; font-weight: 600;
  padding: 2px 7px; border-radius: 4px;
  text-transform: uppercase;
  letter-spacing: 0.3px;
}
.card-footer {
  display: flex; align-items: center; gap: 6px;
  margin-left: 6px;
  color: var(--text3); font-size: 11px;
}
.card-footer .avatar-sm {
  width: 22px; height: 22px;
  border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  font-size: 10px; font-weight: 700; color: #fff;
  flex-shrink: 0;
}
.card-footer .meta {
  display: flex; gap: 8px; margin-left: auto;
  align-items: center; font-family: var(--mono); font-size: 10px;
}

/* ── Add card ── */
.add-card-btn {
  display: flex; align-items: center; justify-content: center;
  gap: 6px; padding: 8px;
  margin: 0 10px 10px;
  border: 1px dashed var(--border2);
  border-radius: 8px;
  background: none; color: var(--text3);
  font-size: 12px; font-weight: 500;
  cursor: pointer; transition: all 0.15s;
  font-family: var(--font);
}
.add-card-btn:hover {
  border-color: var(--accent);
  color: var(--accent2);
  background: rgba(108,92,231,0.06);
}

/* ── Modal overlay ── */
.modal-overlay {
  position: fixed; inset: 0;
  background: rgba(0,0,0,0.65);
  backdrop-filter: blur(4px);
  display: flex; align-items: center; justify-content: center;
  z-index: 1000;
  animation: fadeIn 0.15s ease;
}
@keyframes fadeIn { from { opacity:0 } to { opacity:1 } }
@keyframes slideUp { from { opacity:0; transform:translateY(16px) } to { opacity:1; transform:translateY(0) } }

.modal {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 16px;
  width: 560px; max-width: 92vw;
  max-height: 85vh; overflow-y: auto;
  padding: 24px;
  animation: slideUp 0.2s ease;
  box-shadow: 0 24px 64px rgba(0,0,0,0.5);
}
.modal::-webkit-scrollbar { width: 4px; }
.modal::-webkit-scrollbar-thumb { background: var(--border); border-radius: 2px; }
.modal-header {
  display: flex; align-items: flex-start; gap: 12px;
  margin-bottom: 20px;
}
.modal-header h2 {
  font-size: 18px; font-weight: 700;
  flex: 1; line-height: 1.3;
}
.modal-close {
  width: 32px; height: 32px;
  border-radius: 8px; border: 1px solid var(--border);
  background: var(--surface2); color: var(--text2);
  cursor: pointer; font-size: 16px;
  display: flex; align-items: center; justify-content: center;
  transition: all 0.15s;
  flex-shrink: 0;
}
.modal-close:hover { background: var(--danger); color: #fff; border-color: var(--danger); }

/* ── Form elements ── */
.field { margin-bottom: 16px; }
.field label {
  display: block; font-size: 12px; font-weight: 600;
  color: var(--text2); margin-bottom: 6px;
  text-transform: uppercase; letter-spacing: 0.4px;
}
.field input, .field textarea, .field select {
  width: 100%; padding: 10px 12px;
  background: var(--surface2); border: 1px solid var(--border);
  border-radius: 8px; color: var(--text);
  font-family: var(--font); font-size: 14px;
  outline: none; transition: border-color 0.15s;
}
.field input:focus, .field textarea:focus, .field select:focus {
  border-color: var(--accent);
}
.field textarea { resize: vertical; min-height: 60px; }
.field select { cursor: pointer; }
.field select option { background: var(--surface2); }

.label-picker {
  display: flex; gap: 6px; flex-wrap: wrap;
}
.label-toggle {
  padding: 4px 10px; border-radius: 5px;
  font-size: 11px; font-weight: 600;
  cursor: pointer; border: 2px solid transparent;
  transition: all 0.15s; text-transform: uppercase;
}
.label-toggle.on { border-color: #fff3; }

.subtask-list { display: flex; flex-direction: column; gap: 6px; }
.subtask-row {
  display: flex; align-items: center; gap: 8px;
}
.subtask-check {
  width: 18px; height: 18px;
  border: 2px solid var(--border2);
  border-radius: 5px; cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  font-size: 11px; transition: all 0.15s;
  flex-shrink: 0; background: none; color: transparent;
}
.subtask-check.checked {
  background: var(--accent); border-color: var(--accent);
  color: #fff;
}
.subtask-text {
  flex: 1; font-size: 13px; color: var(--text);
}
.subtask-text.checked-text {
  text-decoration: line-through; color: var(--text3);
}
.subtask-del {
  background: none; border: none;
  color: var(--text3); cursor: pointer; font-size: 14px;
  opacity: 0; transition: opacity 0.15s;
}
.subtask-row:hover .subtask-del { opacity: 1; }

.add-subtask {
  display: flex; gap: 6px; margin-top: 6px;
}
.add-subtask input {
  flex: 1; padding: 6px 10px;
  background: var(--surface2); border: 1px solid var(--border);
  border-radius: 6px; color: var(--text);
  font-size: 12px; font-family: var(--font);
  outline: none;
}
.add-subtask input:focus { border-color: var(--accent); }

/* ── Comments ── */
.comments { margin-top: 4px; }
.comment {
  display: flex; gap: 10px;
  padding: 10px 0;
  border-bottom: 1px solid var(--border);
}
.comment:last-child { border-bottom: none; }
.comment .avatar-sm {
  width: 28px; height: 28px;
  border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  font-size: 11px; font-weight: 700; color: #fff;
  flex-shrink: 0; margin-top: 2px;
}
.comment-body { flex: 1; }
.comment-meta { font-size: 11px; color: var(--text3); margin-bottom: 3px; }
.comment-meta strong { color: var(--text2); }
.comment-text { font-size: 13px; color: var(--text); line-height: 1.5; }
.add-comment {
  display: flex; gap: 8px; margin-top: 10px;
}
.add-comment input {
  flex: 1; padding: 8px 12px;
  background: var(--surface2); border: 1px solid var(--border);
  border-radius: 8px; color: var(--text);
  font-size: 13px; font-family: var(--font);
  outline: none;
}
.add-comment input:focus { border-color: var(--accent); }

/* ── Buttons ── */
.btn {
  padding: 8px 16px; border-radius: 8px;
  font-size: 13px; font-weight: 600;
  cursor: pointer; border: none;
  font-family: var(--font);
  transition: all 0.15s;
}
.btn-primary {
  background: var(--accent); color: #fff;
}
.btn-primary:hover { background: #7C6CF0; }
.btn-ghost {
  background: none; color: var(--text2);
  border: 1px solid var(--border);
}
.btn-ghost:hover { border-color: var(--border2); color: var(--text); }
.btn-danger {
  background: none; color: var(--danger);
  border: 1px solid var(--danger);
}
.btn-danger:hover { background: var(--danger); color: #fff; }

.btn-sm { padding: 5px 10px; font-size: 11px; border-radius: 6px; }

.modal-actions {
  display: flex; gap: 8px; justify-content: flex-end;
  margin-top: 20px; padding-top: 16px;
  border-top: 1px solid var(--border);
}

/* ── Stats bar ── */
.stats-bar {
  display: flex; gap: 20px; margin-left: 24px;
  align-items: center;
}
.stat {
  display: flex; flex-direction: column; align-items: center;
}
.stat-num {
  font-family: var(--mono); font-size: 18px; font-weight: 700;
  color: var(--accent2);
}
.stat-lbl { font-size: 10px; color: var(--text3); text-transform: uppercase; letter-spacing: 0.4px; }

/* ── Progress bar ── */
.progress-bar-bg {
  height: 4px; background: var(--surface3);
  border-radius: 2px; overflow: hidden;
  flex: 1; min-width: 40px;
}
.progress-bar-fill {
  height: 100%; border-radius: 2px;
  background: linear-gradient(90deg, var(--accent), #EC4899);
  transition: width 0.4s ease;
}

/* ── Inline add ── */
.inline-add {
  padding: 0 10px 10px;
}
.inline-add input {
  width: 100%; padding: 10px 12px;
  background: var(--surface2); border: 1px solid var(--accent);
  border-radius: 8px; color: var(--text);
  font-size: 13px; font-family: var(--font);
  outline: none;
}
`;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function Avatar({ userId, size = 22 }) {
  const user = AVATARS.find((u) => u.id === userId);
  if (!user) return null;
  return (
    <div
      className="avatar-sm"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.45,
        background: `hsl(${user.hue}, 55%, 45%)`,
      }}
      title={user.name}
    >
      {user.name[0]}
    </div>
  );
}

function timeAgo(ts) {
  const d = (now() - ts) / 1000;
  if (d < 60) return "just now";
  if (d < 3600) return `${Math.floor(d / 60)}m ago`;
  if (d < 86400) return `${Math.floor(d / 3600)}h ago`;
  return `${Math.floor(d / 86400)}d ago`;
}

// ─── Card Component ──────────────────────────────────────────────────────────

function CardItem({ card, onOpen, onDragStart, onDragEnd, draggingId }) {
  const doneCount = card.subtasks.filter((s) => s.done).length;
  return (
    <div
      className={`card${draggingId === card.id ? " dragging" : ""}`}
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData("text/plain", card.id);
        onDragStart(card.id);
      }}
      onDragEnd={onDragEnd}
      onClick={() => onOpen(card.id)}
    >
      <div className="card-priority" style={{ background: PRIORITY_COLORS[card.priority] }} />
      <div className="card-title">{card.title}</div>
      {card.labels.length > 0 && (
        <div className="card-labels">
          {card.labels.map((lid) => {
            const l = LABELS.find((x) => x.id === lid);
            return l ? (
              <span key={lid} className="card-label" style={{ background: l.color + "22", color: l.color }}>
                {l.name}
              </span>
            ) : null;
          })}
        </div>
      )}
      <div className="card-footer">
        {card.assignee && <Avatar userId={card.assignee} />}
        <div className="meta">
          {card.subtasks.length > 0 && <span>☑ {doneCount}/{card.subtasks.length}</span>}
          {card.comments.length > 0 && <span>💬 {card.comments.length}</span>}
        </div>
      </div>
    </div>
  );
}

// ─── Column Component ────────────────────────────────────────────────────────

function Column({ col, cards, onOpen, onDragStart, onDragEnd, onDrop, draggingId, onAddCard }) {
  const [over, setOver] = useState(false);
  const [adding, setAdding] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    if (adding && inputRef.current) inputRef.current.focus();
  }, [adding]);

  return (
    <div
      className={`column${over ? " drag-over" : ""}`}
      onDragOver={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        const cardId = e.dataTransfer.getData("text/plain");
        onDrop(cardId, col.id);
      }}
    >
      <div className="col-header">
        <span>{col.icon}</span>
        <span>{col.title}</span>
        <span className="col-count">{cards.length}</span>
      </div>
      <div className="col-cards">
        {cards.map((c) => (
          <CardItem key={c.id} card={c} onOpen={onOpen} onDragStart={onDragStart} onDragEnd={onDragEnd} draggingId={draggingId} />
        ))}
      </div>
      {adding ? (
        <div className="inline-add">
          <input
            ref={inputRef}
            placeholder="Card title… (Enter to add, Esc to cancel)"
            onKeyDown={(e) => {
              if (e.key === "Enter" && e.target.value.trim()) {
                onAddCard(col.id, e.target.value.trim());
                e.target.value = "";
                setAdding(false);
              }
              if (e.key === "Escape") setAdding(false);
            }}
            onBlur={() => setAdding(false)}
          />
        </div>
      ) : (
        <button className="add-card-btn" onClick={() => setAdding(true)}>
          + Add card
        </button>
      )}
    </div>
  );
}

// ─── Card Detail Modal ───────────────────────────────────────────────────────

function CardModal({ card, onClose, onUpdate, onDelete }) {
  const [title, setTitle] = useState(card.title);
  const [desc, setDesc] = useState(card.description);
  const [priority, setPriority] = useState(card.priority);
  const [labels, setLabels] = useState([...card.labels]);
  const [assignee, setAssignee] = useState(card.assignee);
  const [column, setColumn] = useState(card.column);
  const [subtasks, setSubtasks] = useState(card.subtasks.map((s) => ({ ...s })));
  const [comments, setComments] = useState([...card.comments]);
  const [newSubtask, setNewSubtask] = useState("");
  const [newComment, setNewComment] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);

  const toggleLabel = (lid) =>
    setLabels((prev) => (prev.includes(lid) ? prev.filter((x) => x !== lid) : [...prev, lid]));

  const save = () => {
    onUpdate({
      ...card,
      title,
      description: desc,
      priority,
      labels,
      assignee,
      column,
      subtasks,
      comments,
    });
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{card.title}</h2>
          <button className="modal-close" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="field">
          <label>Title</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>

        <div className="field">
          <label>Description</label>
          <textarea value={desc} onChange={(e) => setDesc(e.target.value)} rows={3} />
        </div>

        <div style={{ display: "flex", gap: 12 }}>
          <div className="field" style={{ flex: 1 }}>
            <label>Priority</label>
            <select value={priority} onChange={(e) => setPriority(e.target.value)}>
              {Object.entries(PRIORITIES).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </div>
          <div className="field" style={{ flex: 1 }}>
            <label>Assignee</label>
            <select value={assignee} onChange={(e) => setAssignee(e.target.value)}>
              <option value="">Unassigned</option>
              {AVATARS.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
          </div>
          <div className="field" style={{ flex: 1 }}>
            <label>Column</label>
            <select value={column} onChange={(e) => setColumn(e.target.value)}>
              {INITIAL_COLUMNS.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="field">
          <label>Labels</label>
          <div className="label-picker">
            {LABELS.map((l) => (
              <span
                key={l.id}
                className={`label-toggle${labels.includes(l.id) ? " on" : ""}`}
                style={{
                  background: labels.includes(l.id) ? l.color + "33" : l.color + "11",
                  color: l.color,
                }}
                onClick={() => toggleLabel(l.id)}
              >
                {l.name}
              </span>
            ))}
          </div>
        </div>

        <div className="field">
          <label>Subtasks ({subtasks.filter((s) => s.done).length}/{subtasks.length})</label>
          {subtasks.length > 0 && (
            <div style={{ marginBottom: 6 }}>
              <div className="progress-bar-bg">
                <div
                  className="progress-bar-fill"
                  style={{
                    width: subtasks.length ? `${(subtasks.filter((s) => s.done).length / subtasks.length) * 100}%` : "0%",
                  }}
                />
              </div>
            </div>
          )}
          <div className="subtask-list">
            {subtasks.map((st, i) => (
              <div key={st.id} className="subtask-row">
                <button
                  className={`subtask-check${st.done ? " checked" : ""}`}
                  onClick={() => {
                    const next = [...subtasks];
                    next[i] = { ...next[i], done: !next[i].done };
                    setSubtasks(next);
                  }}
                >
                  {st.done ? "✓" : ""}
                </button>
                <span className={`subtask-text${st.done ? " checked-text" : ""}`}>{st.text}</span>
                <button
                  className="subtask-del"
                  onClick={() => setSubtasks(subtasks.filter((_, j) => j !== i))}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
          <div className="add-subtask">
            <input
              value={newSubtask}
              onChange={(e) => setNewSubtask(e.target.value)}
              placeholder="Add a subtask…"
              onKeyDown={(e) => {
                if (e.key === "Enter" && newSubtask.trim()) {
                  setSubtasks([...subtasks, { id: `st-${uid()}`, text: newSubtask.trim(), done: false }]);
                  setNewSubtask("");
                }
              }}
            />
            <button
              className="btn btn-sm btn-primary"
              onClick={() => {
                if (newSubtask.trim()) {
                  setSubtasks([...subtasks, { id: `st-${uid()}`, text: newSubtask.trim(), done: false }]);
                  setNewSubtask("");
                }
              }}
            >
              Add
            </button>
          </div>
        </div>

        <div className="field">
          <label>Comments ({comments.length})</label>
          <div className="comments">
            {comments.map((cm) => (
              <div key={cm.id} className="comment">
                <Avatar userId={cm.userId} size={28} />
                <div className="comment-body">
                  <div className="comment-meta">
                    <strong>{AVATARS.find((u) => u.id === cm.userId)?.name}</strong> · {timeAgo(cm.at)}
                  </div>
                  <div className="comment-text">{cm.text}</div>
                </div>
              </div>
            ))}
          </div>
          <div className="add-comment">
            <input
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Write a comment…"
              onKeyDown={(e) => {
                if (e.key === "Enter" && newComment.trim()) {
                  setComments([
                    ...comments,
                    { id: `cm-${uid()}`, userId: "u1", text: newComment.trim(), at: now() },
                  ]);
                  setNewComment("");
                }
              }}
            />
            <button
              className="btn btn-sm btn-primary"
              onClick={() => {
                if (newComment.trim()) {
                  setComments([
                    ...comments,
                    { id: `cm-${uid()}`, userId: "u1", text: newComment.trim(), at: now() },
                  ]);
                  setNewComment("");
                }
              }}
            >
              Post
            </button>
          </div>
        </div>

        <div className="modal-actions">
          {!confirmDelete ? (
            <button className="btn btn-danger" onClick={() => setConfirmDelete(true)}>
              Delete Card
            </button>
          ) : (
            <>
              <span style={{ fontSize: 12, color: "var(--danger)", alignSelf: "center" }}>Are you sure?</span>
              <button className="btn btn-danger btn-sm" onClick={() => { onDelete(card.id); onClose(); }}>
                Yes, delete
              </button>
              <button className="btn btn-ghost btn-sm" onClick={() => setConfirmDelete(false)}>
                Cancel
              </button>
            </>
          )}
          <div style={{ flex: 1 }} />
          <button className="btn btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button className="btn btn-primary" onClick={save}>
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── App ─────────────────────────────────────────────────────────────────────

export default function App() {
  const [cards, setCards] = useState(() => randomCards());
  const [draggingId, setDraggingId] = useState(null);
  const [openCardId, setOpenCardId] = useState(null);
  const [search, setSearch] = useState("");
  const [filterPriority, setFilterPriority] = useState(null);
  const [filterLabel, setFilterLabel] = useState(null);
  const [filterAssignee, setFilterAssignee] = useState(null);

  // Keyboard shortcut: Escape closes modal
  useEffect(() => {
    const handler = (e) => {
      if (e.key === "Escape") setOpenCardId(null);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const filtered = useMemo(() => {
    return cards.filter((c) => {
      if (search && !c.title.toLowerCase().includes(search.toLowerCase())) return false;
      if (filterPriority && c.priority !== filterPriority) return false;
      if (filterLabel && !c.labels.includes(filterLabel)) return false;
      if (filterAssignee && c.assignee !== filterAssignee) return false;
      return true;
    });
  }, [cards, search, filterPriority, filterLabel, filterAssignee]);

  const handleDrop = useCallback((cardId, colId) => {
    setCards((prev) => prev.map((c) => (c.id === cardId ? { ...c, column: colId } : c)));
    setDraggingId(null);
  }, []);

  const handleUpdate = useCallback((updated) => {
    setCards((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
  }, []);

  const handleDelete = useCallback((id) => {
    setCards((prev) => prev.filter((c) => c.id !== id));
  }, []);

  const handleAddCard = useCallback((colId, title) => {
    setCards((prev) => [
      ...prev,
      {
        id: uid(),
        title,
        description: "",
        column: colId,
        priority: "medium",
        labels: [],
        assignee: "",
        createdAt: now(),
        subtasks: [],
        comments: [],
      },
    ]);
  }, []);

  const openCard = openCardId ? cards.find((c) => c.id === openCardId) : null;

  const doneCount = cards.filter((c) => c.column === "done").length;
  const totalSubtasks = cards.reduce((a, c) => a + c.subtasks.length, 0);
  const doneSubtasks = cards.reduce((a, c) => a + c.subtasks.filter((s) => s.done).length, 0);

  return (
    <>
      <style>{CSS}</style>
      <div className="app">
        {/* ── Header ── */}
        <div className="header">
          <h1>⚡ Kanban Board</h1>
          <div className="stats-bar">
            <div className="stat">
              <span className="stat-num">{cards.length}</span>
              <span className="stat-lbl">Cards</span>
            </div>
            <div className="stat">
              <span className="stat-num">{doneCount}</span>
              <span className="stat-lbl">Done</span>
            </div>
            <div className="stat">
              <span className="stat-num">
                {totalSubtasks > 0 ? Math.round((doneSubtasks / totalSubtasks) * 100) : 0}%
              </span>
              <span className="stat-lbl">Subtasks</span>
            </div>
            <div style={{ width: 80 }}>
              <div className="progress-bar-bg">
                <div
                  className="progress-bar-fill"
                  style={{
                    width: cards.length ? `${(doneCount / cards.length) * 100}%` : "0%",
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* ── Filter bar ── */}
        <div className="filter-bar">
          <div className="search-box">
            <span style={{ color: "var(--text3)" }}>🔍</span>
            <input placeholder="Search cards…" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          {Object.entries(PRIORITIES).map(([k, v]) => (
            <span
              key={k}
              className={`filter-chip${filterPriority === k ? " active" : ""}`}
              style={
                filterPriority === k
                  ? { background: PRIORITY_COLORS[k], borderColor: PRIORITY_COLORS[k] }
                  : {}
              }
              onClick={() => setFilterPriority(filterPriority === k ? null : k)}
            >
              {v}
            </span>
          ))}
          <span style={{ width: 1, height: 20, background: "var(--border)" }} />
          {LABELS.map((l) => (
            <span
              key={l.id}
              className={`filter-chip${filterLabel === l.id ? " active" : ""}`}
              style={
                filterLabel === l.id
                  ? { background: l.color, borderColor: l.color, color: "#fff" }
                  : { color: l.color }
              }
              onClick={() => setFilterLabel(filterLabel === l.id ? null : l.id)}
            >
              {l.name}
            </span>
          ))}
          <span style={{ width: 1, height: 20, background: "var(--border)" }} />
          {AVATARS.map((u) => (
            <span
              key={u.id}
              className={`filter-chip${filterAssignee === u.id ? " active" : ""}`}
              onClick={() => setFilterAssignee(filterAssignee === u.id ? null : u.id)}
            >
              {u.name}
            </span>
          ))}
        </div>

        {/* ── Board ── */}
        <div className="board">
          {INITIAL_COLUMNS.map((col) => {
            const colCards = filtered.filter((c) => c.column === col.id);
            return (
              <Column
                key={col.id}
                col={col}
                cards={colCards}
                onOpen={setOpenCardId}
                onDragStart={setDraggingId}
                onDragEnd={() => setDraggingId(null)}
                onDrop={handleDrop}
                draggingId={draggingId}
                onAddCard={handleAddCard}
              />
            );
          })}
        </div>

        {/* ── Modal ── */}
        {openCard && (
          <CardModal
            card={openCard}
            onClose={() => setOpenCardId(null)}
            onUpdate={handleUpdate}
            onDelete={handleDelete}
          />
        )}
      </div>
    </>
  );
}

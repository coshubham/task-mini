"use client";
import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

function useQueryState() {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();

  const status = sp.get("status") || "all"; // all | active | completed
  const q = sp.get("q") || "";

  const set = (next) => {
    const p = new URLSearchParams(sp.toString());
    Object.entries(next).forEach(([k, v]) => {
      if (v === "" || v === null) p.delete(k);
      else p.set(k, v);
    });
    router.replace(`${pathname}?${p.toString()}`);
  };

  return { status, q, set };
}

export default function Page() {
  const { status, q, set } = useQueryState();
  const [tasks, setTasks] = useState([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [toast, setToast] = useState(null); // {type: 'success'|'error', msg: string}
  const [busy, setBusy] = useState(false);

  async function refresh() {
    const params = new URLSearchParams();
    params.set("status", status);
    if (q) params.set("q", q);
    const res = await fetch(`/api/tasks?${params.toString()}`, { cache: "no-store" });
    const data = await res.json();
    setTasks(Array.isArray(data) ? data : []);
  }

  useEffect(() => {
    refresh();
  }, [status, q]);

  async function onCreate(e) {
    e.preventDefault();
    setBusy(true);
    try {
      // optimistic: show immediately
      const optimisticId = `tmp-${Date.now()}`;
      const optimistic = {
        id: optimisticId,
        title: title.trim(),
        description: description.trim(),
        done: false,
        createdAt: Date.now(),
        _optimistic: true,
      };
      if (!optimistic.title) throw new Error("Title is required.");
      setTasks(prev => [optimistic, ...prev]);

      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({ title, description }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to create task.");

      setTasks(prev => [data, ...prev.filter(t => t.id !== optimisticId)]);
      setTitle("");
      setDescription("");
      setToast({ type: "success", msg: "Task added." });
    } catch (err) {
      setToast({ type: "error", msg: err.message });
      await refresh(); // rollback optimistic
    } finally {
      setBusy(false);
    }
  }

  async function toggleDone(task) {
    const prev = tasks;
    const patched = { ...task, done: !task.done };
    setTasks(ts => ts.map(t => (t.id === task.id ? patched : t)));
    const res = await fetch(`/api/tasks/${task.id}`, {
      method: "PATCH",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify({ done: patched.done }),
    });
    if (!res.ok) {
      setTasks(prev); // rollback
      const data = await res.json();
      setToast({ type: "error", msg: data?.error || "Failed to update task." });
    } else {
      setToast({ type: "success", msg: "Task updated." });
    }
  }

  async function remove(task) {
    const prev = tasks;
    setTasks(ts => ts.filter(t => t.id !== task.id));
    const res = await fetch(`/api/tasks/${task.id}`, { method: "DELETE" });
    if (!res.ok) {
      setTasks(prev); // rollback
      const data = await res.json();
      setToast({ type: "error", msg: data?.error || "Failed to delete task." });
    } else {
      setToast({ type: "success", msg: "Task deleted." });
    }
  }

  const empty = tasks.length === 0;

  return (
    <main style={{ maxWidth: 720, margin: "2rem auto", padding: "0 1rem", fontFamily: "system-ui, sans-serif" }}>
      <h1 style={{ fontSize: "1.75rem", marginBottom: "0.75rem" }}>Mini Task Tracker</h1>

      {/* Create form */}
      <form onSubmit={onCreate} aria-labelledby="create-heading" style={{ marginBottom: "1rem", border: "1px solid #ddd", padding: "1rem", borderRadius: 8 }}>
        <h2 id="create-heading" style={{ fontSize: "1.125rem", marginBottom: 8 }}>Create Task</h2>
        <label style={{ display: "block", marginBottom: 8 }}>
          <span>Title<span aria-hidden> *</span></span>
          <input
            value={title}
            onChange={e => setTitle(e.target.value)}
            required
            maxLength={120}
            aria-required="true"
            placeholder="e.g. Write unit test for toggle"
            style={{ width: "100%", padding: 8, marginTop: 4 }}
          />
        </label>
        <label style={{ display: "block", marginBottom: 8 }}>
          <span>Description (optional)</span>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Short details…"
            rows={3}
            style={{ width: "100%", padding: 8, marginTop: 4 }}
          />
        </label>
        <button disabled={busy} type="submit" style={{ padding: "8px 12px", borderRadius: 6 }}>
          {busy ? "Adding…" : "Add Task"}
        </button>
      </form>

      {/* Filters + search (persist via URL) */}
      <section aria-label="Filters and search" style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 12, flexWrap: "wrap" }}>
        <fieldset>
          <legend className="sr-only">Status filter</legend>
          {["all", "active", "completed"].map(s => (
            <label key={s} style={{ marginRight: 8 }}>
              <input
                type="radio"
                name="status"
                value={s}
                checked={status === s}
                onChange={() => set({ status: s })}
              />{" "}
              {s[0].toUpperCase() + s.slice(1)}
            </label>
          ))}
        </fieldset>
        <input
          type="search"
          placeholder="Search title or description…"
          value={q}
          onChange={e => set({ q: e.target.value })}
          aria-label="Search tasks"
          style={{ flex: 1, minWidth: 180, padding: 8 }}
        />
        <button type="button" onClick={() => set({ q: "", status: "all" })} style={{ padding: "8px 12px", borderRadius: 6 }}>
          Reset
        </button>
      </section>

      {/* Feedback toast */}
      {toast && (
        <div role="status" aria-live="polite" style={{
          marginBottom: 12,
          padding: "8px 12px",
          borderRadius: 6,
          border: "1px solid",
          borderColor: toast.type === "error" ? "#f99" : "#9f9",
          background: toast.type === "error" ? "#fee" : "#efe"
        }}>
          {toast.msg}
        </div>
      )}

      {/* Task list */}
      <section aria-labelledby="list-heading">
        <h2 id="list-heading" className="sr-only">Tasks</h2>
        {empty ? (
          <p style={{ color: "#666" }}>No tasks yet. Add your first one above.</p>
        ) : (
          <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
            {tasks.map(task => (
              <li key={task.id} style={{ border: "1px solid #eee", borderRadius: 8, padding: 12, marginBottom: 8 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <input
                    id={`done-${task.id}`}
                    type="checkbox"
                    checked={task.done}
                    onChange={() => toggleDone(task)}
                    aria-label={task.done ? "Mark as undone" : "Mark as done"}
                  />
                  <div style={{ flex: 1 }}>
                    <label htmlFor={`done-${task.id}`} style={{ fontWeight: 600, textDecoration: task.done ? "line-through" : "none" }}>
                      {task.title}
                    </label>
                    {task.description && (
                      <div style={{ color: "#555", marginTop: 2 }}>{task.description}</div>
                    )}
                    <div style={{ color: "#888", fontSize: 12, marginTop: 4 }}>
                      Created {new Date(task.createdAt).toLocaleString()}
                    </div>
                  </div>
                  <button onClick={() => remove(task)} aria-label={`Delete ${task.title}`} style={{ padding: "6px 10px", borderRadius: 6 }}>
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}

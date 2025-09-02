// lib/store.js
export const tasks = []; // resets on dev server restart
let nextId = 1;

export function listTasks() {
  // return newest first
  return [...tasks].sort((a, b) => b.createdAt - a.createdAt);
}

export function createTask({ title, description = "" }) {
  if (!title || title.trim().length === 0) {
    const err = new Error("Title is required.");
    err.status = 400;
    throw err;
  }
  if (title.length > 120) {
    const err = new Error("Title must be 120 characters or fewer.");
    err.status = 400;
    throw err;
  }
  const task = {
    id: String(nextId++),
    title: title.trim(),
    description: description.trim(),
    done: false,
    createdAt: Date.now(),
  };
  tasks.push(task);
  return task;
}

export function updateTask(id, patch) {
  const idx = tasks.findIndex(t => t.id === id);
  if (idx === -1) {
    const err = new Error("Task not found.");
    err.status = 404;
    throw err;
  }
  tasks[idx] = { ...tasks[idx], ...patch };
  return tasks[idx];
}

export function deleteTask(id) {
  const idx = tasks.findIndex(t => t.id === id);
  if (idx === -1) {
    const err = new Error("Task not found.");
    err.status = 404;
    throw err;
  }
  const [removed] = tasks.splice(idx, 1);
  return removed;
}

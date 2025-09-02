// app/api/tasks/[id]/route.js
import { updateTask, deleteTask } from "../../../lib/store";

export async function PATCH(_req, { params }) {
  try {
    const body = await _req.json();
    const updated = updateTask(params.id, body);
    return Response.json(updated, { status: 200 });
  } catch (e) {
    return Response.json({ error: e.message }, { status: e.status || 500 });
  }
}

export async function DELETE(_req, { params }) {
  try {
    const removed = deleteTask(params.id);
    return Response.json(removed, { status: 200 });
  } catch (e) {
    return Response.json({ error: e.message }, { status: e.status || 500 });
  }
}

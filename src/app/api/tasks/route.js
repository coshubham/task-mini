// app/api/tasks/route.js
import { listTasks, createTask } from "../../lib/store";

export async function GET(request) {
  // optional query filtering/search on server (keeps client thinner)
  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") || "").toLowerCase();
  const status = searchParams.get("status"); // "all" | "active" | "completed"

  let data = listTasks();
  if (status && status !== "all") {
    data = data.filter(t => (status === "completed" ? t.done : !t.done));
  }
  if (q) {
    data = data.filter(
      t =>
        t.title.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q)
    );
  }

  return Response.json(data, { status: 200 });
}

export async function POST(request) {
  try {
    const body = await request.json();
    const created = createTask({
      title: body.title,
      description: body.description || "",
    });
    return Response.json(created, { status: 201 });
  } catch (e) {
    return Response.json({ error: e.message }, { status: e.status || 500 });
  }
}

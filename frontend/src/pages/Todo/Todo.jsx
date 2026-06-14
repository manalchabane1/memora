import {useEffect, useMemo, useState} from "react";
import { getTodos, createTodo, updateTodo, deleteTodoApi } from "../../services/api";
import {
  Plus,
  Search,
  CheckCircle2,
  Circle,
  Trash2,
  Pencil,
  X,
} from "lucide-react";

import todo from "/src/assets/todo.png";
import { MemiGuide } from "../../components/AnimatedMemi";

const PRIORITIES = {
  high: { label: "Haute", color: "#EF4444", bg: "bg-red-50", text: "text-red-600" },
  medium: { label: "Moyenne", color: "#F59E0B", bg: "bg-amber-50", text: "text-amber-600" },
  low: { label: "Basse", color: "#10B981", bg: "bg-emerald-50", text: "text-emerald-600" },
};

const FILTERS = [
  { id: "all", label: "Toutes" },
  { id: "active", label: "À faire" },
  { id: "done", label: "Terminées" },
];

function Todo() {
  const [todos, setTodos] = useState([]);
  const [filter, setFilter] = useState("all");
  const [query, setQuery] = useState("");

  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("");
  const [priority, setPriority] = useState("medium");
  const [due, setDue] = useState("");

  const [editingTodo, setEditingTodo] = useState(null);

  useEffect(() => {
    async function loadTodos() {
      try {
        const data = await getTodos();
        const formatted = data.map((t) => ({ 
          id: t.id,
          title: t.title,
          subject: t.subject || "Général",
          priority: t.priority,
          due: t.due_date || "",
          done: t.status === "done",
          color:"#8B6CF6",
        }));
        setTodos(formatted);
      }
      catch (error) {
        console.error("Erreur chargement todos:", error);
      }
    }

    loadTodos();
  }, []);

  const subjects = useMemo(() => {
    const unique = [...new Set(todos.map((t) => t.subject).filter(Boolean))];
    return unique.length > 0 ? unique : ["Général"];
  }, [todos]);

  const visible = useMemo(() => {
    return todos.filter((todo) => {
      if (filter === "active" && todo.done) return false;
      if (filter === "done" && !todo.done) return false;
      if (query && !todo.title.toLowerCase().includes(query.toLowerCase())) return false;
      return true;
    });
  }, [todos, filter, query]);

  const stats = useMemo(() => {
    const done = todos.filter((todo) => todo.done).length;
    const total = todos.length;
    return {
      done,
      total,
      pct: Math.round((done / Math.max(1, total)) * 100),
    };
  }, [todos]);


  const addTodo = async (e) => {
  e.preventDefault();

  if (!title.trim()) return;

  try {
    const savedTodo = await createTodo({
      title: title.trim(),
      description: "",
      subject: subject.trim() || "Général",
      status: "todo",
      due_date: due || null,
      priority,
      revision_session: null,
    });

    const newTodo = {
      id: savedTodo.id,
      title: savedTodo.title,
      subject: subject.trim() || "Général",
      priority: savedTodo.priority,
      due: savedTodo.due_date || "",
      done: savedTodo.status === "done",
      color: "#8B6CF6",
    };

    setTodos((prev) => [newTodo, ...prev]);
    setTitle("");
    setSubject("");
    setPriority("medium");
    setDue("");
  } catch (error) {
    console.error(error);
    alert("Erreur pendant l’ajout de la tâche.");
  }
};

  const toggleTodo = async (id) => {
  const todo = todos.find((t) => t.id === id);
  if (!todo) return;

  try {
    const newStatus = todo.done ? "todo" : "done";

    await updateTodo(id, {
      status: newStatus,
    });

    setTodos((prev) =>
      prev.map((t) =>
        t.id === id ? { ...t, done: !t.done } : t
      )
    );
  } catch (error) {
    console.error(error);
    alert("Erreur pendant la modification.");
  }
};

  const deleteTodo = async (id) => {
  try {
    await deleteTodoApi(id);
    setTodos((prev) => prev.filter((todo) => todo.id !== id));
    setEditingTodo(null);
  } catch (error) {
    console.error(error);
    alert("Erreur pendant la suppression.");
  }
};

  const saveEdit = async (updatedTodo) => {
    try {
        const updated = await updateTodo(updatedTodo.id, {
            title: updatedTodo.title,
            subject: updatedTodo.subject,
            priority: updatedTodo.priority,
            due_date: updatedTodo.due,
            status: updatedTodo.done ? "done" : "todo",
        });

        setTodos((prev) =>
            prev.map((todo) =>
                todo.id === updatedTodo.id
                    ? {
                          ...todo,
                          title: updated.title,
                          subject: updated.subject,
                          priority: updated.priority,
                          due: updated.due_date,
                          done: updated.status === "done",
                      }
                    : todo
            )
        );

        setEditingTodo(null);

    } catch (error) {
        console.error(error);
        alert("Erreur modification tâche.");
    }
};

  return (
    <div className="p-8 max-w-[1200px] mx-auto text-[#1E293B]">
      <header className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-5 mb-8">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-wider text-[#8B6CF6]">
            Mission du jour
          </p>

          <h1 className="text-5xl font-extrabold tracking-tight mt-1">
            To-Do List
          </h1>

          <p className="text-slate-500 mt-2">
            Organise tes tâches et suis ton avancée.
          </p>
        </div>

        <div className="flex items-center gap-4 bg-white border border-slate-100 rounded-3xl p-4 shadow-sm">
          <img
            src={todo}
            alt="Memi"
            className="w-16 h-16 rounded-2xl object-cover border border-[#8B6CF6]/20"
          />

          <div>
            <p className="text-sm text-slate-400 font-bold">Aujourd’hui</p>
            <h2 className="text-2xl font-extrabold">
              {stats.done}/{stats.total} terminées · {stats.pct}%
            </h2>

            <div className="mt-2 h-2 w-44 rounded-full bg-slate-100 overflow-hidden">
              <div
                className="h-full rounded-full bg-[#8B6CF6]"
                style={{ width: `${stats.pct}%` }}
              />
            </div>
          </div>
        </div>
      </header>

      <form
        onSubmit={addTodo}
        className="bg-white rounded-3xl border border-slate-100 p-4 shadow-sm mb-8"
      >
        <div className="grid lg:grid-cols-[1fr_180px_160px_150px_auto] gap-3">
          <div className="flex items-center gap-3 bg-slate-50 rounded-2xl px-4">
            <Plus size={18} className="text-[#8B6CF6]" />
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex. Finir DM, réviser chapitre..."
              className="w-full h-12 bg-transparent outline-none font-medium placeholder:text-slate-400"
            />
          </div>

          <input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Matière"
            className="h-12 rounded-2xl border border-slate-200 px-4 outline-none focus:ring-2 focus:ring-[#8B6CF6]/40"
          />

          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
            className="h-12 rounded-2xl border border-slate-200 px-4 outline-none"
          >
            <option value="high">Haute</option>
            <option value="medium">Moyenne</option>
            <option value="low">Basse</option>
          </select>

          <input
  type="date"
  value={due}
  onChange={(e) => setDue(e.target.value)}
  className="h-12 rounded-2xl border border-slate-200 px-4 outline-none focus:ring-2 focus:ring-[#8B6CF6]/40"
/>

          <button
            type="submit"
            className="h-12 px-6 rounded-2xl bg-[#1E293B] text-white font-bold hover:bg-[#0f172a]"
          >
            Ajouter
          </button>
        </div>
      </form>

      <div className="flex items-center justify-between gap-4 flex-wrap mb-6">
        <div className="flex items-center gap-2 bg-white border border-slate-100 rounded-2xl p-1">
          {FILTERS.map((item) => (
            <button
              key={item.id}
              onClick={() => setFilter(item.id)}
              className={`px-5 py-2 rounded-xl font-bold transition ${
                filter === item.id
                  ? "bg-[#8B6CF6] text-white"
                  : "text-slate-500 hover:text-[#1E293B]"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="relative">
          <Search
            className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
            size={20}
          />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher..."
            className="w-[300px] h-12 rounded-2xl border border-slate-200 bg-white pl-12 pr-4 outline-none focus:ring-2 focus:ring-[#8B6CF6]/40"
          />
        </div>
      </div>

      <div className="space-y-4">
        {visible.length === 0 ? (
          <EmptyState />
        ) : (
          visible.map((todo) => (
            <TodoItem
              key={todo.id}
              todo={todo}
              onToggle={() => toggleTodo(todo.id)}
              onDelete={() => deleteTodo(todo.id)}
              onEdit={() => setEditingTodo(todo)}
            />
          ))
        )}
      </div>

      {stats.total > 0 && stats.done === stats.total && (
        <MemiGuide
          mood="celebrating"
          eyebrow="Mission accomplie"
          title="Toutes les tâches sont terminées !"
          message="Bravo, profite de cette petite victoire. Memi est fier de toi."
          className="mt-6"
          compact
        />
      )}

      {editingTodo && (
        <EditTodoModal
          todo={editingTodo}
          subjects={subjects}
          onClose={() => setEditingTodo(null)}
          onSave={saveEdit}
          onDelete={deleteTodo}
        />
      )}
    </div>
  );
}

function TodoItem({ todo, onToggle, onDelete, onEdit }) {
  const p = PRIORITIES[todo.priority] || PRIORITIES.medium;

  return (
    <div
      className={`group bg-white rounded-3xl border border-slate-100 p-5 flex items-center gap-4 hover:border-[#8B6CF6]/30 transition ${
        todo.done ? "opacity-60" : ""
      }`}
    >
      <button onClick={onToggle} className="active:scale-90 transition">
        {todo.done ? (
          <CheckCircle2 className="w-8 h-8 text-emerald-500" />
        ) : (
          <Circle className="w-8 h-8 text-slate-300 group-hover:text-[#8B6CF6]" />
        )}
      </button>

      <div className="flex-1">
        <h3
          className={`font-extrabold text-lg ${
            todo.done ? "line-through text-slate-400" : "text-[#1E293B]"
          }`}
        >
          {todo.title}
        </h3>

        <div className="flex items-center gap-3 mt-2 flex-wrap">
          <span className="font-bold text-sm" style={{ color: todo.color }}>
            ● {todo.subject}
          </span>

          <span className={`text-xs px-2 py-1 rounded-full font-bold ${p.bg} ${p.text}`}>
            {p.label}
          </span>

          {todo.due && <span className="text-sm text-slate-400">· {todo.due}</span>}
        </div>
      </div>

      <button
        onClick={onEdit}
        className="opacity-0 group-hover:opacity-100 w-9 h-9 rounded-xl hover:bg-slate-50 flex items-center justify-center text-slate-400 hover:text-[#8B6CF6]"
      >
        <Pencil size={18} />
      </button>

      <button
        onClick={onDelete}
        className="opacity-0 group-hover:opacity-100 w-9 h-9 rounded-xl hover:bg-red-50 flex items-center justify-center text-red-400"
      >
        <Trash2 size={18} />
      </button>
    </div>
  );
}

function EditTodoModal({ todo, onClose, onSave, onDelete }) {
  const [title, setTitle] = useState(todo.title);
  const [subject, setSubject] = useState(todo.subject);
  const [priority, setPriority] = useState(todo.priority);
  const [due, setDue] = useState(todo.due);

  const submit = (e) => {
    e.preventDefault();

    if (!title.trim()) return;

    onSave({
      ...todo,
      title: title.trim(),
      subject: subject.trim() || "Général",
      priority,
      due,
    });
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center p-4">
      <button
        onClick={onClose}
        className="absolute inset-0 bg-[#1E293B]/40 backdrop-blur-sm"
      />

      <form
        onSubmit={submit}
        className="relative w-full max-w-[460px] bg-white rounded-[32px] p-7 shadow-2xl"
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-400 hover:text-[#1E293B]"
        >
          <X size={22} />
        </button>

        <h2 className="text-3xl font-extrabold">Modifier la tâche</h2>
        <p className="text-slate-500 mt-1">Change les détails de ta mission.</p>

        <div className="mt-6 space-y-4">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full h-12 rounded-2xl border border-slate-200 px-4 outline-none focus:ring-2 focus:ring-[#8B6CF6]"
          />

          <input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Matière"
            className="w-full h-12 rounded-2xl border border-slate-200 px-4 outline-none focus:ring-2 focus:ring-[#8B6CF6]"
          />

          <div className="grid grid-cols-2 gap-3">
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              className="h-12 rounded-2xl border border-slate-200 px-4 outline-none"
            >
              <option value="high">Haute</option>
              <option value="medium">Moyenne</option>
              <option value="low">Basse</option>
            </select>

            <input
  type="date"
  value={due}
  onChange={(e) => setDue(e.target.value)}
  className="h-12 rounded-2xl border border-slate-200 px-4 outline-none focus:ring-2 focus:ring-[#8B6CF6]/40"
/>
          </div>
        </div>

        <div className="mt-7 flex justify-between">
          <button
            type="button"
            onClick={() => onDelete(todo.id)}
            className="h-12 px-5 rounded-2xl bg-red-50 text-red-500 font-bold hover:bg-red-100"
          >
            Supprimer
          </button>

          <button
            type="submit"
            className="h-12 px-6 rounded-2xl bg-[#8B6CF6] text-white font-bold hover:bg-[#7C3AED]"
          >
            Enregistrer
          </button>
        </div>
      </form>
    </div>
  );
}

function EmptyState() {
  return (
    <MemiGuide
      mood="encouraging"
      eyebrow="Tout est calme"
      title="Rien à faire pour le moment."
      message="Profite de cette pause pendant qu’elle dure, ou ajoute ta prochaine mission."
    />
  );
}

export default Todo;

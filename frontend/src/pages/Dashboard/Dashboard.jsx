import { useEffect, useState } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import dashboardImg from "../../assets/dashboard.png";
import {
  BookOpen,
  CalendarDays,
  Flame,
  Clock3,
  Target,
  Trophy,
  TrendingUp,
  ArrowUpRight,
  Plus,
  Zap,
  Sparkles,
  CheckCircle2,
} from "lucide-react";

import mascot from "/src/assets/mascot.png";





const sessions = [
  {
    id: 1,
    title: "Révision IA",
    subject: "Session Memora",
    time: "Aujourd’hui",
    color: "#8B6CF6",
    short: "Me",
  },
];

function Dashboard() {

  const [courses, setCourses] = useState([]);
  const [todos, setTodos] = useState([]);
  const [quizzes, setQuizzes] = useState([]);
  const [decks, setDecks] = useState([]);
  const [userName, setUserName] = useState(
  localStorage.getItem("name") || "Étudiant"
);

  const todayLabel = new Date().toLocaleDateString("fr-FR", {
    weekday: "long",
  });

  const todayLabelCapitalized =
    todayLabel.charAt(0).toUpperCase() + todayLabel.slice(1);

  useEffect(() => {
    fetchDashboardData();
    window.addEventListener("storage", () => {
  setUserName(localStorage.getItem("name") || "Étudiant");
});
  }, []);

  const fetchDashboardData = async () => {
    try {

      const token = localStorage.getItem("token");

      const authConfig = {
        headers: {
          Authorization: `Token ${token}`,
        },
      };
      const [
        coursesRes,
        todosRes,
        quizzesRes,
        decksRes,
      ] = await Promise.all([
        axios.get("http://127.0.0.1:8000/api/courses/", authConfig),
        axios.get("http://127.0.0.1:8000/api/todos/", authConfig),
        axios.get("http://127.0.0.1:8000/api/courses/quizzes/", authConfig),
        axios.get("http://127.0.0.1:8000/api/courses/decks/", authConfig),
      ]);

      setCourses(coursesRes.data);
      setTodos(todosRes.data);
      setQuizzes(quizzesRes.data);
      setDecks(decksRes.data);

    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="p-8 max-w-[1500px] mx-auto">
      <section className="relative overflow-hidden rounded-[34px] bg-gradient-to-br from-[#8B6CF6] via-[#A78BFA] to-[#60A5FA] p-9 text-white shadow-xl">
        <div className="relative z-10 max-w-2xl">
          <span className="inline-flex items-center gap-2 rounded-full bg-white/20 px-4 py-2 text-sm font-bold mb-5">
            <Sparkles size={16} />
            On révise ensemble
          </span>

          <h1 className="text-5xl font-extrabold mb-4">
            Salut {userName} 👋
          </h1>

          <p className="text-white/90 text-lg leading-relaxed mb-7">
            Memi t’aide à reprendre tes révisions.
          </p>

          <div className="flex gap-3">
            <Link
              to="/flashcards"
              className="bg-white text-[#8B6CF6] rounded-2xl px-6 py-3 font-bold hover:-translate-y-0.5 transition flex items-center gap-2"
            >
              <Zap size={18} />
              Session express
            </Link>

            <Link
              to="/quiz"
              className="bg-white/20 border border-white/30 rounded-2xl px-6 py-3 font-bold hover:bg-white/30 transition"
            >
              Lancer un quiz
            </Link>
          </div>
        </div>

        <img
          src={mascot}
          alt="Memi"
          className="absolute right-14 top-12 w-44 h-44 object-cover rounded-full border-8 border-white/25 shadow-2xl"
        />

        <div className="absolute -right-20 -top-20 w-80 h-80 bg-blue-300/30 rounded-full blur-3xl" />
        <div className="absolute left-1/4 -bottom-20 w-72 h-72 bg-yellow-300/20 rounded-full blur-3xl" />
      </section>

      <section className="grid grid-cols-4 gap-5 mt-6">
        <StatCard
          icon={<BookOpen />}
          value={courses.length}
          label="Cours"
          trend="+"
          color="purple"
        />

        <StatCard
          icon={<CheckCircle2 />}
          value={todos.filter((t) => t.status === "done").length}
          label="Tâches terminées"
          trend="+"
          color="green"
        />

        <StatCard
          icon={<Target />}
          value={quizzes.length}
          label="Quiz générés"
          trend="+"
          color="blue"
        />

        <StatCard
          icon={<Trophy />}
          value={decks.length}
          label="Flashcards créées"
          trend="+"
          color="yellow"
        />
      </section>

      <section className="grid grid-cols-[1.7fr_1fr] gap-6 mt-6">
        <div className="bg-white rounded-[28px] border border-slate-100 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-extrabold">
                Aujourd’hui · {todayLabelCapitalized}
              </h2>

              <p className="text-slate-400 text-sm">
                Session de révision recommandée
              </p>
            </div>

            <Link to="/planning" className="text-[#8B6CF6] font-bold text-sm flex items-center gap-1">
              Voir le planning <ArrowUpRight size={15} />
            </Link>
          </div>

          <div className="space-y-3">
            <SessionCard
              session={{
                title: "Révision du jour",
                subject: `${courses.length} cours · ${quizzes.length} quiz disponibles`,
                time: `${todos.filter((t) => t.status !== "done").length} tâches restantes`,
                color: "#8B6CF6",
                short: "Me",
              }}
            />
          </div>
        </div>

        <ProgressCard todos={todos} />
      </section>

      <section className="grid grid-cols-[1.7fr_1fr] gap-6 mt-6">
        <div className="bg-white rounded-[28px] border border-slate-100 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-extrabold">Reprendre un cours</h2>
            <Link to="/courses" className="text-[#8B6CF6] font-bold text-sm">
              Tous les cours
            </Link>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {courses.slice(0, 4).map((course, index) => (
              <CourseCard
                key={course.id}
                course={{
                  title: course.title,
                  subject: "Cours",
                  progress: Math.floor(Math.random() * 60) + 30,
                  color: ["#8B6CF6", "#60A5FA", "#34D399", "#FBBF24"][index % 4],
                  info: "Cours importé",
                }}
              />
            ))}
          </div>
        </div>

        <div className="bg-white rounded-[28px] border border-slate-100 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-extrabold">À faire</h2>
            <Link to="/todo" className="text-[#8B6CF6] font-bold text-sm">
              Tout voir
            </Link>
          </div>

          <div className="space-y-5">
            {todos.slice(0, 3).map((todo, index) => (
              <TodoItem
                key={todo.id}
                todo={{
                  title: todo.title,
                  subject: todo.due_date || "Sans date",
                  color: ["#8B6CF6", "#F472B6", "#34D399"][index % 3],
                }}
              />
            ))}
          </div>

          <Link
            to="/todo"
            className="mt-6 w-full h-12 rounded-2xl border-2 border-dashed border-slate-200 text-slate-500 font-bold flex items-center justify-center gap-2 hover:border-[#8B6CF6] hover:text-[#8B6CF6] transition"
          >
            <Plus size={18} />
            Ajouter une tâche
          </Link>
        </div>
      </section>

      <section className="grid grid-cols-4 gap-5 mt-6">
        <QuickAction to="/courses" icon={<BookOpen />} label="Nouveau cours" color="#8B6CF6" />
        <QuickAction to="/flashcards" icon={<Plus />} label="Créer flashcards" color="#60A5FA" />
        <QuickAction to="/planning" icon={<CalendarDays />} label="Planifier session" color="#34D399" />
        <QuickAction to="/todo" icon={<CheckCircle2 />} label="Ajouter tâche" color="#FBBF24" />
      </section>
    </div>
  );
}



function ProgressCard({ todos }) {
  const completedTodos = todos.filter(
    (t) => t.status === "done"
  ).length;

  const totalTodos = todos.length;

  const progress =
    totalTodos > 0
      ? Math.round((completedTodos / totalTodos) * 100)
      : 0;

  return (
    <div className="rounded-[28px] bg-[#1E293B] text-white p-6 shadow-sm overflow-hidden relative">
      <div className="absolute -right-16 -top-16 w-52 h-52 bg-[#8B6CF6]/40 rounded-full blur-3xl" />

      <div className="relative z-10">
        <p className="text-slate-300 font-bold text-sm uppercase tracking-wider">
          Objectif semaine
        </p>

        <h2 className="text-5xl font-extrabold mt-4">
          {completedTodos}/{totalTodos}
        </h2>

        <p className="text-slate-300 mt-2">
          tâches terminées
        </p>

        <div className="flex justify-between text-sm text-slate-300 mt-6">
          <span>Progression</span>
          <span>{progress}%</span>
        </div>

        <div className="h-3 bg-white/10 rounded-full mt-2 overflow-hidden">
          <div
            className="h-full bg-yellow-400 rounded-full"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, value, label, trend, color }) {
  const colors = {
    yellow: "bg-yellow-50 text-yellow-500",
    blue: "bg-blue-50 text-blue-500",
    green: "bg-emerald-50 text-emerald-500",
    purple: "bg-[#8B6CF6]/10 text-[#8B6CF6]",
  };

  return (
    <div className="bg-white rounded-[24px] border border-slate-100 p-6 shadow-sm hover:-translate-y-0.5 transition">
      <div className="flex items-center justify-between">
        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${colors[color]}`}>
          {icon}
        </div>

        <span className="text-emerald-600 text-sm font-bold flex items-center gap-1">
          <TrendingUp size={15} />
          {trend}
        </span>
      </div>

      <h3 className="text-3xl font-extrabold mt-6">{value}</h3>
      <p className="text-slate-400 font-semibold">{label}</p>
    </div>
  );
}

function SessionCard({ session }) {
  return (
    <div className="border border-slate-100 rounded-3xl p-5 flex items-center gap-4 hover:border-[#8B6CF6]/30 transition">
      <div
        className="w-14 h-14 rounded-2xl text-white font-bold flex items-center justify-center"
        style={{ background: session.color }}
      >
        <img
          src={dashboardImg}
          alt="Memi"
          className="w-10 h-10 object-contain"
        />
      </div>

      <div className="flex-1">
        <h3 className="font-extrabold">{session.title}</h3>
        <p className="text-slate-400 text-sm">
          {session.subject} · {session.time}
        </p>
      </div>

      <Link
        to="/flashcards"
        className="text-slate-400 font-bold hover:text-[#8B6CF6]"
      >
        Commencer →
      </Link>
    </div>
  );
}

function CourseCard({ course }) {
  return (
    <div className="rounded-3xl border border-slate-100 p-5 hover:border-[#8B6CF6]/30 transition">
      <div className="flex items-center gap-2 mb-4">
        <span className="w-2 h-2 rounded-full" style={{ background: course.color }} />
        <p className="text-xs font-extrabold uppercase tracking-wider text-slate-400">
          {course.subject}
        </p>
      </div>

      <h3 className="font-extrabold text-lg mb-5">{course.title}</h3>

      <div className="flex items-center gap-3">
        <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full"
            style={{ width: `${course.progress}%`, background: course.color }}
          />
        </div>
        <span className="font-bold text-slate-500">{course.progress}%</span>
      </div>

      <p className="text-slate-400 text-sm mt-4">{course.info}</p>
    </div>
  );
}

function TodoItem({ todo }) {
  return (
    <div className="flex items-start gap-4">
      <div className="w-5 h-5 rounded-full border-2 mt-1" style={{ borderColor: todo.color }} />
      <div>
        <h3 className="font-bold leading-snug">{todo.title}</h3>
        <p className="text-slate-400 text-sm mt-1">{todo.subject}</p>
      </div>
    </div>
  );
}

function QuickAction({ to, icon, label, color }) {
  return (
    <Link
      to={to}
      className="bg-white rounded-[22px] border border-slate-100 p-5 flex items-center gap-4 hover:-translate-y-0.5 hover:shadow-sm transition"
    >
      <div
        className="w-12 h-12 rounded-2xl text-white flex items-center justify-center"
        style={{ background: color }}
      >
        {icon}
      </div>

      <span className="font-extrabold">{label}</span>
      <ArrowUpRight className="ml-auto text-slate-300" size={18} />
    </Link>
  );
}

export default Dashboard;
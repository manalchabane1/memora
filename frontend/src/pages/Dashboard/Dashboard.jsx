import { Link } from "react-router-dom";
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

const user = {
  name: "Faiza",
  streak: 12,
};

const sessions = [
  {
    id: 1,
    title: "Philo — liberté",
    subject: "Philosophie",
    time: "11h00 — 12h00",
    color: "#A78BFA",
    short: "Ph",
  },
  {
    id: 2,
    title: "Physique exos",
    subject: "Physique-Chimie",
    time: "15h00 — 17h00",
    color: "#60A5FA",
    short: "Ph",
  },
];

const courses = [
  {
    title: "Limites et continuité",
    subject: "Mathématiques",
    progress: 72,
    color: "#8B6CF6",
    info: "Il y a 2 h · 4h 20",
  },
  {
    title: "Ondes mécaniques",
    subject: "Physique-Chimie",
    progress: 45,
    color: "#60A5FA",
    info: "Hier · 2h 50",
  },
  {
    title: "La Guerre froide",
    subject: "Histoire-Géo",
    progress: 90,
    color: "#FBBF24",
    info: "Avant-hier · 3h 10",
  },
  {
    title: "Génétique mendélienne",
    subject: "SVT",
    progress: 30,
    color: "#34D399",
    info: "Il y a 4 j · 1h 40",
  },
];

const todos = [
  {
    title: "Finir DM de maths — exercices 12 à 18",
    subject: "Mathématiques · Aujourd'hui",
    color: "#8B6CF6",
  },
  {
    title: "Apprendre 30 irregular verbs",
    subject: "Anglais · Demain",
    color: "#F472B6",
  },
  {
    title: "Lire chapitre 4 de philo",
    subject: "Philosophie · Cette semaine",
    color: "#A78BFA",
  },
];

function Dashboard() {
  return (
    <div className="p-8 max-w-[1500px] mx-auto">
      <section className="relative overflow-hidden rounded-[34px] bg-gradient-to-br from-[#8B6CF6] via-[#A78BFA] to-[#60A5FA] p-9 text-white shadow-xl">
        <div className="relative z-10 max-w-2xl">
          <span className="inline-flex items-center gap-2 rounded-full bg-white/20 px-4 py-2 text-sm font-bold mb-5">
            <Sparkles size={16} />
            On révise ensemble
          </span>

          <h1 className="text-5xl font-extrabold mb-4">
            Salut {user.name} 👋
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
        <StatCard icon={<Flame />} value="12 j" label="Série" trend="+2" color="yellow" />
        <StatCard icon={<Clock3 />} value="6h 42" label="Cette semaine" trend="+18%" color="blue" />
        <StatCard icon={<Target />} value="82%" label="Précision quiz" trend="+5%" color="green" />
        <StatCard icon={<Trophy />} value="124" label="Cartes maîtrisées" trend="+12" color="purple" />
      </section>

      <section className="grid grid-cols-[1.7fr_1fr] gap-6 mt-6">
        <div className="bg-white rounded-[28px] border border-slate-100 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-extrabold">Aujourd’hui · Jeu</h2>
              <p className="text-slate-400 text-sm">2 sessions prévues</p>
            </div>

            <Link to="/planning" className="text-[#8B6CF6] font-bold text-sm flex items-center gap-1">
              Voir le planning <ArrowUpRight size={15} />
            </Link>
          </div>

          <div className="space-y-3">
            {sessions.map((s) => (
              <SessionCard key={s.id} session={s} />
            ))}
          </div>
        </div>

        <ProgressCard />
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
            {courses.map((course) => (
              <CourseCard key={course.title} course={course} />
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
            {todos.map((todo) => (
              <TodoItem key={todo.title} todo={todo} />
            ))}
          </div>

          <button className="mt-6 w-full h-12 rounded-2xl border-2 border-dashed border-slate-200 text-slate-500 font-bold flex items-center justify-center gap-2 hover:border-[#8B6CF6] hover:text-[#8B6CF6] transition">
            <Plus size={18} />
            Ajouter une tâche
          </button>
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

function ProgressCard() {
  return (
    <div className="rounded-[28px] bg-[#1E293B] text-white p-6 shadow-sm overflow-hidden relative">
      <div className="absolute -right-16 -top-16 w-52 h-52 bg-[#8B6CF6]/40 rounded-full blur-3xl" />

      <div className="relative z-10">
        <p className="text-slate-300 font-bold text-sm uppercase tracking-wider">
          Objectif semaine
        </p>

        <h2 className="text-5xl font-extrabold mt-4">6h42</h2>
        <p className="text-slate-300 mt-2">sur 8h prévues</p>

        <div className="flex justify-between text-sm text-slate-300 mt-6">
          <span>Progression</span>
          <span>84%</span>
        </div>

        <div className="h-3 bg-white/10 rounded-full mt-2 overflow-hidden">
          <div className="h-full w-[84%] bg-yellow-400 rounded-full" />
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
        {session.short}
      </div>

      <div className="flex-1">
        <h3 className="font-extrabold">{session.title}</h3>
        <p className="text-slate-400 text-sm">
          {session.subject} · {session.time}
        </p>
      </div>

      <button className="text-slate-400 font-bold hover:text-[#8B6CF6]">
        Commencer →
      </button>
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
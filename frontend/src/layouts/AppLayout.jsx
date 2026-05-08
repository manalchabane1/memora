import { useState } from "react";
import { Outlet, NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  BookOpen,
  Layers,
  CircleHelp,
  CalendarDays,
  CheckSquare,
  Flame,
  Settings,
  LogOut,
} from "lucide-react";


import logo from "/src/assets/logo.png";

function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div className="min-h-screen bg-[#F8FAFC] font-[Poppins] flex text-[#1E293B]">
      {!sidebarOpen && (
        <button
          onClick={() => setSidebarOpen(true)}
          className="fixed top-6 left-6 z-50 w-12 h-12 rounded-2xl bg-[#8B6CF6] text-white font-extrabold shadow-lg"
        >
          M
        </button>
      )}

      {sidebarOpen && (
        <aside className="w-[250px] shrink-0 bg-white border-r border-slate-100 min-h-screen p-6 flex flex-col justify-between sticky top-0">
          <div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="flex items-center gap-3 mb-7 text-left"
            >
              <div className="relative w-12 h-12 rounded-2xl bg-[#8B6CF6] flex items-center justify-center shadow-lg">
                <img src={logo} alt="Memora" className="w-8 h-8 object-contain" />
                <span className="absolute -right-1 -top-1 w-3 h-3 bg-yellow-400 rounded-full" />
              </div>

              <div>
                <h1 className="font-extrabold text-xl">Memora</h1>
                <p className="text-xs text-slate-400">Révise mieux chaque jour</p>
              </div>
            </button>

            <div className="rounded-3xl border border-yellow-100 bg-yellow-50 p-4 mb-7">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-yellow-100 flex items-center justify-center text-yellow-500">
                  <Flame size={22} />
                </div>
                <div>
                  <p className="text-sm text-slate-500 font-semibold">Série en cours</p>
                  <h2 className="font-extrabold text-lg">12 jours</h2>
                </div>
              </div>

              <div className="flex gap-1 mt-4">
                {[1, 2, 3, 4, 5, 6, 7].map((item) => (
                  <div
                    key={item}
                    className={`h-2 flex-1 rounded-full ${
                      item <= 5 ? "bg-yellow-400" : "bg-yellow-100"
                    }`}
                  />
                ))}
              </div>
            </div>

            <p className="text-xs font-extrabold text-slate-400 uppercase tracking-wider mb-3">
              Navigation
            </p>

            <nav className="space-y-2">
              <MenuItem to="/dashboard" icon={<LayoutDashboard size={20} />} label="Dashboard" />
              <MenuItem to="/courses" icon={<BookOpen size={20} />} label="Cours" />
              <MenuItem to="/flashcards" icon={<Layers size={20} />} label="Flashcards" />
              <MenuItem to="/quiz" icon={<CircleHelp size={20} />} label="Quiz" />
              <MenuItem to="/planning" icon={<CalendarDays size={20} />} label="Planning" />
              <MenuItem to="/todo" icon={<CheckSquare size={20} />} label="To-Do" />
            </nav>
          </div>

          <div className="border-t border-slate-100 pt-5">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-11 h-11 rounded-full bg-[#8B6CF6] text-white flex items-center justify-center font-bold">
                FC
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-sm">Faiza</h3>
              </div>
              <Settings size={18} className="text-slate-400" />
            </div>

            <button className="flex items-center gap-2 text-slate-400 text-sm hover:text-[#8B6CF6]">
              <LogOut size={18} />
              Se déconnecter
            </button>
          </div>
        </aside>
      )}

      <main className="flex-1 min-w-0">
        <Outlet />
      </main>
    </div>
  );
}

function MenuItem({ to, icon, label }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `flex items-center gap-3 rounded-2xl px-4 py-3 font-bold transition ${
          isActive
            ? "bg-[#8B6CF6]/10 text-[#8B6CF6]"
            : "text-slate-500 hover:bg-slate-50"
        }`
      }
    >
      {icon}
      <span>{label}</span>
    </NavLink>
  );
}

export default AppLayout;
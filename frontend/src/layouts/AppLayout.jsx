import { useEffect, useState } from "react";
import { Outlet, NavLink, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  BookOpen,
  Layers,
  CircleHelp,
  CalendarDays,
  CheckSquare,
  MessageCircle,
  Flame,
  Settings,
  LogOut,
  Moon,
  Sun,
  User,
  Lock,
  Bell,
  Target,
  X,
  Save,
} from "lucide-react";

import logo from "/src/assets/logo.png";
import {
  changePassword,
  getProfile,
  logoutApi,
  updateProfile,
} from "../services/api";
import { getDisplayName, getInitials, storeProfile } from "../utils/profile";

function localDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function updateDailyStreak() {
  const today = localDateKey(new Date());
  const lastVisit = localStorage.getItem("lastVisitDate");
  const currentStreak = Number(localStorage.getItem("streak") || 0);
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const nextStreak = lastVisit === today
    ? Math.max(currentStreak, 1)
    : lastVisit === localDateKey(yesterday)
      ? currentStreak + 1
      : 1;

  localStorage.setItem("lastVisitDate", today);
  localStorage.setItem("streak", String(nextStreak));
  return nextStreak;
}

function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [profileName, setProfileName] = useState(
    localStorage.getItem("name") || ""
  );

  const [profileEmail, setProfileEmail] = useState(
    localStorage.getItem("email") || ""
  );
  const [profileSaved, setProfileSaved] = useState(false);
  const [profileError, setProfileError] = useState("");
  const [profileBio, setProfileBio] = useState("");
  const [profileSchool, setProfileSchool] = useState("");
  const [profileStudyLevel, setProfileStudyLevel] = useState("");
  const [profileSubjects, setProfileSubjects] = useState("");
  const [profileAvatar, setProfileAvatar] = useState(null);
  const [profileAvatarUrl, setProfileAvatarUrl] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordMessage, setPasswordMessage] = useState("");
  const [streak] = useState(updateDailyStreak);
  const navigate = useNavigate();
  const displayName = getDisplayName(profileName, profileEmail);
  const initials = getInitials(profileName, profileEmail);

  const logout = async () => {
    try {
      await logoutApi();
    } catch {
      // Local logout must still work if the API is unavailable.
    }
    localStorage.removeItem("token");
    localStorage.removeItem("name");
    localStorage.removeItem("email");

    navigate("/");
  };

  useEffect(() => {
    const handleAuthExpired = (event) => {
      sessionStorage.setItem(
        "authMessage",
        event.detail?.message || "Ta session a expiré. Reconnecte-toi."
      );
      navigate("/", { replace: true });
    };
    window.addEventListener("auth-expired", handleAuthExpired);
    return () => window.removeEventListener("auth-expired", handleAuthExpired);
  }, [navigate]);

  useEffect(() => {
    getProfile()
      .then((profile) => {
        setProfileName(profile.name || "");
        setProfileEmail(profile.email || "");
        setProfileBio(profile.bio || "");
        setProfileSchool(profile.school || "");
        setProfileStudyLevel(profile.study_level || "");
        setProfileSubjects((profile.preferred_subjects || []).join(", "));
        setProfileAvatarUrl(profile.avatar_url || "");
        storeProfile(profile);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }

    return () => {
      document.documentElement.classList.remove("dark");
    };
  }, [darkMode]);

  return (
    <div
      className={`h-screen overflow-hidden font-[Poppins] flex transition-colors ${darkMode ? "bg-[#0F172A] text-white" : "bg-[#F8FAFC] text-[#1E293B]"
        }`}
    >
      {!sidebarOpen && (
        <button
          onClick={() => setSidebarOpen(true)}
          className="fixed top-6 left-6 z-50 w-12 h-12 rounded-2xl bg-[#8B6CF6] text-white font-extrabold shadow-lg"
        >
          M
        </button>
      )}

      {sidebarOpen && (
        <aside
          className={`w-[250px] h-screen shrink-0 p-6 flex flex-col justify-between overflow-y-auto border-r transition-colors ${darkMode
            ? "bg-[#111827] border-slate-800"
            : "bg-white border-slate-100"
            }`}
        >
          <div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="flex items-center gap-3 mb-5 text-left"
            >
              <div className="relative w-12 h-12 rounded-2xl bg-[#8B6CF6] flex items-center justify-center shadow-lg">
                <img src={logo} alt="Memora" className="w-8 h-8 object-contain" />
                <span className="absolute -right-1 -top-1 w-3 h-3 bg-yellow-400 rounded-full" />
              </div>

              <div>
                <h1 className={`font-extrabold text-xl ${darkMode ? "text-white" : "text-[#1E293B]"}`}>
                  Memora
                </h1>
                <p className="text-xs text-slate-400">Révise mieux chaque jour</p>
              </div>
            </button>

            <button
              onClick={() => setDarkMode((v) => !v)}
              className={`w-full mb-6 h-11 rounded-2xl font-bold flex items-center justify-center gap-2 transition ${darkMode
                ? "bg-slate-800 text-white hover:bg-slate-700"
                : "bg-[#8B6CF6]/10 text-[#8B6CF6] hover:bg-[#8B6CF6]/20"
                }`}
            >
              {darkMode ? <Sun size={18} /> : <Moon size={18} />}
              {darkMode ? "Mode clair" : "Mode sombre"}
            </button>

            <div
              className={`rounded-3xl p-4 mb-7 border ${darkMode
                ? "bg-yellow-500/10 border-yellow-900/40"
                : "bg-yellow-50 border-yellow-100"
                }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-11 h-11 rounded-2xl flex items-center justify-center text-yellow-500 ${darkMode ? "bg-yellow-500/20" : "bg-yellow-100"
                    }`}
                >
                  <Flame size={22} />
                </div>

                <div>
                  <p className={`text-sm font-semibold ${darkMode ? "text-slate-300" : "text-slate-500"}`}>
                    Série en cours
                  </p>
                  <h2 className={`font-extrabold text-lg ${darkMode ? "text-white" : "text-[#1E293B]"}`}>
                    {streak} {streak > 1 ? "jours" : "jour"}
                  </h2>
                </div>
              </div>

              <div className="flex gap-1 mt-4">
                {[1, 2, 3, 4, 5, 6, 7].map((item) => (
                  <div
                    key={item}
                    className={`h-2 flex-1 rounded-full ${item <= Math.min(streak, 7)
                      ? "bg-yellow-400"
                      : darkMode
                        ? "bg-yellow-500/20"
                        : "bg-yellow-100"
                      }`}
                  />
                ))}
              </div>
            </div>

            <p className="text-xs font-extrabold text-slate-400 uppercase tracking-wider mb-3">
              Navigation
            </p>

            <nav className="space-y-2">
              <MenuItem darkMode={darkMode} to="/dashboard" icon={<LayoutDashboard size={20} />} label="Dashboard" />
              <MenuItem darkMode={darkMode} to="/courses" icon={<BookOpen size={20} />} label="Cours" />
              <MenuItem darkMode={darkMode} to="/flashcards" icon={<Layers size={20} />} label="Flashcards" />
              <MenuItem darkMode={darkMode} to="/quiz" icon={<CircleHelp size={20} />} label="Quiz" />
              <MenuItem darkMode={darkMode} to="/planning" icon={<CalendarDays size={20} />} label="Planning" />
              <MenuItem darkMode={darkMode} to="/todo" icon={<CheckSquare size={20} />} label="To-Do" />
              <MenuItem darkMode={darkMode} to="/forum" icon={<MessageCircle size={20} />} label="Forum" />
            </nav>
          </div>

          <div className={`border-t pt-5 ${darkMode ? "border-slate-800" : "border-slate-100"}`}>
            <div className="flex items-center gap-3 mb-5">
              <div
                title={`Initiales de ${displayName}`}
                className="w-11 h-11 shrink-0 rounded-full bg-[#8B6CF6] text-white flex items-center justify-center font-bold overflow-hidden"
              >
                {profileAvatarUrl
                  ? <img src={profileAvatarUrl} alt={displayName} className="w-full h-full object-cover" />
                  : initials}
              </div>

              <div className="flex-1 min-w-0">
                <h3
                  title={displayName}
                  className={`font-bold text-sm truncate ${darkMode ? "text-white" : "text-[#1E293B]"}`}
                >
                  {displayName}
                </h3>
              </div>

              <button
                onClick={() => setSettingsOpen(true)}
                className="text-slate-400 hover:text-[#8B6CF6]"
              >
                <Settings size={18} />
              </button>
            </div>

            <button
              onClick={logout}
              className="flex items-center gap-2 text-slate-400 text-sm hover:text-[#8B6CF6]"
            >
              <LogOut size={18} />
              Se déconnecter
            </button>
          </div>
        </aside>
      )}

      {settingsOpen && (
        <div
          className="fixed inset-0 z-[999] bg-[#1E293B]/30 backdrop-blur-sm flex items-center justify-center p-6"
          onClick={() => setSettingsOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className={`w-full max-w-[720px] max-h-[90vh] overflow-y-auto rounded-[34px] p-7 shadow-2xl ${darkMode ? "bg-[#111827] text-white" : "bg-white text-[#1E293B]"
              }`}
          >
            <div className="flex justify-between items-start mb-7">
              <div>
                <h2 className="text-3xl font-extrabold">Paramètres</h2>
                <p className="text-slate-400 mt-1">Gère ton profil et tes préférences Memora.</p>
              </div>

              <button
                onClick={() => setSettingsOpen(false)}
                className="w-10 h-10 rounded-2xl bg-slate-100 text-slate-500 hover:bg-slate-200 flex items-center justify-center"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-5">
              <section className={`rounded-3xl border p-5 ${darkMode ? "border-slate-700 bg-slate-900" : "border-slate-100 bg-white"}`}>
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-11 h-11 rounded-2xl bg-[#8B6CF6]/10 text-[#8B6CF6] flex items-center justify-center">
                    <User size={22} />
                  </div>
                  <h3 className="text-xl font-extrabold">Profil</h3>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-bold text-slate-400">Nom</label>
                    <input
                      value={profileName}
                      onChange={(e) => setProfileName(e.target.value)}
                      placeholder="Prénom et nom"
                      autoComplete="name"
                      maxLength={150}
                      className={`mt-2 w-full h-12 rounded-2xl border px-4 outline-none ${darkMode ? "bg-slate-950 border-slate-700" : "bg-white border-slate-200"
                        }`}
                    />
                  </div>

                  <div>
                    <label className="text-sm font-bold text-slate-400">Email</label>
                    <input
                      type="email"
                      value={profileEmail}
                      onChange={(e) => setProfileEmail(e.target.value)}
                      placeholder="Adresse e-mail"
                      autoComplete="email"
                      className={`mt-2 w-full h-12 rounded-2xl border px-4 outline-none ${darkMode ? "bg-slate-950 border-slate-700" : "bg-white border-slate-200"
                        }`}
                    />
                  </div>

                  <div>
                    <label className="text-sm font-bold text-slate-400">École ou université</label>
                    <input value={profileSchool} onChange={(e) => setProfileSchool(e.target.value)} maxLength={150} placeholder="Université, école..." className="mt-2 w-full h-12 rounded-2xl border border-slate-200 px-4 outline-none" />
                  </div>

                  <div>
                    <label className="text-sm font-bold text-slate-400">Niveau d’études</label>
                    <input value={profileStudyLevel} onChange={(e) => setProfileStudyLevel(e.target.value)} maxLength={100} placeholder="Licence 3, Master 1..." className="mt-2 w-full h-12 rounded-2xl border border-slate-200 px-4 outline-none" />
                  </div>

                  <div className="md:col-span-2">
                    <label className="text-sm font-bold text-slate-400">Bio</label>
                    <textarea value={profileBio} onChange={(e) => setProfileBio(e.target.value)} maxLength={500} rows={3} placeholder="Quelques mots sur toi et tes objectifs..." className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none resize-none" />
                  </div>

                  <div className="md:col-span-2">
                    <label className="text-sm font-bold text-slate-400">Matières préférées</label>
                    <input value={profileSubjects} onChange={(e) => setProfileSubjects(e.target.value)} placeholder="Mathématiques, Réseaux, Anglais..." className="mt-2 w-full h-12 rounded-2xl border border-slate-200 px-4 outline-none" />
                  </div>

                  <div className="md:col-span-2">
                    <label className="text-sm font-bold text-slate-400">Photo de profil</label>
                    <input type="file" accept="image/*" onChange={(e) => setProfileAvatar(e.target.files?.[0] || null)} className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none" />
                  </div>

                  <div className="md:col-span-2">
                    <button
                      onClick={async () => {
                        setProfileError("");
                        try {
                          const profile = await updateProfile({
                            name: profileName,
                            email: profileEmail,
                            bio: profileBio,
                            school: profileSchool,
                            study_level: profileStudyLevel,
                            preferred_subjects: profileSubjects,
                            ...(profileAvatar ? { avatar: profileAvatar } : {}),
                          });
                          setProfileName(profile.name);
                          setProfileEmail(profile.email);
                          setProfileAvatarUrl(profile.avatar_url || "");
                          setProfileAvatar(null);
                          storeProfile(profile);
                          setProfileSaved(true);
                          setTimeout(() => setProfileSaved(false), 2000);
                        } catch (error) {
                          setProfileError(error.message);
                        }
                      }}
                      className="mt-4 h-12 px-6 rounded-2xl bg-[#8B6CF6] text-white font-bold hover:bg-[#7C3AED] active:scale-95 transition"
                    >
                      {profileSaved ? "Profil sauvegardé" : "Sauvegarder le profil"}
                    </button>
                    {profileError && <p className="mt-2 text-sm text-red-500">{profileError}</p>}
                  </div>
                </div>
              </section>

              <section className={`rounded-3xl border p-5 ${darkMode ? "border-slate-700 bg-slate-900" : "border-slate-100 bg-white"}`}>
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-11 h-11 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center">
                    <Lock size={22} />
                  </div>
                  <h3 className="text-xl font-extrabold">Sécurité</h3>
                </div>

                <div className="grid gap-3">
                  <input value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} type="password" placeholder="Mot de passe actuel" className="h-12 rounded-2xl border border-slate-200 px-4 outline-none" />
                  <input value={newPassword} onChange={(e) => setNewPassword(e.target.value)} type="password" placeholder="Nouveau mot de passe" className="h-12 rounded-2xl border border-slate-200 px-4 outline-none" />
                  <input value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} type="password" placeholder="Confirmer le nouveau mot de passe" className="h-12 rounded-2xl border border-slate-200 px-4 outline-none" />

                  <button
                    onClick={async () => {
                      setPasswordMessage("");
                      if (newPassword !== confirmPassword) {
                        setPasswordMessage("Les mots de passe ne correspondent pas.");
                        return;
                      }
                      try {
                        const result = await changePassword({
                          current_password: currentPassword,
                          new_password: newPassword,
                        });
                        setPasswordMessage(result.message);
                        setCurrentPassword("");
                        setNewPassword("");
                        setConfirmPassword("");
                        setTimeout(logout, 1200);
                      } catch (error) {
                        setPasswordMessage(error.message);
                      }
                    }}
                    className="h-12 rounded-2xl bg-blue-500 text-white font-bold flex items-center justify-center gap-2"
                  >
                    <Save size={18} />
                    Changer le mot de passe
                  </button>
                  {passwordMessage && <p className="text-sm text-slate-500">{passwordMessage}</p>}
                </div>
              </section>

              <section className={`rounded-3xl border p-5 ${darkMode ? "border-slate-700 bg-slate-900" : "border-slate-100 bg-white"}`}>
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-11 h-11 rounded-2xl bg-yellow-100 text-yellow-600 flex items-center justify-center">
                    <Bell size={22} />
                  </div>
                  <h3 className="text-xl font-extrabold">Préférences</h3>
                </div>

                <button
                  onClick={() => setDarkMode((v) => !v)}
                  className="w-full h-12 rounded-2xl bg-[#8B6CF6] text-white font-bold"
                >
                  {darkMode ? "Passer en mode clair" : "Passer en mode sombre"}
                </button>

                <label className="mt-4 flex items-center justify-between text-sm font-bold">
                  Rappels de révision
                  <input type="checkbox" className="w-5 h-5 accent-[#8B6CF6]" defaultChecked />
                </label>
              </section>

              <section className={`rounded-3xl border p-5 ${darkMode ? "border-slate-700 bg-slate-900" : "border-slate-100 bg-white"}`}>
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-11 h-11 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
                    <Target size={22} />
                  </div>
                  <h3 className="text-xl font-extrabold">Objectifs de révision</h3>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="rounded-2xl bg-[#8B6CF6]/10 p-4">
                    <p className="text-sm text-slate-400 font-bold">Série actuelle</p>
                    <p className="text-2xl font-extrabold mt-1">{streak} {streak > 1 ? "jours" : "jour"}</p>
                  </div>

                  <div className="rounded-2xl bg-[#FBBF24]/10 p-4">
                    <p className="text-sm text-slate-400 font-bold">Objectif quotidien</p>
                    <p className="text-2xl font-extrabold mt-1">20 min</p>
                  </div>
                </div>
              </section>

              <button
                onClick={logout}
                className="w-full h-12 rounded-2xl bg-red-50 text-red-500 font-bold"
              >
                Se déconnecter
              </button>
            </div>
          </div>
        </div>
      )}

      <main
        className={`flex-1 min-w-0 h-screen overflow-y-auto transition-colors ${darkMode ? "bg-[#0F172A]" : "bg-[#F8FAFC]"
          }`}
      >
        <Outlet />
      </main>
    </div>
  );
}

function MenuItem({ to, icon, label, darkMode }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `flex items-center gap-3 rounded-2xl px-4 py-3 font-bold transition ${isActive
          ? "bg-[#8B6CF6]/15 text-[#8B6CF6]"
          : darkMode
            ? "text-slate-300 hover:bg-slate-800"
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

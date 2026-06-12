import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Mail, Lock, Eye, EyeOff, Sparkles, ArrowRight, User } from "lucide-react";
import memiImage from "/src/assets/mascot.png";
import logoImage from "/src/assets/logo.png";
import { loginAccount, registerAccount, requestPasswordReset } from "../../services/api";
import { storeProfile } from "../../utils/profile";

function Login() {
  const [sessionMessage] = useState(() => {
    const message = sessionStorage.getItem("authMessage") || "";
    sessionStorage.removeItem("authMessage");
    return message;
  });
  const navigate = useNavigate();

  const [isSignup, setIsSignup] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [resetOpen, setResetOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    try {
      const endpoint = isSignup
        ? "register"
        : "login";

      const result = await (endpoint === "register"
        ? registerAccount({
          username: email,
          email: email,
          password: password,
          name: name,
        })
        : loginAccount({ username: email, password }));



      if (isSignup) {
        setSuccess("Compte créé ! Vérifie ton email avant de te connecter.");
        setIsSignup(false);
        setName("");
        setPassword("");
        return;
      }
      localStorage.setItem("token", result.token);
      storeProfile({ name: result.name || "", email: result.email || email });
      
      navigate("/dashboard");

    } catch (err) {
      console.error(err);

      setError(
        err.message ||
        "Erreur authentification."
      );
    }
  };

  const handleForgotPassword = async () => {
    const targetEmail = resetEmail || email;
    if (!targetEmail) {
      setError("Entre ton adresse e-mail pour recevoir le lien.");
      return;
    }

    setError("");
    try {
      const result = await requestPasswordReset(targetEmail);
      setSuccess(result.message);
      setResetOpen(false);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-2 bg-[#F8FAFC] font-[Poppins] overflow-hidden">
      <section className="hidden lg:flex relative flex-col justify-between bg-gradient-to-br from-[#8B6CF6] to-[#A78BFA] p-8 text-white overflow-hidden">
        <div className="relative z-10 flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-white/15 border border-white/25 flex items-center justify-center backdrop-blur">
            <img src={logoImage} alt="logo" />
          </div>

          <div>
            <h1 className="text-2xl font-extrabold leading-none">Memora</h1>
            <p className="text-white/80 text-xs mt-1">Ton cerveau t’adora</p>
          </div>
        </div>

        <div className="relative z-10 flex justify-center">
          <div className="absolute w-64 h-64 rounded-full bg-white/10 blur-3xl" />

          <img
            src={memiImage}
            alt="Memi mascotte"
            className="relative w-[260px] h-[260px] object-cover rounded-[42px] shadow-2xl border-4 border-white/30 animate-[float_4s_ease-in-out_infinite]"
          />

          <Sparkles className="absolute top-2 right-36 text-[#FBBF24] w-7 h-7" />
          <Sparkles className="absolute bottom-6 left-36 text-white w-5 h-5" />
        </div>

        <div className="relative z-10 text-center mb-4">
          <h2 className="text-4xl font-extrabold tracking-tight">
            Prêt à tout déchirer ?
          </h2>

          <p className="mt-4 text-white/85 text-base max-w-md mx-auto leading-relaxed">
            Memi t'attend pour réviser, comprendre et réussir.
          </p>
        </div>

        <div className="absolute -top-20 -left-20 w-72 h-72 bg-[#60A5FA]/30 rounded-full blur-3xl" />
        <div className="absolute -bottom-20 -right-20 w-72 h-72 bg-[#FBBF24]/25 rounded-full blur-3xl" />
      </section>

      <section className="relative flex items-center justify-center px-6 py-8">
        <div className="absolute inset-0 opacity-60 bg-[radial-gradient(#DDD6FE_1px,transparent_1px)] [background-size:22px_22px]" />

        <div className="relative w-full max-w-[380px]">
          {sessionMessage && (
            <p className="mb-4 rounded-2xl bg-amber-50 border border-amber-100 px-4 py-3 text-sm font-bold text-amber-700">
              {sessionMessage}
            </p>
          )}
          <div className="mb-6">
            <div className="inline-flex items-center gap-2 rounded-full bg-[#8B6CF6]/10 text-[#8B6CF6] px-4 py-1.5 text-xs font-bold mb-4">
              <Sparkles className="w-3 h-3" />
              {isSignup ? "Bienvenue !" : "Bon retour !"}
            </div>

            <h1 className="text-4xl font-extrabold text-[#1E293B] tracking-tight leading-tight">
              {isSignup ? "Créer ton compte" : "Connecte-toi à Memora"}
            </h1>

            <p className="text-slate-500 mt-3 text-sm">
              Révise mieux, progresse chaque jour.
            </p>
          </div>

          {error && (
            <div className ="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">
              {error}
            </div>
          )}

          {success && (
            <div className ="mb-4 rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-semibold text-green-600">
              {success}
            </div>
          )}

            <form onSubmit={handleSubmit} className="space-y-4" autoComplete="off">

          {isSignup && (
            <div>
                <label className="block text-sm font-bold text-[#1E293B] mb-2">
                  Nom complet
                </label>

                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Prénom et nom"
                    autoComplete="name"
                    maxLength={150}
                    required
                    className="w-full h-12 rounded-2xl border border-slate-200 bg-white pl-11 pr-4 text-sm font-medium text-[#1E293B] outline-none transition focus:ring-2 focus:ring-[#8B6CF6]"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-bold text-[#1E293B] mb-2">
                Adresse e-mail
              </label>

              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />

                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Adresse e-mail"
                  className="w-full h-12 rounded-2xl border border-slate-200 bg-white pl-11 pr-4 text-sm font-medium text-[#1E293B] outline-none transition focus:ring-2 focus:ring-[#8B6CF6]"
                  autoComplete="email"
                  required
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="text-sm font-bold text-[#1E293B]">
                  Mot de passe
                </label>

                {!isSignup && (
                  <button
                    type="button"
                    onClick={() => setResetOpen((open) => !open)}
                    className="text-sm font-bold text-[#8B6CF6] hover:underline"
                  >
                    Oublié ?
                  </button>
                )}
              </div>

              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />

                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mot de passe"
                  className="w-full h-12 rounded-2xl border border-slate-200 bg-white pl-11 pr-12 text-sm font-medium text-[#1E293B] outline-none transition focus:ring-2 focus:ring-[#8B6CF6]"
                  autoComplete={isSignup ? "new-password" : "current-password"}
                  required
                />

                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-[#1E293B]"
                >
                  {showPassword ? <EyeOff size={19} /> : <Eye size={19} />}
                </button>
              </div>
            </div>

            {!isSignup && resetOpen && (
              <div className="rounded-2xl border border-[#8B6CF6]/20 bg-[#8B6CF6]/5 p-3">
                <input
                  type="email"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  placeholder={email || "Adresse e-mail"}
                  className="w-full h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none"
                />
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  className="mt-2 w-full h-10 rounded-xl bg-[#8B6CF6] text-white text-sm font-bold"
                >
                  Envoyer le lien
                </button>
              </div>
            )}

            {!isSignup && (
              <label className="flex items-center gap-2 text-sm text-slate-500">
                <input type="checkbox" className="w-4 h-4 accent-[#8B6CF6]" />
                Se souvenir de moi
              </label>
            )}

            <button
              type="submit"
              className="w-full h-12 rounded-2xl bg-[#8B6CF6] text-white font-bold text-sm flex items-center justify-center gap-2 shadow-[0_16px_30px_-14px_rgba(139,108,246,0.9)] hover:bg-[#7C3AED] hover:-translate-y-0.5 active:scale-[0.98] transition"
            >
              {isSignup ? "Créer mon compte" : "Entrer dans Memora"}
              <ArrowRight size={19} />
            </button>
          </form>

          <div className="flex items-center gap-4 my-6 text-slate-400 text-sm">
            <div className="h-px flex-1 bg-slate-200" />
            ou
            <div className="h-px flex-1 bg-slate-200" />
          </div>

          <button
            type="button"
            onClick={() => setIsSignup(!isSignup)}
            className="w-full h-12 rounded-2xl border border-slate-200 bg-white text-[#1E293B] font-bold text-sm hover:bg-slate-50 transition"
          >
            {isSignup ? "J’ai déjà un compte" : "Créer un compte étudiant"}
          </button>
        </div>
      </section>
    </div>
  );
}
export default Login;

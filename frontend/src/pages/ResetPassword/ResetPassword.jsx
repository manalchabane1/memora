import {useState} from "react";
import {Eye,EyeOff,Lock} from "lucide-react";
import { useParams, Link } from "react-router-dom";
import axios from "axios";

function ResetPassword() {
    const { uid, token } = useParams();
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [error,setError] = useState("");
    const [success, setSuccess] = useState("");
    const[showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword]  = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");
        setSuccess("");

        if (password !== confirmPassword) {
            setError("Les mots de passe ne correspondent pas.");
            return;
        }

        try {
            const res = await axios.post(
                `http://127.0.0.1:8000/api/auth/password-reset-confirm/${uid}/${token}/`,
        {
          password: password,
        }
      );
    setSuccess(res.data.message || "Mot de passe réinitialisé avec succès !");
    setPassword("");
    setConfirmPassword("");
        } catch (err) {
            console.log("RESET ERROR =", err.reponses?.data);
            setError(
                err.response?.data?.error ||
                "Erreur lors de la réinitialisation du mot de passe."
            );
        } };
        return (
        <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC] px-6 font-[Poppins]">
            <div className="w-full max-w-md bg-white rounded-3xl shadow-xl p-8">
                <h1 className="text-3xl font-extrabold text-[#1E293B] mb-3">
                    Nouveau mot de passe</h1>
                <p className="text-slate-500 text-sm mb-6">
                    Choisis un nouveau mot de passe pour ton compte Memora.
                </p>
                
                {error && (
                    <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">
                        {error}
                        </div>
                    )}
                {success && (
                    <div className="mb-4 rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-semibold text-green-700">
                    {success}
                    </div>)}

            <form onSubmit={handleSubmit} className="space-y-4">
                <div className ="relative">
                    <Lock className ="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" w-5 h-5 />
                    <input
                    type={showPassword ? "text" : "password"}
                    placeholder="Nouveau mot de passe"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full h-12 rounded-2xl border border-slate-200 bg-white pl-11 pr-4 text-sm font-medium text-[#1E293B] outline-none transition focus:ring-2 focus:ring-[#8B6CF6]"
                     />
                    <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400"
                >
                    {showPassword ? <EyeOff size={19} /> : <Eye size={19} />}
                </button>
                </div>

                <div className ="relative">
                    <Lock className ="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" w-5 h-5 />
                    <input
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Confirmer le mot de passe"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full h-12 rounded-2xl border border-slate-200 bg-white pl-11 pr-4 text-sm font-medium text-[#1E293B] outline-none transition focus:ring-2 focus:ring-[#8B6CF6]"
                     />
                    <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400"
                >
                    {showConfirmPassword ? <EyeOff size={19} /> : <Eye size={19} />}
                </button>
                </div>

                <button
                    type="submit"
                    className="w-full h-12 rounded-2xl bg-[#8B6CF6] text-white font-bold text-sm hover:bg-[#7C3AED] transition"
                >
                Réinitialiser le mot de passe
                </button>
        </form>

        <Link
          to="/"
          className="block text-center mt-5 text-sm font-bold text-[#8B6CF6] hover:underline"
        >
          Retour à la connexion
        </Link>
      </div>
    </div>
  );
}

export default ResetPassword;
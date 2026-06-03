import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";

export default function VerifyEmail() {
  const { uid, token } = useParams();
  const [message, setMessage] = useState("Vérification en cours...");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    fetch(`http://127.0.0.1:8000/api/accounts/verify-email/${uid}/${token}/`)
      .then((res) => res.json().then((data) => ({ ok: res.ok, data })))
      .then(({ ok, data }) => {
        setSuccess(ok);
        setMessage(data.message || data.error || "Erreur de vérification");
      })
      .catch(() => {
        setSuccess(false);
        setMessage("Impossible de vérifier le compte.");
      });
  }, [uid, token]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f7f3ff] px-4">
      <div className="bg-white rounded-3xl shadow-xl p-10 max-w-md w-full text-center">
        <h1 className="text-3xl font-bold mb-4">
          {success ? "Email vérifié ✅" : "Vérification"}
        </h1>

        <p className="text-gray-600 mb-6">{message}</p>

        <Link
          to="/"
          className="inline-block bg-purple-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-purple-700"
        >
          Aller à la connexion
        </Link>
      </div>
    </div>
  );
}
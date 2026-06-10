import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { verifyEmail } from "../../services/api";

export default function VerifyEmail() {
  const { uid, token } = useParams();
  const [message, setMessage] = useState("Vérification en cours...");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    verifyEmail(uid, token)
      .then((data) => {
        setSuccess(true);
        setMessage(data.message || "Email vérifié.");
      })
      .catch((error) => {
        setSuccess(false);
        setMessage(error.message);
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

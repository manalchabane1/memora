import { useEffect, useState } from "react";
import { MessageCircle, Send, Plus, RefreshCw, User, Tag } from "lucide-react";

import {
  getForumPosts,
  createForumPost,
  getForumComments,
  createForumComment,
} from "../../services/api";
import { MemiGuide } from "../../components/AnimatedMemi";

const categories = [
  { value: "general", label: "Général" },
  { value: "question", label: "Question" },
  { value: "help", label: "Aide" },
  { value: "course", label: "Cours" },
];

function Forum() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [openPostId, setOpenPostId] = useState(null);
const [commentsByPost, setCommentsByPost] = useState({});
const [commentTextByPost, setCommentTextByPost] = useState({});
const [loadingComments, setLoadingComments] = useState(false);

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState("general");

  async function loadPosts() {
    setLoading(true);

    try {
      const data = await getForumPosts();
      setPosts(data);
    } catch (error) {
      console.error("Erreur forum:", error);
      alert(error.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreatePost(e) {
    e.preventDefault();

    if (!title.trim() || !content.trim()) {
      alert("Ajoute un titre et un contenu.");
      return;
    }

    try {
      const newPost = await createForumPost({
        title: title.trim(),
        content: content.trim(),
        category,
      });

      setPosts((prev) => [newPost, ...prev]);
      setTitle("");
      setContent("");
      setCategory("general");
    } catch (error) {
      console.error("Erreur création post:", error);
      alert(error.message);
    }
  }

  async function toggleComments(postId) {
  if (openPostId === postId) {
    setOpenPostId(null);
    return;
  }

  setOpenPostId(postId);
  setLoadingComments(true);

  try {
    const data = await getForumComments(postId);

    setCommentsByPost((prev) => ({
      ...prev,
      [postId]: data,
    }));
  } catch (error) {
    console.error("Erreur chargement commentaires:", error);
    alert(error.message);
  } finally {
    setLoadingComments(false);
  }
}

async function handleCreateComment(e, postId) {
  e.preventDefault();

  const text = commentTextByPost[postId] || "";

  if (!text.trim()) {
    alert("Écris une réponse.");
    return;
  }

  try {
    const newComment = await createForumComment(postId, {
      content: text.trim(),
    });

    setCommentsByPost((prev) => ({
      ...prev,
      [postId]: [...(prev[postId] || []), newComment],
    }));

    setCommentTextByPost((prev) => ({
      ...prev,
      [postId]: "",
    }));

    setPosts((prev) =>
      prev.map((post) =>
        post.id === postId
          ? { ...post, comments_count: (post.comments_count || 0) + 1 }
          : post
      )
    );
  } catch (error) {
    console.error("Erreur création commentaire:", error);
    alert(error.message);
  }
}

  useEffect(() => {
    let active = true;
    getForumPosts()
      .then((data) => {
        if (active) setPosts(data);
      })
      .catch((error) => {
        console.error("Erreur forum:", error);
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="p-8 max-w-[1200px] mx-auto text-[#1E293B]">
      <header className="flex flex-col md:flex-row md:items-end md:justify-between gap-5 mb-8">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-wider text-[#8B6CF6]">
            Communauté
          </p>

          <h1 className="text-5xl font-extrabold tracking-tight mt-1">
            Forum étudiant
          </h1>

          <p className="text-slate-500 mt-2">
            Pose tes questions et échange avec les autres étudiants.
          </p>
        </div>

        <button
          onClick={loadPosts}
          className="h-12 px-5 rounded-2xl bg-white border border-slate-200 font-bold flex items-center gap-2 hover:bg-slate-50"
        >
          <RefreshCw size={18} />
          Actualiser
        </button>
      </header>

      <MemiGuide
        mood="social"
        eyebrow="Communauté Memora"
        title="Pose des questions et aide les autres à apprendre."
        message="Partage une difficulté, une méthode ou une explication utile avec les autres étudiants."
        compact
        className="mb-6"
      />

      <div className="grid lg:grid-cols-[420px_1fr] gap-6">
        <form
          onSubmit={handleCreatePost}
          className="bg-white rounded-[30px] border border-slate-100 p-5 shadow-sm h-fit"
        >
          <div className="flex items-center gap-2 mb-4">
            <div className="w-10 h-10 rounded-2xl bg-[#8B6CF6]/10 text-[#8B6CF6] flex items-center justify-center">
              <Plus size={20} />
            </div>

            <h2 className="text-xl font-extrabold">
              Nouvelle publication
            </h2>
          </div>

          <div className="space-y-3">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Titre de la publication"
              className="w-full h-12 rounded-2xl border border-slate-200 px-4 outline-none focus:ring-2 focus:ring-[#8B6CF6] focus:border-transparent"
            />

            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full h-12 rounded-2xl border border-slate-200 px-4 outline-none focus:ring-2 focus:ring-[#8B6CF6] focus:border-transparent"
            >
              {categories.map((cat) => (
                <option key={cat.value} value={cat.value}>
                  {cat.label}
                </option>
              ))}
            </select>

            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Écris ton message..."
              rows={6}
              className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none resize-none focus:ring-2 focus:ring-[#8B6CF6] focus:border-transparent"
            />

            <button
              type="submit"
              className="w-full h-12 rounded-2xl bg-[#8B6CF6] text-white font-bold flex items-center justify-center gap-2 hover:bg-[#7C3AED]"
            >
              <Send size={18} />
              Publier
            </button>
          </div>
        </form>

        <section className="bg-white rounded-[30px] border border-slate-100 p-5 shadow-sm">
          <h2 className="text-xl font-extrabold mb-4 flex items-center gap-2">
            <MessageCircle className="text-[#8B6CF6]" size={22} />
            Publications
          </h2>

          {loading ? (
            <p className="text-slate-500 font-bold">Chargement...</p>
          ) : posts.length === 0 ? (
            <p className="text-slate-500">
              Aucun post pour l’instant. Crée la première publication.
            </p>
          ) : (
            <div className="space-y-4">
              {posts.map((post) => (
                <article
                  key={post.id}
                  className="rounded-3xl border border-slate-100 p-5 hover:bg-slate-50 transition"
                >
                  <div className="flex items-center gap-3 text-xs text-slate-400 font-bold mb-3">
                    <span className="flex items-center gap-1">
                      <User size={13} />
                      {post.author_username || "Utilisateur"}
                    </span>

                    <span className="flex items-center gap-1">
                      <Tag size={13} />
                      {post.category}
                    </span>
                  </div>

                  <h3 className="text-2xl font-extrabold">
                    {post.title}
                  </h3>

                  <p className="text-slate-600 mt-3 whitespace-pre-wrap">
                    {post.content}
                  </p>
                  
               <button
  type="button"
  onClick={() => toggleComments(post.id)}
  className="mt-4 text-sm font-bold text-[#8B6CF6] hover:underline"
>
  {openPostId === post.id ? "Masquer les réponses" : "Voir / répondre"}
</button>

{openPostId === post.id && (
  <div className="mt-5 border-t border-slate-100 pt-4">
    <h4 className="font-extrabold mb-3">
      Réponses
    </h4>

    {loadingComments ? (
      <p className="text-slate-400 text-sm">Chargement...</p>
    ) : (commentsByPost[post.id] || []).length === 0 ? (
      <p className="text-slate-400 text-sm">
        Aucune réponse pour l’instant.
      </p>
    ) : (
      <div className="space-y-3 mb-4">
        {(commentsByPost[post.id] || []).map((comment) => (
          <div
            key={comment.id}
            className="rounded-2xl bg-slate-50 border border-slate-100 p-3"
          >
            <p className="text-slate-700 whitespace-pre-wrap">
              {comment.content}
            </p>

            <p className="text-xs text-slate-400 mt-2 font-bold">
              {comment.author_username || "Utilisateur"}
            </p>
          </div>
        ))}
      </div>
    )}

    <form onSubmit={(e) => handleCreateComment(e, post.id)}>
      <textarea
        value={commentTextByPost[post.id] || ""}
        onChange={(e) =>
          setCommentTextByPost((prev) => ({
            ...prev,
            [post.id]: e.target.value,
          }))
        }
        placeholder="Écris une réponse..."
        rows={3}
        className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none resize-none focus:ring-2 focus:ring-[#8B6CF6] focus:border-transparent"
      />

      <button
        type="submit"
        className="mt-3 h-11 px-5 rounded-2xl bg-[#34D399] text-white font-bold flex items-center gap-2 hover:bg-[#10B981]"
      >
        <Send size={16} />
        Répondre
      </button>
    </form>
  </div>
)}


 </article>
 ))}
 </div>
 )}
</section>
</div>
</div>
);
}

export default Forum;

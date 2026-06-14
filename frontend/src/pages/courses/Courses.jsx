import { useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { getCourseFileBlob, getCourses, uploadCoursePDF, updateCourse, deleteCourseApi, generateFlashcardsFromCourse, generateSummaryFromCourse, askQuestionFromCourse } from "../../services/api";
import {
  Search,
  Filter,
  ArrowRight,
  Grid3x3,
  List,
  X,
  UploadCloud,
  Pencil,
  FileText,
  Sparkles,
  Trash2,
  Bot,
  Send,
  Folder,
  MoreHorizontal,
Check,

} from "lucide-react";
import { MemiGuide } from "../../components/AnimatedMemi";

const initialSubjects = [];
const initialCourses = [];

function Courses() {
  const fileInputRef = useRef(null);

  const [subjects, setSubjects] = useState(initialSubjects);
  const [courses, setCourses] = useState(initialCourses);
  const [query, setQuery] = useState("");
  const [activeSub, setActiveSub] = useState("all");
  const [view, setView] = useState("grid");
  const [openCourse, setOpenCourse] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [newSubject, setNewSubject] = useState("");
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [loadingFlashcards, setLoadingFlashcards] = useState(false);
  const [flashcardsReady, setFlashcardsReady] = useState(false);
  const [globalChatOpen, setGlobalChatOpen] = useState(false);
  const [globalQuestion, setGlobalQuestion] = useState("");
  const [globalAnswer, setGlobalAnswer] = useState("");
  const [globalSources, setGlobalSources] = useState([]);
  const [globalLoading, setGlobalLoading] = useState(false);
  const [selectedGlobalCourse, setSelectedGlobalCourse] = useState("all");
  const [chatSessions, setChatSessions] = useState(() => {
  const saved = localStorage.getItem("memora_global_chats");
  return saved
    ? JSON.parse(saved)
    : [{ id: "chat-1", title: "Nouvelle discussion", messages: [] }];
});

const [activeChatId, setActiveChatId] = useState("chat-1");
  const [folderMenuOpen, setFolderMenuOpen] = useState(null);
const [editingSubject, setEditingSubject] = useState(null);
const [editingSubjectName, setEditingSubjectName] = useState("");
const [editingChatId, setEditingChatId] = useState(null);
const [editingChatTitle, setEditingChatTitle] = useState("");


  const [uploadingPdf, setUploadingPdf] = useState(false);
 

  useEffect(() => {
    async function loadCourses() {
      try {
        const data = await getCourses();

        const formatted = data.map((course) => ({
          id: course.id,
          title: course.title,
          subjectId: course.subject || null,
          description: "",
          chapters: [],
          summary: course.summary || "Résumé IA en attente.",
          fileName: course.file_name || "PDF",
        }));

        setCourses(formatted);
        const colors = ["#8B6CF6", "#60A5FA", "#34D399", "#FBBF24", "#F472B6"];
        setSubjects(
          [...new Set(formatted.map((course) => course.subjectId))].map((name, index) => ({
            id: name,
            name,
            color: colors[index % colors.length],
          }))
        );
      } catch (error) {
        console.error("Erreur chargement cours :", error);
      }
    }

    loadCourses();
  }, []);

  useEffect(() => {
  localStorage.setItem("memora_global_chats", JSON.stringify(chatSessions));
}, [chatSessions]);

const currentChat =
  chatSessions.find((chat) => chat.id === activeChatId) || chatSessions[0];

const startNewGlobalChat = () => {
  const newChat = {
    id: `chat-${Date.now()}`,
    title: "Nouvelle discussion",
    messages: [],
  };

  setChatSessions((prev) => [newChat, ...prev]);
  setActiveChatId(newChat.id);
  setGlobalQuestion("");
};

  const getSubject = (id) =>
    subjects.find((s) => s.id === id) || {
      id: "none",
      name: "Sans matière",
      color: "#8B6CF6",
    };

  const filtered = useMemo(() => {
    return courses.filter((course) => {
      const matchSubject =
  activeSub === "all"
    ? course.subjectId !== null
    : course.subjectId === activeSub;
      const matchSearch = course.title.toLowerCase().includes(query.toLowerCase());
      return matchSubject && matchSearch;
    });
  }, [courses, query, activeSub]);

  const openFilePicker = () => {
    fileInputRef.current?.click();
  };

  const handleFiles = async (files) => {
    const pdfs = Array.from(files || []).filter((file) =>
      file.name.toLowerCase().endsWith(".pdf")
    );

  if (pdfs.length === 0) {
    alert("Choisis un fichier PDF.");
    return;
  }

  try {
    setUploadingPdf(true);
    for (const file of pdfs) {
      const savedCourse = await uploadCoursePDF(file);

      const uploadedCourse = {
        id: savedCourse.id,
        title: savedCourse.title,
        subjectId: savedCourse.subject || "Général",
        description: "",
        chapters: [],
        summary: "Résumé IA en attente.",
        fileName: savedCourse.file_name || file.name,
      };

      setCourses((prev) => [uploadedCourse, ...prev]);
    }

    if (!subjects.some((subject) => subject.id === "Général")) {
      setSubjects((prev) => [
        ...prev,
        { id: "Général", name: "Général", color: "#8B6CF6" },
      ]);
    }

  } catch (error) {
    console.error(error);
    alert(error.message);
  } finally {
    setUploadingPdf(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }
};

  const generateSummary = async (courseId, options) => {
  try {
    setLoadingSummary(true);
      const result = await generateSummaryFromCourse(courseId);

      if (!result.summary || result.summary.trim() === "") {
        alert("Le résumé n'a pas été généré.");
        return;
      }

      setCourses((prev) =>
        prev.map((course) =>
          course.id === courseId
            ? { ...course, summary: result.summary }
            : course
        )
      );

      if (openCourse?.id === courseId) {
        setOpenCourse((prev) => ({
          ...prev,
          summary: result.summary,
        }));
      }
    } catch (error) {
      console.error(error);
      alert("Erreur pendant la génération du résumé.");
    } finally {
      setLoadingSummary(false);
    }
  };

 

  const askGlobalMemi = async () => {
  const question = globalQuestion.trim();
  if (!question || !currentChat) return;

  setGlobalQuestion("");
  setGlobalLoading(true);

  setChatSessions((prev) =>
    prev.map((chat) =>
      chat.id === currentChat.id
        ? {
            ...chat,
            title:
              chat.title === "Nouvelle discussion"
                ? question.length > 40
    ? question.substring(0, 40) + "..."
    : question
                : chat.title,
            messages: [...chat.messages, { role: "user", text: question }],
          }
        : chat
    )
  );

  try {
    const token = localStorage.getItem("token");

    const res = await fetch("http://127.0.0.1:8000/api/courses/global-chat/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Token ${token}`,
      },
      body: JSON.stringify({
        question,
        course_id: selectedGlobalCourse === "all" ? null : selectedGlobalCourse,
      }),
    });

    const data = await res.json();

    setChatSessions((prev) =>
      prev.map((chat) =>
        chat.id === currentChat.id
          ? {
              ...chat,
              messages: [
                ...chat.messages,
                {
                  role: "assistant",
                  text: data.answer || "Je n’ai pas trouvé de réponse.",
                  sources: data.sources || [],
                },
              ],
            }
          : chat
      )
    );
  } catch (error) {
    setChatSessions((prev) =>
      prev.map((chat) =>
        chat.id === currentChat.id
          ? {
              ...chat,
              messages: [
                ...chat.messages,
                {
                  role: "assistant",
                  text: "Erreur pendant la génération de la réponse.",
                  sources: [],
                },
              ],
            }
          : chat
      )
    );
    console.error(error);
    alert(error.message);
  } finally {
    setGlobalLoading(false);
  }
};

const generateFlashcards = async (courseId, options) => {
  try {
    setLoadingFlashcards(true);
    await generateFlashcardsFromCourse(courseId, options);
    setFlashcardsReady(true);
  } catch (error) {
    console.error("Erreur génération flashcards :", error);
    alert(error.message);
  }finally {
    setLoadingFlashcards(false);
  }
};

const addSubject = () => {
    const name = newSubject.trim();
    if (!name || subjects.some((subject) => subject.name.toLowerCase() === name.toLowerCase())) return;

    const colors = ["#8B6CF6", "#60A5FA", "#34D399", "#FBBF24", "#F472B6"];

    setSubjects((prev) => [
      ...prev,
      {
        id: name,
        name,
        color: colors[prev.length % colors.length],
      },
    ]);

    setNewSubject("");
  };

  const renameCourse = async (id, newTitle) => {
    try {
      await updateCourse(id, { title: newTitle });
      setCourses((prev) =>
        prev.map((course) => course.id === id ? { ...course, title: newTitle } : course)
      );
      if (openCourse?.id === id) setOpenCourse((prev) => ({ ...prev, title: newTitle }));
    } catch (error) {
      alert(error.message);
    }
  };

  const assignSubject = async (id, subjectId) => {
    try {
      await updateCourse(id, { subject: subjectId });
      setCourses((prev) =>
        prev.map((course) => course.id === id ? { ...course, subjectId } : course)
      );
      setOpenCourse((prev) => prev?.id === id ? { ...prev, subjectId } : prev);
    } catch (error) {
      alert(error.message);
    }
  };

  const deleteCourse = async (id) => {
    try {
      await deleteCourseApi(id);
      setCourses((prev) => prev.filter((course) => course.id !== id));
      if (openCourse?.id === id) setOpenCourse(null);
    } catch (error) {
      console.error(error);
      alert("Erreur pendant la suppression du cours.");
    }
  };

  return (
    <div className="min-h-screen px-10 py-8 text-[#1E293B]">
      <input
        ref={fileInputRef}
        type="file"
        accept="application/pdf"
        multiple
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />

      <header className="flex flex-col xl:flex-row xl:items-end xl:justify-between gap-6 mb-8">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-wider text-[#8B6CF6]">
            Bibliothèque
          </p>

          <h1 className="text-5xl font-extrabold tracking-tight mt-1">
            Mes cours
          </h1>

          <p className="text-slate-500 mt-2">
            {courses.length} cours ·{" "}
            {courses.reduce((sum, course) => sum + course.chapters.length, 0)} chapitres
          </p>
        </div>

        <div className="flex items-center gap-3">

          <button
            onClick={() => setGlobalChatOpen(true)}
            className="h-12 px-5 rounded-2xl bg-emerald-400 text-white font-bold flex items-center gap-2 shadow-lg shadow-emerald-200 hover:bg-emerald-500 hover:-translate-y-0.5 transition"
          >
            <Bot size={20} />
            Memi
          </button>

          <div className="relative">
            <Search
              className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
              size={20}
            />

            <input
              placeholder="Rechercher un cours..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-[330px] h-12 rounded-2xl border border-slate-200 bg-white pl-12 pr-4 outline-none focus:ring-2 focus:ring-[#8B6CF6]/40"
            />
          </div>

          <div className="flex bg-white border border-slate-200 rounded-2xl p-1">
            <button
              onClick={() => setView("grid")}
              className={`p-2 rounded-xl ${view === "grid"
                  ? "bg-[#8B6CF6]/10 text-[#8B6CF6]"
                  : "text-slate-400"
                }`}
            >
              <Grid3x3 size={19} />
            </button>

            <button
              onClick={() => setView("list")}
              className={`p-2 rounded-xl ${view === "list"
                  ? "bg-[#8B6CF6]/10 text-[#8B6CF6]"
                  : "text-slate-400"
                }`}
            >
              <List size={19} />
            </button>
          </div>
        </div>
      </header>

      {uploadingPdf && (
        <MemiGuide
          mood="working"
          eyebrow="Import du cours"
          title="Je lis ton document..."
          message="Je vérifie le PDF et prépare ton cours pour les prochaines générations."
          compact
          className="mb-6"
        />
      )}

      <section
        onClick={openFilePicker}
        onDragOver={(e) => {
          e.preventDefault();
          setDragActive(true);
        }}
        onDragLeave={() => setDragActive(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragActive(false);
          handleFiles(e.dataTransfer.files);
        }}
        className={`mb-8 rounded-[30px] border-2 border-dashed px-8 py-9 flex items-center justify-between transition cursor-pointer ${dragActive
            ? "border-[#8B6CF6] bg-[#8B6CF6]/10"
            : "border-[#8B6CF6]/30 bg-white"
          }`}
      >
        <div className="flex items-center gap-6">
          <div className="w-20 h-20 rounded-[28px] bg-[#8B6CF6]/10 text-[#8B6CF6] flex items-center justify-center">
            <UploadCloud size={38} />
          </div>

          <div>
            <h2 className="font-extrabold text-2xl">Glisse ton PDF ici</h2>
            <p className="text-[#8B6CF6] font-bold mt-1">
              ou clique pour sélectionner un fichier
            </p>
            <p className="text-sm text-slate-500 mt-2">
              Memora créera un cours, puis l’IA générera le résumé et les chapitres.
            </p>
          </div>
        </div>


      </section>

      <div className="flex flex-col lg:flex-row lg:items-center gap-3 mb-5">
        <input
          value={newSubject}
          onChange={(e) => setNewSubject(e.target.value)}
          placeholder="Créer un dossier..."
          className="h-11 rounded-2xl border border-slate-200 bg-white px-4 outline-none focus:ring-2 focus:ring-[#8B6CF6]/40"
        />

        <button
          onClick={addSubject}
          className="h-11 px-5 rounded-2xl bg-[#1E293B] text-white font-bold hover:bg-[#0f172a]"
        >
          Créer un dossier
        </button>
      </div>

      <div className="flex items-center gap-2 flex-wrap pb-2 mb-8 overflow-visible">
        

        <button
          onClick={() => setActiveSub("all")}
          className={`px-4 py-2 rounded-full text-sm font-bold flex items-center gap-2 whitespace-nowrap ${activeSub === "all"
              ? "bg-[#1E293B] text-white"
              : "bg-white border border-slate-200 text-slate-600"
            }`}
        >
          <Filter size={16} />
          Tous les cours
        </button>

        {subjects.map((subject) => (
  <div key={subject.id} className="relative">
    <button
      onClick={() => setActiveSub(subject.id)}
      className={`px-4 py-2 rounded-full text-sm font-bold flex items-center gap-2 whitespace-nowrap ${
        activeSub === subject.id
          ? "text-white"
          : "bg-white border border-slate-200 text-slate-600"
      }`}
      style={activeSub === subject.id ? { background: subject.color } : {}}
    >
      <span
        className="w-2 h-2 rounded-full"
        style={{
          background: activeSub === subject.id ? "white" : subject.color,
        }}
      />

      {subject.name}

      <span className="ml-1 text-xs opacity-70">
        {courses.filter((course) => course.subjectId === subject.id).length} cours
      </span>

      <span
        onClick={(e) => {
          e.stopPropagation();
          setFolderMenuOpen(folderMenuOpen === subject.id ? null : subject.id);
        }}
        className="ml-1 px-1 rounded-full hover:bg-black/10"
      >
        ⋯
      </span>
    </button>


    {folderMenuOpen === subject.id && (
  <div className="absolute top-11 right-0 z-[999] w-40 bg-white border border-slate-100 rounded-2xl shadow-2xl p-2">
    <button
  onClick={() => {
    const newName = prompt("Nouveau nom du dossier :", subject.name);
    if (!newName || !newName.trim()) return;

    setSubjects((prev) =>
      prev.map((s) =>
        s.id === subject.id
          ? { ...s, id: newName.trim(), name: newName.trim() }
          : s
      )
    );

    setCourses((prev) =>
      prev.map((course) =>
        course.subjectId === subject.id
          ? { ...course, subjectId: newName.trim() }
          : course
      )
    );

    if (activeSub === subject.id) setActiveSub(newName.trim());
    setFolderMenuOpen(null);
  }}
  className="w-full text-left px-3 py-2 rounded-xl text-sm font-bold text-[#1E293B] hover:bg-slate-100"
>
  Modifier
</button>

    <button
  onClick={() => {
    const confirmDelete = window.confirm(
      `Si tu supprimes le dossier "${subject.name}", tous les cours qu'il contient seront aussi supprimés. Continuer ?`
    );

    if (!confirmDelete) return;

    setCourses((prev) =>
      prev.filter((course) => course.subjectId !== subject.id)
    );

    setSubjects((prev) => prev.filter((s) => s.id !== subject.id));

    if (activeSub === subject.id) setActiveSub("all");

    setFolderMenuOpen(null);
  }}
  className="w-full text-left px-3 py-2 rounded-xl text-sm font-bold text-red-500 hover:bg-red-50"
>
  Supprimer
</button>
  </div>
)}
  </div>
))}
</div>
      {filtered.length === 0 ? (
        <EmptyState />
      ) : view === "grid" ? (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filtered.map((course) => (
            <CourseCard
              key={course.id}
              course={course}
              getSubject={getSubject}
              onOpen={() => setOpenCourse(course)}
              onRename={renameCourse}
              onDelete={deleteCourse}
            />
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-[28px] border border-slate-100 divide-y divide-slate-100 overflow-hidden">
          {filtered.map((course) => (
            <CourseRow
              key={course.id}
              course={course}
              getSubject={getSubject}
              onOpen={() => setOpenCourse(course)}
              onDelete={deleteCourse}
            />
          ))}
        </div>
      )}

      {openCourse && (
        <CourseDrawer
          course={openCourse}
          getSubject={getSubject}
          onClose={() => setOpenCourse(null)}
          onRename={renameCourse}
          onDelete={deleteCourse}
          onGenerateSummary={generateSummary}
          loadingSummary={loadingSummary}
          onGenerateFlashcards={generateFlashcards}
          loadingFlashcards={loadingFlashcards}
          flashcardsReady={flashcardsReady}
          subjects={subjects}
          onAssignSubject={assignSubject}
        />
      )}

      {globalChatOpen && (
  <div
    className="fixed inset-0 z-[999] bg-[#1E293B]/30 backdrop-blur-sm flex items-center justify-center p-6"
    onClick={() => setGlobalChatOpen(false)}
  >
    <div
      onClick={(e) => e.stopPropagation()}
      className="w-full max-w-[980px] h-[80vh] bg-white rounded-[34px] shadow-2xl overflow-hidden flex"
    >
      {/* COLONNE GAUCHE */}
      <aside className="w-[260px] bg-slate-50 border-r border-slate-100 p-4 flex flex-col">
        <div className="flex items-center gap-3 mb-4">
          <img
  src="/memi.png"
  alt="Memi"
  className="w-12 h-12 rounded-2xl"
/>

          <div>
            <p className="text-xs font-extrabold text-emerald-500 uppercase">
              Memi IA
            </p>
            <p className="text-sm font-bold text-slate-500">
              Discussions
            </p>
          </div>
        </div>

        <button
          onClick={startNewGlobalChat}
          className="h-11 rounded-2xl bg-emerald-400 text-white font-bold mb-4 hover:bg-emerald-500"
        >
          + Nouvelle discussion
        </button>

        <div className="flex-1 overflow-y-auto space-y-2">
          {chatSessions.map((chat) => (
            <button
  key={chat.id}
  onClick={() => setActiveChatId(chat.id)}
  onDoubleClick={() => {
  setEditingChatId(chat.id);
  setEditingChatTitle(chat.title);
}}
  className={`w-full text-left px-3 py-3 rounded-2xl text-sm font-bold transition ${
    activeChatId === chat.id
      ? "bg-white text-[#1E293B] shadow-sm"
      : "text-slate-500 hover:bg-white"
  }`}
>
  <div className="flex items-center justify-between">
  <span className="truncate">{editingChatId === chat.id ? (
  <input
    value={editingChatTitle}
    autoFocus
    onChange={(e) => setEditingChatTitle(e.target.value)}
    onBlur={() => {
      if (editingChatTitle.trim()) {
        setChatSessions((prev) =>
          prev.map((c) =>
            c.id === chat.id
              ? { ...c, title: editingChatTitle.trim() }
              : c
          )
        );
      }

      setEditingChatId(null);
    }}
    onKeyDown={(e) => {
      if (e.key === "Enter") {
        if (editingChatTitle.trim()) {
          setChatSessions((prev) =>
            prev.map((c) =>
              c.id === chat.id
                ? { ...c, title: editingChatTitle.trim() }
                : c
            )
          );
        }

        setEditingChatId(null);
      }
    }}
    className="w-full bg-transparent outline-none font-bold"
  />
) : (
  <span>{chat.title}</span>
)}</span>

  <button
    onClick={(e) => {
      e.stopPropagation();

      const ok = window.confirm(
        "Supprimer cette discussion ?"
      );

      if (!ok) return;

      const remaining = chatSessions.filter(
        (c) => c.id !== chat.id
      );

      setChatSessions(
        remaining.length
          ? remaining
          : [
              {
                id: "chat-1",
                title: "Nouvelle discussion",
                messages: [],
              },
            ]
      );

      if (activeChatId === chat.id) {
        setActiveChatId(
          remaining[0]?.id || "chat-1"
        );
      }
    }}
    className="text-slate-300 hover:text-red-500"
  >
    ×
  </button>
</div>
</button>
          ))}
        </div>
      </aside>

      {/* PARTIE DROITE */}
      <section className="flex-1 flex flex-col">
        <header className="p-6 border-b border-slate-100 flex items-start justify-between">
          <div>
            

            <h2 className="text-3xl font-extrabold text-[#1E293B]">
              Pose une question à ta bibliothèque
            </h2>

            <p className="text-slate-500 mt-1">
              Memi répond à partir de tes cours et affiche les sources utilisées.
            </p>
          </div>

          <button
            onClick={() => setGlobalChatOpen(false)}
            className="w-10 h-10 rounded-2xl bg-slate-100 text-slate-500 flex items-center justify-center hover:bg-slate-200"
          >
            <X size={20} />
          </button>
        </header>

        <div className="px-6 pt-4">
          <label className="text-sm font-bold text-slate-500">
            Source de recherche
          </label>

          <select
            value={selectedGlobalCourse}
            onChange={(e) => setSelectedGlobalCourse(e.target.value)}
            className="mt-2 w-full h-11 rounded-2xl border border-slate-200 px-4 outline-none focus:ring-2 focus:ring-emerald-300/50"
          >
            <option value="all">Tous mes cours</option>

            {courses.map((course) => (
              <option key={course.id} value={course.id}>
                {course.title}
              </option>
            ))}
          </select>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {currentChat?.messages.length === 0 && (
            <div className="h-full flex items-center justify-center text-center text-slate-400">
              <div>
                <img
  src="/memi.png"
  alt="Memi"
  className="w-20 h-20 mx-auto mb-3 rounded-3xl"
/>
                <p className="font-bold text-slate-600">
                  Commence une discussion avec Memi
                </p>
                <p className="text-sm mt-1">
                  Pose une question sur tous tes cours ou sur un cours précis.
                </p>
              </div>
            </div>
          )}

          {currentChat?.messages.map((message, index) => (
            <div
              key={index}
              className={`flex ${
                message.role === "user" ? "justify-end" : "justify-start"
              }`}
            >
              <div
                className={`max-w-[75%] rounded-3xl px-5 py-4 leading-7 ${
                  message.role === "user"
                    ? "bg-emerald-400 text-white rounded-br-md"
                    : "bg-slate-50 text-slate-700 rounded-bl-md border border-slate-100"
                }`}
              >
                <ReactMarkdown>{message.text}</ReactMarkdown>

                
              </div>
            </div>
          ))}

          {globalLoading && (
            <div className="flex justify-start">
              <div className="rounded-3xl px-5 py-4 bg-slate-50 text-emerald-500 font-bold flex items-center gap-3">
                <div className="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                <img
  src="/memi.png"
  alt="Memi"
  className="w-10 h-10"
/>
               <span className="animate-pulse">
  Memi cherche dans tes cours...
</span>
              </div>
            </div>
          )}
        </div>

        <div className="p-5 border-t border-slate-100 flex gap-2">
          <input
            value={globalQuestion}
            onChange={(e) => setGlobalQuestion(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") askGlobalMemi();
            }}
            placeholder="Écris ta question..."
            className="flex-1 h-12 rounded-2xl border border-slate-200 px-4 outline-none focus:ring-2 focus:ring-emerald-300/50"
          />

          <button
            onClick={askGlobalMemi}
            disabled={globalLoading}
            className="h-12 px-5 rounded-2xl bg-emerald-400 text-white font-bold flex items-center gap-2 shadow-lg shadow-emerald-100 hover:bg-emerald-500 disabled:opacity-60"
          >
            <Send size={18} />
            Envoyer
          </button>
        </div>
      </section>
    </div>
  </div>
)}
      
    </div>
      );

}



function CourseCard({ course, getSubject, onOpen, onRename, onDelete }) {
  const subject = getSubject(course.subjectId);
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(course.title);

  const saveTitle = () => {
    if (title.trim() !== "") {
      onRename(course.id, title.trim());
    }
    setEditing(false);
  };


  return (
    <article
      onClick={onOpen}
      className="relative bg-white rounded-[30px] border border-slate-100 p-6 overflow-hidden hover:-translate-y-1 hover:shadow-xl transition cursor-pointer"
    >
      <div
        className="absolute -top-12 -right-12 w-36 h-36 rounded-full blur-2xl opacity-20"
        style={{ background: subject.color }}
      />

      <div className="relative">
        <div className="flex items-center justify-between">
          <span
            className="text-xs font-extrabold uppercase tracking-wider px-3 py-1 rounded-full"
            style={{ background: `${subject.color}20`, color: subject.color }}
          >
            {subject.name}
          </span>

          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(course.id);
            }}
            className="text-red-400 hover:text-red-600"
          >
            <Trash2 size={18} />
          </button>
        </div>

        <div className="mt-5 flex items-center gap-2">
          {editing ? (
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={saveTitle}
              onKeyDown={(e) => e.key === "Enter" && saveTitle()}
              onClick={(e) => e.stopPropagation()}
              autoFocus
              className="w-full text-xl font-extrabold bg-slate-50 rounded-xl px-3 py-2 outline-none"
            />
          ) : (
            <h3 className="text-xl font-extrabold leading-snug flex-1">
              {course.title}
            </h3>
          )}

          <button
            onClick={(e) => {
              e.stopPropagation();
              setEditing(true);
            }}
            className="text-slate-300 hover:text-[#8B6CF6]"
          >
            <Pencil size={18} />
          </button>
        </div>



        <p className="mt-3 text-xs text-slate-400 flex items-center gap-1">
          <FileText size={14} />
          {course.fileName}
        </p>



        <div className="mt-5 flex items-center justify-between">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onOpen();
            }}
            className="text-[#8B6CF6] font-bold flex items-center gap-1"
          >
            Continuer
            <ArrowRight size={16} />
          </button>
        </div>
      </div>
    </article>
  );
}

function CourseRow({ course, getSubject, onOpen, onDelete }) {
  const subject = getSubject(course.subjectId);

  return (
    <div
      onClick={onOpen}
      className="flex items-center gap-5 p-5 hover:bg-slate-50 cursor-pointer"
    >
      <div
        className="w-12 h-12 rounded-2xl text-white font-bold flex items-center justify-center"
        style={{ background: subject.color }}
      >
        {subject.name.slice(0, 2)}
      </div>

      <div className="flex-1">
        <h3 className="font-extrabold">{course.title}</h3>
        <p className="text-sm text-slate-400">
          {subject.name}
          {course.totalTime}
        </p>
      </div>

      <button
        onClick={(e) => {
          e.stopPropagation();
          onDelete(course.id);
        }}
        className="text-red-400 hover:text-red-600"
      >
        <Trash2 size={18} />
      </button>

      <ArrowRight className="text-slate-300" size={18} />
    </div>
  );
}

function CourseDrawer({ course, getSubject, onClose, onRename, onDelete, onGenerateSummary, loadingSummary, onGenerateFlashcards, loadingFlashcards, flashcardsReady, subjects, onAssignSubject }) {
  const subject = getSubject(course.subjectId);
  const [title, setTitle] = useState(course.title);
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState([]);
  const [pdfUrl, setPdfUrl] = useState("");
  const [flashcardCount, setFlashcardCount] = useState(10);
  const [flashcardDifficulty, setFlashcardDifficulty] = useState("all");
  const [flashcardFocus, setFlashcardFocus] = useState("");
  const [summaryLines, setSummaryLines] = useState(20);
  const [summaryInstructions, setSummaryInstructions] = useState("");

  useEffect(() => {
    let objectUrl = "";
    getCourseFileBlob(course.id)
      .then((blob) => {
        objectUrl = URL.createObjectURL(blob);
        setPdfUrl(objectUrl);
      })
      .catch(() => setPdfUrl(""));

    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [course.id]);

  const save = () => {
    if (title.trim() !== "") {
      onRename(course.id, title.trim());
    }
  };

  const sendQuestion = async () => {
    if (!question.trim()) return;

    const userQuestion = question;
    setQuestion("");

    setMessages((prev) => [
      ...prev,
      { role: "user", text: userQuestion },
      { role: "assistant", text: "Memi réfléchit..." },
    ]);

    try {
      const result = await askQuestionFromCourse(course.id, userQuestion);

      setMessages((prev) => [
        ...prev.slice(0, -1),
        { role: "assistant", text: result.answer },
      ]);
    } catch (error) {
      console.error(error);

      setMessages((prev) => [
        ...prev.slice(0, -1),
        {
          role: "assistant",
          text: "Erreur pendant la génération de la réponse.",
        },
      ]);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end"
      onClick={onClose}
    >


      <div className="relative z-10 hidden lg:block w-[calc(100vw-580px)] p-8">
        <div className="h-full rounded-3xl border border-slate-200 overflow-hidden bg-white shadow-2xl">

          {pdfUrl ? (



            <iframe
              src={pdfUrl}
              title={course.title}
              className="w-full h-full"
            />
          ) : (
            <div className="h-full flex items-center justify-center text-slate-400">
              Aucun PDF disponible
            </div>
          )}
        </div>
      </div>

      <aside
        onClick={(e) => e.stopPropagation()}
        className="relative z-10 w-full md:w-[65vw] bg-white shadow-2xl overflow-y-auto rounded-l-[36px] overflow-hidden"
      >
        <div
          className="p-8 text-white relative overflow-hidden"
          style={{ background: subject.color }}
        >
          <button
            onClick={onClose}
            className="absolute top-5 right-5 w-10 h-10 rounded-2xl bg-white/20 hover:bg-white/30 flex items-center justify-center"
          >
            <X size={20} />
          </button>

          <p className="text-xs font-extrabold uppercase tracking-widest opacity-80">
            {subject.name}
          </p>

          <div className="mt-3 flex items-center gap-2">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={save}
              className="w-full bg-white/10 rounded-2xl px-3 py-2 text-3xl font-extrabold outline-none"
            />

            <Pencil size={20} />
          </div>

        </div>

        <div className="p-8">
          {(loadingFlashcards || loadingSummary) && (
            <MemiGuide
              mood={loadingSummary ? "thinking" : "working"}
              eyebrow="Memi travaille"
              title={loadingSummary ? "J’analyse ton document..." : "Je crée tes flashcards..."}
              message={loadingSummary ? "Je repère les idées importantes et prépare une synthèse claire." : "Je transforme les notions clés en cartes faciles à réviser."}
              compact
              className="mb-5"
            />
          )}
          <div className="grid gap-3 mb-6">
	  <select
    value={course.subjectId}
    onChange={(e) => onAssignSubject(course.id, e.target.value)}
    className="w-full h-12 rounded-2xl border border-slate-200 px-4 font-bold"
  >
    {subjects.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
	  </select>

  <div className="rounded-2xl bg-[#F8F5FF] p-4 grid gap-3">
    <p className="text-sm font-extrabold text-[#8B6CF6]">Options des flashcards</p>
    <div className="grid grid-cols-2 gap-3">
      <label className="text-xs font-bold text-slate-500">
        Nombre
        <input type="number" min="5" max="40" value={flashcardCount} onChange={(e) => setFlashcardCount(e.target.value === "" ? "" : Number(e.target.value))} onBlur={() => setFlashcardCount(Math.min(40, Math.max(5, Number(flashcardCount) || 10)))} className="mt-1 w-full h-10 rounded-xl border border-slate-200 px-3 bg-white" />
      </label>
      <label className="text-xs font-bold text-slate-500">
        Difficulté
        <select value={flashcardDifficulty} onChange={(e) => setFlashcardDifficulty(e.target.value)} className="mt-1 w-full h-10 rounded-xl border border-slate-200 px-3 bg-white">
          <option value="all">Mixte</option>
          <option value="easy">Facile</option>
          <option value="medium">Moyenne</option>
          <option value="hard">Difficile</option>
        </select>
      </label>
    </div>
    <input value={flashcardFocus} onChange={(e) => setFlashcardFocus(e.target.value)} maxLength={500} placeholder="Focus : définitions, formules, chapitre..." className="h-10 rounded-xl border border-slate-200 px-3 bg-white text-sm" />
  </div>
  

  <button
    type="button"
    disabled={loadingFlashcards}
	    onClick={() => onGenerateFlashcards(course.id, {
        count: flashcardCount,
        difficulty: flashcardDifficulty,
        instructions: flashcardFocus,
      })}
    className={`w-full h-12 rounded-2xl text-white font-bold flex items-center justify-center gap-2 ${
      loadingFlashcards
        ? "bg-[#A78BFA] cursor-not-allowed"
        : "bg-[#8B6CF6] hover:bg-[#7C3AED]"
    }`}
  >
    {loadingFlashcards ? (
      <>
        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
        Génération des flashcards...
      </>
    ) : (
      <>
        <Sparkles size={17} />
        Générer les flashcards
      </>
    )}
  </button>
  {flashcardsReady && (
  <button
    onClick={() => window.location.href = "/flashcards"}
    className="w-full h-12 rounded-2xl bg-[#1E293B] text-white font-bold hover:bg-[#0f172a]"
  >
    Voir les flashcards générées →
  </button>
)}
</div>
          <div className="mb-5">

  <div className="rounded-2xl bg-blue-50 p-4 grid gap-3 mb-3">
    <p className="text-sm font-extrabold text-blue-600">Options du résumé</p>
    <label className="text-xs font-bold text-slate-500">
      Longueur approximative : {summaryLines} lignes
      <input type="range" min="5" max="100" step="5" value={summaryLines} onChange={(e) => setSummaryLines(Number(e.target.value))} className="mt-2 w-full accent-[#8B6CF6]" />
    </label>
    <input value={summaryInstructions} onChange={(e) => setSummaryInstructions(e.target.value)} maxLength={500} placeholder="Consigne : insiste sur les méthodes..." className="h-10 rounded-xl border border-blue-100 px-3 bg-white text-sm" />
  </div>

	  <button
    type="button"
    disabled={loadingSummary}
	    onClick={() => onGenerateSummary(course.id, {
        line_count: summaryLines,
        instructions: summaryInstructions,
      })}
    className={`mb-4 w-full h-12 rounded-2xl text-white font-bold flex items-center justify-center gap-2 ${
      loadingSummary
        ? "bg-[#A78BFA] cursor-not-allowed"
        : "bg-[#8B6CF6] hover:bg-[#7C3AED]"
    }`}
  >
    {loadingSummary ? (
      <>
        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
        Génération du résumé...
      </>
    ) : (
      <>
        <Sparkles size={17} />
        Résumer avec l’IA
      </>
    )}
  </button>

            <div className="rounded-[30px] bg-white border border-slate-200 p-5 shadow-sm">

              <div className="space-y-4 max-h-[430px] overflow-y-auto mb-4 pr-2">

                {course.summary &&
                  course.summary !== "Résumé IA en attente." && (
                    <div className="flex justify-start">
                      <div className="w-full rounded-3xl bg-[#F8F5FF] px-5 py-4 text-slate-700 leading-8 text-[15px]">
                        <ReactMarkdown
                          components={{
                            p: ({ children }) => (
                              <p className="mb-2 leading-7 text-slate-700">
                                {children}
                              </p>
                            ),

                            h1: ({ children }) => (
                              <h1 className="text-xl font-extrabold mb-3 text-[#1E293B]">
                                {children}
                              </h1>
                            ),

                            h2: ({ children }) => (
                              <h2 className="text-lg font-bold mb-2 mt-4 text-[#1E293B]">
                                {children}
                              </h2>
                            ),

                            hr: () => null,

                            strong: ({ children }) => (
                              <strong className="font-bold text-[#1E293B]">
                                {children}
                              </strong>
                            ),
                          }}
                        >
                          {course.summary}

                        </ReactMarkdown>
                      </div>
                    </div>
                  )}

                {messages.map((message, index) => (
                  <div
                    key={index}
                    className={`flex ${message.role === "user" ? "justify-end" : "justify-start"
                      }`}
                  >
                    <div
                      className={`max-w-[60%] rounded-3xl px-4 py-3 text-[15px] leading-7 ${message.role === "user"
                          ? "bg-[#8B6CF6] text-white rounded-br-md shadow-sm"
                          : "bg-[#8B6CF6]/10 text-slate-700 rounded-bl-md"
                        }`}
                    >
                      {message.text}
                    </div>
                  </div>
                ))}

              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") sendQuestion();
                  }}
                  placeholder="Pose une question sur ce cours..."
                  className="flex-1 h-12 rounded-2xl border border-slate-200 px-4 outline-none focus:ring-2 focus:ring-[#8B6CF6]/30"
                />

                <button
                  type="button"
                  onClick={sendQuestion}
                  className="h-12 px-5 rounded-2xl bg-[#1E293B] text-white font-bold"
                >
                  Envoyer
                </button>
              </div>

            </div>
          </div>


          <button
            onClick={() => onDelete(course.id)}
            className="mt-3 w-full h-12 rounded-2xl bg-red-50 text-red-500 font-bold hover:bg-red-100"
          >
            Supprimer ce cours
          </button>
        </div>
      </aside>
    </div>
  );
}

function EmptyState() {
  return (
    <MemiGuide
      mood="welcome"
      eyebrow="Bibliothèque vide"
      title="Commençons à apprendre !"
      message="Glisse ton premier PDF dans la zone au-dessus et je t’aiderai à créer résumés, flashcards et quiz."
    />
  );
}



  


export default Courses;

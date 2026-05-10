import { useEffect, useMemo, useRef, useState } from "react";
import { getCourses, uploadCoursePDF } from "../../services/api";
import {
  Search,
  Plus,
  Filter,
  Clock3,
  BookOpen,
  ArrowRight,
  Grid3x3,
  List,
  X,
  UploadCloud,
  Pencil,
  FileText,
  Sparkles,
  Trash2,
} from "lucide-react";

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
  
  useEffect(() => {
  async function loadCourses() {
    try {
      const data = await getCourses();

      const formatted = data.map((course) => ({
        id: course.id,
        title: course.title,
        subjectId: "general",
        description: "PDF importé dans la base Django.",
        chapters: ["Résumé du document", "Notions importantes", "Questions possibles"],
        progress: 0,
        totalTime: "0h 00",
        lastStudied: "À l’instant",
        summary: "Résumé IA en attente.",
        fileName: course.file?.split("/").pop() || "PDF",
      }));

      setCourses(formatted);
    } catch (error) {
      console.error("Erreur chargement cours :", error);
    }
  }

  loadCourses();
}, []);

  const getSubject = (id) =>
    subjects.find((s) => s.id === id) || {
      id: "general",
      name: "Sans matière",
      color: "#8B6CF6",
    };

  const filtered = useMemo(() => {
    return courses.filter((course) => {
      const matchSubject = activeSub === "all" || course.subjectId === activeSub;
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
    const uploadedCourses = [];

    for (const file of pdfs) {
      const savedCourse = await uploadCoursePDF(file);

      uploadedCourses.push({
        id: savedCourse.id,
        title: savedCourse.title,
        subjectId: "general",
        description: "PDF importé dans la base Django.",
        chapters: ["Résumé du document", "Notions importantes", "Questions possibles"],
        progress: 0,
        totalTime: "0h 00",
        lastStudied: "À l’instant",
        summary: "Résumé IA en attente.",
        fileName: savedCourse.file?.split("/").pop() || file.name,
      });
    }

    setCourses((prev) => [...uploadedCourses, ...prev]);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  } catch (error) {
    console.error(error);
    alert("Erreur pendant l’upload du PDF.");
  }
};

  const generateSummary = () => {
  if (courses.length === 0) {
    alert("Importe d'abord un PDF.");
    return;
  }

  alert("Résumé IA en cours... Le backend Django fera cette partie.");
};

const addSubject = () => {
    if (!newSubject.trim()) return;

    const colors = ["#8B6CF6", "#60A5FA", "#34D399", "#FBBF24", "#F472B6"];

    setSubjects((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        name: newSubject.trim(),
        color: colors[prev.length % colors.length],
      },
    ]);

    setNewSubject("");
  };

  const renameCourse = (id, newTitle) => {
    setCourses((prev) =>
      prev.map((course) =>
        course.id === id ? { ...course, title: newTitle } : course
      )
    );

    if (openCourse?.id === id) {
      setOpenCourse((prev) => ({ ...prev, title: newTitle }));
    }
  };

  const deleteCourse = (id) => {
    setCourses((prev) => prev.filter((course) => course.id !== id));
    if (openCourse?.id === id) setOpenCourse(null);
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
              className={`p-2 rounded-xl ${
                view === "grid"
                  ? "bg-[#8B6CF6]/10 text-[#8B6CF6]"
                  : "text-slate-400"
              }`}
            >
              <Grid3x3 size={19} />
            </button>

            <button
              onClick={() => setView("list")}
              className={`p-2 rounded-xl ${
                view === "list"
                  ? "bg-[#8B6CF6]/10 text-[#8B6CF6]"
                  : "text-slate-400"
              }`}
            >
              <List size={19} />
            </button>
          </div>
        </div>
      </header>

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
        className={`mb-8 rounded-[30px] border-2 border-dashed px-8 py-9 flex items-center justify-between transition cursor-pointer ${
          dragActive
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

        <button
  type="button"
  onClick={(e) => {
    e.stopPropagation();
    generateSummary();
  }}
  className="hidden md:inline-flex items-center gap-2 px-5 py-3 rounded-2xl border border-slate-200 bg-white text-sm font-bold text-[#8B6CF6] hover:bg-[#8B6CF6]/10 transition"
>
  <Sparkles size={17} />
  Résumer avec l’IA
</button>
      </section>

      <div className="flex flex-col lg:flex-row lg:items-center gap-3 mb-5">
        <input
          value={newSubject}
          onChange={(e) => setNewSubject(e.target.value)}
          placeholder="Ajouter une matière : Réseaux, Compilation, BDD..."
          className="h-11 rounded-2xl border border-slate-200 bg-white px-4 outline-none focus:ring-2 focus:ring-[#8B6CF6]/40"
        />

        <button
          onClick={addSubject}
          className="h-11 px-5 rounded-2xl bg-[#1E293B] text-white font-bold hover:bg-[#0f172a]"
        >
          Ajouter matière
        </button>
      </div>

      <div className="flex items-center gap-2 overflow-x-auto pb-2 mb-8">
        <button
          onClick={() => setActiveSub("all")}
          className={`px-4 py-2 rounded-full text-sm font-bold flex items-center gap-2 whitespace-nowrap ${
            activeSub === "all"
              ? "bg-[#1E293B] text-white"
              : "bg-white border border-slate-200 text-slate-600"
          }`}
        >
          <Filter size={16} />
          Tous les cours
        </button>

        {subjects.map((subject) => (
          <button
            key={subject.id}
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
          </button>
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
        />
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

        <p className="mt-3 text-sm text-slate-500 leading-relaxed line-clamp-2">
          {course.description}
        </p>

        <p className="mt-3 text-xs text-slate-400 flex items-center gap-1">
          <FileText size={14} />
          {course.fileName}
        </p>

        <div className="mt-5">
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="font-bold text-slate-500">
              {course.chapters.length} chapitres
            </span>
            <span className="font-extrabold">{course.progress}%</span>
          </div>

          <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
            <div
              className="h-full rounded-full"
              style={{
                width: `${course.progress}%`,
                background: subject.color,
              }}
            />
          </div>
        </div>

        <div className="mt-5 flex items-center justify-between">
          <span className="text-sm text-slate-400">{course.lastStudied}</span>

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
          {subject.name} · {course.chapters.length} chapitres ·{" "}
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

function CourseDrawer({ course, getSubject, onClose, onRename, onDelete }) {
  const subject = getSubject(course.subjectId);
  const [title, setTitle] = useState(course.title);

  const save = () => {
    if (title.trim() !== "") {
      onRename(course.id, title.trim());
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button
        onClick={onClose}
        className="absolute inset-0 bg-[#1E293B]/30 backdrop-blur-sm"
      />

      <aside className="relative z-10 w-full md:w-[580px] bg-white shadow-2xl overflow-y-auto">
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

          <p className="mt-4 text-white/90 leading-relaxed">
            {course.description}
          </p>

          <div className="mt-5 flex gap-2">
            <Meta label={`${course.chapters.length} chapitres`} />
            <Meta label={course.totalTime} />
            <Meta label={`${course.progress}% terminé`} />
          </div>
        </div>

        <div className="p-8">
          <h3 className="text-sm font-extrabold uppercase tracking-wider mb-4">
            Résumé IA
          </h3>

          <div className="rounded-3xl bg-[#8B6CF6]/5 border border-[#8B6CF6]/10 p-5 text-slate-600 leading-relaxed mb-7">
            {course.summary}
          </div>

          <h3 className="text-sm font-extrabold uppercase tracking-wider mb-4">
            Chapitres générés
          </h3>

          <div className="space-y-3">
            {course.chapters.map((chapter, index) => (
              <div
                key={`${chapter}-${index}`}
                className="flex items-center gap-4 p-4 rounded-2xl border border-slate-100 hover:bg-slate-50"
              >
                <div className="w-10 h-10 rounded-2xl bg-slate-100 text-slate-500 flex items-center justify-center font-bold">
                  {index + 1}
                </div>

                <p className="flex-1 font-bold">
                  Chapitre {index + 1} — {chapter}
                </p>

                <BookOpen className="text-slate-300" size={20} />
              </div>
            ))}
          </div>

          <button className="mt-7 w-full h-12 rounded-2xl bg-[#1E293B] text-white font-bold hover:bg-[#0f172a]">
            Reprendre ce cours
          </button>

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

function Meta({ label }) {
  return (
    <span className="px-3 py-1 rounded-full bg-white/20 text-xs font-bold">
      {label}
    </span>
  );
}

function EmptyState() {
  return (
    <div className="bg-white rounded-3xl border border-dashed border-slate-200 p-12 text-center">
      <div className="text-5xl mb-4">📁</div>

      <h3 className="mt-3 text-lg font-bold text-[#1E293B]">
        Aucun cours pour le moment
      </h3>

      <p className="text-sm text-slate-400 mt-1">
        Glisse ton premier PDF dans la zone au-dessus pour créer ton cours automatiquement.
      </p>
    </div>
  );
}



export default Courses;

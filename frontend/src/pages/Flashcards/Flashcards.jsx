import { useEffect, useMemo, useRef, useState } from "react";
import flashcard from "/src/assets/flashcard.png";
import memiImage from "/src/assets/mascot.png";
import { deleteDeck, getDecks, uploadCoursePDF, generateFlashcardsFromCourse } from "../../services/api";
import AnimatedMemi, { MemiGuide } from "../../components/AnimatedMemi";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  RotateCcw,
  Sparkles,
  Layers,
  Search,
  Shuffle,
  UploadCloud,
  Trash2,
} from "lucide-react";

const initialDecks = []

function Flashcards() {
  const fileInputRef = useRef(null);
  const [mode, setMode] = useState("study");
  const [decks, setDecks] = useState(initialDecks);
  const [deckId, setDeckId] = useState(null);
  const [search, setSearch] = useState("");
  const [idx, setIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [progress, setProgress] = useState({ hard: 0, good: 0, easy: 0 });
  const [shuffledCards, setShuffledCards] = useState([]);
  const [difficultyFilter, setDifficultyFilter] = useState("all");
  const [generationCount, setGenerationCount] = useState(10);
  const [generationDifficulty, setGenerationDifficulty] = useState("all");
  const [generationFocus, setGenerationFocus] = useState("");

  

  useEffect(() => {
    async function loadDecks() {
      try {
        const data = await getDecks();

        if (Array.isArray(data) && data.length > 0) {
  setDecks(data);
  setDeckId(data[0].id);
} else {
  setDecks([]);
  setDeckId(null);
}
      } catch (error) {
        console.error("Erreur lors du chargement des flashcards :", error);
        setDecks([]);
  setDeckId(null);
      }
    }

    loadDecks();
  }, []);

  const filteredDecks = useMemo(
    () =>
      decks.filter((deck) =>
        deck.title.toLowerCase().includes(search.toLowerCase())
      ),
    [decks, search]
  );

  const deck = decks.find((d) => d.id === deckId);
  const activeCards = (shuffledCards.length > 0 ? shuffledCards : deck?.cards || [])
    .filter((item) => difficultyFilter === "all" || item.difficulty === difficultyFilter);

  const card = activeCards[idx];
  const total = activeCards.length || 0;
  const finished = idx >= total;


  const selectDeck = (id) => {
    setDeckId(id);
    setIdx(0);
    setFlipped(false);
    setProgress({ hard: 0, good: 0, easy: 0 });
    setShuffledCards([]);
  };

  const handlePdf = async (files) => {
    const pdf = Array.from(files || []).find((file) =>
      file.name.toLowerCase().endsWith(".pdf")
    );

    if (!pdf) return alert("Choisis un fichier PDF.");

    try {
      const savedCourse = await uploadCoursePDF(pdf);
      await generateFlashcardsFromCourse(savedCourse.id, {
        count: generationCount,
        difficulty: generationDifficulty,
        instructions: generationFocus,
      });

      const data = await getDecks();
      setDecks(data);
      setDeckId(data[0]?.id || null);
      setMode("study");

      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (error) {
      console.error(error);
      alert(error.message);
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  if (!deck) {
  return (
    <div className="relative min-h-screen p-8 max-w-[1500px] mx-auto text-[#1E293B] overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-gradient-to-br from-[#F8FAFC] via-[#F3E8FF] to-[#EEF2FF]" />
        <div className="absolute -top-32 -right-32 -z-10 w-96 h-96 rounded-full bg-[#8B6CF6]/25 blur-3xl" />
        <div className="absolute top-80 -left-32 -z-10 w-96 h-96 rounded-full bg-[#C084FC]/25 blur-3xl" />
       <div className="absolute bottom-0 right-1/4 -z-10 w-80 h-80 rounded-full bg-[#60A5FA]/20 blur-3xl" />

      <input
        ref={fileInputRef}
        type="file"
        accept="application/pdf"
        hidden
        onChange={(e) => handlePdf(e.target.files)}
      />

      <header className="flex items-end justify-between gap-5 mb-8">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-wider text-[#8B6CF6]">
            Mémorisation espacée
          </p>
          <h1 className="text-5xl font-extrabold tracking-tight mt-1">
            Flashcards
          </h1>
          <p className="text-slate-500 mt-2">
            Aucun deck pour le moment. Génère tes premières flashcards depuis un PDF.
          </p>
        </div>
      </header>

      <MemiGuide
        mood="welcome"
        eyebrow="Premières flashcards"
        title="Ajoute un cours et je prépare tes cartes."
        message="Choisis le nombre, la difficulté et le sujet à privilégier, puis envoie ton PDF."
        compact
        className="mb-6"
      />

      <PdfGenerator
        onClick={() => fileInputRef.current?.click()}
        count={generationCount}
        setCount={setGenerationCount}
        difficulty={generationDifficulty}
        setDifficulty={setGenerationDifficulty}
        focus={generationFocus}
        setFocus={setGenerationFocus}
      />
    </div>
  );
}
  const restart = () => {
    setIdx(0);
    setFlipped(false);
    setProgress({ hard: 0, good: 0, easy: 0 });
  };

  const shuffleCards = () => {
  const shuffled = [...deck.cards];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }

  setShuffledCards(shuffled);
  setIdx(0);
  setFlipped(false);
};

  const handleRate = (kind) => {
    setProgress((prev) => ({ ...prev, [kind]: prev[kind] + 1 }));
    setFlipped(false);
    setTimeout(() => setIdx((i) => i + 1), 200);
  };

  return (
    <div className="relative min-h-screen p-8 max-w-[1500px] mx-auto text-[#1E293B] overflow-hidden">
      <div className="absolute inset-0 -z-10 bg-gradient-to-br from-[#F8FAFC] via-[#F3E8FF] to-[#EEF2FF]" />
      <div className="absolute -top-32 -right-32 -z-10 w-96 h-96 rounded-full bg-[#8B6CF6]/25 blur-3xl" />
      <div className="absolute top-80 -left-32 -z-10 w-96 h-96 rounded-full bg-[#C084FC]/25 blur-3xl" />
    <div className="absolute bottom-0 right-1/4 -z-10 w-80 h-80 rounded-full bg-[#60A5FA]/20 blur-3xl" />
      <input
        ref={fileInputRef}
        type="file"
        accept="application/pdf"
        hidden
        onChange={(e) => handlePdf(e.target.files)}
      />

      <header className="flex items-end justify-between gap-5 mb-8">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-wider text-[#8B6CF6]">
            Mémorisation espacée
          </p>
          <h1 className="text-5xl font-extrabold tracking-tight mt-1">
            Flashcards
          </h1>
          <p className="text-slate-500 mt-2">
            Concentre-toi ! Memi t’accompagne.
          </p>
        </div>

        <button
          onClick={() => setMode("pdf")}
          className="h-12 px-5 rounded-2xl bg-[#8B6CF6] text-white font-bold flex items-center gap-2 shadow-lg hover:bg-[#7C3AED]"
        >
          <Plus size={20} />
          Nouvelles flashcards
        </button>
      </header>

      <div className="inline-flex bg-white border border-slate-100 rounded-3xl p-2 shadow-sm mb-7">
        <button
          onClick={() => setMode("study")}
          className={`px-6 py-3 rounded-2xl font-bold ${mode === "study" ? "bg-[#8B6CF6] text-white" : "text-[#1E293B]"
            }`}
        >
          🃏 Mes flashcards
        </button>

        <button
          onClick={() => setMode("pdf")}
          className={`px-6 py-3 rounded-2xl font-bold ${mode === "pdf" ? "bg-[#8B6CF6] text-white" : "text-[#1E293B]"
            }`}
        >
          📄 Générer depuis PDF
        </button>
      </div>

      {mode === "study" && (
        <div className="mb-5 flex items-center gap-3">
          <span className="text-sm font-bold text-slate-500">Filtrer les cartes :</span>
          <select
            value={difficultyFilter}
            onChange={(event) => {
              setDifficultyFilter(event.target.value);
              setIdx(0);
              setFlipped(false);
            }}
            className="h-10 rounded-2xl border border-slate-200 bg-white px-4 font-bold text-slate-600"
          >
            <option value="all">Toutes les difficultés</option>
            <option value="easy">Faciles</option>
            <option value="medium">Moyennes</option>
            <option value="hard">Difficiles</option>
          </select>
        </div>
      )}

      {mode === "pdf" ? (
  <PdfGenerator
    onClick={() => fileInputRef.current?.click()}
    count={generationCount}
    setCount={setGenerationCount}
    difficulty={generationDifficulty}
    setDifficulty={setGenerationDifficulty}
    focus={generationFocus}
    setFocus={setGenerationFocus}
  />
) : (
        <div className="space-y-8">
          <aside className="max-w-[950px] mx-auto">
            <div className="relative mb-4">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Rechercher des flashcard..."
                className="w-full h-12 rounded-2xl border border-slate-200 bg-white pl-12 pr-4 outline-none focus:ring-2 focus:ring-[#8B6CF6]/40"
              />
            </div>

            <div className="bg-white rounded-3xl border border-slate-100 p-3 flex gap-3 overflow-x-auto">
              {filteredDecks.map((d) => (
                <div
  key={d.id}
  onClick={() => selectDeck(d.id)}
  className={`relative min-w-[280px] text-left p-4 rounded-2xl flex gap-4 transition cursor-pointer ${
  d.id === deckId ? "bg-[#8B6CF6]/10" : "hover:bg-slate-50"
}`}
>
                  <div
                    className="w-12 h-12 rounded-2xl text-white flex items-center justify-center"
                    style={{ background: d.color }}
                  >
                    <Layers />
                  </div>

<button
  onClick={async (e) => {
    e.stopPropagation();

    try {
      await deleteDeck(d.id);

      const updatedDecks = decks.filter((deck) => deck.id !== d.id);

      setDecks(updatedDecks);

      if (updatedDecks.length === 0) {
        setDeckId(null);
      } else if (d.id === deckId) {
        selectDeck(updatedDecks[0].id);
      }

    } catch (error) {
      console.error(error);
    }
  }}
  className="absolute top-4 right-4 text-red-400 hover:text-red-600 transition"
>
  <Trash2 size={18} />
</button>

                  <div>
                    <h3
                      className={`font-extrabold ${d.id === deckId ? "text-[#8B6CF6]" : ""
                        }`}
                    >
                      {d.title}
                    </h3>
                    <p className="text-sm text-slate-400">
                      {d.subject} · {d.cards.length} cartes
                    </p>

                    <div className="flex gap-2 mt-2">
                      <span className="text-xs bg-emerald-50 text-emerald-600 px-2 py-1 rounded-full font-bold">
                        {d.mastered} maîtrisées
                      </span>
                      <span className="text-xs bg-amber-50 text-amber-600 px-2 py-1 rounded-full font-bold">
                        {d.due} à revoir
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </aside>


          <section className="min-h-[680px] max-w-[950px] mx-auto">
  <style>
    {`
      @keyframes memiFloat {
        0%, 100% {
          transform: translateY(0) rotate(-3deg);
        }
        50% {
          transform: translateY(-14px) rotate(3deg);
        }
      }

      @keyframes softPulse {
        0%, 100% {
          box-shadow: 0 25px 70px rgba(139, 108, 246, 0.18);
        }
        50% {
          box-shadow: 0 35px 90px rgba(139, 108, 246, 0.30);
        }
      }
    `}
  </style>

  <div className="bg-white/80 backdrop-blur rounded-[34px] border border-slate-100 p-5 mb-6 shadow-sm">
    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
      <div>
        <p className="text-xs font-extrabold uppercase tracking-wider text-[#8B6CF6]">
          Session de révision
        </p>
        <h2 className="text-2xl font-extrabold text-[#1E293B] mt-1">
          {deck.title}
        </h2>
      </div>

      <div className="flex flex-wrap items-center gap-3 text-sm font-bold">
        <button
          onClick={restart}
          className="h-10 px-4 rounded-2xl bg-slate-50 text-slate-500 hover:text-[#8B6CF6] hover:bg-[#8B6CF6]/10 transition flex items-center gap-2"
        >
          <RotateCcw size={16} />
          Recommencer
        </button>

        <button
          onClick={shuffleCards}
          className="h-10 px-4 rounded-2xl bg-slate-50 text-slate-500 hover:text-[#8B6CF6] hover:bg-[#8B6CF6]/10 transition flex items-center gap-2"
        >
          <Shuffle size={16} />
          Mélanger
        </button>

        <span className="h-10 px-4 rounded-2xl bg-[#8B6CF6]/10 text-[#8B6CF6] flex items-center">
          {Math.min(idx + 1, total)} / {total}
        </span>
      </div>
    </div>

    <div className="h-3 bg-slate-100 rounded-full mt-5 overflow-hidden">
      <div
        className="h-full rounded-full transition-all duration-500"
        style={{
          width: `${total ? Math.min((idx / total) * 100, 100) : 0}%`,
          background: deck.color,
        }}
      />
    </div>
  </div>

  {!finished ? (
    <>
      <div className="relative flex flex-col items-center justify-center">
        <div className="hidden xl:flex absolute -top-10 right-8 items-center gap-3 z-20">
          <div className="bg-white border border-slate-100 shadow-lg rounded-3xl px-4 py-3 text-sm font-bold text-[#1E293B]">
            Clique sur la carte pour révéler la réponse 
          </div>

          <img
            src={memiImage}
            alt="Memi"
            className="w-28 h-28 object-contain drop-shadow-2xl hover:scale-110 transition duration-300"
            style={{ animation: "memiFloat 3.8s ease-in-out infinite" }}
          />
        </div>

        <div
          onClick={() => setFlipped(!flipped)}
          className="relative w-full max-w-[850px] h-[500px] mx-auto cursor-pointer [perspective:1600px]"
          style={{animation: "softPulse 4s ease-in-out infinite",
            filter: "drop-shadow(0 35px 55px rgba(139, 108, 246, 0.28))",}}>
          <div
            className={`relative h-full w-full transition-transform duration-700 ease-out [transform-style:preserve-3d] ${
              flipped ? "[transform:rotateY(180deg)]" : ""
            }`}
          >
            {/* QUESTION */}
            <div
              className="absolute inset-0 rounded-[46px] border border-white/70 shadow-2xl flex flex-col items-center justify-center text-center p-12 overflow-hidden [backface-visibility:hidden] bg-white/80 backdrop-blur-xl"
              style={{
                background: `radial-gradient(circle at top left, ${deck.color}35, transparent 35%), linear-gradient(135deg, #ffffff 0%, #F8F5FF 50%, ${deck.color}18 100%)`,
              }}
            >
              <div
                className="absolute -top-28 -left-28 w-80 h-80 rounded-full blur-3xl opacity-30"
                style={{ background: deck.color }}
              />

              <div className="relative mb-6 px-5 py-2 rounded-full bg-white/80 border border-slate-100 shadow-sm">
                <p className="uppercase text-xs font-extrabold tracking-widest text-slate-400">
                  Question
                </p>
              </div>

              <h2
              className="relative text-3xl md:text-4xl font-extrabold leading-snug max-w-3xl"
              style={{ color: "#000000", WebkitTextFillColor: "#000000" }}>
                {card.front}
              </h2>

              <p className="relative mt-10 text-slate-400 font-semibold">
        
                Clique pour retourner la carte
              </p>
            </div>

            {/* RÉPONSE */}
            <div
              className="absolute inset-0 rounded-[46px] border border-white/70 shadow-2xl flex flex-col items-center justify-center text-center p-12 overflow-hidden text-white [backface-visibility:hidden] [transform:rotateY(180deg)]"
              style={{
                background: `radial-gradient(circle at top right, rgba(255,255,255,0.30), transparent 35%), linear-gradient(135deg, ${deck.color}, #7C3AED 55%, #312E81)`,
              }}
            >
              <div className="absolute -top-28 -right-28 w-80 h-80 rounded-full bg-white/20 blur-3xl" />

              <div className="relative mb-6 px-5 py-2 rounded-full bg-white/15 border border-white/20">
                <p className="uppercase text-xs font-extrabold tracking-widest text-white/80">
                  Réponse
                </p>
              </div>

              <div className="relative max-h-[280px] overflow-y-auto px-4">
                <h2 className="text-2xl md:text-3xl font-bold leading-relaxed">
                  {card.back}
                </h2>
              </div>

              <p className="relative mt-10 text-white/80 font-semibold">
                Clique pour revoir la question
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={() => setFlipped(!flipped)}
          className="mt-6 h-12 px-6 rounded-2xl bg-[#1E293B] text-white font-bold hover:bg-slate-700 transition"
        >
          {flipped ? "Revoir la question" : "Voir la réponse"}
        </button>
      </div>

      <div className="grid md:grid-cols-3 gap-4 mt-8 max-w-[850px] mx-auto">
        <RateButton
          onClick={() => handleRate("hard")}
          label="Difficile"
          hint="Je l’ai oubliée"
          color="#EF4444"
          bg="bg-red-50"
        />
        <RateButton
          onClick={() => handleRate("good")}
          label="Bien"
          hint="Avec un effort"
          color="#3B82F6"
          bg="bg-blue-50"
        />
        <RateButton
          onClick={() => handleRate("easy")}
          label="Facile"
          hint="Sans hésiter"
          color="#10B981"
          bg="bg-emerald-50"
        />
      </div>

      <div className="flex justify-between items-center mt-6 max-w-[850px] mx-auto">
        <button
          onClick={() => {
            setIdx((i) => Math.max(0, i - 1));
            setFlipped(false);
          }}
          className="h-11 px-5 rounded-2xl bg-white border border-slate-100 text-slate-500 font-bold hover:text-[#8B6CF6] transition"
        >
          <ChevronLeft size={16} className="inline" /> Précédente
        </button>

        <button
          onClick={() => {
            setIdx((i) => Math.min(total - 1, i + 1));
            setFlipped(false);
          }}
          className="h-11 px-5 rounded-2xl bg-white border border-slate-100 text-slate-500 font-bold hover:text-[#8B6CF6] transition"
        >
          Suivante <ChevronRight size={16} className="inline" />
        </button>
      </div>
    </>
  ) : (
    <div className="bg-white rounded-[34px] border border-slate-100 p-12 text-center shadow-xl max-w-[850px] mx-auto">
      <AnimatedMemi mood="celebrating" className="w-32 h-32 mx-auto mb-5" />

      <h2 className="text-3xl font-extrabold">
        Bravo, session terminée 🎉
      </h2>

      <p className="text-slate-500 mt-3">
        Difficile : {progress.hard} · Bien : {progress.good} · Facile :{" "}
        {progress.easy}
      </p>

      <button
        onClick={restart}
        className="mt-6 bg-[#1E293B] text-white px-6 py-3 rounded-2xl font-bold hover:bg-slate-700 transition"
      >
        Recommencer
      </button>
    </div>
  )}
</section>
        </div>
      )}
    </div>
  );
}

function PdfGenerator({ onClick, count, setCount, difficulty, setDifficulty, focus, setFocus }) {
  return (
    <div>
      <section className="rounded-[34px] bg-gradient-to-br from-[#8B6CF6] to-[#C084FC] text-white p-8 mb-7 relative overflow-hidden">
        <p className="font-bold flex items-center gap-2">
          <Sparkles size={18} /> IA Memi
        </p>
        <h2 className="text-3xl font-extrabold mt-3">
          Génère tes flashcards depuis un PDF
        </h2>
        <p className="text-white/80 mt-2">
          Upload ton cours et Memi crée des cartes automatiquement.
        </p>
        <img
          src={flashcard}
          alt="Flashcard mascot"
          className="absolute right-10 top-8 w-28 h-28 object-contain drop-shadow-xl hover:scale-110 transition duration-300"
        />
      </section>

      <section className="rounded-[28px] bg-white border border-slate-100 p-5 mb-5 grid md:grid-cols-2 gap-4">
        <label className="text-sm font-bold text-slate-500">
          Nombre de cartes
          <input type="number" min="5" max="40" value={count} onChange={(e) => setCount(e.target.value === "" ? "" : Number(e.target.value))} onBlur={() => setCount(Math.min(40, Math.max(5, Number(count) || 10)))} className="mt-2 w-full h-11 rounded-2xl border border-slate-200 px-4" />
        </label>
        <label className="text-sm font-bold text-slate-500">
          Difficulté
          <select value={difficulty} onChange={(e) => setDifficulty(e.target.value)} className="mt-2 w-full h-11 rounded-2xl border border-slate-200 px-4">
            <option value="all">Mixte</option>
            <option value="easy">Facile</option>
            <option value="medium">Moyenne</option>
            <option value="hard">Difficile</option>
          </select>
        </label>
        <input value={focus} onChange={(e) => setFocus(e.target.value)} maxLength={500} placeholder="Focus ou consigne optionnelle" className="md:col-span-2 h-11 rounded-2xl border border-slate-200 px-4" />
      </section>

      <section
        onClick={onClick}
        className="h-[260px] rounded-[34px] border-2 border-dashed border-[#8B6CF6]/30 bg-white/60 flex flex-col items-center justify-center cursor-pointer"
      >
        <UploadCloud size={42} className="text-[#8B6CF6]" />
        <h3 className="font-extrabold text-xl mt-4">
          Clique pour uploader ton PDF
        </h3>
        <p className="text-slate-400 mt-1">
          Memi générera les flashcards automatiquement.
        </p>
      </section>
    </div>
  );
}

function RateButton({ onClick, label, hint, color, bg }) {
  return (
    <button
      onClick={onClick}
      className={`${bg} rounded-3xl p-5 text-left hover:-translate-y-1 hover:scale-[1.03] transition shadow-sm hover:shadow-xl border border-white`}
      style={{ color }}
    >
      <div className="font-extrabold text-xl">{label}</div>
      <div className="text-sm mt-1 opacity-80">{hint}</div>
    </button>
  );
}

export default Flashcards;

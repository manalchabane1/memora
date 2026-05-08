import { useEffect, useMemo, useRef, useState } from "react";
import flashcard from "/src/assets/flashcard.png";
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
} from "lucide-react";

const initialDecks = [
  {
    id: 1,
    title: "Formules de dérivation",
    subject: "Mathématiques",
    color: "#8B6CF6",
    mastered: 3,
    due: 3,
    cards: [
      { front: "Dérivée de sin(x) ?", back: "cos(x)" },
      { front: "Dérivée de cos(x) ?", back: "-sin(x)" },
      { front: "Dérivée de x² ?", back: "2x" },
      { front: "Dérivée de e^x ?", back: "e^x" },
      { front: "Dérivée de ln(x) ?", back: "1/x" },
      { front: "Dérivée de 1/x ?", back: "-1/x²" },
    ],
  },
  {
    id: 2,
    title: "Réseaux TCP/IP",
    subject: "Réseaux",
    color: "#60A5FA",
    mastered: 1,
    due: 4,
    cards: [
      { front: "À quoi sert TCP ?", back: "Assurer une transmission fiable des données." },
      { front: "À quoi sert une adresse IP ?", back: "Identifier une machine sur un réseau." },
    ],
  },
];

function Flashcards() {
  const fileInputRef = useRef(null);
  const [mode, setMode] = useState("study");
  const [decks, setDecks] = useState(initialDecks);
  const [deckId, setDeckId] = useState(initialDecks[0].id);
  const [search, setSearch] = useState("");
  const [idx, setIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [progress, setProgress] = useState({ hard: 0, good: 0, easy: 0 });

  const filteredDecks = useMemo(
    () =>
      decks.filter((deck) =>
        deck.title.toLowerCase().includes(search.toLowerCase())
      ),
    [decks, search]
  );

  const deck = decks.find((d) => d.id === deckId) || decks[0];
  const card = deck?.cards[idx];
  const total = deck?.cards.length || 0;
  const finished = idx >= total;

  useEffect(() => {
    setIdx(0);
    setFlipped(false);
    setProgress({ hard: 0, good: 0, easy: 0 });
  }, [deckId]);

  const restart = () => {
    setIdx(0);
    setFlipped(false);
    setProgress({ hard: 0, good: 0, easy: 0 });
  };

  const handleRate = (kind) => {
    setProgress((prev) => ({ ...prev, [kind]: prev[kind] + 1 }));
    setFlipped(false);
    setTimeout(() => setIdx((i) => i + 1), 200);
  };

  const handlePdf = (files) => {
    const pdf = Array.from(files || []).find((file) =>
      file.name.toLowerCase().endsWith(".pdf")
    );

    if (!pdf) return alert("Choisis un fichier PDF.");

    const newDeck = {
      id: Date.now(),
      title: pdf.name.replace(/\.pdf$/i, ""),
      subject: "Depuis PDF",
      color: "#8B6CF6",
      mastered: 0,
      due: 3,
      cards: [
        {
          front: "Carte générée depuis le PDF",
          back: "Le backend Django + IA générera les vraies flashcards.",
        },
        {
          front: "Notion importante du cours",
          back: "Réponse générée automatiquement par l’IA.",
        },
        {
          front: "Question possible d’examen",
          back: "Réponse issue du résumé du PDF.",
        },
      ],
    };

    setDecks((prev) => [newDeck, ...prev]);
    setDeckId(newDeck.id);
    setMode("study");

    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className="p-8 max-w-[1500px] mx-auto text-[#1E293B]">
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
          className={`px-6 py-3 rounded-2xl font-bold ${
            mode === "study" ? "bg-[#8B6CF6] text-white" : "text-[#1E293B]"
          }`}
        >
          🃏 Mes flashcards
        </button>

        <button
          onClick={() => setMode("pdf")}
          className={`px-6 py-3 rounded-2xl font-bold ${
            mode === "pdf" ? "bg-[#8B6CF6] text-white" : "text-[#1E293B]"
          }`}
        >
          📄 Générer depuis PDF
        </button>
      </div>

      {mode === "pdf" ? (
        <PdfGenerator onClick={() => fileInputRef.current?.click()} />
      ) : (
        <div className="grid lg:grid-cols-[360px_1fr] gap-7">
          <aside>
            <div className="relative mb-4">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Rechercher des flashcard..."
                className="w-full h-12 rounded-2xl border border-slate-200 bg-white pl-12 pr-4 outline-none focus:ring-2 focus:ring-[#8B6CF6]/40"
              />
            </div>

            <div className="bg-white rounded-3xl border border-slate-100 p-3">
              {filteredDecks.map((d) => (
                <button
                  key={d.id}
                  onClick={() => setDeckId(d.id)}
                  className={`w-full text-left p-4 rounded-2xl flex gap-4 transition ${
                    d.id === deckId ? "bg-[#8B6CF6]/10" : "hover:bg-slate-50"
                  }`}
                >
                  <div
                    className="w-12 h-12 rounded-2xl text-white flex items-center justify-center"
                    style={{ background: d.color }}
                  >
                    <Layers />
                  </div>

                  <div>
                    <h3
                      className={`font-extrabold ${
                        d.id === deckId ? "text-[#8B6CF6]" : ""
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
                </button>
              ))}
            </div>
          </aside>

          <section>
            <div className="bg-white rounded-3xl border border-slate-100 p-5 mb-5">
              <div className="flex justify-between items-center">
                <h2 className="font-extrabold">{deck.title}</h2>
                <div className="flex items-center gap-4 text-sm text-slate-400 font-bold">
                  <button onClick={restart} className="hover:text-[#8B6CF6]">
                    Recommencer
                  </button>
                  <button className="hover:text-[#8B6CF6] flex items-center gap-1">
                    <Shuffle size={16} /> Mélanger
                  </button>
                  <span>{Math.min(idx + 1, total)} / {total}</span>
                </div>
              </div>

              <div className="h-2 bg-slate-100 rounded-full mt-4 overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${Math.min((idx / total) * 100, 100)}%`,
                    background: deck.color,
                  }}
                />
              </div>
            </div>

            {!finished ? (
              <>
                <div
  onClick={() => setFlipped(!flipped)}
  className="h-[420px] cursor-pointer [perspective:1200px]"
>
  <div
    className={`relative h-full w-full transition-transform duration-700 ease-out [transform-style:preserve-3d] ${
      flipped ? "[transform:rotateY(180deg)]" : ""
    }`}
  >
    {/* QUESTION */}
    <div
      className="absolute inset-0 rounded-[34px] border border-slate-100 shadow-xl flex flex-col items-center justify-center text-center p-10 overflow-hidden [backface-visibility:hidden]"
      style={{
        background: `linear-gradient(135deg, ${deck.color}18, #ffffff 55%, ${deck.color}10)`,
      }}
    >
      <div
        className="absolute -top-24 -left-24 w-72 h-72 rounded-full blur-3xl opacity-30"
        style={{ background: deck.color }}
      />

      <p className="relative uppercase text-sm font-extrabold text-slate-400">
        Question
      </p>

      <h2 className="relative mt-8 text-5xl font-extrabold text-[#1E293B]">
        {card.front}
      </h2>

      <p className="relative mt-8 text-slate-400">
        Clique pour révéler la réponse
      </p>
    </div>

    {/* RÉPONSE */}
    <div
      className="absolute inset-0 rounded-[34px] shadow-xl flex flex-col items-center justify-center text-center p-10 overflow-hidden text-white [backface-visibility:hidden] [transform:rotateY(180deg)]"
      style={{
        background: `linear-gradient(135deg, ${deck.color}, #A78BFA)`,
      }}
    >
      <div className="absolute -top-24 -right-24 w-72 h-72 rounded-full bg-white/20 blur-3xl" />

      <p className="relative uppercase text-sm font-extrabold text-white/80">
        Réponse
      </p>

      <h2 className="relative mt-8 text-5xl font-extrabold">
        {card.back}
      </h2>

      <p className="relative mt-8 text-white/80">
        Clique pour revoir la question
      </p>
    </div>
  </div>
</div>

                <div className="grid grid-cols-3 gap-4 mt-6">
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

                <div className="flex justify-between mt-5 text-slate-400 font-semibold">
                  <button onClick={() => setIdx((i) => Math.max(0, i - 1))}>
                    <ChevronLeft size={16} className="inline" /> Précédente
                  </button>

                  <button
                    onClick={() => setIdx((i) => Math.min(total - 1, i + 1))}
                  >
                    Suivante <ChevronRight size={16} className="inline" />
                  </button>
                </div>
              </>
            ) : (
              <div className="bg-white rounded-3xl border border-slate-100 p-12 text-center">
                <h2 className="text-3xl font-extrabold">Bravo, flashcards terminé 🎉</h2>
                <p className="text-slate-500 mt-2">
                  Difficile : {progress.hard} · Bien : {progress.good} · Facile :{" "}
                  {progress.easy}
                </p>
                <button
                  onClick={restart}
                  className="mt-6 bg-[#1E293B] text-white px-6 py-3 rounded-2xl font-bold"
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

function PdfGenerator({ onClick }) {
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
      className={`${bg} rounded-2xl p-5 text-left hover:-translate-y-0.5 transition`}
      style={{ color }}
    >
      <div className="font-extrabold text-xl">{label}</div>
      <div className="text-sm mt-1 opacity-80">{hint}</div>
    </button>
  );
}

export default Flashcards;
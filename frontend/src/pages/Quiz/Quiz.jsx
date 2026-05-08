import { useRef, useState } from "react";
import image from "/src/assets/image.png";
import {
    Play,
    Sparkles,
    FileText,
    Plus,
    ArrowRight,
    RotateCcw,
    Trophy,
    Lightbulb,
} from "lucide-react";

const quizzesData = [
    {
        id: 1,
        title: "Limites — niveau 1",
        subject: "Mathématiques",
        color: "#8B6CF6",
        time: "8 min",
        difficulty: "Facile",
        questions: [
            {
                question: "Que signifie lim f(x) quand x tend vers a ?",
                options: [
                    "La valeur exacte de f(a)",
                    "Le comportement de f(x) proche de a",
                    "La dérivée de f",
                    "L’intégrale de f",
                ],
                answer: 1,
                hint: "On regarde ce qui se passe près du point.",
            },
            {
                question: "La fonction f(x)=x² est-elle continue sur R ?",
                options: ["Oui", "Non", "Seulement en 0", "Seulement sur R+"],
                answer: 0,
                hint: "Les polynômes sont continus partout.",
            },
        ],
    },
];

function Quiz() {
    const fileInputRef = useRef(null);

    const [quizzes, setQuizzes] = useState(quizzesData);
    const [selectedQuiz, setSelectedQuiz] = useState(null);
    const [step, setStep] = useState(0);
    const [selectedAnswer, setSelectedAnswer] = useState(null);
    const [score, setScore] = useState(0);
    const [showHint, setShowHint] = useState(false);
    const [finished, setFinished] = useState(false);

    const createQuizFromPdf = (files) => {
        const pdf = Array.from(files || []).find((file) =>
            file.name.toLowerCase().endsWith(".pdf")
        );

        if (!pdf) return alert("Choisis un fichier PDF.");

        const newQuiz = {
            id: Date.now(),
            title: pdf.name.replace(/\.pdf$/i, ""),
            subject: "Depuis PDF",
            color: "#8B6CF6",
            time: "5 min",
            difficulty: "Auto",
            questions: [
                {
                    question: "Question générée depuis ton PDF ?",
                    options: ["Réponse A", "Réponse B", "Réponse C", "Réponse D"],
                    answer: 0,
                    hint: "Le backend remplacera cette question par une vraie question IA.",
                },
            ],
        };

        setQuizzes((prev) => [newQuiz, ...prev]);
        setSelectedQuiz(newQuiz);

        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    const createPersonalQuiz = () => {
        const subject = prompt("Sur quel sujet veux-tu créer un quiz ?");

        if (!subject) return;

        const newQuiz = {
            id: Date.now(),
            title: subject,
            subject: "Personnalisé",
            color: "#FBBF24",
            time: "6 min",
            difficulty: "Sur mesure",
            questions: [
                {
                    question: `Question personnalisée sur : ${subject} ?`,
                    options: ["Option 1", "Option 2", "Option 3", "Option 4"],
                    answer: 0,
                    hint: "Le backend générera les vraies questions selon ce sujet.",
                },
            ],
        };

        setQuizzes((prev) => [newQuiz, ...prev]);
        setSelectedQuiz(newQuiz);
    };

    const startQuiz = (quiz) => {
        setSelectedQuiz(quiz);
        setStep(0);
        setSelectedAnswer(null);
        setScore(0);
        setShowHint(false);
        setFinished(false);
    };

    const question = selectedQuiz?.questions[step];

    const chooseAnswer = (index) => {
        if (selectedAnswer !== null) return;

        setSelectedAnswer(index);

        if (index === question.answer) {
            setScore((s) => s + 1);
        }
    };

    const nextQuestion = () => {
        if (step + 1 >= selectedQuiz.questions.length) {
            setFinished(true);
        } else {
            setStep((s) => s + 1);
            setSelectedAnswer(null);
            setShowHint(false);
        }
    };

    const restart = () => startQuiz(selectedQuiz);

    if (selectedQuiz && !finished) {
        return (
            <QuizArena
                quiz={selectedQuiz}
                question={question}
                step={step}
                selectedAnswer={selectedAnswer}
                score={score}
                showHint={showHint}
                setShowHint={setShowHint}
                chooseAnswer={chooseAnswer}
                nextQuestion={nextQuestion}
                restart={restart}
            />
        );
    }

    if (selectedQuiz && finished) {
        return (
            <ResultScreen
                quiz={selectedQuiz}
                score={score}
                restart={restart}
                back={() => setSelectedQuiz(null)}
            />
        );
    }

    return (
        <div className="p-8 max-w-[1500px] mx-auto text-[#1E293B]">
            <input
                ref={fileInputRef}
                type="file"
                accept="application/pdf"
                hidden
                onChange={(e) => createQuizFromPdf(e.target.files)}
            />

            <header className="flex items-end justify-between mb-8">
                <div>
                    <p className="text-xs font-extrabold uppercase tracking-wider text-[#8B6CF6]">
                        Challenge intelligent
                    </p>
                    <h1 className="text-5xl font-extrabold tracking-tight mt-1">
                        Quiz Memora
                    </h1>
                    <p className="text-slate-500 mt-2">
                        Teste tes connaissances, corrige tes erreurs, progresse avec Memi.
                    </p>
                </div>

                <button
                    onClick={createPersonalQuiz}
                    className="h-12 px-5 rounded-2xl bg-[#8B6CF6] text-white font-bold flex items-center gap-2 shadow-lg hover:bg-[#7C3AED]"
                >
                    <Plus size={20} />
                    Nouveau quiz
                </button>
            </header>

            <section className="rounded-[34px] bg-gradient-to-br from-[#8B6CF6] to-[#C084FC] p-8 text-white flex items-center justify-between mb-8 overflow-hidden relative">
                <div>
                    <p className="font-bold flex items-center gap-2">
                        <Sparkles size={18} />
                        IA Memi
                    </p>

                    <h2 className="text-3xl font-extrabold mt-3">
                        Crée un quiz intelligent
                    </h2>

                    <p className="text-white/80 mt-2">
                        Depuis un PDF ou avec un sujet personnalisé.
                    </p>
                </div>

                <div className="flex gap-3 relative z-10">
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        className="h-12 px-5 rounded-2xl bg-white text-[#1E293B] font-bold flex items-center gap-2 hover:-translate-y-0.5 transition"
                    >
                        <FileText size={19} />
                        Depuis PDF
                    </button>

                    <button
                        onClick={createPersonalQuiz}
                        className="h-12 px-5 rounded-2xl bg-[#FBBF24] text-[#1E293B] font-bold flex items-center gap-2 hover:-translate-y-0.5 transition"
                    >
                        <Sparkles size={19} />
                        Quiz personnalisé
                    </button>
                </div>

                <div className="absolute -right-20 -top-20 w-72 h-72 bg-white/10 rounded-full blur-3xl" />
            </section>

            <h2 className="text-2xl font-extrabold mb-5">Quiz disponibles</h2>

            <section className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
                {quizzes.map((quiz) => (
                    <QuizCard key={quiz.id} quiz={quiz} onStart={() => startQuiz(quiz)} />
                ))}
            </section>
        </div>
    );
}

function QuizCard({ quiz, onStart }) {
    return (
        <article className="bg-white rounded-[30px] border border-slate-100 p-6 hover:-translate-y-1 hover:shadow-xl transition">
            <p
                className="text-xs font-extrabold uppercase tracking-widest"
                style={{ color: quiz.color }}
            >
                {quiz.subject}
            </p>

            <h3 className="text-2xl font-extrabold mt-4">{quiz.title}</h3>

            <p className="text-slate-400 mt-2">
                {quiz.questions.length} questions · {quiz.time} · {quiz.difficulty}
            </p>

            <button
                onClick={onStart}
                className="mt-7 w-full h-12 rounded-2xl text-white font-bold flex items-center justify-center gap-2"
                style={{ background: quiz.color }}
            >
                <Play size={18} />
                Commencer
            </button>
        </article>
    );
}

function QuizArena({
    quiz,
    question,
    step,
    selectedAnswer,
    score,
    showHint,
    setShowHint,
    chooseAnswer,
    nextQuestion,
    restart,
}) {
    const total = quiz.questions.length;
    const progress = ((step + 1) / total) * 100;

    return (
        <div className="p-8 max-w-[1500px] mx-auto text-[#1E293B]">
            <div className="grid xl:grid-cols-[90px_1fr_280px] gap-6">
                <aside className="hidden xl:flex flex-col gap-3">
                    {quiz.questions.map((_, index) => (
                        <div
                            key={index}
                            className={`w-12 h-12 rounded-2xl flex items-center justify-center font-extrabold ${index === step
                                    ? "bg-[#8B6CF6] text-white"
                                    : index < step
                                        ? "bg-emerald-100 text-emerald-600"
                                        : "bg-white text-slate-400"
                                }`}
                        >
                            {index + 1}
                        </div>
                    ))}
                </aside>

                <main>
                    <div className="bg-white rounded-3xl border border-slate-100 p-5 mb-6">
                        <div className="flex justify-between items-center mb-3">
                            <div>
                                <p className="text-xs font-extrabold uppercase tracking-wider text-[#8B6CF6]">
                                    {quiz.subject} · Quiz
                                </p>
                                <h1 className="text-3xl font-extrabold">{quiz.title}</h1>
                            </div>

                            <div className="text-right">
                                <p className="text-sm text-slate-400">Score</p>
                                <p className="text-2xl font-extrabold">{score}</p>
                            </div>
                        </div>

                        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div
                                className="h-full rounded-full transition-all"
                                style={{ width: `${progress}%`, background: quiz.color }}
                            />
                        </div>
                    </div>

                    <section
                        className="rounded-[34px] p-10 min-h-[270px] flex flex-col justify-center relative overflow-hidden"
                        style={{
                            background: `linear-gradient(135deg, ${quiz.color}18, white 55%, ${quiz.color}10)`,
                        }}
                    >
                        <p className="text-sm font-extrabold text-slate-400 uppercase">
                            Question {step + 1}/{total}
                        </p>

                        <h2 className="text-4xl font-extrabold mt-5 leading-tight">
                            {question.question}
                        </h2>
                    </section>

                    <section className="grid md:grid-cols-2 gap-4 mt-6">
                        {question.options.map((option, index) => {
                            const isSelected = selectedAnswer === index;
                            const isCorrect = question.answer === index;
                            const isWrong = isSelected && !isCorrect;

                            let style = "bg-white border-slate-100 hover:border-[#8B6CF6]/40";

                            if (selectedAnswer !== null && isCorrect) {
                                style = "bg-emerald-50 border-emerald-300 text-emerald-700";
                            }

                            if (isWrong) {
                                style = "bg-red-50 border-red-300 text-red-600";
                            }

                            return (
                                <button
                                    key={index}
                                    onClick={() => chooseAnswer(index)}
                                    className={`min-h-[90px] rounded-3xl border-2 p-5 text-left font-bold transition ${style}`}
                                >
                                    <span className="text-sm opacity-50 mr-2">
                                        {String.fromCharCode(65 + index)}.
                                    </span>
                                    {option}
                                </button>
                            );
                        })}
                    </section>

                    {selectedAnswer !== null && (
                        <div className="mt-6 flex justify-end">
                            <button
                                onClick={nextQuestion}
                                className="h-12 px-6 rounded-2xl bg-[#1E293B] text-white font-bold flex items-center gap-2"
                            >
                                Question suivante
                                <ArrowRight size={18} />
                            </button>
                        </div>
                    )}
                </main>

                <aside className="space-y-4">
                    <div className="rounded-[30px] bg-white border border-slate-100 p-6">
                        <img
                            src={image}
                            alt="Memi"
                            className="w-24 h-24 object-contain mb-3 mx-auto"
                        />
                       

                        <button
                            onClick={() => setShowHint(!showHint)}
                            className="mt-5 w-full h-11 rounded-2xl bg-[#8B6CF6]/10 text-[#8B6CF6] font-bold flex items-center justify-center gap-2"
                        >
                            <Lightbulb size={18} />
                            Voir indice
                        </button>

                        {showHint && (
                            <p className="mt-4 text-sm text-slate-500 bg-slate-50 p-4 rounded-2xl text-center">
                                {question.hint}
                            </p>
                        )}
                    </div>

                    <button
                        onClick={restart}
                        className="w-full h-12 rounded-2xl bg-white border border-slate-100 font-bold text-slate-500 flex items-center justify-center gap-2"
                    >
                        <RotateCcw size={18} />
                        Recommencer
                    </button>
                </aside>
            </div>
        </div>
    );
}

function ResultScreen({ quiz, score, restart, back }) {
    const total = quiz.questions.length;
    const percent = Math.round((score / total) * 100);

    return (
        <div className="p-8 max-w-[1000px] mx-auto text-[#1E293B]">
            <section className="bg-white rounded-[40px] border border-slate-100 p-12 text-center shadow-xl">
                <Trophy size={60} className="mx-auto text-[#FBBF24]" />

                <h1 className="text-5xl font-extrabold mt-6">Quiz terminé</h1>

                <p className="text-slate-500 mt-3">
                    Tu as obtenu {score}/{total} bonnes réponses.
                </p>

                <div className="mt-8 text-7xl font-extrabold" style={{ color: quiz.color }}>
                    {percent}%
                </div>

                <div className="mt-8 flex justify-center gap-3">
                    <button
                        onClick={restart}
                        className="h-12 px-6 rounded-2xl bg-[#8B6CF6] text-white font-bold"
                    >
                        Recommencer
                    </button>

                    <button
                        onClick={back}
                        className="h-12 px-6 rounded-2xl bg-slate-100 text-[#1E293B] font-bold"
                    >
                        Retour aux quiz
                    </button>
                </div>
            </section>
        </div>
    );
}

export default Quiz;
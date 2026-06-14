import { useState, useEffect } from "react";
import {
    checkQuizAnswer,
    deleteQuizApi,
    generatePersonalQuiz,
    generateQuizFromDeck as generateQuizFromDeckApi,
    getDecks,
    getQuizzes,
    submitQuiz,
} from "../../services/api";
import AnimatedMemi, { MemiGuide } from "../../components/AnimatedMemi";
import {
    Play,
    Sparkles,
    FileText,
    Plus,
    ArrowRight,
    RotateCcw,
    Lightbulb,
    Trash2,
} from "lucide-react";

function formatQuiz(quiz) {
    return {
        id: quiz.id,
        deckId: quiz.deck,
        title: quiz.title.replace("Flashcards - ", "").replace("Quiz - ", ""),
        subject: quiz.subject,
        color: quiz.subject === "Personnalisé" ? "#FBBF24" : "#8B6CF6",
        time: "5 min",
        difficulty: "IA",
        questions: (quiz.quiz_questions || []).map((question) => ({
            id: question.id,
            question: question.question,
            options: question.choices,
        })),
    };
}

function Quiz() {
    const [quizzes, setQuizzes] = useState([]);
    const [decks, setDecks] = useState([]);
    const [showCourses, setShowCourses] = useState(false);
    const [loadingQuizCourseId, setLoadingQuizCourseId] = useState(null);
    const [showPersonalForm, setShowPersonalForm] = useState(false);
    const [personalTopic, setPersonalTopic] = useState("");
    const [loadingPersonalQuiz, setLoadingPersonalQuiz] = useState(false);
    const [selectedQuiz, setSelectedQuiz] = useState(null);
    const [step, setStep] = useState(0);
    const [selectedAnswer, setSelectedAnswer] = useState(null);
    const [score, setScore] = useState(0);
    const [showHint, setShowHint] = useState(false);
    const [finished, setFinished] = useState(false);
    const [answers, setAnswers] = useState({});
    const [submitting, setSubmitting] = useState(false);
    const [checkingAnswer, setCheckingAnswer] = useState(false);
    const [answerFeedback, setAnswerFeedback] = useState(null);
    const [questionCount, setQuestionCount] = useState(10);
    const [quizDifficulty, setQuizDifficulty] = useState("medium");
    const [quizInstructions, setQuizInstructions] = useState("");

    useEffect(() => {
        async function loadQuizData() {
            try {
                const [loadedDecks, loadedQuizzes] = await Promise.all([getDecks(), getQuizzes()]);
                setDecks(loadedDecks);
                setQuizzes(loadedQuizzes.map(formatQuiz));
            } catch (err) {
                console.error(err);
            }
        }

        loadQuizData();
    }, []);

    const generateQuizFromDeck = async (deck) => {
        try {
            setLoadingQuizCourseId(deck.id);

            const result = await generateQuizFromDeckApi(deck.id, {
                count: questionCount,
                difficulty: quizDifficulty,
                instructions: quizInstructions,
            });
            if (result.already_exists) {
                alert(result.message || "Quiz déjà généré.");
                setShowCourses(false);
                return;
            }
            const newQuiz = formatQuiz(result);

            setQuizzes((prev) => [newQuiz, ...prev]);
            setShowCourses(false);
        } catch (err) {
            console.error(err);
            alert(err.message);
        } finally {
            setLoadingQuizCourseId(null);
        }
    };

    const createPersonalQuiz = async () => {
        if (!personalTopic.trim()) return;

        try {
            setLoadingPersonalQuiz(true);

            const result = await generatePersonalQuiz(personalTopic, {
                count: questionCount,
                difficulty: quizDifficulty,
                instructions: quizInstructions,
            });
            const newQuiz = formatQuiz(result);

            setQuizzes((prev) => [newQuiz, ...prev]);
            setPersonalTopic("");
            setShowPersonalForm(false);
        } catch (err) {
            console.error(err);
            alert(err.message);
        } finally {
            setLoadingPersonalQuiz(false);
        }
    };

    const deleteQuiz = async (quizId) => {
        try {
            await deleteQuizApi(quizId);
            setQuizzes((prev) => prev.filter((q) => q.id !== quizId));
        } catch (err) {
            console.error(err);
        }
    };

    const startQuiz = (quiz) => {
        setSelectedQuiz(quiz);
        setStep(0);
        setSelectedAnswer(null);
        setScore(0);
        setShowHint(false);
        setFinished(false);
        setAnswers({});
        setAnswerFeedback(null);
    };

    const question = selectedQuiz?.questions[step];

    const chooseAnswer = async (index) => {
        if (selectedAnswer !== null || checkingAnswer) return;

        setSelectedAnswer(index);
        setAnswers((previous) => ({ ...previous, [question.id]: question.options[index] }));
        setCheckingAnswer(true);
        try {
            const feedback = await checkQuizAnswer(
                selectedQuiz.id,
                question.id,
                question.options[index]
            );
            setAnswerFeedback(feedback);
            if (feedback.is_correct) setScore((current) => current + 1);
        } catch (error) {
            setSelectedAnswer(null);
            alert(error.message);
        } finally {
            setCheckingAnswer(false);
        }
    };

    const nextQuestion = async () => {
        if (step + 1 >= selectedQuiz.questions.length) {
            try {
                setSubmitting(true);
                const result = await submitQuiz(selectedQuiz.id, answers);
                setScore(result.score);
                setFinished(true);
            } catch (error) {
                alert(error.message);
            } finally {
                setSubmitting(false);
            }
        } else {
            setStep((s) => s + 1);
            setSelectedAnswer(null);
            setAnswerFeedback(null);
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
                submitting={submitting}
                checkingAnswer={checkingAnswer}
                answerFeedback={answerFeedback}
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
                    onClick={() => setShowPersonalForm(!showPersonalForm)}
                    className="h-12 px-5 rounded-2xl bg-[#8B6CF6] text-white font-bold flex items-center gap-2 shadow-lg hover:bg-[#7C3AED]"
                >
                    <Plus size={20} />
                    Nouveau quiz
                </button>
            </header>

            {(loadingQuizCourseId !== null || loadingPersonalQuiz) && (
                <MemiGuide
                    mood="working"
                    eyebrow="Quiz IA"
                    title="Je prépare tes questions..."
                    message="Je rédige des choix plausibles et vérifie chaque bonne réponse."
                    compact
                    className="mb-6"
                />
            )}

            <section className="rounded-[34px] bg-gradient-to-br from-[#8B6CF6] to-[#C084FC] p-8 text-white flex items-center justify-between mb-8 overflow-visible relative">
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

                <div className="flex gap-3 relative z-10 items-start max-w-full">
                    <div className="relative">
                        <button
                            onClick={() => setShowCourses(!showCourses)}
                            className="h-12 px-5 rounded-2xl bg-white text-[#1E293B] font-bold flex items-center gap-2 hover:-translate-y-0.5 transition"
                        >
                            <FileText size={19} />
                            Depuis PDF
                        </button>

                        {showCourses && (
                            <div className="absolute top-16 left-0 w-80 bg-white backdrop-blur-xl rounded-2xl border border-white/40 shadow-2xl p-3 z-50">
                                <QuizOptions
                                    count={questionCount}
                                    setCount={setQuestionCount}
                                    difficulty={quizDifficulty}
                                    setDifficulty={setQuizDifficulty}
                                    instructions={quizInstructions}
                                    setInstructions={setQuizInstructions}
                                />
                                <p className="font-bold mb-3 text-slate-700">
                                    Choisir un cours
                                </p>

                                <div className="space-y-1 max-h-44 overflow-y-auto pr-1">
                                    {decks.map((deck) => (
                                        <button disabled={loadingQuizCourseId !== null}
                                            key={deck.id}
                                            onClick={() => {
                                                generateQuizFromDeck(deck);
                                            }}
                                            className="w-full text-left px-4 py-3 rounded-xl hover:bg-[#F3F0FF] transition text-slate-700 font-medium"
                                        >
                                            {loadingQuizCourseId === deck.id ? (
                                                <span className="flex items-center gap-2">
                                                    <span className="w-4 h-4 border-2 border-[#8B6CF6] border-t-transparent rounded-full animate-spin"></span>
                                                    Génération...
                                                </span>
                                            ) : (
                                                deck.title.replace("Flashcards - ", "")
                                            )}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                    <div className="relative">
                        <button
                            onClick={() => setShowPersonalForm(!showPersonalForm)}
                            className="h-12 px-5 rounded-2xl bg-[#FBBF24] text-[#1E293B] font-bold flex items-center gap-2 hover:-translate-y-0.5 transition"
                        >
                            <Sparkles size={19} />
                            Quiz personnalisé
                        </button>

                        {showPersonalForm && (
                            <div className="absolute top-16 right-0 w-80 bg-white rounded-2xl border border-slate-100 shadow-2xl p-4 z-50">
                                <p className="font-bold mb-3 text-slate-700">
                                    Sujet du quiz
                                </p>

                                <input
                                    value={personalTopic}
                                    onChange={(e) => setPersonalTopic(e.target.value)}
                                    placeholder="Entrez le sujet du quiz..."
                                    className="w-full h-11 rounded-xl border border-slate-200 px-3 text-slate-700 outline-none focus:ring-2 focus:ring-[#FBBF24]/40"
                                />
                                <QuizOptions
                                    count={questionCount}
                                    setCount={setQuestionCount}
                                    difficulty={quizDifficulty}
                                    setDifficulty={setQuizDifficulty}
                                    instructions={quizInstructions}
                                    setInstructions={setQuizInstructions}
                                />

                                <button
                                    onClick={createPersonalQuiz}
                                    disabled={loadingPersonalQuiz}
                                    className="mt-3 w-full h-11 rounded-xl bg-[#FBBF24] text-[#1E293B] font-bold flex items-center justify-center gap-2 disabled:opacity-60"
                                >
                                    {loadingPersonalQuiz ? (
                                        <>
                                            <span className="w-4 h-4 border-2 border-[#1E293B] border-t-transparent rounded-full animate-spin"></span>
                                            Génération...
                                        </>
                                    ) : (
                                        "Générer le quiz"
                                    )}
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                <div className="absolute -right-20 -top-20 w-72 h-72 bg-white/10 rounded-full blur-3xl" />
            </section>

            <h2 className="text-2xl font-extrabold mb-5">Quiz disponibles</h2>

            <section className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
                {quizzes.map((quiz) => (
                    <QuizCard key={quiz.id} quiz={quiz} onStart={() => startQuiz(quiz)} onDelete={deleteQuiz} />
                ))}
            </section>
        </div>
    );
}

function QuizCard({ quiz, onStart, onDelete }) {
    return (
        <article className="relative bg-white rounded-[30px] border border-slate-100 p-6 hover:-translate-y-1 hover:shadow-xl transition">
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
                disabled={quiz.questions.length === 0}
                className="mt-7 w-full h-12 rounded-2xl text-white font-bold flex items-center justify-center gap-2"
                style={{ background: quiz.color }}
            >
                <Play size={18} />
                Commencer
            </button>

            <button
                onClick={() => onDelete(quiz.id)}
                className="mt-3 w-full h-12 rounded-2xl border border-slate-200 text-slate-400 font-bold flex items-center justify-center gap-2 hover:bg-slate-100"
            >
                <Trash2 size={18} />
                Supprimer
            </button>
        </article>
    );
}

function QuizOptions({ count, setCount, difficulty, setDifficulty, instructions, setInstructions }) {
    return (
        <div className="grid gap-2 mb-3 text-slate-700">
            <div className="grid grid-cols-2 gap-2">
                <label className="text-xs font-bold">
                    Questions
                    <input
                        type="number"
                        min="5"
                        max="30"
                        value={count}
                        onChange={(event) => setCount(
                            event.target.value === "" ? "" : Number(event.target.value)
                        )}
                        onBlur={() => setCount(
                            Math.min(30, Math.max(5, Number(count) || 10))
                        )}
                        className="mt-1 w-full h-9 rounded-xl border border-slate-200 px-2"
                    />
                </label>
                <label className="text-xs font-bold">
                    Niveau
                    <select
                        value={difficulty}
                        onChange={(event) => setDifficulty(event.target.value)}
                        className="mt-1 w-full h-9 rounded-xl border border-slate-200 px-2"
                    >
                        <option value="easy">Facile</option>
                        <option value="medium">Moyen</option>
                        <option value="hard">Difficile</option>
                    </select>
                </label>
            </div>
            <input
                value={instructions}
                onChange={(event) => setInstructions(event.target.value)}
                maxLength={500}
                placeholder="Focus ou consigne optionnelle"
                className="h-9 rounded-xl border border-slate-200 px-2 text-xs"
            />
        </div>
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
    submitting,
    checkingAnswer,
    answerFeedback,
}) {
    if (!question) {
        return (
            <div className="p-10 text-center text-red-500 font-bold">
                Aucune question disponible pour ce quiz.
            </div>
        );
    }
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
                            const isCorrect = answerFeedback?.correct_answer === option;
                            const isWrongSelection = isSelected && answerFeedback && !answerFeedback.is_correct;

                            let style = "bg-white border-slate-100 hover:border-[#8B6CF6]/40";

                            if (isCorrect) {
                                style = "bg-emerald-50 border-emerald-400 text-emerald-800 shadow-[0_12px_35px_rgba(16,185,129,0.18)]";
                            } else if (isWrongSelection) {
                                style = "bg-rose-50 border-rose-400 text-rose-800 shadow-[0_12px_35px_rgba(244,63,94,0.16)]";
                            } else if (isSelected) {
                                style = "bg-[#8B6CF6]/10 border-[#8B6CF6] text-[#7C3AED]";
                            }

                            return (
                                <button
                                    key={index}
                                    onClick={() => chooseAnswer(index)}
                                    disabled={selectedAnswer !== null}
                                    className={`relative min-h-[90px] rounded-3xl border-2 p-5 text-left font-bold transition-all duration-300 ${style} ${selectedAnswer !== null ? "cursor-default" : "hover:-translate-y-0.5"}`}
                                >
                                    <span className="text-sm opacity-50 mr-2">
                                        {String.fromCharCode(65 + index)}.
                                    </span>
                                    {option}
                                    {isCorrect && <span className="absolute right-4 top-4 text-emerald-600">✓</span>}
                                    {isWrongSelection && <span className="absolute right-4 top-4 text-rose-600">✕</span>}
                                </button>
                            );
                        })}
                    </section>

                    {selectedAnswer !== null && (
                        <div className="mt-6 flex flex-col md:flex-row md:items-center gap-4 justify-between">
                            <div className={`rounded-2xl px-5 py-4 font-bold ${
                                checkingAnswer
                                    ? "bg-[#8B6CF6]/10 text-[#7C3AED]"
                                    : answerFeedback?.is_correct
                                        ? "bg-emerald-50 text-emerald-700"
                                        : "bg-rose-50 text-rose-700"
                            }`}>
                                {checkingAnswer
                                    ? "Memi vérifie ta réponse..."
                                    : answerFeedback?.is_correct
                                        ? "Bonne réponse !"
                                        : `Pas tout à fait. La bonne réponse est : ${answerFeedback?.correct_answer || ""}`}
                                {answerFeedback?.explanation && (
                                    <p className="mt-1 text-sm font-medium opacity-80">{answerFeedback.explanation}</p>
                                )}
                            </div>
                            <button
                                onClick={nextQuestion}
                                disabled={submitting || checkingAnswer || !answerFeedback}
                                className="h-12 px-6 rounded-2xl bg-[#1E293B] text-white font-bold flex items-center gap-2"
                            >
                                {submitting
                                    ? "Correction..."
                                    : step + 1 >= total
                                        ? "Terminer le quiz"
                                        : "Question suivante"}
                                <ArrowRight size={18} />
                            </button>
                        </div>
                    )}
                </main>

                <aside className="space-y-4">
                    <div className="rounded-[30px] bg-white border border-slate-100 p-6">
                        <AnimatedMemi
                            mood={answerFeedback?.is_correct ? "celebrating" : answerFeedback ? "encouraging" : "thinking"}
                            className="w-28 h-28 mb-3 mx-auto"
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
                                Relis attentivement les quatre propositions avant de répondre.
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
                <AnimatedMemi
                    mood={percent >= 70 ? "celebrating" : "encouraging"}
                    className="w-40 h-40 mx-auto"
                />

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

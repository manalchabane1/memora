import { useEffect, useMemo, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  CalendarDays,
  Clock3,
  GripVertical,
  Trash2,
  X,
  Pencil,
  MapPin,
  Sparkles,
} from "lucide-react";

import {
  createAvailability,
  createRevisionPlan,
  createRevisionSession,
  deleteAvailability,
  deleteRevisionSession,
  getAvailabilities,
  getRevisionPlans,
  getRevisionSessions,
  generateAiPlanning,
  updateRevisionSession,
  getDecks,
} from "../../services/api";
import { MemiGuide } from "../../components/AnimatedMemi";

const HOURS = Array.from({ length: 24 }).map((_, i) => i);
const DAYS = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];
const COLORS = ["#8B6CF6", "#60A5FA", "#34D399", "#FBBF24", "#F472B6"];

function getMonday(date, weekOffset = 0) {
  const d = new Date(date);
  const dayIndex = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - dayIndex + weekOffset * 7);
  d.setHours(0, 0, 0, 0);
  return d;
}

function formatDateInput(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function parseDate(dateString) {
  const [y, m, d] = dateString.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function getDayIndexFromDate(dateString) {
  const d = parseDate(dateString);
  return (d.getDay() + 6) % 7;
}

function getHour(value, fallback = 9) {
  if (!value) return fallback;
  const [hours, minutes = "0"] = String(value).split(":");
  return Number(hours) + Number(minutes) / 60;
}

function hourToTime(value) {
  const hours = Math.floor(value);
  const minutes = Math.round((value - hours) * 60);
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

function sessionToEvent(session) {
  const startHour = getHour(session.start_time, 9);
  const endHour = getHour(session.end_time, startHour + 1);

  return {
    id: session.id || session.session_id || Date.now(),
    title: session.title || session.objective || "Séance de révision",
    date: session.date,
    startHour,
    endHour,
    location: session.location || (session.objective ? "Planning IA" : ""),
    description: session.description || session.session_type || "Révision",
    color: session.color || "#8B6CF6",
    revisionPlan: session.revisionPlan,
    deck: session.deck,
    status: session.status || "planned",
  };
}

function Planning() {
  const [events, setEvents] = useState([]);
  const [weekOffset, setWeekOffset] = useState(0);
  const [draggedId, setDraggedId] = useState(null);
  const [hoverCell, setHoverCell] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [loadingAi, setLoadingAi] = useState(false);
  const [decks, setDecks] = useState([]);
  const [plans, setPlans] = useState([]);
  const [availabilities, setAvailabilities] = useState([]);
  const [availabilityDay, setAvailabilityDay] = useState("Lundi");
  const [availabilityStart, setAvailabilityStart] = useState("18:00");
  const [availabilityEnd, setAvailabilityEnd] = useState("19:00");
  const [aiDeckId, setAiDeckId] = useState("");
  const [aiExamDate, setAiExamDate] = useState("");
  const [aiPriority, setAiPriority] = useState("medium");

  useEffect(() => {
    async function loadPlanningData() {
      try {
        const [sessions, loadedDecks, loadedPlans, loadedAvailabilities] = await Promise.all([
          getRevisionSessions(),
          getDecks(),
          getRevisionPlans(),
          getAvailabilities(),
        ]);
        setEvents(sessions.map(sessionToEvent));
        setDecks(loadedDecks);
        setPlans(loadedPlans);
        setAvailabilities(loadedAvailabilities);
        setAiDeckId(loadedDecks[0]?.id ? String(loadedDecks[0].id) : "");
      } catch (error) {
        console.error("Erreur chargement planning:", error);
      }
    }

    loadPlanningData();
  }, []);

  const weekInfo = useMemo(() => {
    const monday = getMonday(new Date(), weekOffset);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);

    const format = (date) =>
      date.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });

    return {
      monday,
      sunday,
      label: `${format(monday)} — ${format(sunday)}`,
    };
  }, [weekOffset]);

  const visibleEvents = events.filter((event) => {
    const eventDate = parseDate(event.date);
    return eventDate >= weekInfo.monday && eventDate <= weekInfo.sunday;
  });

  const totalHours = visibleEvents.reduce(
    (sum, event) => sum + (event.endHour - event.startHour),
    0
  );
  const daysBeforeExam = aiExamDate
    ? Math.ceil((parseDate(aiExamDate) - new Date()) / (1000 * 60 * 60 * 24))
    : null;

  const openAddModal = () => {
    setEditingEvent(null);
    setShowModal(true);
  };

  const openEditModal = (event) => {
    setEditingEvent(event);
    setShowModal(true);
  };

  const saveEvent = async (data) => {
    try {
      let revisionPlan = data.revisionPlan;
      if (!revisionPlan) {
        const plan = await createRevisionPlan({
          title: "Planning personnel",
          description: "Événements ajoutés manuellement",
        });
        setPlans((prev) => [plan, ...prev]);
        revisionPlan = plan.id;
      }

      const payload = {
        title: data.title,
        date: data.date,
        start_time: hourToTime(data.startHour),
        end_time: hourToTime(data.endHour),
        location: data.location,
        description: data.description,
        color: data.color,
        revisionPlan,
        deck: data.deck,
        status: data.status || "planned",
      };

      if (editingEvent) {
        const saved = await updateRevisionSession(editingEvent.id, payload);
        setEvents((prev) =>
          prev.map((event) => (event.id === editingEvent.id ? sessionToEvent(saved) : event))
        );
      } else {
        const saved = await createRevisionSession(payload);
        setEvents((prev) => [...prev, sessionToEvent(saved)]);
      }

      setShowModal(false);
      setEditingEvent(null);
    } catch (error) {
      alert(error.message);
    }
  };

  const deleteEvent = async (id) => {
    try {
      await deleteRevisionSession(id);
      setEvents((prev) => prev.filter((event) => event.id !== id));
      setShowModal(false);
      setEditingEvent(null);
    } catch (error) {
      alert(error.message);
    }
  };

  const handleGenerateAiPlanning = async () => {
    if (!aiDeckId || !aiExamDate) return alert("Choisis un deck et une date d'examen.");

    setLoadingAi(true);

    try {
      const result = await generateAiPlanning({
        deck_id: Number(aiDeckId),
        exam_date: aiExamDate,
        priority: aiPriority,
      });

      const newEvents = Array.isArray(result.sessions)
        ? result.sessions.map(sessionToEvent)
        : [];

      setEvents((prev) => [...prev, ...newEvents]);
      setPlans(await getRevisionPlans());

      alert(result.message || "Planning IA généré avec succès !");
    } catch (error) {
      console.error("Erreur génération planning IA:", error);
      alert(error.message);
    } finally {
      setLoadingAi(false);
    }
  };

  const onDrop = async (dayIndex, hour) => {
    if (!draggedId) return;

    const newDate = new Date(weekInfo.monday);
    newDate.setDate(weekInfo.monday.getDate() + dayIndex);

    const event = events.find((item) => item.id === draggedId);
    if (!event) return;
    const duration = event.endHour - event.startHour;
    const targetHour = Math.max(0, Math.min(hour, 23 - duration));

    try {
      const saved = await updateRevisionSession(event.id, {
        date: formatDateInput(newDate),
        start_time: hourToTime(targetHour),
        end_time: hourToTime(targetHour + duration),
      });
      setEvents((prev) =>
        prev.map((item) => (item.id === event.id ? sessionToEvent(saved) : item))
      );
    } catch (error) {
      alert(error.message);
    } finally {
      setDraggedId(null);
      setHoverCell(null);
    }
  };

  const addAvailability = async () => {
    try {
      const availability = await createAvailability({
        day: availabilityDay,
        start_time: availabilityStart,
        end_time: availabilityEnd,
      });
      setAvailabilities((prev) => [...prev, availability]);
    } catch (error) {
      alert(error.message);
    }
  };

  const removeAvailability = async (id) => {
    try {
      await deleteAvailability(id);
      setAvailabilities((prev) => prev.filter((item) => item.id !== id));
    } catch (error) {
      alert(error.message);
    }
  };

  return (
    <div className="p-8 max-w-[1500px] mx-auto text-[#1E293B]">
      <header className="flex flex-col xl:flex-row xl:items-end xl:justify-between gap-6 mb-8">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-wider text-[#8B6CF6]">
            Calendrier
          </p>

          <h1 className="text-5xl font-extrabold tracking-tight mt-1">
            Planning de révision
          </h1>

          <p className="text-slate-500 mt-2">
            Organise tes événements par semaine.
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <div className="h-12 px-4 rounded-2xl bg-white border border-slate-200 flex items-center gap-3">
            <button onClick={() => setWeekOffset((v) => v - 1)}>
              <ChevronLeft className="text-slate-500" size={20} />
            </button>

            <span className="font-extrabold flex items-center gap-2">
              <CalendarDays size={18} className="text-[#8B6CF6]" />
              {weekInfo.label}
            </span>

            <button onClick={() => setWeekOffset((v) => v + 1)}>
              <ChevronRight className="text-slate-500" size={20} />
            </button>
          </div>

          <button
            onClick={openAddModal}
            className="h-12 px-5 rounded-2xl bg-[#8B6CF6] text-white font-bold flex items-center gap-2 shadow-[0_12px_25px_-12px_rgba(139,108,246,0.8)] hover:bg-[#7C3AED]"
          >
            <Plus size={20} />
            Nouvel événement
          </button>

          <button
            onClick={handleGenerateAiPlanning}
            disabled={loadingAi}
            className="h-12 px-5 rounded-2xl bg-[#34D399] text-white font-bold flex items-center gap-2 hover:bg-[#10B981] disabled:opacity-60"
          >
            <Sparkles size={20} />
            {loadingAi ? "Génération..." : "Planning IA"}
          </button>
        </div>
      </header>

      {loadingAi && (
        <MemiGuide
          mood="planning"
          eyebrow="Planning IA"
          title="Je construis ton programme de révision..."
          message="J’organise tes disponibilités et tes priorités en séances réalistes."
          compact
          className="mb-6"
        />
      )}

      {!loadingAi && daysBeforeExam !== null && daysBeforeExam >= 0 && daysBeforeExam <= 3 && (
        <MemiGuide
          mood="encouraging"
          eyebrow="Examen proche"
          title={`Ton examen est dans ${daysBeforeExam || "moins d’un"} jour${daysBeforeExam > 1 ? "s" : ""}.`}
          message="Concentre-toi sur les chapitres essentiels et garde des séances réalistes."
          compact
          className="mb-6"
        />
      )}

      <section className="grid xl:grid-cols-2 gap-4 mb-8">
        <div className="bg-white rounded-3xl border border-slate-100 p-5 shadow-sm">
          <h2 className="font-extrabold text-lg">Disponibilités pour l’IA</h2>
          <div className="grid sm:grid-cols-[1fr_1fr_1fr_auto] gap-2 mt-4">
            <select value={availabilityDay} onChange={(e) => setAvailabilityDay(e.target.value)} className="h-11 rounded-xl border border-slate-200 px-3">
              {DAYS.map((day) => <option key={day}>{day}</option>)}
            </select>
            <input type="time" value={availabilityStart} onChange={(e) => setAvailabilityStart(e.target.value)} className="h-11 rounded-xl border border-slate-200 px-3" />
            <input type="time" value={availabilityEnd} onChange={(e) => setAvailabilityEnd(e.target.value)} className="h-11 rounded-xl border border-slate-200 px-3" />
            <button onClick={addAvailability} className="h-11 px-4 rounded-xl bg-[#1E293B] text-white font-bold">Ajouter</button>
          </div>
          <div className="flex flex-wrap gap-2 mt-4">
            {availabilities.map((availability) => (
              <button
                key={availability.id}
                onClick={() => removeAvailability(availability.id)}
                className="px-3 py-2 rounded-xl bg-[#8B6CF6]/10 text-[#8B6CF6] text-sm font-bold flex items-center gap-2"
                title="Supprimer"
              >
                {availability.day} {availability.start_time.slice(0, 5)}–{availability.end_time.slice(0, 5)}
                <X size={14} />
              </button>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-3xl border border-slate-100 p-5 shadow-sm">
          <h2 className="font-extrabold text-lg">Génération du planning IA</h2>
          <div className="grid sm:grid-cols-3 gap-2 mt-4">
            <select value={aiDeckId} onChange={(e) => setAiDeckId(e.target.value)} className="h-11 rounded-xl border border-slate-200 px-3">
              <option value="">Choisir un deck</option>
              {decks.map((deck) => <option key={deck.id} value={deck.id}>{deck.title}</option>)}
            </select>
            <input type="date" value={aiExamDate} min={formatDateInput(new Date())} onChange={(e) => setAiExamDate(e.target.value)} className="h-11 rounded-xl border border-slate-200 px-3" />
            <select value={aiPriority} onChange={(e) => setAiPriority(e.target.value)} className="h-11 rounded-xl border border-slate-200 px-3">
              <option value="low">Priorité faible</option>
              <option value="medium">Priorité moyenne</option>
              <option value="high">Priorité haute</option>
            </select>
          </div>
        </div>
      </section>

      <section className="grid md:grid-cols-3 gap-4 max-w-[700px] mb-8">
        <MiniStat value={visibleEvents.length} label="Événements" color="#8B6CF6" />
        <MiniStat value={`${totalHours}h`} label="Heures planifiées" color="#60A5FA" />
        <MiniStat value={events.length} label="Total créés" color="#34D399" />
      </section>

      <section className="bg-white rounded-[32px] border border-slate-100 overflow-hidden shadow-sm">
        <div
          className="grid border-b border-slate-100"
          style={{ gridTemplateColumns: "90px repeat(7, minmax(0, 1fr))" }}
        >
          <div className="p-4 text-xs font-extrabold uppercase tracking-wider text-slate-400">
            Heure
          </div>

          {DAYS.map((day) => (
            <div
              key={day}
              className="p-4 text-center font-extrabold border-l border-slate-100"
            >
              {day.slice(0, 3)}
            </div>
          ))}
        </div>

        <div
          className="grid"
          style={{ gridTemplateColumns: "90px repeat(7, minmax(0, 1fr))" }}
        >
          {HOURS.map((hour) => (
            <div key={hour} className="contents">
              <div className="border-t border-slate-100 p-3 text-sm text-slate-400 font-bold">
                {hour}h
              </div>

              {DAYS.map((_, dayIndex) => {
                const cellEvents = visibleEvents.filter(
                  (event) =>
                    getDayIndexFromDate(event.date) === dayIndex &&
                    Math.floor(event.startHour) === hour
                );

                const isHover =
                  hoverCell?.day === dayIndex && hoverCell?.hour === hour;

                return (
                  <div
                    key={`${dayIndex}-${hour}`}
                    onDragOver={(e) => {
                      e.preventDefault();
                      setHoverCell({ day: dayIndex, hour });
                    }}
                    onDragLeave={() => setHoverCell(null)}
                    onDrop={(e) => {
                      e.preventDefault();
                      onDrop(dayIndex, hour);
                    }}
                    className={`relative min-h-[85px] border-t border-l border-slate-100 p-2 transition ${
                      isHover ? "bg-[#8B6CF6]/10" : "bg-white"
                    }`}
                  >
                    {cellEvents.map((event) => (
                      <EventBlock
                        key={event.id}
                        event={event}
                        onDragStart={() => setDraggedId(event.id)}
                        onDragEnd={() => {
                          setDraggedId(null);
                          setHoverCell(null);
                        }}
                        onEdit={() => openEditModal(event)}
                        onDelete={() => deleteEvent(event.id)}
                      />
                    ))}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </section>

      {showModal && (
        <EventModal
          initialData={editingEvent}
          defaultDate={formatDateInput(weekInfo.monday)}
          onClose={() => {
            setShowModal(false);
            setEditingEvent(null);
          }}
          onSave={saveEvent}
          onDelete={deleteEvent}
          decks={decks}
          plans={plans}
        />
      )}
    </div>
  );
}

function EventBlock({ event, onDragStart, onDragEnd, onEdit, onDelete }) {
  const duration = event.endHour - event.startHour;

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onClick={onEdit}
      className="group relative rounded-2xl px-3 py-2 cursor-pointer overflow-hidden hover:scale-[1.01] transition"
      style={{
        background: `${event.color}18`,
        borderLeft: `4px solid ${event.color}`,
        minHeight: `${duration * 72}px`,
      }}
    >
      <div className="flex items-start gap-2">
        <GripVertical size={16} style={{ color: event.color }} />

        <div className="min-w-0">
          <h3
            className="font-extrabold text-sm truncate"
            style={{ color: event.color }}
          >
            {event.title}
          </h3>

          <p className="text-xs text-slate-500 flex items-center gap-1 mt-1">
            <Clock3 size={13} />
            {hourToTime(event.startHour)}–{hourToTime(event.endHour)}
          </p>

          {event.location && (
            <p className="text-xs text-slate-400 flex items-center gap-1 mt-1 truncate">
              <MapPin size={12} />
              {event.location}
            </p>
          )}
        </div>
      </div>

      <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onEdit();
          }}
          className="w-7 h-7 rounded-xl bg-white text-[#8B6CF6] flex items-center justify-center"
        >
          <Pencil size={14} />
        </button>

        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="w-7 h-7 rounded-xl bg-white text-red-500 flex items-center justify-center"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
}

function EventModal({ initialData, defaultDate, onClose, onSave, onDelete, decks, plans }) {
  const isEdit = Boolean(initialData);

  const [title, setTitle] = useState(initialData?.title || "");
  const [date, setDate] = useState(initialData?.date || defaultDate);
  const [startHour, setStartHour] = useState(initialData?.startHour || 9);
  const [endHour, setEndHour] = useState(initialData?.endHour || 10);
  const [location, setLocation] = useState(initialData?.location || "");
  const [description, setDescription] = useState(initialData?.description || "");
  const [color, setColor] = useState(initialData?.color || "#8B6CF6");
  const [deck, setDeck] = useState(initialData?.deck || decks[0]?.id || "");
  const [revisionPlan, setRevisionPlan] = useState(initialData?.revisionPlan || plans[0]?.id || "");

  const submit = (e) => {
    e.preventDefault();

    if (!title.trim()) return alert("Ajoute un titre.");
    if (!deck) return alert("Choisis un deck.");
    if (endHour <= startHour) {
      alert("L’heure de fin doit être après l’heure de début.");
      return;
    }

    onSave({
      title: title.trim(),
      date,
      startHour,
      endHour,
      location,
      description,
      color,
      deck: Number(deck),
      revisionPlan: revisionPlan ? Number(revisionPlan) : null,
      status: initialData?.status || "planned",
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        onClick={onClose}
        className="absolute inset-0 bg-[#1E293B]/40 backdrop-blur-sm"
      />

      <form
        onSubmit={submit}
        className="relative w-full max-w-[520px] max-h-[92vh] overflow-y-auto hide-scrollbar bg-white rounded-[32px] p-6 shadow-2xl"
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-400 hover:text-[#1E293B]"
        >
          <X size={22} />
        </button>

        <h2 className="text-3xl font-extrabold text-[#1E293B]">
          {isEdit ? "Modifier l’événement" : "Nouvel événement"}
        </h2>

        <p className="text-slate-500 mt-1">
          Planifie ton créneau de révision.
        </p>

        <div className="mt-4 space-y-3">
          <Field label="Titre">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Réviser les limites"
              autoFocus
              className="w-full h-12 rounded-2xl border border-slate-200 px-4 outline-none focus:ring-2 focus:ring-[#8B6CF6] focus:border-transparent"
            />
          </Field>

          <Field label="Date">
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full h-12 rounded-2xl border border-slate-200 px-4 outline-none focus:ring-2 focus:ring-[#8B6CF6] focus:border-transparent"
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Heure début">
              <input
                type="time"
                value={hourToTime(startHour)}
                onChange={(e) => setStartHour(getHour(e.target.value))}
                className="w-full h-12 rounded-2xl border border-slate-200 px-4 outline-none focus:ring-2 focus:ring-[#8B6CF6] focus:border-transparent"
              />
            </Field>

            <Field label="Heure fin">
              <input
                type="time"
                value={hourToTime(endHour)}
                onChange={(e) => setEndHour(getHour(e.target.value))}
                className="w-full h-12 rounded-2xl border border-slate-200 px-4 outline-none focus:ring-2 focus:ring-[#8B6CF6] focus:border-transparent"
              />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Deck">
              <select value={deck} onChange={(e) => setDeck(e.target.value)} className="w-full h-12 rounded-2xl border border-slate-200 px-4">
                <option value="">Choisir un deck</option>
                {decks.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}
              </select>
            </Field>
            <Field label="Planning">
              <select value={revisionPlan} onChange={(e) => setRevisionPlan(e.target.value)} className="w-full h-12 rounded-2xl border border-slate-200 px-4">
                <option value="">Planning personnel</option>
                {plans.map((plan) => <option key={plan.id} value={plan.id}>{plan.title}</option>)}
              </select>
            </Field>
          </div>

          <Field label="Lieu">
            <input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Bibliothèque, maison, salle B..."
              className="w-full h-12 rounded-2xl border border-slate-200 px-4 outline-none focus:ring-2 focus:ring-[#8B6CF6] focus:border-transparent"
            />
          </Field>

          <Field label="Description">
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Objectif de la séance..."
              rows={3}
              className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none resize-none focus:ring-2 focus:ring-[#8B6CF6] focus:border-transparent"
            />
          </Field>

          <Field label="Couleur">
            <div className="flex gap-3">
              {COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`w-10 h-10 rounded-full transition ${
                    color === c
                      ? "ring-4 ring-[#1E293B]/20 scale-110"
                      : "hover:scale-105"
                  }`}
                  style={{ background: c }}
                />
              ))}
            </div>
          </Field>
        </div>

        <div className="mt-5 flex justify-between items-center gap-3">
          {isEdit ? (
            <button
              type="button"
              onClick={() => onDelete(initialData.id)}
              className="h-12 px-5 rounded-2xl bg-red-50 text-red-500 font-bold hover:bg-red-100"
            >
              Supprimer
            </button>
          ) : (
            <div />
          )}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="h-12 px-5 rounded-2xl text-slate-500 font-bold hover:bg-slate-50"
            >
              Annuler
            </button>

            <button
              type="submit"
              className="h-12 px-6 rounded-2xl bg-[#8B6CF6] text-white font-bold hover:bg-[#7C3AED] shadow-[0_12px_25px_-12px_rgba(139,108,246,0.8)]"
            >
              {isEdit ? "Enregistrer" : "Ajouter l’événement"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="block text-sm font-bold text-[#1E293B] mb-2">
        {label}
      </span>
      {children}
    </label>
  );
}

function MiniStat({ value, label, color }) {
  return (
    <div className="bg-white rounded-3xl border border-slate-100 p-5 shadow-sm">
      <h2 className="text-3xl font-extrabold" style={{ color }}>
        {value}
      </h2>
      <p className="text-slate-500 font-bold text-sm mt-1">{label}</p>
    </div>
  );
}

export default Planning;

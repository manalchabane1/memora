import {
  BookOpen,
  CalendarDays,
  CheckCircle2,
  Lightbulb,
  MessageCircle,
  Sparkles,
  Trophy,
} from "lucide-react";

import memiImage from "../assets/mascot.png";

const moodIcons = {
  welcome: Sparkles,
  thinking: Lightbulb,
  working: BookOpen,
  celebrating: Trophy,
  encouraging: CheckCircle2,
  planning: CalendarDays,
  social: MessageCircle,
};

function AnimatedMemi({ className = "", imageClassName = "", mood = "welcome" }) {
  const MoodIcon = moodIcons[mood] || Sparkles;

  return (
    <div className={`memi-stage memi-stage-${mood} relative isolate ${className}`}>
      <div className="memi-aura" aria-hidden="true" />
      <div className="memi-prop memi-prop-primary" aria-hidden="true">
        <MoodIcon size={18} />
      </div>
      <div className="memi-prop memi-prop-secondary" aria-hidden="true">
        <Sparkles size={14} />
      </div>
      <img
        src={memiImage}
        alt="Memi"
        className={`memi-character w-full h-full object-contain drop-shadow-2xl ${imageClassName}`}
      />
    </div>
  );
}

export function MemiGuide({
  mood = "welcome",
  eyebrow = "Memi",
  title,
  message,
  className = "",
  compact = false,
  children,
}) {
  return (
    <section className={`memi-guide memi-guide-${mood} ${compact ? "memi-guide-compact" : ""} ${className}`}>
      <div className="relative z-10 flex-1">
        <p className="text-xs font-extrabold uppercase tracking-widest text-[#8B6CF6]">
          {eyebrow}
        </p>
        {title && <h2 className={`${compact ? "text-xl" : "text-2xl"} font-extrabold mt-2`}>{title}</h2>}
        {message && <p className="text-slate-500 mt-2 leading-relaxed">{message}</p>}
        {children && <div className="mt-4">{children}</div>}
      </div>
      <AnimatedMemi
        mood={mood}
        className={compact ? "w-24 h-24 shrink-0" : "w-36 h-36 shrink-0"}
      />
    </section>
  );
}

export default AnimatedMemi;

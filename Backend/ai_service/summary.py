import logging
import math
import re

from .chunking import build_balanced_contexts, evenly_select
from .groq_service import call_groq_json
from .parsing import extract_json_lines
from .prompts import JSON_ONLY_SYSTEM, build_summary_facts_prompt, build_summary_synthesis_prompt
from .similarity import contains_similar_text, unique_texts
from .text_cleaning import meaningful_sentences


logger = logging.getLogger(__name__)


def request_summary_facts(text, fact_count, instructions=""):
    try:
        content = call_groq_json(
            build_summary_facts_prompt(text, fact_count, instructions),
            JSON_ONLY_SYSTEM,
            temperature=0.15,
        )
    except Exception:
        logger.exception("Summary section generation failed")
        return []
    return extract_json_lines(content, "facts")[:fact_count]


def synthesize_summary_lines(facts, line_count, instructions=""):
    if not facts:
        return []
    try:
        content = call_groq_json(
            build_summary_synthesis_prompt(facts, line_count, instructions),
            JSON_ONLY_SYSTEM,
            temperature=0.1,
        )
    except Exception:
        logger.exception("Final summary synthesis failed")
        return []
    return extract_json_lines(content, "lines")[:line_count]


def generate_summary_with_groq(text, line_count=20, instructions=""):
    source_chunks = build_balanced_contexts(text, max_contexts=12)
    facts_per_chunk = max(6, min(16, math.ceil(line_count / max(1, len(source_chunks))) + 6))
    facts = []
    for chunk in source_chunks:
        facts.extend(request_summary_facts(chunk, facts_per_chunk, instructions))
    facts = unique_texts(facts, threshold=0.8)
    facts = evenly_select(facts, min(len(facts), 100))

    lines = unique_texts(synthesize_summary_lines(facts, line_count, instructions), threshold=0.8)
    fallback_lines = facts if facts else unique_texts(meaningful_sentences(text), threshold=0.8)
    for fallback_line in fallback_lines:
        if len(lines) >= line_count:
            break
        if not contains_similar_text(fallback_line, lines, threshold=0.8):
            lines.append(fallback_line)
    lines = lines[:line_count]
    if not lines:
        return ""
    final_line = re.sub(r"^À retenir\s*:\s*", "", lines[-1], flags=re.IGNORECASE)
    lines[-1] = f"À retenir : {final_line.strip()}"
    return "\n".join(f"- {line}" for line in lines)

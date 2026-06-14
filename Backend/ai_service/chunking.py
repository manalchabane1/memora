import math
import re

from .text_cleaning import canonical_text, clean_text


def _split_oversized_unit(unit, max_chars):
    words = unit.split()
    pieces = []
    current = []
    current_length = 0
    for word in words:
        added_length = len(word) + (1 if current else 0)
        if current and current_length + added_length > max_chars:
            pieces.append(" ".join(current))
            current = []
            current_length = 0
        current.append(word)
        current_length += len(word) + (1 if current_length else 0)
    if current:
        pieces.append(" ".join(current))
    return pieces


def split_text(text, max_chars=7000):
    cleaned = clean_text(text)
    if not cleaned:
        return []

    units = [
        unit.strip()
        for unit in re.split(r"(?<=[.!?])\s+|\n+", cleaned)
        if unit.strip()
    ]
    chunks = []
    current = []
    current_length = 0
    for unit in units:
        for piece in _split_oversized_unit(unit, max_chars):
            added_length = len(piece) + (1 if current else 0)
            if current and current_length + added_length > max_chars:
                chunks.append(" ".join(current))
                current = []
                current_length = 0
            current.append(piece)
            current_length += len(piece) + (1 if current_length else 0)
    if current:
        chunks.append(" ".join(current))
    return chunks


def evenly_select(items, count):
    if len(items) <= count:
        return items
    if count <= 1:
        return [items[len(items) // 2]]
    return [
        items[round(index * (len(items) - 1) / (count - 1))]
        for index in range(count)
    ]


def _representative_excerpt(text, max_chars):
    if len(text) <= max_chars:
        return text
    half = max_chars // 2
    return f"{text[:half]}\n[...]\n{text[-half:]}"


def build_balanced_contexts(text, max_contexts=12, chunk_chars=9000, context_chars=24000):
    chunks = split_text(text, max_chars=chunk_chars)
    if len(chunks) <= max_contexts:
        return chunks

    contexts = []
    group_size = math.ceil(len(chunks) / max_contexts)
    for start in range(0, len(chunks), group_size):
        group = chunks[start:start + group_size]
        excerpt_chars = max(200, context_chars // len(group))
        contexts.append("\n\n".join(
            _representative_excerpt(chunk, excerpt_chars)
            for chunk in group
        ))
    return contexts


def select_relevant_chunks(text, query, max_chunks=4, max_chars=7000):
    chunks = split_text(text, max_chars=max_chars)
    if len(chunks) <= max_chunks:
        return chunks

    query_tokens = set(canonical_text(query).split())
    if not query_tokens:
        return evenly_select(chunks, max_chunks)

    scored = []
    for index, chunk in enumerate(chunks):
        chunk_tokens = set(canonical_text(chunk).split())
        overlap = len(query_tokens & chunk_tokens)
        density = overlap / max(1, len(query_tokens))
        scored.append((overlap, density, index, chunk))

    selected = sorted(scored, reverse=True)[:max_chunks]
    if selected[0][0] == 0:
        return []
    return [item[3] for item in sorted(selected, key=lambda item: item[2])]

from difflib import SequenceMatcher

from .text_cleaning import canonical_text, normalize_text


SIMILARITY_THRESHOLD = 0.76
SIMILARITY_STOPWORDS = {
    "a", "an", "and", "au", "aux", "ce", "ces", "cette", "comment", "dans",
    "de", "des", "du", "est", "et", "is", "la", "le", "les", "of", "pour",
    "pourquoi", "qu", "que", "quel", "quelle", "quelles", "quels", "qui",
    "sont", "the", "to", "un", "une", "what",
}


def texts_are_similar(first, second, threshold=SIMILARITY_THRESHOLD):
    first_key = canonical_text(first)
    second_key = canonical_text(second)
    if not first_key or not second_key:
        return False
    if first_key == second_key:
        return True

    first_tokens = {token for token in first_key.split() if token not in SIMILARITY_STOPWORDS}
    second_tokens = {token for token in second_key.split() if token not in SIMILARITY_STOPWORDS}
    if not first_tokens or not second_tokens:
        first_tokens = set(first_key.split())
        second_tokens = set(second_key.split())
    union = first_tokens | second_tokens
    token_similarity = len(first_tokens & second_tokens) / len(union) if union else 0
    is_subset = (
        min(len(first_tokens), len(second_tokens)) >= 2
        and (first_tokens <= second_tokens or second_tokens <= first_tokens)
    )
    sequence_similarity = SequenceMatcher(None, first_key, second_key).ratio()
    return token_similarity >= threshold or (is_subset and sequence_similarity >= 0.75)


def contains_similar_text(value, existing_values, threshold=SIMILARITY_THRESHOLD):
    return any(texts_are_similar(value, existing, threshold) for existing in existing_values)


def unique_texts(values, threshold=SIMILARITY_THRESHOLD):
    unique = []
    for value in values:
        normalized = normalize_text(value)
        if normalized and not contains_similar_text(normalized, unique, threshold):
            unique.append(normalized)
    return unique


def has_duplicate_choices(choices):
    return any(
        contains_similar_text(choice, choices[:index], threshold=0.8)
        for index, choice in enumerate(choices)
    )


def choice_sets_are_similar(first_choices, second_choices, threshold=0.8):
    if len(first_choices) != len(second_choices):
        return False
    unmatched = list(second_choices)
    for choice in first_choices:
        match_index = next(
            (
                index for index, candidate in enumerate(unmatched)
                if texts_are_similar(choice, candidate, threshold)
            ),
            None,
        )
        if match_index is None:
            return False
        unmatched.pop(match_index)
    return True


def contains_similar_choice_set(choices, existing_choice_sets, threshold=0.8):
    return any(
        choice_sets_are_similar(choices, existing, threshold)
        for existing in existing_choice_sets
    )

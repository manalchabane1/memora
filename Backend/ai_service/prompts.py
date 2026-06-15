import json


JSON_ONLY_SYSTEM = "Tu réponds uniquement avec un objet JSON valide, sans markdown."


def build_flashcards_prompt(text, count, difficulty="all", focus=""):
    difficulty_instruction = (
        "répartis les difficultés entre easy, medium et hard"
        if difficulty == "all"
        else f"toutes les cartes doivent avoir la difficulté {difficulty}"
    )
    focus_instruction = focus or "les notions les plus importantes du cours"

    return f"""
Tu es un assistant pédagogique expert en création de supports de révision.

Objectif:
Génère EXACTEMENT {count} flashcards distinctes et utiles à partir de cette section du cours, si la section contient assez de notions exploitables.
Si certaines informations sont inutiles, ignore-les et cherche d'autres notions importantes dans la section avant de réduire le nombre.

Réponds uniquement avec un objet JSON valide:
{{"items": [{{"question": "question claire", "answer": "réponse précise", "difficulty": "easy"}}]}}

Contraintes obligatoires:
- réponds uniquement en français
- difficulty doit être easy, medium ou hard
- {difficulty_instruction}
- concentre-toi sur: {focus_instruction}
- privilégie les définitions, méthodes, mécanismes, concepts, relations, formules et algorithmes
- chaque flashcard doit tester une connaissance réutilisable en examen
- les questions doivent être différentes entre elles
- les réponses doivent être courtes, précises et fidèles au cours
- n'invente jamais une information absente du texte
- aucun champ supplémentaire

Interdictions:
- ne crée jamais de flashcard à partir de titres seuls
- ne crée jamais de flashcard à partir de sommaires, tables des matières ou plans de cours
- ne crée jamais de flashcard sur des noms propres, enseignants, auteurs, universités, emails ou en-têtes de diapositives
- ne crée jamais de flashcard sur une blague, une remarque isolée ou un exemple sans notion générale
- ne crée jamais de flashcard du type "Explique ce passage du cours"

Important:
Si une phrase est seulement décorative ou administrative, ignore-la.
Si un exemple illustre une notion générale, crée une flashcard sur la notion générale, pas sur l'exemple lui-même.
Retourne moins de {count} flashcards uniquement si la section ne contient vraiment pas assez de connaissances fiables.

Section du cours:
{text}
"""


def build_flashcard_facts_prompt(text, fact_count, focus=""):
    focus_instruction = focus or "les notions les plus importantes du cours"

    return f"""
Tu analyses une section de cours afin de préparer des flashcards de révision.
Extrais entre 5 et {fact_count} faits pédagogiques atomiques, fiables et utiles en examen
si la section contient assez de matière. Retourne-en moins uniquement si elle ne contient
pas 5 idées fiables.

Un fait atomique est une idée complète et autonome, compréhensible sans le document original:
- une définition
- une propriété
- une formule accompagnée de sa signification
- une étape d'algorithme
- une méthode
- une relation entre concepts
- une condition ou une conséquence

Contraintes obligatoires:
- réponds uniquement en français
- concentre-toi sur: {focus_instruction}
- privilégie les faits centraux et diversifiés
- chaque fait doit être fidèle à la section et suffisamment complet pour créer une flashcard
- un fait peut être détaillé; ne le raccourcis pas au point de perdre son sens
- fusionne les idées redondantes
- n'invente jamais d'information
- chaque fait doit être autonome mais compact: maximum 35 mots

Ignore obligatoirement:
- titres seuls, en-têtes de diapositives, plans et tables des matières
- noms d'enseignants, auteurs, universités et adresses email
- texte administratif, bibliographies, liens et modalités
- blagues, anecdotes et exemples isolés sans concept général

Réponds uniquement avec cet objet JSON:
{{"facts": ["fait autonome 1", "fait autonome 2"]}}

Section du cours:
{text}
"""


def build_flashcards_from_facts_prompt(
    facts,
    count,
    difficulty="all",
    focus="",
    previous_questions=None,
):
    difficulty_instruction = (
        "répartis les difficultés entre easy, medium et hard"
        if difficulty == "all"
        else f"toutes les cartes doivent avoir la difficulté {difficulty}"
    )
    focus_instruction = focus or "les notions les plus importantes du cours"
    previous_questions = previous_questions or []
    previous_instruction = (
        "Évite absolument les questions déjà générées suivantes: "
        f"{json.dumps(previous_questions, ensure_ascii=False)}"
        if previous_questions
        else "Aucune question précédente à éviter."
    )

    return f"""
Tu es un assistant pédagogique expert en création de flashcards.
Génère EXACTEMENT {count} flashcards distinctes à partir des faits vérifiés fournis.
Retourne moins de cartes uniquement si les faits ne contiennent vraiment pas assez de connaissances fiables.

Réponds uniquement avec cet objet JSON:
{{"items": [{{"question": "question claire", "answer": "réponse précise", "difficulty": "easy"}}]}}

Contraintes obligatoires:
- réponds uniquement en français
- {difficulty_instruction}
- concentre-toi sur: {focus_instruction}
- teste uniquement des définitions, concepts, méthodes, algorithmes, formules, mécanismes ou relations
- chaque question doit tester une connaissance différente et utile en examen
- chaque réponse doit être précise, autonome et fidèle aux faits
- difficulty doit être easy, medium ou hard
- n'invente jamais d'information et n'ajoute aucun champ
- {previous_instruction}

Interdictions:
- aucune question sur un titre, un plan, une personne, une université, un email ou du texte administratif
- aucune question sur une blague, une anecdote ou un exemple isolé
- aucune question vague du type "Explique ce passage"

Faits vérifiés:
{json.dumps(facts, ensure_ascii=False)}
"""


def build_summary_facts_prompt(text, fact_count, instructions=""):
    focus = instructions or "les notions les plus importantes du cours"
    return f"""
Tu analyses une section d'un cours afin de préparer une synthèse globale.
Extrais uniquement les faits pédagogiques importants, précis et autonomes.

Contraintes:
- réponds en français et n'invente rien
- ignore les détails administratifs, liens et bibliographies
- privilégie définitions, relations, mécanismes, méthodes et conclusions
- fusionne les idées redondantes
- retourne au maximum {fact_count} faits
- consigne particulière: {focus}

Réponds uniquement avec:
{{"facts": ["fait important 1", "fait important 2"]}}

Section du cours:
{text}
"""


def build_summary_synthesis_prompt(facts, line_count, instructions=""):
    focus = instructions or "les notions les plus importantes du cours"
    return f"""
Tu es un assistant pédagogique expert en synthèse de cours.
Crée une fiche de révision cohérente uniquement à partir des faits vérifiés.

Contraintes:
- réponds en français et n'invente rien
- fusionne les doublons et organise les idées dans un ordre logique
- chaque ligne doit apporter une information différente et utile
- retourne jusqu'à {line_count} lignes, sans répétition pour remplir
- la dernière ligne doit commencer par "À retenir :"
- consigne particulière: {focus}

Réponds uniquement avec:
{{"lines": ["ligne 1", "ligne 2"]}}

Faits vérifiés:
{json.dumps(facts, ensure_ascii=False)}
"""


def build_quiz_prompt(flashcards, count, difficulty="medium", instructions=""):
    focus = instructions or "les notions les plus importantes"
    return f"""
Tu es un assistant pédagogique expert en création de QCM de révision.

Objectif:
Génère EXACTEMENT {count} questions distinctes à partir des flashcards fournies, si les flashcards contiennent assez de notions exploitables.

Réponds uniquement avec un objet JSON valide:
{{"items": [{{"question": "Quel est le principe de cette notion ?", "choices": ["une réponse correcte et complète", "une réponse plausible mais fausse", "une autre erreur fréquente", "une confusion possible"], "correct_answer": "une réponse correcte et complète", "explanation": "La bonne réponse correspond à la définition du cours."}}]}}
Contraintes:
- réponds uniquement en français
- chaque question teste une notion différente
- chaque question a exactement 4 choix distincts
- correct_answer est exactement égal à un choix
- une seule réponse doit être correcte
- les mauvais choix doivent être plausibles mais clairement faux
- ne répète ni question, ni ensemble de choix
- niveau attendu: {difficulty}
- consigne particulière: {focus}
- chaque question doit venir d'une notion importante déjà présente dans les flashcards
- retourne moins de {count} questions uniquement si les flashcards ne permettent vraiment pas d'en créer davantage

Interdictions:
- ne crée jamais de question sur un titre, un sommaire, un nom propre, une adresse email, une université, une anecdote, une remarque isolée ou un exemple sans notion générale
- ne crée jamais de question sur la structure du document
- ne crée jamais de question vague du type "De quoi parle ce passage ?"

Flashcards:
{json.dumps(flashcards, ensure_ascii=False)}
"""


def build_personal_quiz_prompt(topic, count, difficulty="medium", instructions=""):
    focus = instructions or "couvrir les notions principales"
    return f"""
Tu es un assistant pédagogique expert en création de QCM.
Génère jusqu'à {count} questions distinctes sur le sujet fourni.

Réponds uniquement avec:
{{"items": [{{"question": "question claire", "choices": ["A", "B", "C", "D"], "correct_answer": "A", "explanation": "explication courte"}}]}}

Contraintes:
- réponds uniquement en français
- chaque question teste un aspect différent
- exactement 4 choix distincts et une seule bonne réponse
- correct_answer est exactement égal à un choix
- ne répète ni question, ni ensemble de choix
- niveau attendu: {difficulty}
- consigne particulière: {focus}

Sujet:
{topic}
"""


def build_pdf_question_prompt(context, question):
    return f"""
Tu es un assistant pédagogique.
Réponds à la question uniquement à partir des extraits du cours fournis.
Si la réponse n'y figure pas, réponds: "Je ne trouve pas cette information dans le cours."
Réponds en français, clairement, sans inventer.

Question:
{question}

Extraits pertinents du cours:
{context}
"""


def build_revision_plan_prompt(deck_title, flashcards, availabilities, exam_date, priority):
    return f"""
Tu es un assistant pédagogique spécialisé dans l'organisation des révisions.
Propose un planning réaliste utilisant uniquement les disponibilités fournies.

Réponds uniquement avec:
{{"sessions": [{{"day": "Lundi", "start_time": "18:00", "end_time": "19:00", "objective": "Réviser les notions principales", "session_type": "flashcards", "todo_title": "Réviser les cartes importantes", "todo_description": "Revoir les cartes difficiles", "todo_priority": "high"}}]}}

Contraintes:
- maximum 5 séances et aucune séance hors disponibilité
- session_type: flashcards, summary, quiz ou review
- todo_priority: low, medium ou high
- réponds en français

Deck: {deck_title}
Date d'examen: {exam_date}
Priorité: {priority}
Disponibilités: {json.dumps(availabilities, ensure_ascii=False)}
Flashcards représentatives: {json.dumps(flashcards, ensure_ascii=False)}
"""

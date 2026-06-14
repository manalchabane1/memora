from django.urls import path

from .views import (
    get_courses,
    download_course,
    get_decks,
    upload_course,
    delete_course,
    generate_flashcards_from_course,
    generate_summary_from_course,
    ask_question_from_course,
    delete_deck,
    generate_quiz_from_deck,
    submit_quiz,
    quiz_attempt_history,
    quiz_statistics,
    generate_personal_quiz,
    get_quizzes,
    delete_quiz,
    global_chat,
    folders_list_create,
    move_course_to_folder,
    global_chat,
    check_quiz_answer,
)

urlpatterns = [
    path("", get_courses, name="get_courses"),

    path("upload/", upload_course, name="upload_course"),
    path("<int:course_id>/file/", download_course, name="download_course"),

    path("decks/", get_decks, name="get_decks"),

    path(
        "<int:course_id>/",
        delete_course,
        name="delete_course"
    ),

    path(
        "<int:course_id>/generate-flashcards/",
        generate_flashcards_from_course,
        name="generate_flashcards_from_course"
    ),

    path(
        "<int:course_id>/generate-summary/",
        generate_summary_from_course,
        name="generate_summary_from_course"
    ),

    path(
        "<int:course_id>/ask/",
        ask_question_from_course,
        name="ask_question_from_course"
    ),

    path(
        "flashcards/delete/<int:deck_id>/",
        delete_deck,
        name="delete_deck"
    ),

    path(
        "decks/<int:deck_id>/generate-quiz/",
        generate_quiz_from_deck,
        name="generate_quiz_from_deck"
    ),

    path(
        "quizzes/<int:quiz_id>/submit/",
        submit_quiz,
        name="submit_quiz"
    ),
    path(
        "quizzes/<int:quiz_id>/questions/<int:question_id>/check/",
        check_quiz_answer,
        name="check_quiz_answer",
    ),

    path(
        "quizzes/<int:quiz_id>/history/",
        quiz_attempt_history,
        name="quiz_attempt_history"
    ),

    path(
        "quizzes/<int:quiz_id>/statistics/",
        quiz_statistics,
        name="quiz_statistics"
    ),

    path(
        "generate-personal-quiz/",
        generate_personal_quiz,
        name="generate_personal_quiz"
    ),

    path(
        "quizzes/",
        get_quizzes,
        name="get_quizzes"
    ),

    path(
        "quizzes/delete/<int:quiz_id>/",
        delete_quiz,
        name="delete_quiz"
    ),
    path("global-chat/", global_chat, name="global_chat"),

    path("folders/", folders_list_create, name="folders_list_create"),
path("<int:course_id>/move-folder/", move_course_to_folder, name="move_course_to_folder"),
path("global-chat/", global_chat, name="global_chat"),
]

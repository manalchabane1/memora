export const API_ORIGIN = (import.meta.env.VITE_API_ORIGIN || "http://127.0.0.1:8000").replace(
  /\/$/,
  ""
);
const API_URL = `${API_ORIGIN}/api`;

function getAuthHeaders() {
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Token ${token}` } : {};
}

async function handleResponse(response, errorMessage) {
  if (response.status === 401) {
    localStorage.removeItem("token");
    window.dispatchEvent(new CustomEvent("auth-expired", {
      detail: { message: "Ta session a expiré. Reconnecte-toi pour retrouver tes pages." },
    }));
  }

  if (!response.ok) {
    let data;
    try {
      data = await response.json();
    } catch (error) {
      throw new Error(errorMessage, { cause: error });
    }
    const details = data.error || data.detail || data.message || JSON.stringify(data);
    throw new Error(Array.isArray(details) ? details.join(" ") : details);
  }

  if (response.status === 204) return null;
  return response.json();
}

async function apiFetch(path, options = {}, errorMessage = "Erreur API") {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      ...getAuthHeaders(),
      ...options.headers,
    },
  });
  return handleResponse(response, errorMessage);
}

function jsonOptions(method, data) {
  return {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  };
}

export function loginAccount(credentials) {
  return apiFetch("/auth/login/", jsonOptions("POST", credentials), "Erreur authentification");
}

export function registerAccount(data) {
  return apiFetch("/auth/register/", jsonOptions("POST", data), "Erreur inscription");
}

export function verifyEmail(uid, token) {
  return apiFetch(
    `/accounts/verify-email/${uid}/${token}/`,
    {},
    "Erreur de vérification"
  );
}

export function confirmPasswordReset(uid, token, password) {
  return apiFetch(
    `/auth/password-reset-confirm/${uid}/${token}/`,
    jsonOptions("POST", { password }),
    "Erreur réinitialisation mot de passe"
  );
}

export function getProfile() {
  return apiFetch("/auth/profile/", {}, "Erreur chargement profil");
}

export function updateProfile(data) {
  if (data.avatar instanceof File) {
    const formData = new FormData();
    Object.entries(data).forEach(([key, value]) => {
      formData.append(key, Array.isArray(value) ? value.join(",") : value);
    });
    return apiFetch(
      "/auth/profile/",
      { method: "PATCH", body: formData },
      "Erreur modification profil"
    );
  }
  return apiFetch("/auth/profile/", jsonOptions("PATCH", data), "Erreur modification profil");
}

export function changePassword(data) {
  return apiFetch(
    "/auth/change-password/",
    jsonOptions("POST", data),
    "Erreur modification mot de passe"
  );
}

export function logoutApi() {
  return apiFetch("/auth/logout/", { method: "POST" }, "Erreur déconnexion");
}

export function requestPasswordReset(email) {
  return apiFetch(
    "/auth/password-reset/",
    jsonOptions("POST", { email }),
    "Erreur demande de réinitialisation"
  );
}

export function getCourses() {
  return apiFetch("/courses/", {}, "Erreur chargement cours");
}

export async function getCourseFileBlob(courseId) {
  const response = await fetch(`${API_URL}/courses/${courseId}/file/`, {
    headers: getAuthHeaders(),
  });
  if (!response.ok) await handleResponse(response, "Erreur chargement PDF");
  return response.blob();
}

export async function uploadCoursePDF(file) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("title", file.name.replace(/\.pdf$/i, ""));
  return apiFetch(
    "/courses/upload/",
    { method: "POST", body: formData },
    "Erreur upload PDF"
  );
}

export function updateCourse(id, data) {
  return apiFetch(`/courses/${id}/`, jsonOptions("PATCH", data), "Erreur modification cours");
}

export function deleteCourseApi(id) {
  return apiFetch(`/courses/${id}/`, { method: "DELETE" }, "Erreur suppression cours");
}

export function getDecks() {
  return apiFetch("/courses/decks/", {}, "Erreur chargement flashcards");
}

export function deleteDeck(id) {
  return apiFetch(
    `/courses/flashcards/delete/${id}/`,
    { method: "DELETE" },
    "Erreur suppression flashcards"
  );
}

export function generateFlashcardsFromCourse(courseId, options = {}) {
  return apiFetch(
    `/courses/${courseId}/generate-flashcards/`,
    jsonOptions("POST", options),
    "Erreur génération flashcards"
  );
}

export function generateSummaryFromCourse(courseId, options = {}) {
  return apiFetch(
    `/courses/${courseId}/generate-summary/`,
    jsonOptions("POST", options),
    "Erreur génération résumé"
  );
}

export function askQuestionFromCourse(courseId, question) {
  return apiFetch(
    `/courses/${courseId}/ask/`,
    jsonOptions("POST", { question }),
    "Erreur question IA"
  );
}

export function getQuizzes() {
  return apiFetch("/courses/quizzes/", {}, "Erreur chargement quiz");
}

export function generateQuizFromDeck(deckId, options = {}) {
  return apiFetch(
    `/courses/decks/${deckId}/generate-quiz/`,
    jsonOptions("POST", options),
    "Erreur génération quiz"
  );
}

export function generatePersonalQuiz(topic, options = {}) {
  return apiFetch(
    "/courses/generate-personal-quiz/",
    jsonOptions("POST", { topic, ...options }),
    "Erreur génération quiz"
  );
}

export function submitQuiz(quizId, answers) {
  return apiFetch(
    `/courses/quizzes/${quizId}/submit/`,
    jsonOptions("POST", { answers }),
    "Erreur correction quiz"
  );
}

export function checkQuizAnswer(quizId, questionId, answer) {
  return apiFetch(
    `/courses/quizzes/${quizId}/questions/${questionId}/check/`,
    jsonOptions("POST", { answer }),
    "Erreur de vérification de la réponse"
  );
}

export function deleteQuizApi(quizId) {
  return apiFetch(
    `/courses/quizzes/delete/${quizId}/`,
    { method: "DELETE" },
    "Erreur suppression quiz"
  );
}

export function getTodos() {
  return apiFetch("/todos/", {}, "Erreur chargement tâches");
}

export function createTodo(todo) {
  return apiFetch("/todos/", jsonOptions("POST", todo), "Erreur création tâche");
}

export function updateTodo(id, data) {
  return apiFetch(`/todos/${id}/`, jsonOptions("PATCH", data), "Erreur modification tâche");
}

export function deleteTodoApi(id) {
  return apiFetch(`/todos/${id}/`, { method: "DELETE" }, "Erreur suppression tâche");
}

export function getAvailabilities() {
  return apiFetch("/planning/availabilities/", {}, "Erreur chargement disponibilités");
}

export function createAvailability(availability) {
  return apiFetch(
    "/planning/availabilities/",
    jsonOptions("POST", availability),
    "Erreur création disponibilité"
  );
}

export function deleteAvailability(id) {
  return apiFetch(
    `/planning/availabilities/${id}/`,
    { method: "DELETE" },
    "Erreur suppression disponibilité"
  );
}

export function getRevisionPlans() {
  return apiFetch("/planning/", {}, "Erreur chargement plannings");
}

export function createRevisionPlan(plan) {
  return apiFetch("/planning/", jsonOptions("POST", plan), "Erreur création planning");
}

export function getRevisionSessions() {
  return apiFetch("/planning/sessions/", {}, "Erreur chargement séances");
}

export function createRevisionSession(session) {
  return apiFetch(
    "/planning/sessions/",
    jsonOptions("POST", session),
    "Erreur création séance"
  );
}

export function updateRevisionSession(id, data) {
  return apiFetch(
    `/planning/sessions/${id}/`,
    jsonOptions("PATCH", data),
    "Erreur modification séance"
  );
}

export function deleteRevisionSession(id) {
  return apiFetch(
    `/planning/sessions/${id}/`,
    { method: "DELETE" },
    "Erreur suppression séance"
  );
}

export function generateAiPlanning(data) {
  return apiFetch(
    "/planning/generate-ai/",
    jsonOptions("POST", data),
    "Erreur génération planning IA"
  );
}
/* ---------------- FORUM ---------------- */

export function getForumPosts() {
  return apiFetch("/forum/", {}, "Erreur chargement forum");
}

export function createForumPost(post) {
  return apiFetch(
    "/forum/",
    jsonOptions("POST", post),
    "Erreur création publication"
  );
}

export function getForumComments(postId) {
  return apiFetch(
    `/forum/${postId}/comments/`,
    {},
    "Erreur chargement commentaires"
  );
}

export function createForumComment(postId, comment) {
  return apiFetch(
    `/forum/${postId}/comments/`,
    jsonOptions("POST", comment),
    "Erreur création commentaire"
  );
}

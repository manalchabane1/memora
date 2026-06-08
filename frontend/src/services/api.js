const API_URL = "http://127.0.0.1:8000/api";

function getAuthHeaders() {
  const token = localStorage.getItem("token");

  return token ? { Authorization: `Token ${token}` } : {};
}

async function handleResponse(response, errorMessage) {
  if (!response.ok) {
    let details = "";

    try {
      const data = await response.json();
      details = data.error || data.detail || data.message || JSON.stringify(data);
    } catch {
      details = "";
    }

    throw new Error(details || errorMessage);
  }

  return response.json();
}

/* ---------------- COURSES ---------------- */

export async function getCourses() {
  const response = await fetch(`${API_URL}/courses/`, {
    headers: {
      ...getAuthHeaders(),
    },
  });

  return handleResponse(response, "Erreur chargement cours");
}

export async function uploadCoursePDF(file) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("title", file.name.replace(/\.pdf$/i, ""));

  const response = await fetch(`${API_URL}/courses/upload/`, {
    method: "POST",
    headers: {
      ...getAuthHeaders(),
    },
    body: formData,
  });

  return handleResponse(response, "Erreur upload PDF");
}

export async function deleteCourseApi(id) {
  const response = await fetch(`${API_URL}/courses/${id}/`, {
    method: "DELETE",
    headers: {
      ...getAuthHeaders(),
    },
  });

  return handleResponse(response, "Erreur suppression cours");
}

/* ---------------- FLASHCARDS ---------------- */

export async function getDecks() {
  const response = await fetch(`${API_URL}/courses/decks/`, {
    headers: {
      ...getAuthHeaders(),
    },
  });

  return handleResponse(response, "Erreur chargement flashcards");
}

export async function generateFlashcardsFromCourse(courseId) {
  const response = await fetch(
    `${API_URL}/courses/${courseId}/generate-flashcards/`,
    {
      method: "POST",
      headers: {
        ...getAuthHeaders(),
      },
    }
  );

  return handleResponse(response, "Erreur génération flashcards");
}

/* ---------------- SUMMARY / CHAT PDF ---------------- */

export async function generateSummaryFromCourse(courseId) {
  const response = await fetch(
    `${API_URL}/courses/${courseId}/generate-summary/`,
    {
      method: "POST",
      headers: {
        ...getAuthHeaders(),
      },
    }
  );

  return handleResponse(response, "Erreur génération résumé");
}

export async function askQuestionFromCourse(courseId, question) {
  const response = await fetch(`${API_URL}/courses/${courseId}/ask/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeaders(),
    },
    body: JSON.stringify({ question }),
  });

  return handleResponse(response, "Erreur question IA");
}

/* ---------------- TODOS ---------------- */

export async function getTodos() {
  const response = await fetch(`${API_URL}/todos/`, {
    headers: {
      ...getAuthHeaders(),
    },
  });

  return handleResponse(response, "Erreur chargement todos");
}

export async function createTodo(todo) {
  const response = await fetch(`${API_URL}/todos/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeaders(),
    },
    body: JSON.stringify(todo),
  });

  return handleResponse(response, "Erreur création todo");
}

export async function updateTodo(id, data) {
  const response = await fetch(`${API_URL}/todos/${id}/`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeaders(),
    },
    body: JSON.stringify(data),
  });

  return handleResponse(response, "Erreur modification todo");
}

export async function deleteTodoApi(id) {
  const response = await fetch(`${API_URL}/todos/${id}/`, {
    method: "DELETE",
    headers: {
      ...getAuthHeaders(),
    },
  });

  return handleResponse(response, "Erreur suppression todo");
}

/* ---------------- PLANNING ---------------- */

export async function getAvailabilities() {
  const response = await fetch(`${API_URL}/planning/availabilities/`, {
    headers: {
      ...getAuthHeaders(),
    },
  });

  return handleResponse(response, "Erreur chargement disponibilités");
}

export async function createAvailability(availability) {
  const response = await fetch(`${API_URL}/planning/availabilities/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeaders(),
    },
    body: JSON.stringify(availability),
  });

  return handleResponse(response, "Erreur création disponibilité");
}

export async function getRevisionPlans() {
  const response = await fetch(`${API_URL}/planning/`, {
    headers: {
      ...getAuthHeaders(),
    },
  });

  return handleResponse(response, "Erreur chargement plannings");
}

export async function getRevisionSessions() {
  const response = await fetch(`${API_URL}/planning/sessions/`, {
    headers: {
      ...getAuthHeaders(),
    },
  });

  return handleResponse(response, "Erreur chargement séances");
}

export async function generateAiPlanning(data) {
  const response = await fetch(`${API_URL}/planning/generate-ai/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeaders(),
    },
    body: JSON.stringify(data),
  });

  return handleResponse(response, "Erreur génération planning IA");
}
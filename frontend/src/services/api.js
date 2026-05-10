const API_URL = "http://127.0.0.1:8000/api";

export async function getDecks() {
  const response = await fetch(`${API_URL}/courses/decks/`);
  if (!response.ok) throw new Error("Erreur chargement flashcards");
  return response.json();
}

export async function getCourses() {
  const response = await fetch(`${API_URL}/courses/`);
  if (!response.ok) throw new Error("Erreur chargement cours");
  return response.json();
}

export async function uploadCoursePDF(file) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("title", file.name.replace(/\.pdf$/i, ""));

  const response = await fetch(`${API_URL}/courses/upload/`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) throw new Error("Erreur upload PDF");
  return response.json();
}
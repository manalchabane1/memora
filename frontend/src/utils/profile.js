function humanizeEmail(email) {
  const localPart = String(email || "").split("@")[0];
  const words = localPart
    .split(/[._-]+/)
    .filter((word) => word && !/^\d+$/.test(word));

  return words
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

export function getDisplayName(name, email) {
  return String(name || "").trim() || humanizeEmail(email) || "Utilisateur";
}

export function getInitials(name, email) {
  const nameWords = String(name || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  const words = nameWords.length > 0
    ? nameWords
    : getDisplayName("", email).split(/\s+/).filter(Boolean);

  if (words.length === 0) return "?";
  if (words.length === 1) {
    const nameWord = words[0].toLowerCase();
    const emailSurname = humanizeEmail(email)
      .split(/\s+/)
      .find((word) => word.toLowerCase() !== nameWord);

    return `${words[0].charAt(0)}${emailSurname?.charAt(0) || ""}`.toUpperCase();
  }

  return `${words[0].charAt(0)}${words.at(-1).charAt(0)}`.toUpperCase();
}

export function storeProfile(profile) {
  localStorage.setItem("name", profile.name || "");
  localStorage.setItem("email", profile.email || "");
  window.dispatchEvent(new CustomEvent("profile-updated", { detail: profile }));
}

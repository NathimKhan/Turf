let lastMessage = "";
let lastShownAt = 0;

export function notify(message) {
  const now = Date.now();
  if (message === lastMessage && now - lastShownAt < 1500) return;
  lastMessage = message;
  lastShownAt = now;
  window.dispatchEvent(new CustomEvent("turfx:toast", { detail: message }));
}

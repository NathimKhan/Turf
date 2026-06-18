export function notify(message) {
  window.dispatchEvent(new CustomEvent("turfx:toast", { detail: message }));
}

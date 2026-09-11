import { esc } from "../utils/formatters.js";
import { icon } from "./icons.js";
let previousFocus;
export function showModal(title, subtitle, content, wide = false) {
  const dialog = document.querySelector("#modal");
  previousFocus = document.activeElement;
  if (dialog.open) dialog.close();
  dialog.style.width = wide ? "min(1060px, calc(100% - 28px))" : "";
  dialog.innerHTML = `<div class="dialog-title-row"><div><h2 id="modal-title">${esc(title)}</h2></div><button class="modal-close" data-action="close-modal" aria-label="Fechar janela">${icon("close")}</button></div><p class="modal-subtitle">${esc(subtitle)}</p>${content}`;
  dialog.showModal();
  return dialog;
}
export function closeModal() {
  document.querySelector("#modal").close();
  previousFocus?.focus?.();
}
export function toast(message, error = false) {
  const div = document.createElement("div");
  div.className = `toast ${error ? "error" : ""}`;
  div.innerHTML = `${icon(error ? "alert" : "check")}<span>${esc(message)}</span>`;
  document.querySelector("#toasts").append(div);
  setTimeout(() => div.remove(), error ? 9000 : 5000);
}
export function formError(error, target = "#form-error") {
  const el = document.querySelector(target);
  if (el) {
    el.className = "inline-error";
    el.textContent = error.message || String(error);
    el.scrollIntoView({ block: "nearest" });
  } else toast(error.message || String(error), true);
}
export function confirmDialog(
  title,
  description,
  label,
  callback,
  dangerous = false,
) {
  const dialog = showModal(
    title,
    description,
    `<div id="form-error" role="alert"></div><div class="modal-actions"><button class="btn" data-action="close-modal">Voltar</button><button class="btn ${dangerous ? "danger" : "primary"}" id="confirm-action">${esc(label)}</button></div>`,
  );
  dialog.querySelector("#confirm-action").onclick = async (e) => {
    e.currentTarget.disabled = true;
    try {
      await callback();
    } catch (error) {
      formError(error);
    } finally {
      if (dialog.querySelector("#confirm-action"))
        dialog.querySelector("#confirm-action").disabled = false;
    }
  };
}

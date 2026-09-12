export function isoDate(value = new Date()) {
  const d = value instanceof Date ? value : new Date(`${value}T12:00:00`);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
export function addDays(value, amount) {
  const d = new Date(`${value}T12:00:00`);
  d.setDate(d.getDate() + amount);
  return isoDate(d);
}
export function monday(value = isoDate()) {
  const d = new Date(`${value}T12:00:00`);
  return addDays(value, -((d.getDay() + 6) % 7));
}
export function weekDays(value, length = 6) {
  const start = monday(value);
  return Array.from({ length }, (_, i) => addDays(start, i));
}
export function inWeek(value, week) {
  return !!value && monday(value) === monday(week);
}
export function daysBetween(a, b) {
  return Math.round(
    (new Date(`${b}T12:00:00`) - new Date(`${a}T12:00:00`)) / 86400000,
  );
}
export function weekNumber(value) {
  const d = new Date(`${monday(value)}T12:00:00`);
  d.setDate(d.getDate() + 3);
  const start = new Date(d.getFullYear(), 0, 1, 12);
  return Math.ceil(((d - start) / 86400000 + 1) / 7);
}
export function dateLabel(value, options = {}) {
  return value
    ? new Date(`${value}T12:00:00`).toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        ...options,
      })
    : "—";
}
export function weekLabel(value) {
  return `${dateLabel(monday(value))} — ${dateLabel(addDays(monday(value), 5), { year: "numeric" })}`;
}
export function validDate(value) {
  return (
    typeof value === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    !Number.isNaN(Date.parse(`${value}T12:00:00`)) &&
    isoDate(value) === value
  );
}

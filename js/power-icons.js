// 7つの力を表す小さな図形。viewBox は 0 0 24 24 で統一し、currentColor で塗る。
export const POWER_ICON_PATHS = {
  agency: [
    "M12 2 14.4 7.6 12 17 9.6 7.6Z",
    "M6.5 17h11",
    "M12 17v5",
    "M9.5 22h5",
  ],
  safety: [
    "M12 2.5 20 5.4v6.1c0 4.6-3.2 8.6-8 10-4.8-1.4-8-5.4-8-10V5.4Z",
    "M8.6 12.1 11 14.6l4.6-5",
  ],
  delegation: [
    "M12 2.6a9.4 9.4 0 1 0 0 18.8 9.4 9.4 0 0 0 0-18.8Z",
    "M15.6 8.4 13.3 13.3 8.4 15.6l2.3-4.9Z",
  ],
  instruction: [
    "M8.4 7.4h7.2l3.4 7.5c1 2.3-.6 4.7-3.1 4.7H8.1c-2.5 0-4.1-2.4-3.1-4.7Z",
    "M8.4 7.4c0-3.6 7.2-3.6 7.2 0",
    "M9.6 12.6h4.8",
  ],
  dialogue: [
    "M4.5 19.5 14 10",
    "M17.6 2.6l1 2.6 2.6 1-2.6 1-1 2.6-1-2.6-2.6-1 2.6-1Z",
    "M6.4 13.4l.7 1.8 1.8.7-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7Z",
  ],
  verification: [
    "M12 2.6c3.6 0 6.4 3.1 6.4 7s-2.8 7-6.4 7-6.4-3.1-6.4-7 2.8-7 6.4-7Z",
    "M12 16.6V22",
    "M9.4 22h5.2",
    "M9.6 7.4c-1 .8-1.6 2-1.6 3.4",
  ],
  finishing: [
    "M3.4 12c2.4-3.8 5.7-5.7 9.6-5.7 3.4 0 6 1.6 7.6 3.4L22 12l-1.4 2.3c-1.6 1.8-4.2 3.4-7.6 3.4-3.9 0-7.2-1.9-9.6-5.7Z",
    "M3.4 12 1.6 8.6M3.4 12l-1.8 3.4",
    "M9.6 11.2h.02",
  ],
};

export function powerIconMarkup(powerId, { size = 20, title = "" } = {}) {
  const paths = POWER_ICON_PATHS[powerId];
  if (!paths) return "";
  const label = title
    ? ` role="img" aria-label="${title}"`
    : ' aria-hidden="true" focusable="false"';
  const body = paths
    .map((definition) => `<path d="${definition}"></path>`)
    .join("");
  return `<svg class="power-icon" viewBox="0 0 24 24" width="${size}" height="${size}"`
    + ` fill="none" stroke="currentColor" stroke-width="1.6"`
    + ` stroke-linecap="round" stroke-linejoin="round"${label}>${body}</svg>`;
}

export function createPowerIcon(powerId, options = {}) {
  const markup = powerIconMarkup(powerId, options);
  if (!markup) return null;
  const template = document.createElement("template");
  template.innerHTML = markup;
  return template.content.firstElementChild;
}

// A one-line boundary around the real navigation, so a test can observe that
// it happened — and in what order — without redefining window.location, which
// jsdom exposes as non-configurable. The browser still performs the genuine
// window.location.assign; nothing about the shipped behaviour changes.
export const assignLocation = (url: string): void => {
  window.location.assign(url);
};

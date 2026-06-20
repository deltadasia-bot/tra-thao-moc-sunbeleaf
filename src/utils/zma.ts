export function getBasePath() {
  if (window.BASE_PATH) {
    return window.BASE_PATH.replace(/\/$/, "");
  }

  const zappsPath = window.location.pathname.match(/^\/zapps\/[^/]+/);
  if (zappsPath) {
    return zappsPath[0];
  }

  if (window.APP_ID) {
    return `/zapps/${window.APP_ID}`;
  }

  return "";
}

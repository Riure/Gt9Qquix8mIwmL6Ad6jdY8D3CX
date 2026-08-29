(() => {
  "use strict";
  const API_ORIGIN = "https://xs-m7il.onrender.com";
  const nativeFetch = window.fetch.bind(window);

  window.fetch = function(input, init) {
    try {
      if (typeof input === "string" && input.startsWith("/api/")) {
        input = API_ORIGIN + input;
      } else if (input instanceof Request) {
        const u = new URL(input.url, location.href);
        if (u.origin === location.origin && u.pathname.startsWith("/api/")) {
          input = new Request(API_ORIGIN + u.pathname + u.search, input);
        }
      }
    } catch (e) {
      console.error("[XS API Bridge]", e);
    }
    return nativeFetch(input, init);
  };

  window.XS_API_ORIGIN = API_ORIGIN;
})();

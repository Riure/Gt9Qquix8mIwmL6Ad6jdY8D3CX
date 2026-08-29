(() => {
  "use strict";
  const API_ORIGIN = "https://xs-m7il.onrender.com";
  const nativeFetch = window.fetch.bind(window);

  window.fetch = function(input, init) {
    try {
      let url = "";
      if (typeof input === "string") {
        url = input;
      } else if (input instanceof Request) {
        url = input.url;
      }

      if (url.startsWith("/api/") || url.includes("/api/")) {
        // Se for relativo, adiciona a origem
        let targetUrl = url.startsWith("/") ? API_ORIGIN + url : url;
        if (url.includes("/api/") && !url.startsWith("http")) {
          const pathPart = url.substring(url.indexOf("/api/"));
          targetUrl = API_ORIGIN + pathPart;
        }

        if (input instanceof Request) {
          input = new Request(targetUrl, init || input);
        } else {
          init = init || {};
          input = targetUrl;
        }
      }
    } catch (e) {
      console.error("[XS API Bridge Error]", e);
    }
    return nativeFetch(input, init);
  };

  window.XS_API_ORIGIN = API_ORIGIN;
})();

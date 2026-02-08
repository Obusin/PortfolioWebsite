(function () {
  function initCarousels() {
    var roots = document.querySelectorAll("[data-carousel-3d]");
    if (!roots.length) return;

    var prefersReduced =
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var isCoarsePointer =
      window.matchMedia &&
      window.matchMedia("(pointer: coarse)").matches;
    var isSmall =
      window.matchMedia &&
      window.matchMedia("(max-width: 720px)").matches;

    for (var r = 0; r < roots.length; r++) {
      var root = roots[r];
      var track = root.querySelector("[data-carousel-3d-track]");
      if (!track) continue;

      var prevBtn = root.querySelector("[data-carousel-prev]");
      var nextBtn = root.querySelector("[data-carousel-next]");
      var speed = parseFloat(root.getAttribute("data-carousel-speed") || "0.01");

      var carousel = new window.CardCarousel({
        root: root,
        track: track,
        angleStep: 18,
        distance: 320,
        depthStep: 200,
        speed: speed,
        prevBtn: prevBtn,
        nextBtn: nextBtn,
        isStatic: prefersReduced || isCoarsePointer || isSmall,
      });

      root._carouselInstance = carousel;
    }
  }

  window.initCarousels = initCarousels;
})();

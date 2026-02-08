(function () {
  function CardCarousel(options) {
    this.root = options.root;
    this.track = options.track;
    this.cards = [];
    this.angleStep = options.angleStep;
    this.distance = options.distance;
    this.depthStep = options.depthStep;
    this.speed = options.speed;
    this.isActive = false;
    this.lastTime = 0;
    this.animationFrameId = null;
    this.current = 0;
    this.hoveredIndex = -1;
    this.lockedIndex = -1;
    this.pauseUntil = 0;
    this.movingTimer = null;
    this.hoverRaf = null;
    this.prevBtn = options.prevBtn;
    this.nextBtn = options.nextBtn;
    this.isStatic = options.isStatic;
    this.isBound = false;

    this.refreshCards();
    this.bindEvents();
  }

  CardCarousel.prototype.refreshCards = function () {
    this.cards = this.track.querySelectorAll("[data-carousel-3d-card]");
    this.root.setAttribute("data-carousel-count", String(this.cards.length));
    if (this.current >= this.cards.length) {
      this.current = 0;
    }
    for (var i = 0; i < this.cards.length; i++) {
      this.cards[i].setAttribute("data-carousel-index", String(i));
    }
  };

  CardCarousel.prototype.wrapOffset = function (value, total) {
    if (!total) return 0;
    var wrapped = ((value % total) + total) % total;
    if (wrapped > total / 2) wrapped -= total;
    return wrapped;
  };

  CardCarousel.prototype.update = function (delta) {
    var now = performance.now();
    if (now < this.pauseUntil) {
      delta = 0;
    }
    if (delta > 0) {
      this.root.classList.add("carousel-3d--moving");
      if (this.movingTimer) {
        clearTimeout(this.movingTimer);
      }
      var root = this.root;
      this.movingTimer = setTimeout(function () {
        root.classList.remove("carousel-3d--moving");
      }, 700);
    }

    this.current += delta * this.speed;
    if (this.cards.length && this.current >= this.cards.length) this.current -= this.cards.length;
    if (this.cards.length && this.current < 0) this.current += this.cards.length;

    var total = this.cards.length;
    if (!total) return;

    var focusIndex = this.lockedIndex !== -1 ? this.lockedIndex : this.hoveredIndex;

    for (var i = 0; i < total; i++) {
      var card = this.cards[i];
      var offsetIndex = this.wrapOffset(i - this.current, total);
      var clampedOffset = Math.max(-3, Math.min(3, offsetIndex));
      var absOffset = Math.abs(clampedOffset);
      var angle = clampedOffset * this.angleStep;
      var z = -absOffset * this.depthStep;
      var x = clampedOffset * this.distance;
      var scale = 1 - Math.min(absOffset * 0.12, 0.35);
      var opacity = 1 - Math.min(absOffset * 0.22, 0.7);

      if (focusIndex === i) {
        angle = 0;
        z += 200;
        scale += 0.1;
        opacity = Math.min(1, opacity + 0.25);
        card.classList.add("is-focus");
      } else {
        card.classList.remove("is-focus");
      }

      if (focusIndex !== -1 && focusIndex !== i) {
        card.classList.add("is-dim");
      } else {
        card.classList.remove("is-dim");
      }

      card.style.transform =
        "translateX(" + x + "px) translateZ(" + z + "px) rotateY(" + angle + "deg) scale(" + scale + ")";
      card.style.opacity = String(opacity.toFixed(3));
      card.style.zIndex = String(100 - Math.round(absOffset * 10));
    }
  };

  CardCarousel.prototype.loop = function (timestamp) {
    if (!this.isActive) return;
    if (!this.lastTime) this.lastTime = timestamp;
    var delta = (timestamp - this.lastTime) / 1000;
    this.lastTime = timestamp;
    this.update(delta);
    this.animationFrameId = window.requestAnimationFrame(this.loop.bind(this));
  };

  CardCarousel.prototype.start = function () {
    if (this.isActive) return;
    this.isActive = true;
    this.lastTime = 0;
    this.animationFrameId = window.requestAnimationFrame(this.loop.bind(this));
  };

  CardCarousel.prototype.stop = function () {
    this.isActive = false;
    this.root.classList.remove("carousel-3d--moving");
    if (this.movingTimer) {
      clearTimeout(this.movingTimer);
      this.movingTimer = null;
    }
    if (this.animationFrameId) {
      window.cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  };

  CardCarousel.prototype.nudge = function (direction) {
    if (!this.cards.length) return;
    this.clearLock();
    this.clearHover();
    this.current = Math.round(this.current);
    this.current += direction;
    if (this.current < 0) this.current += this.cards.length;
    if (this.current >= this.cards.length) this.current -= this.cards.length;
    this.pauseUntil = performance.now() + 2000;
    this.update(0);
  };

  CardCarousel.prototype.setHover = function (index) {
    if (this.lockedIndex !== -1) return;
    this.hoveredIndex = index;
    this.pauseUntil = performance.now() + 2000;
    this.update(0);
  };

  CardCarousel.prototype.clearHover = function () {
    if (this.lockedIndex !== -1) return;
    this.hoveredIndex = -1;
    this.update(0);
  };

  CardCarousel.prototype.toggleLock = function (index) {
    if (this.lockedIndex === index) {
      this.lockedIndex = -1;
      this.update(0);
      return;
    }
    this.lockedIndex = index;
    this.pauseUntil = performance.now() + 2000;
    this.update(0);
  };

  CardCarousel.prototype.clearLock = function () {
    if (this.lockedIndex === -1) return;
    this.lockedIndex = -1;
    this.update(0);
  };

  CardCarousel.prototype.handleHover = function (event) {
    var target = document.elementFromPoint(event.clientX, event.clientY);
    if (!target || !target.closest) return;
    if (!this.root.contains(target)) return;
    var card = target.closest("[data-carousel-3d-card]");
    if (!card) return;
    var index = Number(card.getAttribute("data-carousel-index"));
    if (Number.isNaN(index)) return;
    this.setHover(index);
  };

  CardCarousel.prototype.bindEvents = function () {
    var self = this;
    if (this.isBound) return;
    this.isBound = true;
    if (this.isStatic) {
      this.root.classList.add("carousel-3d--static");
      return;
    }

    this.root.addEventListener("pointermove", function (event) {
      if (self.hoverRaf) return;
      self.hoverRaf = window.requestAnimationFrame(function () {
        self.hoverRaf = null;
        self.handleHover(event);
      });
    });

    this.root.addEventListener("pointerleave", function () {
      self.clearHover();
    });

    this.root.addEventListener("pointerenter", function (event) {
      self.handleHover(event);
    });

    this.track.addEventListener("click", function (event) {
      var target = event.target;
      if (window.CardHelper && window.CardHelper.isInteractiveTarget(target)) {
        return;
      }
      if (!target || !target.closest) return;
      var card = target.closest("[data-carousel-3d-card]");
      if (!card) return;
      var index = Number(card.getAttribute("data-carousel-index"));
      if (Number.isNaN(index)) return;
      self.toggleLock(index);
    });

    if (this.prevBtn) {
      this.prevBtn.addEventListener("click", function () {
        self.nudge(-1);
      });
    }
    if (this.nextBtn) {
      this.nextBtn.addEventListener("click", function () {
        self.nudge(1);
      });
    }

    this.root.addEventListener("pointerenter", function () {
      self.stop();
    });
    this.root.addEventListener("pointerleave", function () {
      self.start();
    });

    this.root.addEventListener("carousel:refresh", function () {
      self.refreshCards();
      self.update(0);
    });

    document.addEventListener("click", function (event) {
      if (!self.root.contains(event.target)) {
        self.clearLock();
      }
    });

    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape" || event.key === "Esc") {
        self.clearLock();
      }
      if (event.key === "ArrowLeft") {
        self.nudge(-1);
      }
      if (event.key === "ArrowRight") {
        self.nudge(1);
      }
    });

    if ("IntersectionObserver" in window) {
      var observer = new IntersectionObserver(
        function (entries) {
          for (var i = 0; i < entries.length; i++) {
            if (entries[i].isIntersecting) {
              self.start();
            } else {
              self.stop();
            }
          }
        },
        { rootMargin: "160px 0px" }
      );
      observer.observe(this.root);
    } else {
      this.start();
    }

    document.addEventListener("visibilitychange", function () {
      if (document.hidden) {
        self.stop();
      } else {
        self.start();
      }
    });
  };

  window.CardCarousel = CardCarousel;
})();

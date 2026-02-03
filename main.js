// Minimal behavior for the portfolio site.
// - Keeps the footer year current.
// - No animations or external libraries.

(function () {
	// Keep footer year current
	var yearEl = document.getElementById("year");
	if (yearEl) {
		yearEl.textContent = String(new Date().getFullYear());
	}

		initCarousel3D();
		initVideoLibrary();
		initRobloxShowcase();

	function initCarousel3D() {
		var roots = document.querySelectorAll("[data-carousel-3d]");
		if (!roots.length) return;

		if (
			window.matchMedia &&
			window.matchMedia("(prefers-reduced-motion: reduce)").matches
		) {
			return;
		}

		for (var r = 0; r < roots.length; r++) {
			setupCarouselInstance(roots[r]);
		}

		function setupCarouselInstance(root) {
			var track = root.querySelector("[data-carousel-3d-track]");
			if (!track) return;

			var cards = track.querySelectorAll("[data-carousel-3d-card]");
			if (!cards.length) return;

			if (
				window.matchMedia &&
				window.matchMedia("(max-width: 720px)").matches
			) {
				root.classList.add("carousel-3d--static");
				return;
			}

			var current = 0;
			var target = 0;
			var angleStep = 22;
			var distance = 220;
			var depthStep = 140;
			var animationFrameId;

			function update() {
				current += (target - current) * 0.08;

				var total = cards.length;
				var center = (total - 1) / 2;

				for (var i = 0; i < total; i++) {
					var card = cards[i];
					var offsetIndex = i - center + current;
					var clampedOffset = Math.max(-3, Math.min(3, offsetIndex));
					var angle = clampedOffset * angleStep;
					var z = -Math.abs(clampedOffset) * depthStep;
					var x = clampedOffset * distance;
					var scale = 1 - Math.min(Math.abs(clampedOffset) * 0.12, 0.35);
					var opacity = 1 - Math.min(Math.abs(clampedOffset) * 0.22, 0.7);

					card.style.transform =
						"translateX(" + x + "px) translateZ(" + z + "px) rotateY(" + angle + "deg) scale(" + scale + ")";
					card.style.opacity = String(opacity.toFixed(3));
					card.style.zIndex = String(100 - Math.round(Math.abs(clampedOffset) * 10));
				}
			}

			function loop() {
				update();
				animationFrameId = window.requestAnimationFrame(loop);
			}

			loop();

			root.addEventListener("mousemove", function (event) {
				var rect = root.getBoundingClientRect();
				var x = (event.clientX - rect.left) / rect.width;
				var normalized = x * 2 - 1; // -1 (left) to 1 (right)
				var maxOffset = 1.6;
				target = normalized * maxOffset;
			});

			root.addEventListener("mouseleave", function () {
				target = 0;
			});
		}
	}

	function initVideoLibrary() {
		var grid = document.querySelector("[data-video-grid]");
		var modal = document.querySelector("[data-video-modal]");
		if (!grid || !modal) return;

		var frame = modal.querySelector("[data-video-frame]");
		var titleEl = modal.querySelector(".video-modal-title");
		var descEl = modal.querySelector(".video-modal-desc");
		var tagEl = modal.querySelector(".video-modal-tag");
		var closeBtn = modal.querySelector(".video-modal-close");

		function openFromCard(card) {
			if (!frame) return;

			var vimeoId = card.getAttribute("data-vimeo-id");
			if (!vimeoId) return;

			var title = card.getAttribute("data-video-title") || "";
			var desc = card.getAttribute("data-video-description") || "";
			var category = card.getAttribute("data-video-category") || "";

			while (frame.firstChild) {
				frame.removeChild(frame.firstChild);
			}

			var iframe = document.createElement("iframe");
			var src =
				"https://player.vimeo.com/video/" +
				encodeURIComponent(vimeoId) +
				"?title=0&byline=0&portrait=0&dnt=1";
			iframe.setAttribute("src", src);
			iframe.setAttribute("allow", "fullscreen; picture-in-picture");
			iframe.setAttribute("allowfullscreen", "allowfullscreen");
			iframe.setAttribute("loading", "eager");
			iframe.style.width = "100%";
			iframe.style.height = "100%";
			iframe.style.border = "0";
			frame.appendChild(iframe);

			if (titleEl) titleEl.textContent = title;
			if (descEl) descEl.textContent = desc;
			if (tagEl) {
				if (category) {
					tagEl.textContent = category;
					tagEl.style.display = "inline-flex";
				} else {
					tagEl.textContent = "";
					tagEl.style.display = "none";
				}
			}

			modal.hidden = false;
			document.body.classList.add("video-modal-open");
		}

		function closeModal() {
			if (modal.hidden) return;
			modal.hidden = true;
			document.body.classList.remove("video-modal-open");
			if (!frame) return;
			while (frame.firstChild) {
				frame.removeChild(frame.firstChild);
			}
		}

		grid.addEventListener("click", function (event) {
			var button = event.target.closest
				? event.target.closest(".video-card-inner")
				: null;
			if (!button) return;
			var card = button.closest
				? button.closest(".video-card")
				: null;
			if (!card) return;
			openFromCard(card);
		});

		modal.addEventListener("click", function (event) {
			if (event.target === modal) {
				closeModal();
			}
		});

		if (closeBtn) {
			closeBtn.addEventListener("click", function () {
				closeModal();
			});
		}

		window.addEventListener("keydown", function (event) {
			if (event.key === "Escape" || event.key === "Esc") {
				closeModal();
			}
		});

		var thumbs = grid.querySelectorAll(".video-thumb");
		if ("IntersectionObserver" in window) {
			var observer = new IntersectionObserver(function (entries, obs) {
				for (var i = 0; i < entries.length; i++) {
					var entry = entries[i];
					if (!entry.isIntersecting) continue;
					var el = entry.target;
					var url = el.getAttribute("data-thumb-src");
					if (url && !el.getAttribute("data-thumb-loaded")) {
						el.style.backgroundImage = "url('" + url + "')";
						el.setAttribute("data-thumb-loaded", "true");
					}
					obs.unobserve(el);
				}
			}, {
				rootMargin: "80px",
			});

			for (var t = 0; t < thumbs.length; t++) {
				observer.observe(thumbs[t]);
			}
		} else {
			for (var j = 0; j < thumbs.length; j++) {
				var el = thumbs[j];
				var url = el.getAttribute("data-thumb-src");
				if (url) {
					el.style.backgroundImage = "url('" + url + "')";
				}
			}
		}
	}

		function initRobloxShowcase() {
			var section = document.querySelector("[data-roblox-showcase]");
			if (!section || !window.fetch) return;

			var cards = section.querySelectorAll("[data-roblox-game]");
			if (!cards.length) return;

			var placeIds = [];
			for (var i = 0; i < cards.length; i++) {
				var pid = cards[i].getAttribute("data-place-id");
				if (pid) {
					placeIds.push(pid);
				}
			}
			if (!placeIds.length) return;

			var loaded = false;

			function loadThumbnails() {
				if (loaded) return;
				loaded = true;

				var url =
					"https://thumbnails.roblox.com/v1/places/gameicons?placeIds=" +
					placeIds.join(",") +
					"&size=512x512&format=Png&isCircular=false";

				fetch(url)
					.then(function (response) {
						if (!response.ok) {
							throw new Error("Roblox thumbnails request failed");
						}
						return response.json();
					})
					.then(function (payload) {
						if (!payload || !payload.data || !payload.data.length) return;

						var map = {};
						for (var j = 0; j < payload.data.length; j++) {
							var item = payload.data[j];
							var key = null;
							if (item && item.targetId != null) {
								key = String(item.targetId);
							}
							if (key && item.imageUrl) {
								map[key] = item.imageUrl;
							}
						}

						for (var c = 0; c < cards.length; c++) {
							var card = cards[c];
							var cardPlaceId = card.getAttribute("data-place-id");
							if (!cardPlaceId) continue;
							var thumb = card.querySelector(".roblox-game-thumb");
							if (!thumb) continue;
							var imgUrl = map[cardPlaceId];
							if (imgUrl) {
								thumb.style.backgroundImage = "url('" + imgUrl + "')";
							}
						}
					})
					.catch(function () {
						// Keep graceful fallback gradients if the request fails.
					});
			}

			if ("IntersectionObserver" in window) {
				var observer = new IntersectionObserver(
					function (entries, obs) {
						for (var k = 0; k < entries.length; k++) {
							var entry = entries[k];
							if (!entry.isIntersecting) continue;
							obs.unobserve(section);
							loadThumbnails();
							break;
						}
					},
					{
						rootMargin: "160px 0px",
					}
				);
				observer.observe(section);
			} else {
				loadThumbnails();
			}
		}
})();

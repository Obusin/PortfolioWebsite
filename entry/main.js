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
	initPortfolio();

	function formatNumber(value) {
		if (typeof value !== "number") return "";
		try {
			return new Intl.NumberFormat("en", { notation: "compact" }).format(value);
		} catch (err) {
			return String(value);
		}
	}

	function truncateText(text, maxLength) {
		if (!text) return "";
		if (text.length <= maxLength) return text;
		return text.slice(0, maxLength - 3).trim() + "...";
	}

	function initPortfolio() {
		if (!window.fetch) return;

		fetch("/api/portfolio")
			.then(function (response) {
				if (!response.ok) {
					throw new Error("Portfolio API failed");
				}
				return response.json();
			})
			.then(function (payload) {
				if (!payload) return;
				applyProfileFromApi(payload.profile || null);
				renderGamesFromApi(payload.games || []);
				renderCommunitiesFromApi(payload.communities || []);
			})
			.catch(function () {
				// Keep fallback content if API fails.
			});
	}

	function applyProfileFromApi(profile) {
		if (!profile) return;
		var avatar = document.querySelector("[data-roblox-avatar]");
		if (avatar && profile.avatar) {
			avatar.src = profile.avatar;
		}
	}

	function initCarousel3D() {
		var roots = document.querySelectorAll("[data-carousel-3d]");
		if (!roots.length) return;

		if (
			window.matchMedia &&
			window.matchMedia("(prefers-reduced-motion: reduce)").matches
		) {
			for (var i = 0; i < roots.length; i++) {
				roots[i].classList.add("carousel-3d--static");
			}
			return;
		}

		for (var r = 0; r < roots.length; r++) {
			setupCarouselInstance(roots[r]);
		}

		function setupCarouselInstance(root) {
			var track = root.querySelector("[data-carousel-3d-track]");
			if (!track) return;

			var cards = [];
			refreshCards();
			if (!cards.length) return;

			if (
				window.matchMedia &&
				window.matchMedia("(max-width: 720px)").matches
			) {
				root.classList.add("carousel-3d--static");
				return;
			}

			var current = 0;
			var angleStep = 18;
			var distance = 320;
			var depthStep = 200;
			var speed = parseFloat(root.getAttribute("data-carousel-speed") || "0.01");
			var animationFrameId;
			var isActive = false;
			var lastTime = 0;
			var prevBtn = root.querySelector("[data-carousel-prev]");
			var nextBtn = root.querySelector("[data-carousel-next]");
			var pauseUntil = 0;
			var movingTimer = null;

			function refreshCards() {
				cards = track.querySelectorAll("[data-carousel-3d-card]");
				root.setAttribute("data-carousel-count", String(cards.length));
				if (current >= cards.length) {
					current = 0;
				}
				for (var h = 0; h < cards.length; h++) {
					(function (idx) {
						var card = cards[idx];
						card.addEventListener("mouseenter", function () {
							focusCard(idx);
						});
					})(h);
				}
			}

			function wrapOffset(value, total) {
				if (!total) return 0;
				var wrapped = ((value % total) + total) % total;
				if (wrapped > total / 2) wrapped -= total;
				return wrapped;
			}

			function update(delta) {
				var now = performance.now();
				if (now < pauseUntil) {
					delta = 0;
				}
				if (delta > 0) {
					root.classList.add("carousel-3d--moving");
					if (movingTimer) {
						clearTimeout(movingTimer);
					}
					movingTimer = setTimeout(function () {
						root.classList.remove("carousel-3d--moving");
					}, 700);
				}
				current += delta * speed;
				if (cards.length && current >= cards.length) current -= cards.length;
				if (cards.length && current < 0) current += cards.length;

				var total = cards.length;
				if (!total) return;

				for (var i = 0; i < total; i++) {
					var card = cards[i];
					var offsetIndex = wrapOffset(i - current, total);
					var clampedOffset = Math.max(-3, Math.min(3, offsetIndex));
					var absOffset = Math.abs(clampedOffset);
					var angle = clampedOffset * angleStep;
					var z = -absOffset * depthStep;
					var x = clampedOffset * distance;
					var scale = 1 - Math.min(absOffset * 0.12, 0.35);
					var opacity = 1 - Math.min(absOffset * 0.22, 0.7);

					card.style.transform =
						"translateX(" + x + "px) translateZ(" + z + "px) rotateY(" + angle + "deg) scale(" + scale + ")";
					card.style.opacity = String(opacity.toFixed(3));
					card.style.zIndex = String(100 - Math.round(absOffset * 10));
				}
			}

			function loop(timestamp) {
				if (!isActive) return;
				if (!lastTime) lastTime = timestamp;
				var delta = (timestamp - lastTime) / 1000;
				lastTime = timestamp;
				update(delta);
				animationFrameId = window.requestAnimationFrame(loop);
			}

			function start() {
				if (isActive) return;
				isActive = true;
				lastTime = 0;
				animationFrameId = window.requestAnimationFrame(loop);
			}

			function stop() {
				isActive = false;
				root.classList.remove("carousel-3d--moving");
				if (movingTimer) {
					clearTimeout(movingTimer);
					movingTimer = null;
				}
				if (animationFrameId) {
					window.cancelAnimationFrame(animationFrameId);
					animationFrameId = null;
				}
			}
			root.addEventListener("pointerenter", stop);
			root.addEventListener("pointerleave", start);
			root.addEventListener("carousel:refresh", function () {
				refreshCards();
				update(0);
			});

			function nudge(direction) {
				if (!cards.length) return;
				current = Math.round(current);
				current += direction;
				if (current < 0) current += cards.length;
				if (current >= cards.length) current -= cards.length;
				pauseUntil = performance.now() + 2000;
				update(0);
			}

			function focusCard(index) {
				if (!cards.length) return;
				current = index;
				pauseUntil = performance.now() + 2000;
				update(0);
			}


			if (prevBtn) {
				prevBtn.addEventListener("click", function () {
					nudge(-1);
				});
			}
			if (nextBtn) {
				nextBtn.addEventListener("click", function () {
					nudge(1);
				});
			}

			if ("IntersectionObserver" in window) {
				var observer = new IntersectionObserver(
					function (entries) {
						for (var i = 0; i < entries.length; i++) {
							if (entries[i].isIntersecting) {
								start();
							} else {
								stop();
							}
						}
					},
					{ rootMargin: "160px 0px" }
				);
				observer.observe(root);
			} else {
				start();
			}

			document.addEventListener("visibilitychange", function () {
				if (document.hidden) {
					stop();
				} else {
					start();
				}
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

	function renderGamesFromApi(items) {
		var section = document.querySelector("[data-roblox-showcase]");
		if (!section) return;
		var track = section.querySelector("[data-carousel-3d-track]");
		if (!track) return;

		while (track.firstChild) {
			track.removeChild(track.firstChild);
		}

		for (var i = 0; i < items.length; i++) {
			var item = items[i];
			if (!item || !item.experienceId) continue;

			var placeId = String(item.experienceId);
			var title = item.title || "Roblox Game";
			var desc = truncateText(item.description || "", 140);
			var role = item.role || "Developer";

			var card = document.createElement("article");
			card.className = "carousel-3d-card roblox-game-card roblox-game-card--carousel";
			card.setAttribute("data-carousel-3d-card", "");
			card.setAttribute("data-roblox-game", "");
			card.setAttribute("data-place-id", placeId);

			card.innerHTML =
				'<div class="roblox-game-thumb" aria-hidden="true">' +
				'<div class="roblox-game-badge mono"><span class="roblox-badge-dot"></span><span data-roblox-playing-badge>--</span></div>' +
				'<span class="roblox-game-pill mono">Roblox Game</span>' +
				"</div>" +
				'<div class="roblox-game-body">' +
				'<h3 class="roblox-game-title"></h3>' +
				'<p class="roblox-game-desc"></p>' +
				'<div class="roblox-game-meta mono"><span class="roblox-game-role"></span></div>' +
				'<div class="roblox-game-stats mono" data-roblox-stats>' +
				'<span data-roblox-visits>Visits: --</span>' +
				'<span data-roblox-playing>Playing: --</span>' +
				'<span data-roblox-favorites>Favorites: --</span>' +
				"</div>" +
				'<a class="roblox-game-cta mono" target="_blank" rel="noreferrer noopener">Play on Roblox</a>' +
				"</div>";

			var titleEl = card.querySelector(".roblox-game-title");
			var descEl = card.querySelector(".roblox-game-desc");
			var roleEl = card.querySelector(".roblox-game-role");
			var link = card.querySelector(".roblox-game-cta");
			var thumb = card.querySelector(".roblox-game-thumb");
			var visitsEl = card.querySelector("[data-roblox-visits]");
			var playingEl = card.querySelector("[data-roblox-playing]");
			var playingBadgeEl = card.querySelector("[data-roblox-playing-badge]");
			var favoritesEl = card.querySelector("[data-roblox-favorites]");

			if (titleEl) titleEl.textContent = title;
			if (descEl) descEl.textContent = desc || "Explore this Roblox experience.";
			if (roleEl) roleEl.textContent = "Role: " + role;
			if (link && item.links && item.links.roblox) {
				link.href = item.links.roblox;
			} else if (link) {
				link.href = "https://www.roblox.com/games/" + placeId;
			}
			if (thumb && item.image) {
				thumb.style.backgroundImage = "url('" + item.image + "')";
			}

			if (item.stats) {
				if (visitsEl && typeof item.stats.visits === "number") {
					visitsEl.textContent = "Visits: " + formatNumber(item.stats.visits);
				}
				if (playingEl && typeof item.stats.playing === "number") {
					playingEl.textContent =
						"Playing: " + formatNumber(item.stats.playing);
				}
				if (playingBadgeEl && typeof item.stats.playing === "number") {
					playingBadgeEl.textContent = formatNumber(item.stats.playing);
				}
				if (favoritesEl && typeof item.stats.favorites === "number") {
					favoritesEl.textContent =
						"Favorites: " + formatNumber(item.stats.favorites);
				}
			}

			track.appendChild(card);
		}

		if (typeof Event === "function") {
			var root = section.querySelector("[data-carousel-3d]");
			if (root) {
				root.dispatchEvent(new Event("carousel:refresh"));
			}
		}
	}

	function renderCommunitiesFromApi(items) {
		var section = document.querySelector("[data-roblox-groups]");
		if (!section) return;
		var track = section.querySelector("[data-carousel-3d-track]");
		if (!track) return;

		while (track.firstChild) {
			track.removeChild(track.firstChild);
		}

		for (var i = 0; i < items.length; i++) {
			var item = items[i];
			if (!item) continue;

			var title = item.title || "Roblox Group";
			var role = item.role || "Contributor";
			var desc = truncateText(item.description || "", 120);

			var card = document.createElement("article");
			card.className = "carousel-3d-card roblox-group-card";
			card.setAttribute("data-carousel-3d-card", "");
			card.setAttribute("data-roblox-group", "");

			card.innerHTML =
				'<div class="roblox-group-logo" aria-hidden="true"></div>' +
				'<div class="roblox-group-body">' +
				'<h3 class="roblox-group-title"></h3>' +
				'<p class="roblox-group-desc"></p>' +
				'<div class="roblox-group-meta mono">' +
				'<span data-roblox-members>Members: --</span>' +
				'<span class="roblox-group-role"></span>' +
				"</div>" +
				'<a class="roblox-group-cta mono" target="_blank" rel="noreferrer noopener">View Group</a>' +
				"</div>";

			var titleEl = card.querySelector(".roblox-group-title");
			var descEl = card.querySelector(".roblox-group-desc");
			var membersEl = card.querySelector("[data-roblox-members]");
			var roleEl = card.querySelector(".roblox-group-role");
			var link = card.querySelector(".roblox-group-cta");
			var logo = card.querySelector(".roblox-group-logo");

			if (titleEl) titleEl.textContent = title;
			if (descEl) descEl.textContent = desc || "Community collaboration.";
			if (roleEl) roleEl.textContent = "Role: " + role;
			if (membersEl && item.stats && typeof item.stats.members === "number") {
				membersEl.textContent =
					"Members: " + formatNumber(item.stats.members);
			}
			if (link && item.links && item.links.community) {
				link.href = item.links.community;
			}
			if (logo && item.image) {
				logo.style.backgroundImage = "url('" + item.image + "')";
			}

			track.appendChild(card);
		}

		if (typeof Event === "function") {
			var root = section.querySelector("[data-carousel-3d]");
			if (root) {
				root.dispatchEvent(new Event("carousel:refresh"));
			}
		}
	}
})();

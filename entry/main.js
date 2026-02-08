// Minimal behavior for the portfolio site.
// - Keeps the footer year current.
// - No animations or external libraries.

(function () {
	// Keep footer year current
	var yearEl = document.getElementById("year");
	if (yearEl) {
		yearEl.textContent = String(new Date().getFullYear());
	}

	if (window.initCarousels) {
		window.initCarousels();
	}
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

// Minimal behavior for the portfolio site.
// - Keeps the footer year current.
// - No animations or external libraries.

(function () {
	// Keep footer year current
	var yearEl = document.getElementById("year");
	if (yearEl) {
		yearEl.textContent = String(new Date().getFullYear());
	}

	initScrollCarousels();
	initCarousel3D();
	initVideoLibrary();
	initRobloxShowcase();
	initRobloxGroups();
	initRobloxAvatar();

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

	var robloxUserIdPromise = null;
	var robloxProxyBase = "";

	function getRobloxUserContext() {
		var body = document.body;
		if (!body) return { userId: "", username: "" };
		if (!robloxProxyBase) {
			var proxyAttr = body.getAttribute("data-roblox-proxy") || "";
			if (proxyAttr) {
				robloxProxyBase = proxyAttr;
			} else if (
				window.location &&
				(window.location.hostname === "localhost" ||
					window.location.hostname === "127.0.0.1")
			) {
				robloxProxyBase = "https://cors.isomorphic-git.org/";
			}
		}
		return {
			userId: body.getAttribute("data-roblox-user-id") || "",
			username: body.getAttribute("data-roblox-username") || "",
		};
	}

	function robloxFetchJson(url, options) {
		return fetch(url, options)
			.then(function (response) {
				if (!response.ok) {
					throw new Error("Roblox request failed");
				}
				return response.json();
			})
			.catch(function () {
				if (!robloxProxyBase) throw new Error("Roblox request failed");
				var proxiedUrl = robloxProxyBase + url;
				var retryOptions = options
					? {
							method: options.method,
							headers: options.headers,
							body: options.body,
					  }
					: undefined;
				return fetch(proxiedUrl, retryOptions).then(function (response) {
					if (!response.ok) {
						throw new Error("Roblox request failed");
					}
					return response.json();
				});
			});
	}

	function fetchUserIdFromUsername(username) {
		return robloxFetchJson("https://users.roblox.com/v1/usernames/users", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				usernames: [username],
				excludeBannedUsers: false,
			}),
		})
			.then(function (payload) {
				if (!payload || !payload.data || !payload.data.length) return null;
				var entry = payload.data[0];
				return entry && entry.id ? String(entry.id) : null;
			})
			.catch(function () {
				return null;
			});
	}

	function resolveRobloxUserId() {
		if (robloxUserIdPromise) return robloxUserIdPromise;

		var ctx = getRobloxUserContext();
		var directId = ctx.userId && /^\d+$/.test(ctx.userId) ? ctx.userId : "";
		if (directId) {
			robloxUserIdPromise = Promise.resolve(directId);
			return robloxUserIdPromise;
		}

		var username = ctx.username ? ctx.username.replace(/^@/, "") : "";
		if (!username) {
			robloxUserIdPromise = Promise.resolve(null);
			return robloxUserIdPromise;
		}

		robloxUserIdPromise = fetchUserIdFromUsername(username);
		return robloxUserIdPromise;
	}

	function initRobloxAvatar() {
		if (!window.fetch) return;
		var img = document.querySelector("[data-roblox-avatar]");
		if (!img) return;

			resolveRobloxUserId().then(function (userId) {
				if (!userId) return;

				var url =
					"https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=" +
					encodeURIComponent(userId) +
					"&size=420x420&format=Png&isCircular=false";

				robloxFetchJson(url)
					.then(function (payload) {
						if (!payload || !payload.data || !payload.data.length) return;
						var item = payload.data[0];
					if (item && item.imageUrl) {
						img.src = item.imageUrl;
					}
				})
				.catch(function () {
					// Keep local fallback if avatar fetch fails.
				});
		});
	}

	function initScrollCarousels() {
		var carousels = document.querySelectorAll("[data-scroll-carousel]");
		if (!carousels.length) return;

		for (var i = 0; i < carousels.length; i++) {
			setupScrollCarousel(carousels[i]);
		}

		function setupScrollCarousel(root) {
			var track = root.querySelector("[data-scroll-track]");
			if (!track) return;

			var progress = root.parentElement
				? root.parentElement.querySelector("[data-carousel-progress]")
				: null;

			var isDragging = false;
			var startX = 0;
			var startScrollLeft = 0;

			function updateProgress() {
				if (!progress) return;
				var maxScroll = track.scrollWidth - track.clientWidth;
				var ratio = maxScroll > 0 ? track.scrollLeft / maxScroll : 0;
				progress.style.setProperty("--progress", (ratio * 100).toFixed(2));
			}

			function stopDrag() {
				if (!isDragging) return;
				isDragging = false;
				track.classList.remove("is-dragging");
			}

			track.addEventListener("pointerdown", function (event) {
				isDragging = true;
				startX = event.clientX;
				startScrollLeft = track.scrollLeft;
				track.classList.add("is-dragging");
				if (track.setPointerCapture) {
					track.setPointerCapture(event.pointerId);
				}
			});

			track.addEventListener("pointermove", function (event) {
				if (!isDragging) return;
				var delta = event.clientX - startX;
				track.scrollLeft = startScrollLeft - delta;
			});

			track.addEventListener("pointerup", stopDrag);
			track.addEventListener("pointercancel", stopDrag);
			track.addEventListener("pointerleave", stopDrag);
			track.addEventListener("scroll", updateProgress);
			window.addEventListener("resize", updateProgress);

			updateProgress();
		}
	}

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
			var isActive = false;

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
				if (!isActive) return;
				update();
				animationFrameId = window.requestAnimationFrame(loop);
			}

			function start() {
				if (isActive) return;
				isActive = true;
				loop();
			}

			function stop() {
				isActive = false;
				if (animationFrameId) {
					window.cancelAnimationFrame(animationFrameId);
					animationFrameId = null;
				}
			}

			root.addEventListener("mousemove", function (event) {
				if (!isActive) return;
				var rect = root.getBoundingClientRect();
				var x = (event.clientX - rect.left) / rect.width;
				var normalized = x * 2 - 1; // -1 (left) to 1 (right)
				var maxOffset = 1.6;
				target = normalized * maxOffset;
			});

			root.addEventListener("mouseleave", function () {
				target = 0;
			});

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

	function initRobloxShowcase() {
		var section = document.querySelector("[data-roblox-showcase]");
		if (!section || !window.fetch) return;

		var auto = section.getAttribute("data-roblox-auto") === "true";
		if (auto) {
			resolveRobloxUserId().then(function (userId) {
				if (!userId) return;
				robloxFetchJson(
					"https://games.roblox.com/v2/users/" +
						encodeURIComponent(userId) +
						"/games?accessFilter=Public&sortOrder=Desc&limit=8"
				)
					.then(function (payload) {
						if (!payload || !payload.data || !payload.data.length) return;
						renderRobloxGames(section, payload.data);
						startRobloxShowcase(section);
					})
					.catch(function () {
						startRobloxShowcase(section);
					});
			});
			return;
		}

		startRobloxShowcase(section);
	}

	function renderRobloxGames(section, games) {
		var track = section.querySelector("[data-scroll-track]");
		if (!track) return;

		while (track.firstChild) {
			track.removeChild(track.firstChild);
		}

		for (var i = 0; i < games.length; i++) {
			var game = games[i];
			if (!game || !game.rootPlaceId) continue;

			var placeId = String(game.rootPlaceId);
			var title = game.name || "Roblox Game";
			var desc = truncateText(game.description || "", 140);

			var card = document.createElement("article");
			card.className = "roblox-game-card roblox-game-card--carousel";
			card.setAttribute("data-roblox-game", "");
			card.setAttribute("data-place-id", placeId);
			card.setAttribute("data-role", "Builder / Developer");
			card.setAttribute(
				"data-game-url",
				"https://www.roblox.com/games/" + placeId
			);

			card.innerHTML =
				'<div class="roblox-game-thumb" aria-hidden="true">' +
				'<div class="roblox-game-badge mono"><span class="roblox-badge-dot"></span><span data-roblox-playing-badge>--</span></div>' +
				'<span class="roblox-game-pill mono">Roblox Game</span>' +
				"</div>" +
				'<div class="roblox-game-body">' +
				'<h3 class="roblox-game-title"></h3>' +
				'<p class="roblox-game-desc"></p>' +
				'<div class="roblox-game-meta mono"><span class="roblox-game-role">Role: Builder / Developer</span></div>' +
				'<div class="roblox-game-stats mono" data-roblox-stats>' +
				'<span data-roblox-visits>Visits: --</span>' +
				'<span data-roblox-playing>Playing: --</span>' +
				'<span data-roblox-favorites>Favorites: --</span>' +
				"</div>" +
				'<a class="roblox-game-cta mono" target="_blank" rel="noreferrer noopener">Play on Roblox</a>' +
				"</div>";

			var titleEl = card.querySelector(".roblox-game-title");
			var descEl = card.querySelector(".roblox-game-desc");
			var link = card.querySelector(".roblox-game-cta");

			if (titleEl) titleEl.textContent = title;
			if (descEl) descEl.textContent = desc || "Explore this Roblox experience.";
			if (link) link.href = "https://www.roblox.com/games/" + placeId;

			track.appendChild(card);
		}

		if (typeof Event === "function") {
			track.dispatchEvent(new Event("scroll"));
		}
	}

	function startRobloxShowcase(section) {
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

			robloxFetchJson(url)
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

			var statsUrl =
				"https://games.roblox.com/v1/games?placeIds=" +
				placeIds.join(",");

			robloxFetchJson(statsUrl)
				.then(function (payload) {
					if (!payload || !payload.data || !payload.data.length) return;

					var statsMap = {};
					for (var s = 0; s < payload.data.length; s++) {
						var item = payload.data[s];
						var key = null;
						if (item && item.placeId != null) {
							key = String(item.placeId);
						}
						if (key) {
							statsMap[key] = {
								visits: item.visits,
								playing: item.playing,
								favorites:
									typeof item.favoritesCount === "number"
										? item.favoritesCount
										: item.favoritedCount,
							};
						}
					}

					for (var c = 0; c < cards.length; c++) {
						var card = cards[c];
						var cardPlaceId = card.getAttribute("data-place-id");
						if (!cardPlaceId) continue;
						var stats = statsMap[cardPlaceId];
						if (!stats) continue;

						var visitsEl = card.querySelector("[data-roblox-visits]");
						var playingEl = card.querySelector("[data-roblox-playing]");
						var playingBadgeEl = card.querySelector("[data-roblox-playing-badge]");
						var favoritesEl = card.querySelector("[data-roblox-favorites]");

						if (visitsEl && typeof stats.visits === "number") {
							visitsEl.textContent = "Visits: " + formatNumber(stats.visits);
						}
						if (playingEl && typeof stats.playing === "number") {
							playingEl.textContent = "Playing: " + formatNumber(stats.playing);
						}
						if (playingBadgeEl && typeof stats.playing === "number") {
							playingBadgeEl.textContent = formatNumber(stats.playing);
						}
						if (favoritesEl && typeof stats.favorites === "number") {
							favoritesEl.textContent =
								"Favorites: " + formatNumber(stats.favorites);
						}
					}
				})
				.catch(function () {
					// Keep placeholders if stats request fails.
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

	function initRobloxGroups() {
		var section = document.querySelector("[data-roblox-groups]");
		if (!section || !window.fetch) return;

		var auto = section.getAttribute("data-roblox-auto") === "true";
		if (auto) {
			resolveRobloxUserId().then(function (userId) {
				if (!userId) return;
				robloxFetchJson(
					"https://groups.roblox.com/v1/users/" +
						encodeURIComponent(userId) +
						"/groups/roles"
				)
					.then(function (payload) {
						if (!payload || !payload.data || !payload.data.length) return;
						renderRobloxGroups(section, payload.data);
						startRobloxGroups(section);
					})
					.catch(function () {
						startRobloxGroups(section);
					});
			});
			return;
		}

		startRobloxGroups(section);
	}

	function renderRobloxGroups(section, groups) {
		var track = section.querySelector("[data-scroll-track]");
		if (!track) return;

		while (track.firstChild) {
			track.removeChild(track.firstChild);
		}

		for (var i = 0; i < groups.length; i++) {
			var entry = groups[i];
			if (!entry || !entry.group || !entry.group.id) continue;

			var groupId = String(entry.group.id);
			var groupName = entry.group.name || "Roblox Group";
			var roleName = entry.role ? entry.role.name : "";
			var memberCount = entry.group.memberCount;

			var card = document.createElement("article");
			card.className = "roblox-group-card";
			card.setAttribute("data-roblox-group", "");
			card.setAttribute("data-group-id", groupId);

			card.innerHTML =
				'<div class="roblox-group-logo" aria-hidden="true"></div>' +
				'<div class="roblox-group-body">' +
				'<h3 class="roblox-group-title"></h3>' +
				'<p class="roblox-group-desc">Join the community to stay up to date.</p>' +
				'<div class="roblox-group-meta mono">' +
				'<span data-roblox-members>Members: --</span>' +
				'<span class="roblox-group-role"></span>' +
				"</div>" +
				'<a class="roblox-group-cta mono" target="_blank" rel="noreferrer noopener">View Group</a>' +
				"</div>";

			var titleEl = card.querySelector(".roblox-group-title");
			var membersEl = card.querySelector("[data-roblox-members]");
			var roleEl = card.querySelector(".roblox-group-role");
			var link = card.querySelector(".roblox-group-cta");

			if (titleEl) titleEl.textContent = groupName;
			if (membersEl && typeof memberCount === "number") {
				membersEl.textContent = "Members: " + formatNumber(memberCount);
			}
			if (roleEl) {
				roleEl.textContent = roleName ? "Role: " + roleName : "Role: Member";
			}
			if (link) link.href = "https://www.roblox.com/groups/" + groupId;

			track.appendChild(card);
		}

		if (typeof Event === "function") {
			track.dispatchEvent(new Event("scroll"));
		}
	}

	function startRobloxGroups(section) {
		var cards = section.querySelectorAll("[data-roblox-group]");
		if (!cards.length) return;

		var groupIds = [];
		for (var i = 0; i < cards.length; i++) {
			var gid = cards[i].getAttribute("data-group-id");
			if (gid && /^\d+$/.test(gid) && Number(gid) > 0) {
				groupIds.push(gid);
			}
		}
		if (!groupIds.length) return;

		var loaded = false;

		function loadGroups() {
			if (loaded) return;
			loaded = true;

			var iconUrl =
				"https://thumbnails.roblox.com/v1/groups/icons?groupIds=" +
				groupIds.join(",") +
				"&size=150x150&format=Png&isCircular=true";

			robloxFetchJson(iconUrl)
				.then(function (payload) {
					if (!payload || !payload.data || !payload.data.length) return;

					var iconMap = {};
					for (var j = 0; j < payload.data.length; j++) {
						var item = payload.data[j];
						var key = null;
						if (item && item.targetId != null) {
							key = String(item.targetId);
						}
						if (key && item.imageUrl) {
							iconMap[key] = item.imageUrl;
						}
					}

					for (var c = 0; c < cards.length; c++) {
						var card = cards[c];
						var groupId = card.getAttribute("data-group-id");
						if (!groupId) continue;
						var logo = card.querySelector(".roblox-group-logo");
						if (!logo) continue;
						var imgUrl = iconMap[groupId];
						if (imgUrl) {
							logo.style.backgroundImage = "url('" + imgUrl + "')";
						}
					}
				})
				.catch(function () {
					// Keep fallback gradients if the request fails.
				});

			var infoUrl =
				"https://groups.roblox.com/v1/groups?groupIds=" +
				groupIds.join(",");

			robloxFetchJson(infoUrl)
				.then(function (payload) {
					if (!payload || !payload.data || !payload.data.length) return;

					var infoMap = {};
					for (var s = 0; s < payload.data.length; s++) {
						var item = payload.data[s];
						var key = null;
						if (item && item.id != null) {
							key = String(item.id);
						}
						if (key) {
							infoMap[key] = {
								name: item.name,
								memberCount: item.memberCount,
							};
						}
					}

					for (var c = 0; c < cards.length; c++) {
						var card = cards[c];
						var groupId = card.getAttribute("data-group-id");
						if (!groupId) continue;
						var info = infoMap[groupId];
						if (!info) continue;

						var titleEl = card.querySelector(".roblox-group-title");
						var memberEl = card.querySelector("[data-roblox-members]");
						if (titleEl && info.name) {
							titleEl.textContent = info.name;
						}
						if (memberEl && typeof info.memberCount === "number") {
							memberEl.textContent =
								"Members: " + formatNumber(info.memberCount);
						}

						var link = card.querySelector(".roblox-group-cta");
						if (link) {
							var explicitUrl = card.getAttribute("data-group-url");
							if (explicitUrl) {
								link.href = explicitUrl;
							} else {
								link.href = "https://www.roblox.com/groups/" + groupId;
							}
						}
					}
				})
				.catch(function () {
					// Keep placeholders if group info request fails.
				});
		}

		if ("IntersectionObserver" in window) {
			var observer = new IntersectionObserver(
				function (entries, obs) {
					for (var k = 0; k < entries.length; k++) {
						var entry = entries[k];
						if (!entry.isIntersecting) continue;
						obs.unobserve(section);
						loadGroups();
						break;
					}
				},
				{
					rootMargin: "160px 0px",
				}
			);
			observer.observe(section);
		} else {
			loadGroups();
		}
	}
})();

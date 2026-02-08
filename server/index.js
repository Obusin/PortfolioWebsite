const express = require("express");
const path = require("path");
const portfolio = require("../services/data/portfolio.data");
const {
  getGamesData,
  getThumbnails,
  getGroupsData,
  getGroupIcons,
  getUserAvatar,
} = require("../services/api/roblox");

const app = express();

app.use(express.static(path.join(__dirname, "..")));

app.get("/api/portfolio", async (req, res) => {
  try {
    const games = portfolio.games.map((item) => ({ ...item }));
    const communities = portfolio.communities.map((item) => ({ ...item }));
    const profile = { ...portfolio.profile };

    const experienceIds = games
      .map((item) => item.experienceId)
      .filter((id) => typeof id === "number" && id > 0);

    const universeIds = games
      .map((item) => item.universeId)
      .filter((id) => typeof id === "number" && id > 0);

    const groupIds = communities
      .map((item) => item.groupId)
      .filter((id) => typeof id === "number" && id > 0);

    const userIds = profile.userId ? [profile.userId] : [];

    let gamesData = { data: [] };
    let thumbsData = { data: [] };
    let groupsData = { data: [] };
    let groupIcons = { data: [] };
    let userAvatar = { data: [] };

    try {
      gamesData = await getGamesData(universeIds);
    } catch (err) {
      // Keep fallback data
    }

    try {
      thumbsData = await getThumbnails(experienceIds);
    } catch (err) {
      // Keep fallback data
    }

    try {
      groupsData = await getGroupsData(groupIds);
    } catch (err) {
      // Keep fallback data
    }

    try {
      groupIcons = await getGroupIcons(groupIds);
    } catch (err) {
      // Keep fallback data
    }

    try {
      userAvatar = await getUserAvatar(userIds);
    } catch (err) {
      // Keep fallback data
    }

    const gameMap = new Map();
    if (gamesData && Array.isArray(gamesData.data)) {
      gamesData.data.forEach((item) => {
        if (item && (item.universeId || item.id || item.experienceId)) {
          const key = String(item.universeId || item.id || item.experienceId);
          gameMap.set(key, item);
        }
      });
    }

    const thumbMap = new Map();
    if (thumbsData && Array.isArray(thumbsData.data)) {
      thumbsData.data.forEach((item) => {
        if (item && item.targetId != null) {
          thumbMap.set(String(item.targetId), item.imageUrl || "");
        }
      });
    }

    const groupMap = new Map();
    if (groupsData && Array.isArray(groupsData.data)) {
      groupsData.data.forEach((item) => {
        if (item && item.id != null) {
          groupMap.set(String(item.id), item);
        }
      });
    }

    const groupIconMap = new Map();
    if (groupIcons && Array.isArray(groupIcons.data)) {
      groupIcons.data.forEach((item) => {
        if (item && item.targetId != null) {
          groupIconMap.set(String(item.targetId), item.imageUrl || "");
        }
      });
    }

    let avatarUrl = null;
    if (userAvatar && Array.isArray(userAvatar.data) && userAvatar.data.length) {
      avatarUrl = userAvatar.data[0].imageUrl || null;
    }

    const enrichedGames = games.map((item) => {
      const statsKey = item.universeId
        ? String(item.universeId)
        : String(item.experienceId);
      const key = String(item.experienceId);
      const api = gameMap.get(statsKey) || {};
      return {
        ...item,
        title: api.name || item.title,
        stats: {
          visits: api.visits ?? null,
          favorites: api.favoritesCount ?? api.favoritedCount ?? null,
          playing: api.playing ?? null,
        },
        image: thumbMap.get(key) || null,
        universeId: api.universeId || api.id || api.experienceId || item.universeId || null,
      };
    });

    const enrichedCommunities = communities.map((item) => {
      const key = String(item.groupId);
      const api = groupMap.get(key) || {};
      return {
        ...item,
        title: api.name || item.title,
        stats: {
          members: api.memberCount ?? null,
        },
        image: groupIconMap.get(key) || null,
      };
    });

    res.json({
      generatedAt: new Date().toISOString(),
      profile: {
        ...profile,
        avatar: avatarUrl,
      },
      games: enrichedGames,
      communities: enrichedCommunities,
    });
  } catch (err) {
    res.status(500).json({
      error: "Failed to load portfolio data",
    });
  }
});

app.get("/api/health", (req, res) => {
  res.json({ ok: true });
});

const port = Number(process.env.PORT || 8787);
app.listen(port, () => {
  console.log("API listening on http://localhost:" + port);
});

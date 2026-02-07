const { getCache, setCache } = require("../../core/utils/cache");

const OPEN_CLOUD_KEY = process.env.ROBLOX_API_KEY || "";
const GAMES_ENDPOINT =
  process.env.ROBLOX_GAMES_ENDPOINT ||
  "https://apis.roblox.com/games/v1/games?experienceIds={ids}";
const THUMBNAILS_ENDPOINT =
  process.env.ROBLOX_THUMBNAILS_ENDPOINT ||
  "https://thumbnails.roblox.com/v1/places/gameicons?placeIds={ids}&size=512x512&format=Png&isCircular=false";
const GROUPS_ENDPOINT =
  process.env.ROBLOX_GROUPS_ENDPOINT ||
  "https://apis.roblox.com/groups/v1/groups?groupIds={ids}";
const GROUP_ICONS_ENDPOINT =
  process.env.ROBLOX_GROUP_ICONS_ENDPOINT ||
  "https://thumbnails.roblox.com/v1/groups/icons?groupIds={ids}&size=150x150&format=Png&isCircular=true";
const USER_AVATAR_ENDPOINT =
  process.env.ROBLOX_USER_AVATAR_ENDPOINT ||
  "https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds={ids}&size=420x420&format=Png&isCircular=false";

const DEFAULT_TTL = Number(process.env.ROBLOX_CACHE_TTL_MS || 900000);

function buildUrl(template, ids) {
  return template.replace("{ids}", ids.join(","));
}

async function fetchJson(url) {
  const headers = {};
  if (OPEN_CLOUD_KEY) {
    headers["x-api-key"] = OPEN_CLOUD_KEY;
  }

  const response = await fetch(url, { headers });
  if (!response.ok) {
    const text = await response.text();
    throw new Error("Roblox API error: " + response.status + " " + text);
  }
  return response.json();
}

async function fetchWithCache(key, url) {
  const cached = getCache(key);
  if (cached) return cached;
  const data = await fetchJson(url);
  setCache(key, data, DEFAULT_TTL);
  return data;
}

async function getGamesData(experienceIds) {
  if (!experienceIds.length) return { data: [] };
  const url = buildUrl(GAMES_ENDPOINT, experienceIds);
  return fetchWithCache("games:" + experienceIds.join(","), url);
}

async function getThumbnails(experienceIds) {
  if (!experienceIds.length) return { data: [] };
  const url = buildUrl(THUMBNAILS_ENDPOINT, experienceIds);
  return fetchWithCache("thumbs:" + experienceIds.join(","), url);
}

async function getGroupsData(groupIds) {
  if (!groupIds.length) return { data: [] };
  const url = buildUrl(GROUPS_ENDPOINT, groupIds);
  return fetchWithCache("groups:" + groupIds.join(","), url);
}

async function getGroupIcons(groupIds) {
  if (!groupIds.length) return { data: [] };
  const url = buildUrl(GROUP_ICONS_ENDPOINT, groupIds);
  return fetchWithCache("group-icons:" + groupIds.join(","), url);
}

async function getUserAvatar(userIds) {
  if (!userIds.length) return { data: [] };
  const url = buildUrl(USER_AVATAR_ENDPOINT, userIds);
  return fetchWithCache("user-avatar:" + userIds.join(","), url);
}

module.exports = {
  getGamesData,
  getThumbnails,
  getGroupsData,
  getGroupIcons,
  getUserAvatar,
};

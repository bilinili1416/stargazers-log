// ===== Configuration =====

// The GitHub account whose stars are listed. Change this one line to point the
// page at somebody else, or open the page with ?user=someone to peek at theirs.
const DEFAULT_USER = "bilinili1416";

const username = (new URLSearchParams(location.search).get("user") || DEFAULT_USER).trim();
const API = "https://api.github.com";

const repositoryList = document.querySelector("#repository-list");
const repositoryCount = document.querySelector("#repository-count");
const collectionTools = document.querySelector("#collection-tools");
const searchInput = document.querySelector("#search");
const languageSelect = document.querySelector("#language");
const sortSelect = document.querySelector("#sort");
const profileLine = document.querySelector("#profile-line");

const fullNumberFormat = new Intl.NumberFormat("en");
const dateFormat = new Intl.DateTimeFormat("en", {
  year: "numeric",
  month: "short",
  day: "numeric"
});

// Every starred repository we have fetched, before search / filter / sort.
let repositories = [];

// ===== Helpers =====

function formatDate(dateString) {
  const date = new Date(dateString);
  return Number.isNaN(date.getTime()) ? "Date unavailable" : dateFormat.format(date);
}

function timeAgo(dateString) {
  const seconds = (Date.now() - new Date(dateString).getTime()) / 1000;
  const units = [
    ["year", 31536000],
    ["month", 2592000],
    ["day", 86400],
    ["hour", 3600],
    ["minute", 60]
  ];

  for (const [label, size] of units) {
    const value = Math.floor(seconds / size);
    if (value >= 1) {
      return `${value} ${label}${value === 1 ? "" : "s"} ago`;
    }
  }
  return "just now";
}

function describeError(response) {
  if (response.status === 404) {
    return `GitHub has no account named "${username}".`;
  }

  if (response.status === 403 || response.status === 429) {
    const reset = response.headers.get("X-RateLimit-Reset");
    const when = reset ? new Date(Number(reset) * 1000).toLocaleString("en") : "later";
    return (
      "GitHub's anonymous request limit is used up (60 per hour). " +
      `It resets at ${when} — reload the page after that.`
    );
  }

  return `GitHub responded with ${response.status}.`;
}

async function requestJson(path, headers = {}) {
  const response = await fetch(`${API}${path}`, {
    headers: { Accept: "application/vnd.github+json", ...headers }
  });

  if (!response.ok) {
    throw new Error(describeError(response));
  }

  return response.json();
}

// ===== Reading the real star list =====

// GitHub returns at most 100 repositories per page and gives no page count, so
// we walk the pages until one comes back shorter than a full page.
async function fetchStarredRepositories(account) {
  const perPage = 100;
  const maxPages = 10; // 1000 repositories — plenty for a personal log.
  const collected = [];

  for (let page = 1; page <= maxPages; page += 1) {
    const batch = await requestJson(
      `/users/${encodeURIComponent(account)}/starred?per_page=${perPage}&page=${page}`,
      // The star+json media type adds "starred_at": when the star was given.
      { Accept: "application/vnd.github.star+json" }
    );

    for (const item of batch) {
      collected.push({ starredAt: item.starred_at, repo: item.repo });
    }

    if (batch.length < perPage) {
      break;
    }
  }

  return collected;
}

// ===== Rendering =====

function renderRepository(entry) {
  const repo = entry.repo;
  const item = document.createElement("li");
  item.className = "repository-item";

  const link = document.createElement("a");
  link.className = "repository-name";
  link.href = repo.html_url;
  link.textContent = repo.full_name;

  const description = document.createElement("p");
  description.className = "repository-description";
  description.textContent = repo.description || "No description provided.";

  const details = document.createElement("div");
  details.className = "repository-details";

  if (repo.language) {
    const language = document.createElement("span");
    language.className = "repository-language";
    language.textContent = repo.language;
    details.append(language);
  }

  const stars = document.createElement("span");
  stars.textContent = `${fullNumberFormat.format(repo.stargazers_count)} stars`;

  const forks = document.createElement("span");
  forks.textContent = `${fullNumberFormat.format(repo.forks_count)} forks`;

  const updated = document.createElement("span");
  updated.textContent = `Updated ${timeAgo(repo.pushed_at)}`;

  const date = document.createElement("time");
  date.dateTime = entry.starredAt;
  date.textContent = `Starred ${formatDate(entry.starredAt)}`;

  details.append(stars, forks, updated, date);
  item.append(link, description, details);
  return item;
}

function showMessage(text) {
  repositoryList.replaceChildren();
  const message = document.createElement("li");
  message.className = "list-message";
  message.textContent = text;
  repositoryList.append(message);
}

function sortRepositories(list) {
  const time = (value) => new Date(value || 0).getTime();
  const sorted = [...list];

  switch (sortSelect.value) {
    case "starred-asc":
      return sorted.sort((a, b) => time(a.starredAt) - time(b.starredAt));
    case "stars-desc":
      return sorted.sort((a, b) => b.repo.stargazers_count - a.repo.stargazers_count);
    case "updated-desc":
      return sorted.sort((a, b) => time(b.repo.pushed_at) - time(a.repo.pushed_at));
    case "name-asc":
      return sorted.sort((a, b) => a.repo.full_name.localeCompare(b.repo.full_name, "en"));
    default:
      return sorted.sort((a, b) => time(b.starredAt) - time(a.starredAt));
  }
}

function renderCollection() {
  const keyword = searchInput.value.trim().toLowerCase();
  const language = languageSelect.value;

  const visible = repositories.filter(({ repo }) => {
    if (language && (repo.language || "Other") !== language) {
      return false;
    }
    if (!keyword) {
      return true;
    }

    return [repo.full_name, repo.description || "", repo.language || ""]
      .join(" ")
      .toLowerCase()
      .includes(keyword);
  });

  const ordered = sortRepositories(visible);
  repositoryList.replaceChildren(...ordered.map(renderRepository));

  const filtered = Boolean(keyword || language);
  repositoryCount.textContent = filtered
    ? `${fullNumberFormat.format(ordered.length)} of ` +
      `${fullNumberFormat.format(repositories.length)} repositories`
    : `${fullNumberFormat.format(repositories.length)} repositories`;

  if (ordered.length === 0) {
    showMessage(
      repositories.length === 0
        ? "No starred repositories yet. Star a few on GitHub, then reload."
        : "No repositories match this search."
    );
  }
}

function fillLanguageOptions() {
  const counts = new Map();

  for (const { repo } of repositories) {
    const name = repo.language || "Other";
    counts.set(name, (counts.get(name) || 0) + 1);
  }

  const options = [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "en"))
    .map(([name, total]) => {
      const option = document.createElement("option");
      option.value = name;
      option.textContent = `${name} (${total})`;
      return option;
    });

  languageSelect.append(...options);
}

function renderProfile(profile) {
  profileLine.hidden = false;
  profileLine.textContent = "Live from the GitHub API · ";

  const link = document.createElement("a");
  link.href = `https://github.com/${profile.login}?tab=stars`;
  link.textContent = `@${profile.login}`;
  link.target = "_blank";
  link.rel = "noopener noreferrer";

  profileLine.append(link);
}

// ===== Start =====

async function loadRepositories() {
  try {
    const [profile, starred] = await Promise.all([
      requestJson(`/users/${encodeURIComponent(username)}`),
      fetchStarredRepositories(username)
    ]);

    repositories = starred;
    renderProfile(profile);

    if (repositories.length > 0) {
      collectionTools.hidden = false;
      fillLanguageOptions();
    }

    renderCollection();
  } catch (error) {
    repositoryCount.textContent = "Unavailable";
    showMessage(`Could not load the star list. ${error.message}`);
    console.error("Could not load starred repositories:", error);
  }
}

searchInput.addEventListener("input", renderCollection);
languageSelect.addEventListener("change", renderCollection);
sortSelect.addEventListener("change", renderCollection);

// The controls live in a <form> for the label/accessibility wiring; pressing
// Enter should filter the list, not reload the page.
collectionTools.addEventListener("submit", (event) => event.preventDefault());

loadRepositories();

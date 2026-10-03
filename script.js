const repositoryList = document.querySelector("#repository-list");
const repositoryCount = document.querySelector("#repository-count");
const numberFormat = new Intl.NumberFormat("en", { notation: "compact" });
const dateFormat = new Intl.DateTimeFormat("en", {
  year: "numeric",
  month: "short",
  day: "numeric"
});

function formatDate(dateString) {
  const date = new Date(`${dateString}T00:00:00`);
  return Number.isNaN(date.getTime()) ? "Date unavailable" : dateFormat.format(date);
}

function renderRepository(event) {
  const item = document.createElement("li");
  item.className = "repository-item";

  const link = document.createElement("a");
  link.className = "repository-name";
  link.href = event.repo.url;
  link.textContent = event.repo.name;

  const description = document.createElement("p");
  description.className = "repository-description";
  description.textContent = event.repo.description;

  const details = document.createElement("div");
  details.className = "repository-details";

  const language = document.createElement("span");
  language.className = "repository-language";
  language.textContent = event.repo.language;

  const stars = document.createElement("span");
  stars.textContent = `${numberFormat.format(event.repo.stars)} stars`;

  const date = document.createElement("time");
  date.dateTime = event.createdAt;
  date.textContent = `Starred ${formatDate(event.createdAt)}`;

  details.append(language, stars, date);
  item.append(link, description, details);
  return item;
}

async function loadRepositories() {
  try {
    const response = await fetch("events.json");
    if (!response.ok) {
      throw new Error(`Request failed: ${response.status}`);
    }

    const events = await response.json();
    const starredRepositories = events.filter(
      (event) => event.type === "starred" && event.repo
    );

    repositoryList.replaceChildren(
      ...starredRepositories.map(renderRepository)
    );
    repositoryCount.textContent = `${starredRepositories.length} repositories`;

    if (starredRepositories.length === 0) {
      repositoryList.innerHTML = '<li class="list-message">No starred repositories yet.</li>';
    }
  } catch (error) {
    repositoryCount.textContent = "Unavailable";
    repositoryList.innerHTML =
      '<li class="list-message">Could not load repositories. Open this page through a local web server and try again.</li>';
    console.error("Could not load starred repositories:", error);
  }
}

loadRepositories();
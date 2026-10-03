# stargazers-log

English | [简体中文](README.zh-CN.md)

the log of my starred repositories

## What this is

A static page that lists the repositories a GitHub account has starred. Instead
of reading a hand-written `events.json`, it asks the public GitHub API for the
real star list every time the page loads, so it always matches the account.

Files:

| File | Purpose |
| --- | --- |
| `index.html` | Page structure |
| `style.css` | Styling |
| `script.js` | Fetches the starred repositories and renders the list |
| `tools/star-repos.mjs` | Copies another account's stars into yours (see below) |
| `.github/workflows/deploy.yml` | Publishes the page to GitHub Pages on every push to `main` |

## Using it

Open the published page, or serve the folder locally:

```bash
python -m http.server 8000
```

Then visit <http://localhost:8000>. (Open it through a server rather than as a
`file://` path, so the browser is allowed to call the API.)

You can search by name, description or language, filter by language, and sort by
star date, star count, last update or name.

## Pointing it at another account

Edit the first constant in `script.js`:

```js
const DEFAULT_USER = "bilinili1416";
```

Or leave the code alone and pass the account in the URL:

```
https://your-page/?user=some-other-account
```

## Copying someone else's stars

`tools/star-repos.mjs` stars, in your own account, every repository another
account has starred. Starring is a write, so it needs a token.

1. Create a fine-grained token with **Starring: Read and write** as an account
   permission and **Metadata: Read-only** as a repository permission. A classic
   token with the `public_repo` scope also works.
2. Save it in `tools/.star-token`, which git ignores, or set `GITHUB_TOKEN`.
3. Preview the change, then apply it:

```bash
node tools/star-repos.mjs --from PKUFlyingPig
node tools/star-repos.mjs --from PKUFlyingPig --apply
```

Repositories you have already starred are skipped. Every run writes a log file,
and `--undo <logfile>` removes exactly the stars that run added without touching
stars you already had. Requests are spaced one second apart, so 136 new stars
take about two and a half minutes. Starring is public activity, so a large batch
appears in your followers' feeds.

## Notes on the API

- The page reads `https://api.github.com/users/<account>/starred`, which is
  public data and needs no sign-in.
- Anonymous requests are limited to 60 per hour per visitor; each page load
  uses one or two. If the limit runs out the page says so and when it resets.
- Results are fetched 100 at a time, up to 1000 repositories.

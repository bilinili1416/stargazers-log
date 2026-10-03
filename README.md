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

## Notes on the API

- The page reads `https://api.github.com/users/<account>/starred`, which is
  public data and needs no sign-in.
- Anonymous requests are limited to 60 per hour per visitor; each page load
  uses one or two. If the limit runs out the page says so and when it resets.
- Results are fetched 100 at a time, up to 1000 repositories.

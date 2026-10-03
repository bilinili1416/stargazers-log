# stargazers-log

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

## 这是什么

一个静态页面，打开后会实时调用 GitHub 的公开 API，把当前账号 star 过的仓库列出来。
仓库有变化时不用改代码，刷新页面就能看到最新结果。

## 怎么用

1. 直接用浏览器打开 `index.html`，或者在 GitHub Pages 上访问这个仓库。
2. 页面上可以：搜索关键词、按语言筛选、按收藏时间 / Star 数 / 更新时间 / 名称排序。

## 换成别的账号

打开 `index.html`，找到最上面这一行：

```js
const DEFAULT_USER = "bilinili1416";
```

把用户名改成你自己的即可。也可以不改代码，直接在网址后面加参数临时查看：

```
index.html?user=某个GitHub用户名
```

## 说明

- 数据来自 `https://api.github.com/users/<用户名>/starred`，只读取公开信息。
- 未登录状态下 GitHub 每小时允许 60 次请求，正常浏览完全够用；如果提示额度用完，等一会儿刷新即可。
- 仓库按收藏时间倒序获取，最多读取 1000 个。

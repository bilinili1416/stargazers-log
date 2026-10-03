# stargazers-log

[English](README.md) | 简体中文

我 star 的仓库的记录

## 这是什么

一个静态页面，用来列出某个 GitHub 账号 star 过的仓库。它不再读取手写的
`events.json`，而是在每次页面加载时向 GitHub 的公开 API 请求真实的 star
列表，因此展示的内容始终与该账号保持一致。

文件说明：

| 文件 | 用途 |
| --- | --- |
| `index.html` | 页面结构 |
| `style.css` | 样式 |
| `script.js` | 获取 star 过的仓库并渲染列表 |
| `.github/workflows/deploy.yml` | 每次推送到 `main` 时把页面发布到 GitHub Pages |

## 使用方法

打开已发布的页面，或者在本地启动一个服务来提供这个目录：

```bash
python -m http.server 8000
```

然后访问 <http://localhost:8000>。（请通过服务器打开，而不要使用 `file://`
路径，这样浏览器才被允许调用该 API。）

你可以按名称、描述或语言搜索，按语言筛选，以及按收藏时间、Star 数、最近更新
或名称排序。

## 换一个账号

修改 `script.js` 中的第一个常量：

```js
const DEFAULT_USER = "bilinili1416";
```

或者不改动代码，直接在网址中传入账号：

```
https://your-page/?user=some-other-account
```

## API 说明

- 页面读取 `https://api.github.com/users/<account>/starred`，这是公开数据，
  不需要登录。
- 未登录的请求限制为每位访问者每小时 60 次；每次加载页面会消耗一到两次。
  如果额度用完，页面会说明这一点以及额度重置的时间。
- 结果按每次 100 条获取，最多 1000 个仓库。

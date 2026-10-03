# stargazers-log

the log of my starred repositories

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

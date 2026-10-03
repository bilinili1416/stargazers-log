#!/usr/bin/env node
//
// Copy another GitHub account's stars into your own account.
//
//   Dry run (default, changes nothing):
//     node tools/star-repos.mjs --from PKUFlyingPig
//
//   Actually star the repositories that are still missing:
//     node tools/star-repos.mjs --from PKUFlyingPig --apply
//
//   Remove exactly the stars that an earlier run added:
//     node tools/star-repos.mjs --undo tools/starred-PKUFlyingPig-2026-10-03.json
//
// The token is read from, in this order: --token, the GITHUB_TOKEN environment
// variable, or the file tools/.star-token. Never pass it on the command line if
// you would rather it not end up in your shell history.

import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const API = "https://api.github.com";
const USER_AGENT = "stargazers-log-star-tool";

// ===== Arguments =====

function parseArgs(argv) {
  const options = {
    from: "",
    apply: false,
    undo: "",
    token: "",
    tokenFile: path.join("tools", ".star-token"),
    delay: 1000,
    log: "",
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const value = () => {
      i += 1;
      if (i >= argv.length) {
        throw new Error(`${arg} needs a value`);
      }
      return argv[i];
    };

    switch (arg) {
      case "--from": options.from = value(); break;
      case "--apply": options.apply = true; break;
      case "--undo": options.undo = value(); break;
      case "--token": options.token = value(); break;
      case "--token-file": options.tokenFile = value(); break;
      case "--delay": options.delay = Number(value()); break;
      case "--log": options.log = value(); break;
      case "--help":
      case "-h":
        options.help = true;
        break;
      default:
        throw new Error(`Unknown option: ${arg}`);
    }
  }

  return options;
}

const options = parseArgs(process.argv.slice(2));

if (options.help || (!options.from && !options.undo)) {
  console.log(
    [
      "Copy another GitHub account's stars into your own account.",
      "",
      "  node tools/star-repos.mjs --from <account>            dry run, changes nothing",
      "  node tools/star-repos.mjs --from <account> --apply    star the missing repositories",
      "  node tools/star-repos.mjs --undo <logfile>            remove the stars a run added",
      "",
      "Options:",
      "  --token <token>       use this token instead of the environment/file",
      "  --token-file <path>   read the token from this file (default tools/.star-token)",
      "  --delay <ms>          pause between write requests (default 1000)",
      "  --log <path>          where to record what was starred",
    ].join("\n")
  );
  process.exit(options.help ? 0 : 1);
}

// ===== Token =====

async function resolveToken() {
  if (options.token) return options.token.trim();

  if (process.env.GITHUB_TOKEN) return process.env.GITHUB_TOKEN.trim();

  try {
    return (await readFile(options.tokenFile, "utf8")).trim();
  } catch {
    throw new Error(
      "No token found. Create one and either set GITHUB_TOKEN, or save it to " +
      `${options.tokenFile}. See the README for the permissions it needs.`
    );
  }
}

// Filled in by resolveToken() once we are inside the try/catch below, so a
// missing token prints one clean line instead of a stack trace.
let token = "";

// ===== Talking to GitHub =====

function headers() {
  return {
    Accept: "application/vnd.github+json",
    Authorization: `Bearer ${token}`,
    "User-Agent": USER_AGENT,
    "X-GitHub-Api-Version": "2022-11-28",
  };
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function api(pathname, { method = "GET", body } = {}) {
  const url = `${API}${pathname}`;

  for (let attempt = 1; attempt <= 3; attempt += 1) {
    const response = await fetch(url, { method, headers: headers(), body });

    if (response.ok) {
      return response.status === 204 ? null : response.json();
    }

    // Secondary rate limits ask you to slow down and come back.
    if (response.status === 403 || response.status === 429) {
      const retryAfter = Number(response.headers.get("Retry-After"));
      const wait = Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : 5000;

      if (attempt < 3) {
        console.log(`     rate limited, waiting ${Math.round(wait / 1000)}s...`);
        await sleep(wait);
        continue;
      }
    }

    if (response.status === 401) {
      throw new Error(
        "GitHub rejected the token (401 Bad credentials). Check that it is still " +
        "valid, that it has not expired, and that it was copied in full."
      );
    }

    if (response.status === 404) {
      throw new Error(
        `GitHub returned 404 for ${pathname}. If this happened while starring, the ` +
        "token is probably missing the \"Starring\" write permission."
      );
    }

    const detail = await response.text();
    throw new Error(`${method} ${pathname} failed: ${response.status} ${detail.slice(0, 300)}`);
  }

  throw new Error(`${method} ${pathname} failed after three attempts`);
}

async function fetchStarred(pathname) {
  const perPage = 100;
  const maxPages = 50;
  const repos = [];

  for (let page = 1; page <= maxPages; page += 1) {
    const batch = await api(`${pathname}?per_page=${perPage}&page=${page}`);
    repos.push(...batch);

    if (batch.length < perPage) {
      break;
    }
  }

  return repos;
}

// ===== Undo =====

async function undo(logPath) {
  const log = JSON.parse(await readFile(logPath, "utf8"));
  const repos = log.starred || [];

  if (repos.length === 0) {
    console.log("That log records no repositories, nothing to undo.");
    return;
  }

  console.log(`Removing ${repos.length} stars recorded in ${logPath}.\n`);

  let removed = 0;

  for (const fullName of repos) {
    process.stdout.write(`  - ${fullName} ... `);

    try {
      await api(`/user/starred/${fullName}`, { method: "DELETE" });
      removed += 1;
      console.log("unstared");
    } catch (error) {
      console.log(`failed (${error.message})`);
    }

    await sleep(options.delay);
  }

  console.log(`\nRemoved ${removed} of ${repos.length}.`);
  console.log("Re-run the tool without --apply to see the current state.");
}

// ===== Star =====

async function star() {
  const account = await api("/user");
  console.log(`Token belongs to @${account.login}.`);

  const sourceRepos = await fetchStarred(`/users/${encodeURIComponent(options.from)}/starred`);
  console.log(`@${options.from} has starred ${sourceRepos.length} repositories.`);

  if (sourceRepos.length === 0) {
    return;
  }

  const myRepos = await fetchStarred("/user/starred");
  const alreadyStarred = new Set(myRepos.map((repo) => repo.full_name));
  console.log(`You have already starred ${alreadyStarred.size} repositories.`);

  const missing = sourceRepos.filter((repo) => !alreadyStarred.has(repo.full_name));
  console.log(`\n${missing.length} repositories are new to you:`);

  for (const repo of missing.slice(0, 20)) {
    console.log(`  ${repo.full_name}`);
  }
  if (missing.length > 20) {
    console.log(`  ... and ${missing.length - 20} more`);
  }

  if (missing.length === 0) {
    console.log("\nNothing to do, your star list already covers all of them.");
    return;
  }

  if (!options.apply) {
    const minutes = Math.ceil((missing.length * options.delay) / 60000);
    console.log(
      `\nDry run: nothing was changed. Re-run with --apply to star these ` +
      `${missing.length} repositories (about ${minutes} minute(s)).`
    );
    return;
  }

  console.log(`\nStarring ${missing.length} repositories...\n`);

  const starred = [];
  const failed = [];

  for (const repo of missing) {
    process.stdout.write(`  + ${repo.full_name} ... `);

    try {
      // This endpoint takes no body, and GitHub asks for Content-Length: 0.
      await api(`/user/starred/${repo.full_name}`, { method: "PUT", body: "" });
      starred.push(repo.full_name);
      console.log("starred");
    } catch (error) {
      failed.push({ repo: repo.full_name, reason: error.message });
      console.log(`failed (${error.message})`);
    }

    await sleep(options.delay);
  }

  const logPath = options.log ||
    path.join("tools", `starred-${options.from}-${new Date().toISOString().slice(0, 10)}.json`);

  await writeFile(
    logPath,
    `${JSON.stringify({ from: options.from, account: account.login, starred, failed }, null, 2)}\n`,
    "utf8"
  );

  console.log(`\nStarred ${starred.length} repositories, ${failed.length} failed.`);
  console.log(`Wrote ${logPath} — keep it if you want to undo this later:`);
  console.log(`  node tools/star-repos.mjs --undo ${logPath}`);
}

// ===== Run =====

try {
  token = await resolveToken();

  if (options.undo) {
    await undo(options.undo);
  } else {
    await star();
  }
} catch (error) {
  console.error(`\n${error.message}`);
  process.exitCode = 1;
}

import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import readline from "node:readline";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

function readPortFromDotEnv(envPath) {
  try {
    const raw = fs.readFileSync(envPath, "utf8");
    for (const line of raw.split(/\r?\n/)) {
      const m = line.match(/^\s*PORT\s*=\s*(\d+)\s*$/);
      if (m) return parseInt(m[1], 10);
    }
  } catch {
    /* missing .env */
  }
  return 3099;
}

function resolveCloudflaredBinary() {
  const name = process.platform === "win32" ? "cloudflared.exe" : "cloudflared";
  const local = path.join(root, ".tools", name);
  if (fs.existsSync(local)) return local;
  return "cloudflared";
}

/** Quick Tunnel prints *.trycloudflare.com — pull the URL once for PUBLIC_URL. */
function extractTryCloudflareUrl(line) {
  const m = line.match(/https:\/\/[a-zA-Z0-9-]+\.trycloudflare\.com\/?/);
  return m ? m[0].replace(/\/+$/, "") : null;
}

function upsertPublicUrl(envPath, url) {
  const raw = fs.existsSync(envPath) ? fs.readFileSync(envPath, "utf8") : "";
  const lines = raw.split(/\r?\n/);
  let found = false;
  const next = lines.map((line) => {
    if (/^\s*PUBLIC_URL\s*=/.test(line)) {
      found = true;
      return `PUBLIC_URL=${url}`;
    }
    return line;
  });
  if (!found) {
    if (next.length && next[next.length - 1] !== "") next.push("");
    next.push(`PUBLIC_URL=${url}`);
  }
  fs.writeFileSync(envPath, next.join("\n"), "utf8");
}

const envPath = path.join(root, ".env");
const port = readPortFromDotEnv(envPath);
const bin = resolveCloudflaredBinary();

if (!fs.existsSync(envPath)) {
  console.error("Missing .env — copy .env.example to .env and fill RECALL_API_KEY first.");
  process.exit(1);
}

let wrotePublicUrl = false;
function onTunnelLine(line, stream) {
  if (stream === "stderr") {
    process.stderr.write(`${line}\n`);
  } else {
    process.stdout.write(`${line}\n`);
  }
  if (wrotePublicUrl) return;
  const url = extractTryCloudflareUrl(line);
  if (!url) return;
  upsertPublicUrl(envPath, url);
  wrotePublicUrl = true;
  process.stderr.write(
    `\n[PUBLIC_URL] Updated ${path.relative(process.cwd(), envPath)} → ${url}\n` +
      "Restart recall-bridge (`npm run dev`) so the server reloads PUBLIC_URL.\n\n",
  );
}

function pipeLines(stream, label) {
  readline
    .createInterface({ input: stream, crlfDelay: Infinity })
    .on("line", (line) => onTunnelLine(line, label));
}

const child = spawn(bin, ["tunnel", "--url", `http://127.0.0.1:${port}`], {
  cwd: root,
  stdio: ["inherit", "pipe", "pipe"],
  windowsHide: true,
});

pipeLines(child.stdout, "stdout");
pipeLines(child.stderr, "stderr");

child.on("error", (err) => {
  if (/** @type {NodeJS.ErrnoException} */ (err).code === "ENOENT") {
    console.error(
      `Could not run "${bin}". Install cloudflared globally or place the binary at recall-bridge/.tools/cloudflared` +
        (process.platform === "win32" ? ".exe" : "") +
        " (see README).",
    );
  } else {
    console.error(err);
  }
  process.exit(1);
});

child.on("exit", (code, signal) => {
  if (signal) process.exit(1);
  process.exit(code ?? 1);
});

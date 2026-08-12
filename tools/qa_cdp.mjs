#!/usr/bin/env node
/* Minimal CDP screenshot harness, zero dependencies.
   Drives the puppeteer-cached Chrome via the DevTools protocol.
   Usage: node tools/qa_cdp.mjs                                     */
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "qa");
const CHROME = "/home/vercel-sandbox/.cache/puppeteer/chrome/linux-151.0.7922.77/chrome-linux64/chrome";

const CHECKPOINTS = [0.0, 0.16, 0.27, 0.44, 0.50, 0.61, 0.635, 0.72, 0.86, 1.0];
const VIEWPORTS = [
  { name: "desktop-1440", width: 1440, height: 900 },
  { name: "laptop-1280", width: 1280, height: 720 },
  { name: "tablet-land-1024", width: 1024, height: 768 },
  { name: "tablet-port-768", width: 768, height: 1024 },
  { name: "mobile-390", width: 390, height: 844 },
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function launch() {
  const port = 9222 + Math.floor(Math.random() * 500);
  const proc = spawn(CHROME, [
    "--headless=new", "--no-sandbox", "--disable-gpu",
    "--hide-scrollbars", "--disable-dev-shm-usage",
    `--remote-debugging-port=${port}`, "about:blank",
  ], { stdio: "ignore" });
  // wait for the devtools endpoint
  let wsUrl = null;
  for (let i = 0; i < 50; i++) {
    await sleep(200);
    try {
      const res = await fetch(`http://127.0.0.1:${port}/json/version`);
      const j = await res.json();
      wsUrl = j.webSocketDebuggerUrl;
      break;
    } catch {}
  }
  if (!wsUrl) throw new Error("chrome did not start");
  return { proc, port };
}

class CDP {
  constructor(ws) {
    this.ws = ws;
    this.id = 0;
    this.pending = new Map();
    this.consoleErrors = [];
    ws.onmessage = (ev) => {
      const msg = JSON.parse(ev.data);
      if (msg.id && this.pending.has(msg.id)) {
        const { resolve, reject } = this.pending.get(msg.id);
        this.pending.delete(msg.id);
        msg.error ? reject(new Error(msg.error.message)) : resolve(msg.result);
      } else if (msg.method === "Runtime.exceptionThrown") {
        this.consoleErrors.push(
          msg.params.exceptionDetails?.exception?.description || "pageerror");
      } else if (msg.method === "Runtime.consoleAPICalled" &&
                 msg.params.type === "error") {
        this.consoleErrors.push(
          msg.params.args?.map((a) => a.value ?? a.description).join(" "));
      }
    };
  }
  static async connect(port) {
    // new tab
    const res = await fetch(
      `http://127.0.0.1:${port}/json/new?about:blank`, { method: "PUT" });
    const target = await res.json();
    const ws = new WebSocket(target.webSocketDebuggerUrl);
    await new Promise((ok, err) => { ws.onopen = ok; ws.onerror = err; });
    return new CDP(ws);
  }
  send(method, params = {}) {
    const id = ++this.id;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }
}

async function run() {
  const { proc, port } = await launch();
  const issues = [];
  try {
    for (const vp of VIEWPORTS) {
      const cdp = await CDP.connect(port);
      await cdp.send("Runtime.enable");
      await cdp.send("Page.enable");
      await cdp.send("Emulation.setDeviceMetricsOverride", {
        width: vp.width, height: vp.height, deviceScaleFactor: 1, mobile: vp.width < 500,
      });
      await cdp.send("Page.navigate", { url: "http://localhost:8932/index.html" });
      await sleep(2200); // loader + fonts + decode

      // rail + a11y assertions run right after load (before scrolling)
      if (vp.name === "desktop-1440") {
        const rail = await cdp.send("Runtime.evaluate", { returnByValue: true,
          expression: `JSON.stringify((() => {
            const wraps = [...document.querySelectorAll(".rail-wrap")];
            const out = { railCount: wraps.length, rails: [] };
            for (const wrap of wraps) {
              const track = wrap.querySelector(".rail-track");
              const cards = [...track.children];
              const clones = cards.filter(c => c.hasAttribute("aria-hidden"));
              out.rails.push({ total: cards.length, clones: clones.length,
                clonesUntabbable: clones.every(c => [...c.querySelectorAll("a,button")].every(el => el.tabIndex === -1)) });
            }
            out.videoCount = document.querySelectorAll(".work-card:not([aria-hidden]) video").length;
            return out;
          })())` });
        const r = rail.result?.value ? JSON.parse(rail.result.value) : null;
        console.log("rails:", JSON.stringify(r));
        if (!r || r.railCount !== 2) issues.push(`expected 2 rails, got ${r?.railCount}`);
        else {
          const services = r.rails.find(rr => rr.total === 21);
          const work = r.rails.find(rr => rr.total === 18);
          if (work && work.total !== 18) issues.push(`work rail: expected 18, got ${work.total}`);
          if (services && services.total !== 21) issues.push(`services rail: expected 21, got ${services.total}`);
          if (services && !services.clonesUntabbable) issues.push("services rail clones tabbable");
          if (work && !work.clonesUntabbable) issues.push("work rail clones tabbable");
          if (r.videoCount !== 4) issues.push(`expected 4 work videos, got ${r.videoCount}`);
        }
        console.log("rails:", JSON.stringify(r));
        if (!r || r.railCount !== 2) issues.push(`expected 2 rails, got ${r?.railCount}`);
        else {
          const services = r.rails.find(rr => rr.total === 21);
          const work = r.rails.find(rr => rr.total === 18);
          if (work && work.total !== 18) issues.push(`work rail: expected 18, got ${work.total}`);
          if (services && services.total !== 21) issues.push(`services rail: expected 21, got ${services.total}`);
          if (services && !services.clonesUntabbable) issues.push("services rail clones tabbable");
          if (work && !work.clonesUntabbable) issues.push("work rail clones tabbable");
          if (r.videoCount !== 4) issues.push(`expected 4 work videos, got ${r.videoCount}`);
        }
      }

      for (const p of CHECKPOINTS) {
        await cdp.send("Runtime.evaluate", { expression: `
          (() => {
            const s = document.getElementById("cinematic");
            const max = s.offsetHeight - window.innerHeight;
            window.scrollTo(0, s.offsetTop + ${p} * max);
          })()` });
        await sleep(1600); // let smoothed playhead converge
        const shot = await cdp.send("Page.captureScreenshot", { format: "png" });
        fs.writeFileSync(
          path.join(OUT, `${vp.name}-p${String(p).replace(".", "")}.png`),
          Buffer.from(shot.data, "base64"));
      }

      const overflow = await cdp.send("Runtime.evaluate", {
        expression: `document.documentElement.scrollWidth - document.documentElement.clientWidth`,
        returnByValue: true });
      if (overflow.result.value > 1)
        issues.push(`${vp.name}: horizontal overflow ${overflow.result.value}px`);
      if (cdp.consoleErrors.length)
        issues.push(`${vp.name}: console: ${cdp.consoleErrors.join(" | ")}`);

      // reversal determinism (desktop only)
      if (vp.name === "desktop-1440") {
        const snap = async (p) => {
          await cdp.send("Runtime.evaluate", { expression: `(() => {
            const s = document.getElementById("cinematic");
            const max = s.offsetHeight - innerHeight;
            window.scrollTo(0, s.offsetTop + ${p} * max);
          })()` });
          await sleep(1500);
          const v = await cdp.send("Runtime.evaluate", { returnByValue: true,
            expression: `parseFloat(getComputedStyle(document.getElementById("stage")).getPropertyValue("--p-open"))` });
          return v.result.value;
        };
        const down = await snap(0.27);
        await snap(0.95);
        const up = await snap(0.27);
        console.log(`reversal: down=${down} up=${up}`);
        if (Math.abs(down - up) > 0.03) issues.push(`reversal mismatch: ${down} vs ${up}`);
      }

      await cdp.send("Runtime.evaluate", { expression: `window.scrollTo(0,0)` });
      console.log(`done ${vp.name}`);
      cdp.ws.close();
    }
  } finally {
    proc.kill();
  }
  fs.writeFileSync(path.join(OUT, "qa-report.txt"),
    issues.length ? issues.join("\n") : "No console errors, no horizontal overflow.");
  console.log(issues.length ? "ISSUES:\n" + issues.join("\n") : "CLEAN");
}

run().catch((e) => { console.error(e); process.exit(1); });

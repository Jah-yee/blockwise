import { readFileSync } from "node:fs";
import { join } from "node:path";

export const L = (en: string, zh: string) => `<span class="e">${en}</span><span class="z" lang="zh">${zh}</span>`;
export const GITHUB = "https://github.com/Jah-yee/blockwise";

const NAV: [string, string, string, string][] = [
  ["home", "/", "Overview", "总览"],
  ["dashboard", "/dashboard/", "Dashboard", "仪表盘"],
  ["tui", "/tui/", "Terminal", "终端"],
  ["sim", "/simulator/", "Simulator", "模拟器"],
];

export const css = (dir: string) => readFileSync(join(dir, "shared.css"), "utf8");

export function nav(active: string): string {
  const items = NAV.map(([k, href, en, zh]) => `<a href="${href}"${k === active ? ' aria-current="page"' : ""}>${L(en, zh)}</a>`).join("");
  return `<header class="nav"><div class="nav-in">
<a class="brand" href="/" aria-label="Blockwise"><svg viewBox="0 0 32 32" width="22" height="22" aria-hidden="true"><rect x="3" y="7" width="20" height="14" rx="2.5" fill="none" stroke="currentColor" stroke-width="1.6"/><g fill="var(--accent)"><circle cx="8" cy="12" r="1.7"/><circle cx="8" cy="16" r="1.7"/><circle cx="8" cy="20" r="1.7" opacity=".0"/></g><path d="M13 12h6M13 16h4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg><span>Blockwise</span></a>
<nav class="links" aria-label="Primary">${items}<a href="${GITHUB}" rel="noopener">GitHub<span class="ext" aria-hidden="true">↗</span></a></nav>
<button class="lang" id="langbtn" type="button" aria-label="Language"><span class="e">中文</span><span class="z">EN</span></button>
</div></header>`;
}

export function footer(): string {
  return `<footer class="foot"><div class="wrap">
<p class="disc">${L(
    "Blockwise runs on Monad testnet. The money is test MON with no value. The return series is synthetic (seeded regime-switching returns), the strategy family is seven integers, and costs are a fixed 3 bp. Nothing here is investment advice, and no result here predicts a real market. The sealed segment sits on a public chain: “look once” is a recorded look, not a secret.",
    "Blockwise 运行在 Monad 测试网，使用的是没有价值的测试 MON。收益序列是合成的（带种子的状态切换收益），策略族只有七个整数，成本固定为 3 个基点。这里的一切都不构成投资建议，任何结果都不预示真实市场。封存段位于公开链上：“只看一次”是被记录的一次查看，而不是秘密。")}</p>
<p class="small">${L("Blockwise is not affiliated with Jev Trader or TypeSafe. The Jev judge shown in recorded runs is a labelled stand-in.", "Blockwise 与 Jev Trader、TypeSafe 无关联。记录的运行中显示的 Jev 评审是明确标注的替身。")}</p>
<p class="small links2"><a href="${GITHUB}">GitHub</a> · <a href="${GITHUB}/blob/main/README.md">README</a> · <a href="${GITHUB}/blob/main/docs/faq.md">FAQ</a> · Apache-2.0</p>
</div></footer>`;
}

const FONTS = `<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Newsreader:ital,opsz,wght@0,6..72,400;0,6..72,500;1,6..72,400&family=Source+Sans+3:wght@400;600&family=IBM+Plex+Mono:wght@400;500&display=swap">`;

const LANGJS = `<script>(function(){try{var q=new URLSearchParams(location.search).get("lang");var z=q==="zh"||(!q&&localStorage.getItem("bw-lang")==="zh");if(q){localStorage.setItem("bw-lang",q==="zh"?"zh":"en")}if(z){document.documentElement.classList.add("zh");document.documentElement.lang="zh-CN"}}catch(e){var z0=/lang=zh/.test(location.search);if(z0)document.documentElement.classList.add("zh")}
document.addEventListener("DOMContentLoaded",function(){var zh=document.documentElement.classList.contains("zh");
document.querySelectorAll('a[href^="/"]').forEach(function(a){if(zh&&!/lang=/.test(a.getAttribute("href"))){var h=a.getAttribute("href"),i=h.indexOf("#");var p=i<0?h:h.slice(0,i),s=i<0?"":h.slice(i);a.setAttribute("href",p+(p.indexOf("?")<0?"?":"&")+"lang=zh"+s)}});
var b=document.getElementById("langbtn");if(b)b.addEventListener("click",function(){var u=new URL(location.href);if(zh)u.searchParams.delete("lang");u.searchParams.set("lang",zh?"en":"zh");try{localStorage.setItem("bw-lang",zh?"en":"zh")}catch(e){}location.href=u.toString()})})})();</script>`;

export function page(opts: { dir: string; active: string; title: string; desc: string; body: string; extraHead?: string; bodyClass?: string }): string {
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${opts.title}</title><meta name="description" content="${opts.desc}">
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='6' fill='%23E1E1DC'/%3E%3Crect x='6' y='9' width='20' height='14' rx='2.5' fill='none' stroke='%2341423D' stroke-width='2'/%3E%3Ccircle cx='11' cy='16' r='2' fill='%231f5a63'/%3E%3C/svg%3E">
${FONTS}${LANGJS}<style>${css(opts.dir)}</style>${opts.extraHead ?? ""}</head>
<body class="${opts.bodyClass ?? ""}"><a class="skip" href="#main">Skip to content</a>${nav(opts.active)}<main id="main">${opts.body}</main>${footer()}</body></html>`;
}

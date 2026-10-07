// Generates assets/trophies.svg from live GitHub stats.
// Runs daily via .github/workflows/trophies.yml (needs Node 18+ for global fetch).
import { writeFileSync, mkdirSync } from "node:fs";

const USER = process.env.GH_USER ?? "Kurtisko221x";
const headers = { "User-Agent": "trophy-gen", Accept: "application/vnd.github+json" };
if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;

async function gh(path) {
  const res = await fetch(`https://api.github.com${path}`, { headers });
  if (!res.ok) throw new Error(`${res.status} ${path}`);
  return res.json();
}

const user = await gh(`/users/${USER}`);
const repos = await gh(`/users/${USER}/repos?per_page=100&type=owner`);
const own = repos.filter((r) => !r.fork);
const stars = own.reduce((n, r) => n + r.stargazers_count, 0);
const langs = new Set(own.map((r) => r.language).filter(Boolean)).size;
const count = async (q) => (await gh(`/search/issues?q=${encodeURIComponent(q)}&per_page=1`)).total_count;
const commits = (await gh(`/search/commits?q=author:${USER}&per_page=1`)).total_count;
const prs = await count(`author:${USER} type:pr`);
const issues = await count(`author:${USER} type:issue`);

// [title, value, thresholds for C..SSS]
const trophies = [
  ["Commits", commits, [1, 50, 200, 500, 1000, 2000, 5000]],
  ["Repos", own.length, [1, 3, 5, 10, 20, 35, 50]],
  ["Stars", stars, [1, 5, 15, 40, 100, 300, 1000]],
  ["Languages", langs, [1, 2, 3, 5, 7, 10, 12]],
  ["Pull Requests", prs, [1, 5, 15, 40, 100, 200, 500]],
  ["Followers", user.followers, [1, 5, 15, 40, 100, 300, 1000]],
  ["Issues", issues, [1, 5, 15, 40, 100, 200, 500]],
];
const RANKS = ["C", "B", "A", "AA", "AAA", "S", "SS", "SSS"];
const COLORS = { C: "#8b7fb8", B: "#7dd3fc", A: "#4ade80", AA: "#4ade80", AAA: "#ffd166", S: "#ff4fa3", SS: "#e100ff", SSS: "#ffffff" };

const rankOf = (v, t) => {
  let i = 0;
  while (i < t.length && v >= t[i]) i++;
  return i === 0 ? "?" : RANKS[i - 1];
};

const W = 130, H = 150, GAP = 12;
const cards = trophies.map(([title, value, t], i) => {
  const rank = rankOf(value, t);
  const col = COLORS[rank] ?? "#3b2f63";
  const x = i * (W + GAP);
  return `
  <g transform="translate(${x},0)"><g class="card" style="animation-delay:${(i * 0.15).toFixed(2)}s">
    <rect width="${W}" height="${H}" rx="12" fill="#0d0a1f" stroke="#2a1f4a"/>
    <text x="${W / 2}" y="22" class="title">${title}</text>
    <g transform="translate(${W / 2 - 22},34)"><g class="cup">
      <path d="M8 0h28v14a14 14 0 0 1-28 0z" fill="${col}"/>
      <path d="M8 4H2a8 8 0 0 0 8 12M36 4h6a8 8 0 0 1-8 12" fill="none" stroke="${col}" stroke-width="3"/>
      <rect x="18" y="28" width="8" height="8" fill="${col}"/>
      <rect x="10" y="36" width="24" height="6" rx="2" fill="${col}"/>
      <rect x="10" y="2" width="5" height="10" rx="2" fill="#fff" opacity=".35"/>
    </g></g>
    <text x="${W / 2}" y="104" class="rank" fill="${col}">${rank}</text>
    <text x="${W / 2}" y="132" class="val">${value} ${title === "Languages" ? "used" : "total"}</text>
  </g></g>`;
});

const width = trophies.length * (W + GAP) - GAP;
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${H}" width="${width}" height="${H}">
  <style>
    .title { font: 700 13px 'Segoe UI', Arial, sans-serif; fill: #c77dff; text-anchor: middle; }
    .rank { font: 900 26px 'Segoe UI', Arial, sans-serif; text-anchor: middle; }
    .val { font: 12px 'Consolas', monospace; fill: #8b7fb8; text-anchor: middle; }
    .card { opacity: 0; animation: pop .6s ease-out forwards; }
    @keyframes pop { from { opacity: 0; transform: translateY(8px) } to { opacity: 1; transform: none } }
    .cup { animation: bob 3s ease-in-out infinite; }
    @keyframes bob { 0%,100% { transform: none } 50% { transform: translateY(-4px) } }
  </style>${cards.join("")}
</svg>
`;

mkdirSync("assets", { recursive: true });
writeFileSync("assets/trophies.svg", svg);
console.log(`trophies.svg written (commits=${commits} repos=${own.length} stars=${stars} langs=${langs} prs=${prs} followers=${user.followers} issues=${issues})`);

import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const imageDir = join(process.cwd(), "assets", "img");
const shampoo = readFileSync(join(imageDir, "amazon-shampoo-clean.jpg")).toString("base64");
const oil = readFileSync(join(imageDir, "amazon-hair-oil.jpg")).toString("base64");

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="980" height="900" viewBox="0 0 980 900" role="img" aria-labelledby="title desc">
  <title id="title">Hairry Blossom Ayurvedic Shampoo and Herbal Hair Oil</title>
  <desc id="desc">A premium single combined product photo showing Hairry Blossom shampoo and hair oil together.</desc>
  <defs>
    <linearGradient id="bg" x1="0" x2="1" y1="0" y2="1">
      <stop offset="0" stop-color="#fffdf7"/>
      <stop offset="0.55" stop-color="#f4e8ce"/>
      <stop offset="1" stop-color="#dec28a"/>
    </linearGradient>
    <linearGradient id="photoBg" x1="0" x2="1" y1="0" y2="1">
      <stop offset="0" stop-color="#fffdf7"/>
      <stop offset="0.55" stop-color="#f7ecd0"/>
      <stop offset="1" stop-color="#ead19a"/>
    </linearGradient>
    <radialGradient id="halo" cx="55%" cy="28%" r="62%">
      <stop offset="0" stop-color="#fff6d6" stop-opacity="0.85"/>
      <stop offset="0.6" stop-color="#d8a742" stop-opacity="0.26"/>
      <stop offset="1" stop-color="#d8a742" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="photoGlow" cx="66%" cy="43%" r="58%">
      <stop offset="0" stop-color="#fff1b5" stop-opacity="0.35"/>
      <stop offset="0.68" stop-color="#fff1b5" stop-opacity="0"/>
    </radialGradient>
    <clipPath id="photoClip">
      <rect x="88" y="82" width="804" height="650" rx="10"/>
    </clipPath>
    <linearGradient id="seamBlend" gradientUnits="userSpaceOnUse" x1="330" x2="614" y1="0" y2="0">
      <stop offset="0" stop-color="#f6e7c2" stop-opacity="0"/>
      <stop offset="0.5" stop-color="#fffdf7" stop-opacity="0.34"/>
      <stop offset="1" stop-color="#f6e7c2" stop-opacity="0"/>
    </linearGradient>
  </defs>
  <rect width="980" height="900" rx="8" fill="url(#bg)"/>
  <rect width="980" height="900" rx="8" fill="url(#halo)"/>
  <path d="M58 720 C226 650 310 705 450 632 C620 544 724 598 922 498" fill="none" stroke="#006b49" stroke-width="18" stroke-linecap="round" opacity="0.16"/>
  <path d="M126 192 C84 118 112 66 180 44 C220 118 206 174 126 192Z" fill="#006b49" opacity="0.28"/>
  <path d="M824 142 C882 94 928 104 956 154 C900 204 856 198 824 142Z" fill="#6f9f59" opacity="0.34"/>
  <ellipse cx="502" cy="736" rx="346" ry="54" fill="#302212" opacity="0.16"/>
  <g>
    <ellipse cx="500" cy="746" rx="372" ry="58" fill="#302212" opacity="0.18"/>
    <rect x="88" y="82" width="804" height="650" rx="10" fill="url(#photoBg)"/>
    <g clip-path="url(#photoClip)">
      <rect x="88" y="82" width="804" height="650" fill="url(#photoBg)"/>
      <image href="data:image/jpeg;base64,${oil}" x="108" y="96" width="402" height="603" preserveAspectRatio="xMidYMid slice" style="mix-blend-mode:multiply"/>
      <image href="data:image/jpeg;base64,${shampoo}" x="438" y="96" width="404" height="560" preserveAspectRatio="xMidYMin slice" style="mix-blend-mode:multiply"/>
      <rect x="330" y="82" width="284" height="650" fill="url(#seamBlend)"/>
      <rect x="88" y="82" width="804" height="650" fill="#fffdf7" opacity="0.16"/>
      <rect x="88" y="82" width="804" height="650" fill="url(#photoGlow)"/>
      <path d="M116 618 C288 552 368 630 514 556 C646 490 756 522 868 462" fill="none" stroke="#006b49" stroke-width="15" stroke-linecap="round" opacity="0.16"/>
      <path d="M146 182 C112 122 136 78 194 62 C228 122 214 168 146 182Z" fill="#006b49" opacity="0.24"/>
      <path d="M806 188 C856 146 898 156 922 198 C874 240 834 236 806 188Z" fill="#6f9f59" opacity="0.28"/>
    </g>
    <rect x="88" y="82" width="804" height="650" rx="10" fill="none" stroke="#fffdf7" stroke-width="12"/>
  </g>
  <g transform="translate(716 118)">
    <circle cx="86" cy="86" r="76" fill="#fffdf7" stroke="#d8a742" stroke-width="2"/>
    <text x="86" y="74" text-anchor="middle" font-family="Georgia, serif" font-size="24" font-weight="700" fill="#063f2e">Root to</text>
    <text x="86" y="101" text-anchor="middle" font-family="Georgia, serif" font-size="24" font-weight="700" fill="#063f2e">Scalp</text>
    <text x="86" y="126" text-anchor="middle" font-family="Arial, sans-serif" font-size="13" font-weight="700" fill="#f07818">AYURVEDIC RITUAL</text>
  </g>
  <g transform="translate(178 800)">
    <text x="0" y="0" font-family="Georgia, serif" font-size="34" font-weight="700" fill="#063f2e">Complete Hair Care Duo</text>
    <text x="0" y="34" font-family="Arial, sans-serif" font-size="17" font-weight="700" fill="#67452f">Ayurvedic Shampoo + Herbal Hair Oil</text>
  </g>
</svg>`;

writeFileSync(join(imageDir, "product-duo.svg"), svg);
console.log("Created assets/img/product-duo.svg");

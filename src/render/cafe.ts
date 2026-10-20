// Фон клуба-кафе — общий для всех столов (утверждён вместе с концептом Агаты, docs/ART_STYLE.md §8).
// Только декор: окно, лампы, полка с играми, доска для счёта мелом. Модуль не зависит от DOM.
const ol = (w = 4): string => `stroke="#3B2418" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round"`;

// ---------- фон кафе (единицы BG_DESIGN: 2400 × 900, центр персонажа x = 1200, дальний край стола y = 470) ----------
export function cafeBackgroundSvg(): string {
  // Провод доходит до верхушки купола плафона (вершина кривой — y = 75).
  const lamp = (x: number) => `<path d="M${x} 0 V77" ${ol(3)}/><path d="M${x - 48} 104 Q${x} 46 ${x + 48} 104 Z" fill="#C5333B" ${ol(4)}/><ellipse cx="${x}" cy="106" rx="17" ry="6" fill="#FFF1C9"/>`;
  const glow = (x: number) => `<ellipse cx="${x}" cy="280" rx="360" ry="300" fill="url(#bgGlow)"/>`;
  const panel = (x: number) => `<rect x="${x}" y="368" width="210" height="88" rx="6" fill="none" stroke="#8C5A31" stroke-width="3"/>`;
  const window = (x: number) => `<g>
    <rect x="${x}" y="110" width="250" height="215" rx="8" fill="url(#bgSky)" ${ol(5)}/>
    <path d="M${x} 285 L${x + 40} 266 L${x + 40} 246 L${x + 72} 246 L${x + 72} 272 L${x + 118} 254 L${x + 118} 234 L${x + 150} 234 L${x + 150} 260 L${x + 196} 244 L${x + 250} 266 L${x + 250} 325 L${x} 325 Z" fill="#2B3354" opacity="0.85"/>
    <circle cx="${x + 192}" cy="146" r="13" fill="#FFF3D1" opacity="0.9"/>
    <path d="M${x + 125} 110 V325 M${x} 216 H${x + 250}" stroke="#8C5A31" stroke-width="7"/>
    <rect x="${x}" y="110" width="250" height="215" rx="8" fill="none" ${ol(5)}/>
    <path d="M${x - 20} 94 C${x - 6} 160 ${x + 18} 250 ${x + 4} 334 L${x + 40} 334 C${x + 36} 260 ${x + 26} 160 ${x + 28} 94 Z" fill="#B8323F" ${ol(4)}/>
    <path d="M${x + 270} 94 C${x + 256} 160 ${x + 232} 250 ${x + 246} 334 L${x + 210} 334 C${x + 214} 260 ${x + 224} 160 ${x + 222} 94 Z" fill="#B8323F" ${ol(4)}/>
    <rect x="${x - 34}" y="84" width="318" height="15" rx="7" fill="#8C5A31" ${ol(3.5)}/></g>`;
  const shelf = (x: number) => `<g>
    <rect x="${x}" y="284" width="270" height="15" rx="4" fill="#8C5A31" ${ol(3.5)}/>
    <rect x="${x + 14}" y="228" width="36" height="56" rx="4" fill="#C5333B" ${ol(3)}/>
    <rect x="${x + 52}" y="242" width="60" height="42" rx="4" fill="#E8AB30" ${ol(3)}/>
    <rect x="${x + 114}" y="220" width="28" height="64" rx="4" fill="#2F7A72" ${ol(3)}/>
    <path d="M${x + 160} 284 L${x + 166} 250 L${x + 220} 250 L${x + 226} 284 Z" fill="#C2774A" ${ol(3)}/>
    <path d="M${x + 193} 250 C${x + 182} 214 ${x + 160} 204 ${x + 150} 210 C${x + 166} 220 ${x + 177} 234 ${x + 188} 250 M${x + 193} 250 C${x + 198} 210 ${x + 220} 194 ${x + 234} 198 C${x + 220} 212 ${x + 208} 230 ${x + 198} 250" fill="#5B9A4E" ${ol(2.6)}/></g>`;
  const picture = (x: number) => `<g><rect x="${x}" y="150" width="150" height="110" rx="6" fill="#8C5A31" ${ol(4)}/><rect x="${x + 12}" y="162" width="126" height="86" rx="3" fill="#E9D7B4"/>
    <path d="M${x + 20} 238 L${x + 60} 196 L${x + 86} 222 L${x + 104} 206 L${x + 130} 238 Z" fill="#7FA36B"/><circle cx="${x + 110}" cy="184" r="9" fill="#F4C542"/></g>`;
  const board = `<rect x="1520" y="96" width="230" height="124" rx="10" fill="#2E4038" ${ol(5)}/><rect x="1529" y="105" width="212" height="106" rx="6" fill="none" stroke="#8C5A31" stroke-width="5"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 2400 900" width="2400" height="900">
  <defs>
    <linearGradient id="bgWall" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#F3DDB8"/><stop offset="1" stop-color="#E6C08C"/></linearGradient>
    <linearGradient id="bgSky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3E4C7A"/><stop offset="0.65" stop-color="#C77F7A"/><stop offset="1" stop-color="#F0B26E"/></linearGradient>
    <radialGradient id="bgGlow" cx="0.5" cy="0.3" r="0.6"><stop offset="0" stop-color="#FFF1C9" stop-opacity="0.5"/><stop offset="1" stop-color="#FFF1C9" stop-opacity="0"/></radialGradient>
  </defs>
  <rect width="2400" height="900" fill="url(#bgWall)"/>
  <rect y="350" width="2400" height="550" fill="#B97E4B"/>
  <path d="M0 350 H2400" ${ol(4)}/>
  ${[30, 270, 510, 750, 1460, 1700, 1940, 2180].map(panel).join('')}
  ${window(640)}${window(120)}
  ${picture(2120)}
  ${board}${shelf(1500)}
  ${glow(880)}${glow(1520)}
  ${lamp(880)}${lamp(1520)}
  </svg>`;
}

/** Где на фоне висит доска для счёта (единицы фона). */
export const BG_BOARD = { x: 1529, y: 105, w: 212, h: 106 } as const;

// Общий стол клуба в перспективе: деревянный бортик, сукно и пятно света от ламп (docs/ART_STYLE.md §8).
import type { Graphics } from 'pixi.js';
import type { LayoutSpec } from '../layout/layout';

export function drawCafeTable(g: Graphics, s: LayoutSpec): void {
  const t = s.table;
  g.clear();
  g.poly([t.farLeft - 12, t.farY - 8, t.farRight + 12, t.farY - 8, t.nearRight + 30, t.nearY, t.nearLeft - 30, t.nearY]).fill(0xa86b3c).stroke({ color: 0x3b2418, width: 5 });
  g.moveTo(t.farLeft, t.farY - 2).lineTo(t.farRight, t.farY - 2).stroke({ color: 0xc88d58, width: 3 });
  g.poly([t.farLeft + 8, t.farY + 4, t.farRight - 8, t.farY + 4, t.nearRight, t.nearY, t.nearLeft, t.nearY]).fill(0x2a6d66).stroke({ color: 0x3b2418, width: 4 });
  // Пятно света от ламп: по центру видимого сукна и целиком в его пределах (не залезает на бортик).
  const cx = (t.farLeft + t.farRight) / 2;
  const felt = s.height - (t.farY + 4);
  const cy = t.farY + 4 + felt / 2;
  const lw = Math.min((t.farRight - t.farLeft) * 0.42, s.width * 0.46);
  const lh = felt / 2 - Math.max(10, felt * 0.06);
  g.ellipse(cx, cy, lw, lh).fill({ color: 0x4aa293, alpha: 0.35 });
  g.ellipse(cx, cy, lw * 0.6, lh * 0.6).fill({ color: 0x5fb3a3, alpha: 0.25 });
  // Строчка по краю сукна.
  for (let x = t.farLeft + 20; x < t.farRight - 20; x += 14) g.circle(x, t.farY + 14, 1.4).fill({ color: 0x8fd0c3, alpha: 0.7 });
}

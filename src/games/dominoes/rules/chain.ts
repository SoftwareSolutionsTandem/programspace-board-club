// Цепочка домино (docs/games/dominoes.md §1, §4): концы, подходящие кости, выкладка.
// Только геометрия, без состояния партии — её используют движок, проекция, ИИ и сцена.
import { hasPip, type Bone, type Pip } from './bones';
import type { End, Placed } from './state';

/** Концы цепочки [левый, правый]; null — цепочка пуста. */
export function chainEnds(chain: readonly Placed[]): readonly [Pip, Pip] | null {
  const first = chain[0];
  const last = chain[chain.length - 1];
  return first && last ? [first.left, last.right] : null;
}

/** К каким концам подходит кость (§4). К пустой цепочке — «left». */
export function fittingEnds(b: Bone, chain: readonly Placed[]): End[] {
  const ends = chainEnds(chain);
  if (!ends) return ['left'];
  const out: End[] = [];
  if (hasPip(b, ends[0])) out.push('left');
  if (hasPip(b, ends[1])) out.push('right');
  return out;
}

/** Цепочка после выкладки. Дубль кладётся поперёк, но новых концов не открывает (§1). */
export function attach(chain: readonly Placed[], b: Bone, end: End): Placed[] {
  const ends = chainEnds(chain);
  if (!ends) return [{ bone: b, left: b.hi, right: b.lo }];
  if (end === 'left') {
    const n = ends[0];
    return [{ bone: b, left: b.hi === n ? b.lo : b.hi, right: n }, ...chain];
  }
  const n = ends[1];
  return [...chain, { bone: b, left: n, right: b.hi === n ? b.lo : b.hi }];
}

/** Ходы выкладкой для руки при данной цепочке (без учёта правила первого хода). */
export function playsFor(hand: readonly Bone[], chain: readonly Placed[]): { bone: Bone; end: End }[] {
  return hand.flatMap((b) => fittingEnds(b, chain).map((end) => ({ bone: b, end })));
}


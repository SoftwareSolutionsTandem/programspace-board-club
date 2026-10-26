import { it } from 'vitest';
import { writeFileSync } from 'node:fs';
import * as K from '../../src/characters/khariton/art';
import * as C2 from '../../src/characters/kostyan/art';
import { EMOTIONS } from '../../src/characters/types';
const img = (svg: string, w: number, extra = '') => '<img style="width:' + w + 'px;' + extra + '" src="data:image/svg+xml;utf8,' + encodeURIComponent(svg) + '">';
it('sheet', () => {
  const A = (process.env.CHAR === 'kostyan' ? C2 : K) as unknown as typeof K;
  let html = '<html><body style="margin:0;background:#e8c796">';
  // фигура: тело + руки + голова
  html += '<div style="position:relative;width:430px;height:470px;display:inline-block">';
  html += img(A.bodySvg(), 430, 'position:absolute;left:0;top:0');
  html += img(A.headSvg('warm'), 260, 'position:absolute;left:80px;top:0');
  html += img(A.mouthSvg('smile'), A.MOUTH_BOX.w, 'position:absolute;left:' + (A.MOUTH_BOX.x) + 'px;top:' + (A.MOUTH_BOX.y + 30) + 'px');
  html += img(A.armsSvg('idle'), 430, 'position:absolute;left:0;top:0');
  html += '</div><div style="display:inline-block;width:1000px">';
  for (const e of EMOTIONS) html += img(A.portraitSvg(e), 240);
  html += '</div>';
  writeFileSync('/tmp/claude-0/-home-user/824be373-dd02-510b-89fb-4f8a0d12a750/scratchpad/char.html', html + '</body></html>');
});

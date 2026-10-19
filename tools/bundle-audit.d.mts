// Типы для tools/bundle-audit.mjs (используется в тестах).
export interface AuditInput {
  product: { id: string; games: readonly string[]; characters: readonly string[]; publicAssets: readonly string[]; strings: Readonly<Record<string, string>>; icon: { file: string; status: string } };
  report: { files: { fileName: string; type: 'chunk' | 'asset'; modules?: string[] }[] };
  dist: Map<string, string>;
  publicFiles: Map<string, string>;
  iconHash: string;
  licenses: string;
  manifests: Map<string, { lines: Record<string, Record<string, string>> }>;
  indexHtml: string;
  expectedTitle: string;
}
export interface AuditResult {
  errors: string[];
  warnings: string[];
  modules: number;
  games: string[];
  characters: string[];
}
export function auditBuild(a: AuditInput): AuditResult;

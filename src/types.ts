/**
 * Parser output and graph analysis contract types for Repnex Repository Intelligence.
 */

export interface ParsedFile {
  /** Path relative to repository root, forward-slash separated. */
  path: string;
  /** Enclosing folder relative to root, or empty string if at root. */
  folder: string;
  /** Language identifier. */
  language: FileLanguage;
  /** Total line count of the file. */
  lineCount: number;
  /** SHA-256 hash or digest of the file content. */
  contentHash: string;
  /** Exported identifiers. */
  exports?: string[];
  /** Primary functions or declarations. */
  functions?: string[];
}

export type FileLanguage =
  | "typescript"
  | "javascript"
  | "typescriptreact"
  | "javascriptreact";

export type EdgeKind = "import" | "re-export" | "dynamic-import" | "require";

export interface ParsedEdge {
  /** File containing the import statement. */
  sourcePath: string;
  /** Target file the import resolves to. */
  targetPath: string;
  /** Literal import specifier string. */
  importSpecifier: string;
  /** Relationship kind. */
  kind: EdgeKind;
}

export type UnresolvedReason =
  | "file-not-found"
  | "outside-repository"
  | "node-module"
  | "non-literal-dynamic-import"
  | "unsupported-syntax"
  | "path-alias-unresolved";

export interface UnresolvedImport {
  sourcePath: string;
  importSpecifier: string;
  reason: UnresolvedReason;
  kind: EdgeKind;
}

export interface FileFanMetrics {
  /** Inbound count (how many repository files import this file). */
  fanIn: number;
  /** Outbound count (how many repository files this file imports). */
  fanOut: number;
}

export interface SkippedFile {
  path: string;
  reason: string;
}

export interface CoverageReport {
  totalFilesFound: number;
  filesParsed: number;
  filesSkipped: number;
  skippedFiles: SkippedFile[];
  totalImports: number;
  resolvedImports: number;
  externalImports: number;
  unresolvedImports: UnresolvedImport[];
}

export interface ExtractedRoute {
  filePath: string;
  routePath: string;
  httpMethods: string[];
}

export interface ParseResult {
  repoRoot: string;
  parsedAt: string;
  framework: string;
  files: ParsedFile[];
  edges: ParsedEdge[];
  fanMetrics: Record<string, FileFanMetrics>;
  coverage: CoverageReport;
  folders: string[];
  routes: ExtractedRoute[];
  fileRoles: Record<string, string>;
}

/**
 * Parser output types for Repnex Repository Intelligence Agent.
 */

export interface ParsedFile {
  path: string;
  folder: string;
  language: FileLanguage;
  lineCount: number;
  contentHash: string;
  exports?: string[];
  functions?: string[];
}

export type FileLanguage =
  | 'typescript'
  | 'javascript'
  | 'typescriptreact'
  | 'javascriptreact';

export type EdgeKind = 'import' | 're-export' | 'dynamic-import' | 'require';

export interface ParsedEdge {
  sourcePath: string;
  targetPath: string;
  importSpecifier: string;
  kind: EdgeKind;
}

export type UnresolvedReason =
  | 'file-not-found'
  | 'outside-repository'
  | 'node-module'
  | 'non-literal-dynamic-import'
  | 'unsupported-syntax'
  | 'path-alias-unresolved';

export interface UnresolvedImport {
  sourcePath: string;
  importSpecifier: string;
  reason: UnresolvedReason;
  kind: EdgeKind;
}

export interface FileFanMetrics {
  fanIn: number;
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

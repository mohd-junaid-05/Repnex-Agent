import type { ParsedFile, ParseResult } from "../types.js";

export type FileKind =
  | "hook"
  | "test"
  | "story"
  | "component"
  | "page"
  | "route"
  | "routes"
  | "layout"
  | "entry"
  | "types"
  | "config"
  | "utility"
  | "adapter"
  | "controllers"
  | "services"
  | "modules"
  | "entities"
  | "dtos"
  | "guards"
  | "middleware"
  | "models"
  | "views"
  | "unidentified";

export interface FileClassification {
  kind: FileKind;
  label: string;
  identified: boolean;
}

/**
 * Resolves a file's classification from repository taxonomy and role metadata if available,
 * or falls back to convention-based regex classification.
 */
export function getFileClassification(file: ParsedFile, data?: ParseResult): FileClassification {
  if (data?.fileRoles && data.fileRoles[file.path]) {
    const roleName = data.fileRoles[file.path];
    const isUnidentified =
      roleName === "Modules" || roleName === "Plumbing" || roleName === "unidentified";
    return {
      kind: roleName.toLowerCase() as FileKind,
      label: roleName,
      identified: !isUnidentified,
    };
  }
  return classifyFile(file);
}

/**
 * Classifies a file based on file conventions, naming patterns, and location.
 */
export function classifyFile(file: ParsedFile): FileClassification {
  const p = file.path.replace(/\\/g, "/").toLowerCase();
  const fileName = (file.path.split(/[/\\]/).pop() || file.path).toLowerCase();

  // 1. Tests
  if (
    fileName.endsWith(".test.ts") ||
    fileName.endsWith(".test.tsx") ||
    fileName.endsWith(".test.js") ||
    fileName.endsWith(".test.jsx") ||
    fileName.endsWith(".spec.ts") ||
    fileName.endsWith(".spec.tsx") ||
    fileName.endsWith(".spec.js") ||
    fileName.endsWith(".spec.jsx") ||
    p.includes("/__tests__/") ||
    p.startsWith("__tests__/")
  ) {
    return {
      kind: "test",
      label: "Test",
      identified: true,
    };
  }

  // 2. Stories
  if (
    fileName.endsWith(".story.tsx") ||
    fileName.endsWith(".stories.tsx") ||
    fileName.endsWith(".story.ts") ||
    fileName.endsWith(".stories.ts") ||
    fileName.endsWith(".story.jsx") ||
    fileName.endsWith(".stories.jsx")
  ) {
    return {
      kind: "story",
      label: "Story",
      identified: true,
    };
  }

  // 3. React Hooks
  if (fileName.startsWith("use-") || /^use[a-z0-9]/.test(fileName)) {
    return {
      kind: "hook",
      label: "Hook",
      identified: true,
    };
  }

  // 4. Entry / Barrel files
  if (
    fileName === "index.ts" ||
    fileName === "index.tsx" ||
    fileName === "index.js" ||
    fileName === "index.jsx" ||
    fileName === "main.ts" ||
    fileName === "main.tsx" ||
    fileName === "main.js" ||
    fileName === "mod.ts"
  ) {
    return {
      kind: "entry",
      label: "Entry / Barrel",
      identified: true,
    };
  }

  // 5. Next.js / Web Routes & Layouts
  if (fileName === "page.tsx" || fileName === "page.jsx" || fileName === "page.js") {
    return {
      kind: "page",
      label: "Page routes",
      identified: true,
    };
  }
  if (fileName === "route.ts" || fileName === "route.js") {
    return {
      kind: "route",
      label: "API endpoints",
      identified: true,
    };
  }
  if (
    fileName === "layout.tsx" ||
    fileName === "layout.jsx" ||
    fileName === "template.tsx" ||
    fileName === "loading.tsx" ||
    fileName === "error.tsx" ||
    fileName === "not-found.tsx"
  ) {
    return {
      kind: "layout",
      label: "Layouts",
      identified: true,
    };
  }

  // 6. UI Components
  if (
    file.language === "typescriptreact" ||
    file.language === "javascriptreact" ||
    p.includes("/components/") ||
    p.startsWith("components/") ||
    p.includes("/ui/") ||
    p.startsWith("ui/") ||
    fileName.endsWith(".tsx") ||
    fileName.endsWith(".jsx")
  ) {
    return {
      kind: "component",
      label: "Components",
      identified: true,
    };
  }

  // 7. Types
  if (
    fileName.endsWith(".d.ts") ||
    fileName === "types.ts" ||
    fileName.endsWith(".types.ts") ||
    p.includes("/types/") ||
    p.startsWith("types/")
  ) {
    return {
      kind: "types",
      label: "Types",
      identified: true,
    };
  }

  // 8. Config
  if (
    fileName.includes(".config.") ||
    fileName.startsWith("tsconfig") ||
    fileName === "middleware.ts" ||
    fileName === "proxy.ts" ||
    fileName.startsWith(".env")
  ) {
    return {
      kind: "config",
      label: "Configuration",
      identified: true,
    };
  }

  // 9. Utilities & Library code
  if (
    p.includes("/utils/") ||
    p.startsWith("utils/") ||
    p.includes("/util/") ||
    p.startsWith("util/") ||
    p.includes("/lib/") ||
    p.startsWith("lib/") ||
    p.includes("/helpers/") ||
    p.startsWith("helpers/") ||
    fileName.endsWith(".util.ts") ||
    fileName.endsWith(".utils.ts")
  ) {
    return {
      kind: "utility",
      label: "Utilities",
      identified: true,
    };
  }

  // 10. Adapters / Parser internals
  if (
    p.includes("/adapters/") ||
    p.startsWith("adapters/") ||
    p.includes("/parser/") ||
    p.startsWith("parser/")
  ) {
    return {
      kind: "adapter",
      label: "Parser / Adapter",
      identified: true,
    };
  }

  // 11. Unidentified module
  return {
    kind: "unidentified",
    label: "Module",
    identified: false,
  };
}

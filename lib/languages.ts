import { python } from "@codemirror/lang-python"
import { php } from "@codemirror/lang-php"
import { javascript } from "@codemirror/lang-javascript"
import type { Extension } from "@codemirror/state"

export type Language = "python" | "php" | "typescript"

export type LanguageConfig = {
  label: string
  version: string
  filename: string
  extension: Extension
  sample: string
}

// version/filename must match the runtimes installed in the Piston container,
// otherwise /api/execute/ rejects the request.
export const LANGUAGE_CONFIG: Record<Language, LanguageConfig> = {
  python: {
    label: "Python",
    version: "3.12.0",
    filename: "main.py",
    extension: python(),
    sample: `# Starter code
prices = [49.99, 12.5, 89.0, 4.75]

# TODO: your code here
`,
  },
  php: {
    label: "PHP",
    version: "8.2.3",
    filename: "main.php",
    extension: php(),
    sample: `<?php

// Starter code
$prices = [49.99, 12.5, 89.0, 4.75];

// TODO: your code here
`,
  },
  typescript: {
    label: "TypeScript",
    version: "5.0.3",
    filename: "main.ts",
    extension: javascript({ typescript: true }),
    sample: `// Starter code
const prices = [49.99, 12.5, 89.0, 4.75]

// TODO: your code here
`,
  },
}

// Derived list for the toolbar dropdown — avoids a second array to keep in sync.
export const LANGUAGE_OPTIONS: { value: Language; label: string }[] = (
  Object.keys(LANGUAGE_CONFIG) as Language[]
).map((key) => ({ value: key, label: LANGUAGE_CONFIG[key].label }))

export const DEFAULT_LANGUAGE: Language = "python"

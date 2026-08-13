"use client"

import dynamic from "next/dynamic"

import { LANGUAGE_CONFIG, type Language } from "@/lib/languages"

// CodeMirror touches the DOM and window on import, so it must load on the
// client only — a server render would throw.
const CodeMirror = dynamic(
  () => import("@uiw/react-codemirror").then((mod) => mod.default),
  { ssr: false }
)

type CodeEditorProps = {
  language: Language
  value: string
  onChange: (value: string) => void
}

export default function CodeEditor({ language, value, onChange }: CodeEditorProps) {
  const config = LANGUAGE_CONFIG[language]

  return (
    <div className="h-full min-h-0 overflow-hidden">
      <CodeMirror
        value={value}
        height="100%"
        theme="dark"
        extensions={[config.extension]}
        onChange={onChange}
        basicSetup={{
          lineNumbers: true,
          indentOnInput: true,
          tabSize: 4,
        }}
        className="h-full text-sm"
      />
    </div>
  )
}

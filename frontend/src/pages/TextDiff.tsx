import { useState, useMemo, useEffect } from "react"
import Editor from "@monaco-editor/react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { FileJson } from "lucide-react"
import { useTheme } from "@/components/theme-provider"

const STORAGE_KEY_LEFT = "textDiff_left"
const STORAGE_KEY_RIGHT = "textDiff_right"
const STORAGE_KEY_JSON_MODE = "textDiff_jsonMode"

type DiffType = "equal" | "added" | "removed" | "modified"

interface DiffLine {
  type: DiffType
  oldLineNumber: number | null
  newLineNumber: number | null
  content: string
}

// Helper function to check if text is valid JSON
function isValidJSON(text: string): boolean {
  if (!text.trim()) return false
  try {
    JSON.parse(text)
    return true
  } catch {
    return false
  }
}

// Recursively sort object keys alphabetically
function sortObjectKeys(obj: any): any {
  if (obj === null || typeof obj !== "object") {
    return obj
  }

  if (Array.isArray(obj)) {
    return obj.map(sortObjectKeys)
  }

  const sorted: any = {}
  const keys = Object.keys(obj).sort()
  for (const key of keys) {
    sorted[key] = sortObjectKeys(obj[key])
  }
  return sorted
}

// Format JSON with sorted keys
function formatJSON(text: string): string {
  try {
    const parsed = JSON.parse(text)
    const sorted = sortObjectKeys(parsed)
    return JSON.stringify(sorted, null, 2)
  } catch {
    return text
  }
}

// LCS-based diff algorithm (correct handling of reordered/distant matching lines)
function computeLineDiff(oldText: string, newText: string): DiffLine[] {
  const oldLines = oldText.split("\n")
  const newLines = newText.split("\n")
  const m = oldLines.length
  const n = newLines.length

  // Build LCS table using dynamic programming
  const lcs: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0))
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (oldLines[i - 1] === newLines[j - 1]) {
        lcs[i][j] = lcs[i - 1][j - 1] + 1
      } else {
        lcs[i][j] = Math.max(lcs[i - 1][j], lcs[i][j - 1])
      }
    }
  }

  // Backtrack the LCS table to produce the diff operations
  type Op = { type: "equal" | "added" | "removed"; content: string }
  const ops: Op[] = []
  let i = m
  let j = n
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && oldLines[i - 1] === newLines[j - 1]) {
      ops.unshift({ type: "equal", content: oldLines[i - 1] })
      i--
      j--
    } else if (j > 0 && (i === 0 || lcs[i][j - 1] >= lcs[i - 1][j])) {
      ops.unshift({ type: "added", content: newLines[j - 1] })
      j--
    } else {
      ops.unshift({ type: "removed", content: oldLines[i - 1] })
      i--
    }
  }

  // Convert to DiffLine with proper line numbers
  const result: DiffLine[] = []
  let oldLineNum = 0
  let newLineNum = 0
  for (const op of ops) {
    if (op.type === "equal") {
      oldLineNum++
      newLineNum++
      result.push({ type: "equal", oldLineNumber: oldLineNum, newLineNumber: newLineNum, content: op.content })
    } else if (op.type === "added") {
      newLineNum++
      result.push({ type: "added", oldLineNumber: null, newLineNumber: newLineNum, content: op.content })
    } else {
      oldLineNum++
      result.push({ type: "removed", oldLineNumber: oldLineNum, newLineNumber: null, content: op.content })
    }
  }

  return result
}

// Extract the JSON key from a line like:  "email": "foo"  →  "email"
function getJsonKey(content: string): string | null {
  const match = content.match(/^\s*"([^"]+)"\s*:/)
  return match ? match[1] : null
}

// Post-process LCS diff to detect same-key JSON field modifications
// Runs of [removed…] immediately followed by [added…] are scanned;
// pairs that share the same JSON key are promoted to type "modified".
function pairModifiedLines(lines: DiffLine[]): DiffLine[] {
  const result: DiffLine[] = []
  let i = 0

  while (i < lines.length) {
    // Collect consecutive removed lines
    const removedBlock: DiffLine[] = []
    while (i < lines.length && lines[i].type === "removed") {
      removedBlock.push(lines[i])
      i++
    }

    // Collect consecutive added lines that directly follow
    const addedBlock: DiffLine[] = []
    while (i < lines.length && lines[i].type === "added") {
      addedBlock.push(lines[i])
      i++
    }

    if (removedBlock.length === 0 && addedBlock.length === 0) {
      // Normal equal line
      result.push(lines[i])
      i++
      continue
    }

    if (removedBlock.length === 0) {
      result.push(...addedBlock)
      continue
    }

    if (addedBlock.length === 0) {
      result.push(...removedBlock)
      continue
    }

    // Try to pair removed ↔ added by matching JSON key
    const usedAddedIdx = new Set<number>()
    const pairMap = new Map<number, number>() // removedIdx → addedIdx

    for (let ri = 0; ri < removedBlock.length; ri++) {
      const key = getJsonKey(removedBlock[ri].content)
      if (!key) continue
      for (let ai = 0; ai < addedBlock.length; ai++) {
        if (usedAddedIdx.has(ai)) continue
        if (getJsonKey(addedBlock[ai].content) === key) {
          pairMap.set(ri, ai)
          usedAddedIdx.add(ai)
          break
        }
      }
    }

    // Emit unmatched removed lines
    for (let ri = 0; ri < removedBlock.length; ri++) {
      if (!pairMap.has(ri)) result.push(removedBlock[ri])
    }

    // Emit matched pairs as modified (old line first, then new line)
    for (const [ri, ai] of pairMap.entries()) {
      result.push({ ...removedBlock[ri], type: "modified" })
      result.push({ ...addedBlock[ai], type: "modified" })
    }

    // Emit unmatched added lines
    for (let ai = 0; ai < addedBlock.length; ai++) {
      if (!usedAddedIdx.has(ai)) result.push(addedBlock[ai])
    }
  }

  return result
}

export default function TextDiff() {
  const { theme } = useTheme()

  const getMonacoTheme = () => {
    if (theme === "system") {
      return window.matchMedia("(prefers-color-scheme: dark)").matches ? "vs-dark" : "vs"
    }
    return theme === "dark" ? "vs-dark" : "vs"
  }

  const [leftText, setLeftText] = useState(() => {
    return localStorage.getItem(STORAGE_KEY_LEFT) || ""
  })

  const [rightText, setRightText] = useState(() => {
    return localStorage.getItem(STORAGE_KEY_RIGHT) || ""
  })

  const [jsonMode, setJsonMode] = useState(() => {
    return localStorage.getItem(STORAGE_KEY_JSON_MODE) === "true"
  })

  const [isComparing, setIsComparing] = useState(false)
  const [viewType, setViewType] = useState<"split" | "unified">("split")
  const [activeTab, setActiveTab] = useState("input")

  // Check if both texts are valid JSON
  const isLeftJSON = useMemo(() => isValidJSON(leftText), [leftText])
  const isRightJSON = useMemo(() => isValidJSON(rightText), [rightText])
  const canUseJsonMode = isLeftJSON && isRightJSON

  // Compute diff
  const diffLines = useMemo(() => {
    if (!isComparing) return []

    const leftToCompare = jsonMode && canUseJsonMode ? formatJSON(leftText) : leftText
    const rightToCompare = jsonMode && canUseJsonMode ? formatJSON(rightText) : rightText

    const raw = computeLineDiff(leftToCompare, rightToCompare)
    return jsonMode && canUseJsonMode ? pairModifiedLines(raw) : raw
  }, [leftText, rightText, isComparing, jsonMode, canUseJsonMode])

  // Calculate statistics
  const stats = useMemo(() => {
    const added = diffLines.filter((l) => l.type === "added").length
    const removed = diffLines.filter((l) => l.type === "removed").length
    const modified = diffLines.filter((l) => l.type === "modified").length / 2 // Modified creates 2 lines
    return { added, removed, modified }
  }, [diffLines])

  // Save to localStorage on change
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_LEFT, leftText)
  }, [leftText])

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_RIGHT, rightText)
  }, [rightText])

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_JSON_MODE, jsonMode.toString())
  }, [jsonMode])

  const getLineStyle = (type: DiffType) => {
    switch (type) {
      case "added":
        return "bg-green-500/10 border-l-4 border-green-500"
      case "removed":
        return "bg-red-500/10 border-l-4 border-red-500"
      case "modified":
        return "bg-yellow-500/10 border-l-4 border-yellow-500"
      default:
        return "bg-background"
    }
  }

  const getLineNumberStyle = (type: DiffType) => {
    switch (type) {
      case "added":
        return "text-green-500"
      case "removed":
        return "text-red-500"
      case "modified":
        return "text-yellow-500"
      default:
        return "text-muted-foreground"
    }
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Text Diff</h1>
          <p className="text-muted-foreground">Compare two texts side by side</p>
        </div>
        {canUseJsonMode && (
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="gap-2">
              <FileJson className="h-4 w-4" />
              JSON detected
            </Badge>
            <Button
              variant={jsonMode ? "default" : "outline"}
              onClick={() => setJsonMode(!jsonMode)}
              className="gap-2"
            >
              <FileJson className="h-4 w-4" />
              JSON mode is {jsonMode ? "ON" : "OFF"}
            </Button>
          </div>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="sr-only">
          <TabsTrigger value="input">Input</TabsTrigger>
          <TabsTrigger value="comparison">Comparison</TabsTrigger>
        </TabsList>

        <TabsContent value="input" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  Original Text
                  {isLeftJSON && (
                    <Badge variant="secondary" className="gap-1">
                      <FileJson className="h-3 w-3" />
                      JSON
                    </Badge>
                  )}
                </CardTitle>
                <CardDescription>Enter or paste the original text</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="border rounded-md overflow-hidden">
                  <Editor
                    height="65vh"
                    defaultLanguage="plaintext"
                    language={isLeftJSON ? "json" : "plaintext"}
                    value={leftText}
                    onChange={(value) => setLeftText(value || "")}
                    theme={getMonacoTheme()}
                    options={{
                      minimap: { enabled: false },
                      lineNumbers: "on",
                      scrollBeyondLastLine: false,
                      wordWrap: "on",
                      automaticLayout: true,
                      fontSize: 14,
                    }}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  Modified Text
                  {isRightJSON && (
                    <Badge variant="secondary" className="gap-1">
                      <FileJson className="h-3 w-3" />
                      JSON
                    </Badge>
                  )}
                </CardTitle>
                <CardDescription>Enter or paste the modified text</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="border rounded-md overflow-hidden">
                  <Editor
                    height="65vh"
                    defaultLanguage="plaintext"
                    language={isRightJSON ? "json" : "plaintext"}
                    value={rightText}
                    onChange={(value) => setRightText(value || "")}
                    theme={getMonacoTheme()}
                    options={{
                      minimap: { enabled: false },
                      lineNumbers: "on",
                      scrollBeyondLastLine: false,
                      wordWrap: "on",
                      automaticLayout: true,
                      fontSize: 14,
                    }}
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="flex justify-center">
            <Button
              onClick={() => {
                setIsComparing(true)
                setActiveTab("comparison")
              }}
              size="lg"
            >
              Compare Texts
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="comparison" className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex gap-2">
              <Badge variant="outline">
                <span className="text-green-500">+{stats.added}</span> added
              </Badge>
              <Badge variant="outline">
                <span className="text-red-500">-{stats.removed}</span> removed
              </Badge>
              <Badge variant="outline">
                <span className="text-yellow-500">~{stats.modified}</span> modified
              </Badge>
              {jsonMode && canUseJsonMode && (
                <Badge variant="secondary" className="gap-1">
                  <FileJson className="h-3 w-3" />
                  JSON mode active
                </Badge>
              )}
            </div>
            <div className="flex gap-2">
              <Button
                variant={viewType === "split" ? "default" : "outline"}
                onClick={() => setViewType("split")}
              >
                Split View
              </Button>
              <Button
                variant={viewType === "unified" ? "default" : "outline"}
                onClick={() => setViewType("unified")}
              >
                Unified View
              </Button>
            </div>
          </div>

          <Card>
            <CardContent className="p-0">
              {viewType === "split" ? (
                <div className="grid grid-cols-2 divide-x">
                  <div>
                    <div className="bg-muted px-4 py-2 font-semibold text-sm">Original</div>
                    <div className="overflow-auto max-h-[70vh]">
                      {diffLines
                        .filter((line) => line.oldLineNumber !== null)
                        .map((line, idx) => (
                          <div key={idx} className={`flex ${getLineStyle(line.type)}`}>
                            <span
                              className={`px-4 py-1 min-w-[60px] text-right text-xs ${getLineNumberStyle(line.type)}`}
                            >
                              {line.oldLineNumber}
                            </span>
                            <span className="px-4 py-1 font-mono text-sm flex-1">{line.content}</span>
                          </div>
                        ))}
                    </div>
                  </div>
                  <div>
                    <div className="bg-muted px-4 py-2 font-semibold text-sm">Modified</div>
                    <div className="overflow-auto max-h-[70vh]">
                      {diffLines
                        .filter((line) => line.newLineNumber !== null)
                        .map((line, idx) => (
                          <div key={idx} className={`flex ${getLineStyle(line.type)}`}>
                            <span
                              className={`px-4 py-1 min-w-[60px] text-right text-xs ${getLineNumberStyle(line.type)}`}
                            >
                              {line.newLineNumber}
                            </span>
                            <span className="px-4 py-1 font-mono text-sm flex-1">{line.content}</span>
                          </div>
                        ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div>
                  <div className="bg-muted px-4 py-2 font-semibold text-sm">Unified Diff</div>
                  <div className="overflow-auto max-h-[70vh]">
                    {diffLines.map((line, idx) => (
                      <div key={idx} className={`flex ${getLineStyle(line.type)}`}>
                        <span
                          className={`px-4 py-1 min-w-[60px] text-right text-xs ${getLineNumberStyle(line.type)}`}
                        >
                          {line.oldLineNumber || ""}
                        </span>
                        <span
                          className={`px-4 py-1 min-w-[60px] text-right text-xs ${getLineNumberStyle(line.type)}`}
                        >
                          {line.newLineNumber || ""}
                        </span>
                        <span className="px-4 py-1 font-mono text-sm flex-1">{line.content}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="flex justify-center">
            <Button
              onClick={() => {
                setIsComparing(false)
                setActiveTab("input")
              }}
              variant="outline"
            >
              Back to Edit
            </Button>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

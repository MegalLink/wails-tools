import { useState, useMemo, useEffect, useCallback } from "react"
import Editor from "@monaco-editor/react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { FileJson, ChevronLeft, ChevronRight, Check, Copy, CheckCheck, GitMerge, AlertCircle } from "lucide-react"
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

// ─── Merge types & helpers ────────────────────────────────────────────────────

type MergeDecision = "left" | "right" | null

interface MergeHunk {
  id: number
  type: "equal" | "conflict"
  // equal hunks
  equalLines: DiffLine[]
  // conflict hunks
  leftLines: DiffLine[]
  rightLines: DiffLine[]
  decision: MergeDecision
}

function buildMergeHunks(diffLines: DiffLine[]): MergeHunk[] {
  const hunks: MergeHunk[] = []
  let i = 0
  let id = 0

  while (i < diffLines.length) {
    const line = diffLines[i]
    if (line.type === "equal") {
      const equalLines: DiffLine[] = []
      while (i < diffLines.length && diffLines[i].type === "equal") {
        equalLines.push(diffLines[i])
        i++
      }
      hunks.push({ id: id++, type: "equal", equalLines, leftLines: [], rightLines: [], decision: null })
    } else {
      // collect consecutive non-equal lines into left (original) and right (modified)
      const leftLines: DiffLine[] = []
      const rightLines: DiffLine[] = []
      while (i < diffLines.length && diffLines[i].type !== "equal") {
        const l = diffLines[i]
        const isLeft = l.type === "removed" || (l.type === "modified" && l.oldLineNumber !== null && l.newLineNumber === null)
        if (isLeft) leftLines.push(l)
        else rightLines.push(l)
        i++
      }
      hunks.push({ id: id++, type: "conflict", equalLines: [], leftLines, rightLines, decision: null })
    }
  }

  return hunks
}

function buildMergedText(hunks: MergeHunk[]): string {
  const lines: string[] = []
  for (const hunk of hunks) {
    if (hunk.type === "equal") {
      lines.push(...hunk.equalLines.map((l) => l.content))
    } else {
      const chosen = hunk.decision === "right" ? hunk.rightLines : hunk.leftLines
      lines.push(...chosen.map((l) => l.content))
    }
  }
  return lines.join("\n")
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
  const [viewType, setViewType] = useState<"split" | "unified" | "merge">("split")
  const [activeTab, setActiveTab] = useState("input")
  const [mergeHunks, setMergeHunks] = useState<MergeHunk[]>([])
  const [copiedMerge, setCopiedMerge] = useState(false)

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

  // Build merge hunks when diff changes
  useEffect(() => {
    setMergeHunks(buildMergeHunks(diffLines))
  }, [diffLines])

  const decideMergeHunk = useCallback((id: number, decision: MergeDecision) => {
    setMergeHunks((prev) =>
      prev.map((h) => (h.id === id ? { ...h, decision } : h))
    )
  }, [])

  const mergedText = useMemo(() => buildMergedText(mergeHunks), [mergeHunks])

  const mergeStats = useMemo(() => {
    const conflicts = mergeHunks.filter((h) => h.type === "conflict")
    const resolved = conflicts.filter((h) => h.decision !== null)
    return { total: conflicts.length, resolved: resolved.length }
  }, [mergeHunks])

  const copyMergedText = useCallback(() => {
    navigator.clipboard.writeText(mergedText).then(() => {
      setCopiedMerge(true)
      setTimeout(() => setCopiedMerge(false), 2000)
    })
  }, [mergedText])

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
              <Button
                variant={viewType === "merge" ? "default" : "outline"}
                className="gap-2"
                onClick={() => setViewType("merge")}
              >
                <GitMerge className="h-4 w-4" />
                Merge
              </Button>
            </div>
          </div>

          <Card>
            <CardContent className="p-0">
              {viewType === "merge" ? (
                <TooltipProvider>
                  <div>
                    {/* Merge toolbar */}
                    <div className="bg-muted px-4 py-2 flex items-center justify-between text-sm border-b">
                      <div className="flex items-center gap-3">
                        <GitMerge className="h-4 w-4" />
                        <span className="font-semibold">Visual Merge</span>
                        <Separator orientation="vertical" className="h-4" />
                        {mergeStats.resolved < mergeStats.total ? (
                          <span className="flex items-center gap-1 text-amber-500">
                            <AlertCircle className="h-3.5 w-3.5" />
                            {mergeStats.resolved}/{mergeStats.total} conflicts resolved
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-green-500">
                            <CheckCheck className="h-3.5 w-3.5" />
                            All {mergeStats.total} conflicts resolved
                          </span>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() =>
                          setMergeHunks((prev) => prev.map((h) => h.type === "conflict" ? { ...h, decision: "left" } : h))
                        }>
                          Accept all ← Original
                        </Button>
                        <Button size="sm" variant="outline" onClick={() =>
                          setMergeHunks((prev) => prev.map((h) => h.type === "conflict" ? { ...h, decision: "right" } : h))
                        }>
                          Accept all Modified →
                        </Button>
                      </div>
                    </div>

                    {/* Hunk list */}
                    <div className="overflow-auto max-h-[50vh]">
                      {mergeHunks.map((hunk) => {
                        if (hunk.type === "equal") {
                          return (
                            <div key={hunk.id}>
                              {hunk.equalLines.map((line, li) => (
                                <div key={li} className="flex bg-background">
                                  <span className="px-4 py-0.5 min-w-[50px] text-right text-xs text-muted-foreground font-mono">
                                    {line.oldLineNumber}
                                  </span>
                                  <span className="px-4 py-0.5 font-mono text-sm flex-1 text-muted-foreground">{line.content}</span>
                                </div>
                              ))}
                            </div>
                          )
                        }

                        // Conflict hunk
                        const isResolved = hunk.decision !== null
                        return (
                          <div
                            key={hunk.id}
                            className={`border-y ${isResolved ? "border-green-500/30" : "border-amber-500/40"}`}
                          >
                            {/* Conflict header */}
                            <div className={`flex items-center justify-between px-4 py-1 text-xs font-semibold ${isResolved ? "bg-green-500/5" : "bg-amber-500/5"}`}>
                              <span className="text-muted-foreground">
                                {isResolved
                                  ? `✓ Resolved — using ${hunk.decision === "left" ? "Original" : "Modified"}`
                                  : "⚡ Conflict — choose a version"}
                              </span>
                              {isResolved && (
                                <Button size="sm" variant="ghost" className="h-5 text-xs px-2 text-muted-foreground" onClick={() => decideMergeHunk(hunk.id, null)}>
                                  Undo
                                </Button>
                              )}
                            </div>

                            {/* Two columns: original | modified */}
                            <div className="grid grid-cols-2 divide-x">
                              {/* LEFT — original */}
                              <div className={`${hunk.decision === "left" ? "bg-green-500/10 ring-2 ring-inset ring-green-500/40" : hunk.decision === "right" ? "opacity-40" : "bg-red-500/5"}`}>
                                <div className="flex items-center justify-between px-3 py-1 text-xs text-red-400 font-medium">
                                  <span>← Original</span>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        size="sm"
                                        variant={hunk.decision === "left" ? "default" : "outline"}
                                        className={`h-6 px-2 text-xs gap-1 ${hunk.decision === "left" ? "bg-green-600 hover:bg-green-700 border-green-600" : ""}`}
                                        onClick={() => decideMergeHunk(hunk.id, hunk.decision === "left" ? null : "left")}
                                      >
                                        {hunk.decision === "left" ? <Check className="h-3 w-3" /> : <ChevronLeft className="h-3 w-3" />}
                                        {hunk.decision === "left" ? "Accepted" : "Accept"}
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Use original version</TooltipContent>
                                  </Tooltip>
                                </div>
                                {hunk.leftLines.map((line, li) => (
                                  <div key={li} className="flex">
                                    <span className="px-3 py-0.5 min-w-[40px] text-right text-xs text-red-500 font-mono">{line.oldLineNumber}</span>
                                    <span className="px-3 py-0.5 font-mono text-sm flex-1 text-red-300">{line.content}</span>
                                  </div>
                                ))}
                                {hunk.leftLines.length === 0 && (
                                  <div className="px-3 py-1 text-xs text-muted-foreground italic">— empty —</div>
                                )}
                              </div>

                              {/* RIGHT — modified */}
                              <div className={`${hunk.decision === "right" ? "bg-green-500/10 ring-2 ring-inset ring-green-500/40" : hunk.decision === "left" ? "opacity-40" : "bg-green-500/5"}`}>
                                <div className="flex items-center justify-between px-3 py-1 text-xs text-green-400 font-medium">
                                  <span>Modified →</span>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        size="sm"
                                        variant={hunk.decision === "right" ? "default" : "outline"}
                                        className={`h-6 px-2 text-xs gap-1 ${hunk.decision === "right" ? "bg-green-600 hover:bg-green-700 border-green-600" : ""}`}
                                        onClick={() => decideMergeHunk(hunk.id, hunk.decision === "right" ? null : "right")}
                                      >
                                        {hunk.decision === "right" ? <Check className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                                        {hunk.decision === "right" ? "Accepted" : "Accept"}
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Use modified version</TooltipContent>
                                  </Tooltip>
                                </div>
                                {hunk.rightLines.map((line, li) => (
                                  <div key={li} className="flex">
                                    <span className="px-3 py-0.5 min-w-[40px] text-right text-xs text-green-500 font-mono">{line.newLineNumber}</span>
                                    <span className="px-3 py-0.5 font-mono text-sm flex-1 text-green-300">{line.content}</span>
                                  </div>
                                ))}
                                {hunk.rightLines.length === 0 && (
                                  <div className="px-3 py-1 text-xs text-muted-foreground italic">— empty —</div>
                                )}
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>

                    {/* Result preview */}
                    <div className="border-t">
                      <div className="flex items-center justify-between px-4 py-2 bg-muted text-sm font-semibold">
                        <span>Merged Result</span>
                        <Button size="sm" variant="outline" className="gap-2" onClick={copyMergedText}>
                          {copiedMerge ? <CheckCheck className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
                          {copiedMerge ? "Copied!" : "Copy"}
                        </Button>
                      </div>
                      <div className="overflow-auto max-h-[25vh] bg-background">
                        {mergedText.split("\n").map((line, idx) => (
                          <div key={idx} className="flex">
                            <span className="px-4 py-0.5 min-w-[50px] text-right text-xs text-muted-foreground font-mono select-none">{idx + 1}</span>
                            <span className="px-4 py-0.5 font-mono text-sm flex-1">{line}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </TooltipProvider>
              ) : viewType === "split" ? (
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

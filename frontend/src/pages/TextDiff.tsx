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

// Custom diff algorithm
function computeLineDiff(oldText: string, newText: string): DiffLine[] {
  const oldLines = oldText.split("\n")
  const newLines = newText.split("\n")
  const result: DiffLine[] = []

  let oldIndex = 0
  let newIndex = 0

  while (oldIndex < oldLines.length || newIndex < newLines.length) {
    const oldLine = oldLines[oldIndex]
    const newLine = newLines[newIndex]

    if (oldIndex >= oldLines.length) {
      // Only new lines remaining
      result.push({
        type: "added",
        oldLineNumber: null,
        newLineNumber: newIndex + 1,
        content: newLine,
      })
      newIndex++
    } else if (newIndex >= newLines.length) {
      // Only old lines remaining
      result.push({
        type: "removed",
        oldLineNumber: oldIndex + 1,
        newLineNumber: null,
        content: oldLine,
      })
      oldIndex++
    } else if (oldLine === newLine) {
      // Lines are equal
      result.push({
        type: "equal",
        oldLineNumber: oldIndex + 1,
        newLineNumber: newIndex + 1,
        content: oldLine,
      })
      oldIndex++
      newIndex++
    } else {
      // Lines are different - check if this is a modification or add/remove
      let foundMatch = false

      // Look ahead in new lines to see if old line appears later
      for (let i = 1; i < Math.min(5, newLines.length - newIndex); i++) {
        if (oldLine === newLines[newIndex + i]) {
          // Old line appears later in new - current new lines are added
          for (let j = 0; j < i; j++) {
            result.push({
              type: "added",
              oldLineNumber: null,
              newLineNumber: newIndex + 1,
              content: newLines[newIndex],
            })
            newIndex++
          }
          foundMatch = true
          break
        }
      }

      if (!foundMatch) {
        // Look ahead in old lines to see if new line appears later
        for (let i = 1; i < Math.min(5, oldLines.length - oldIndex); i++) {
          if (newLine === oldLines[oldIndex + i]) {
            // New line appears later in old - current old lines are removed
            for (let j = 0; j < i; j++) {
              result.push({
                type: "removed",
                oldLineNumber: oldIndex + 1,
                newLineNumber: null,
                content: oldLines[oldIndex],
              })
              oldIndex++
            }
            foundMatch = true
            break
          }
        }
      }

      if (!foundMatch) {
        // No match found - mark as modified
        result.push({
          type: "modified",
          oldLineNumber: oldIndex + 1,
          newLineNumber: newIndex + 1,
          content: oldLine,
        })
        result.push({
          type: "modified",
          oldLineNumber: null,
          newLineNumber: newIndex + 1,
          content: newLine,
        })
        oldIndex++
        newIndex++
      }
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
    
    return computeLineDiff(leftToCompare, rightToCompare)
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
              JSON mode {jsonMode ? "ON" : "OFF"}
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
                    height="400px"
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
                    height="400px"
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
                    <div className="overflow-auto max-h-[600px]">
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
                    <div className="overflow-auto max-h-[600px]">
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
                  <div className="overflow-auto max-h-[600px]">
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

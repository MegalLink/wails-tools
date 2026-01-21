import { useState, useEffect } from "react"
import Editor from "@monaco-editor/react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, RefreshCw, GitCompareArrows, X } from "lucide-react"
import { useTheme } from "@/components/theme-provider"
import * as Diff from "diff"

const STORAGE_KEY_LEFT = "textDiff_leftText"
const STORAGE_KEY_RIGHT = "textDiff_rightText"
const STORAGE_KEY_MERGE = "textDiff_mergeText"

interface DiffBlock {
  lineNumber: number
  type: "added" | "removed" | "conflict" | "unchanged"
  leftContent: string
  rightContent: string
  resolved: boolean
  acceptedSide: "left" | "right" | "none" | "both"
}

export default function TextDiff() {
  const { theme } = useTheme()
  const [leftText, setLeftText] = useState(() => {
    return localStorage.getItem(STORAGE_KEY_LEFT) || ""
  })
  const [rightText, setRightText] = useState(() => {
    return localStorage.getItem(STORAGE_KEY_RIGHT) || ""
  })
  const [mergeText, setMergeText] = useState(() => {
    return localStorage.getItem(STORAGE_KEY_MERGE) || ""
  })
  const [isComparing, setIsComparing] = useState(false)
  const [diffBlocks, setDiffBlocks] = useState<DiffBlock[]>([])
  const [inputMode, setInputMode] = useState<"plaintext" | "json">("plaintext")

  const getMonacoTheme = () => {
    if (theme === "system") {
      return window.matchMedia("(prefers-color-scheme: dark)").matches ? "vs-dark" : "vs"
    }
    return theme === "dark" ? "vs-dark" : "vs"
  }

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_LEFT, leftText)
  }, [leftText])

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_RIGHT, rightText)
  }, [rightText])

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_MERGE, mergeText)
  }, [mergeText])

  const computeDiff = () => {
    const leftLines = leftText.split("\n")
    const rightLines = rightText.split("\n")
    const diff = Diff.diffLines(leftText, rightText)
    const blocks: DiffBlock[] = []
    
    let leftIndex = 0
    let rightIndex = 0

    diff.forEach((part) => {
      const lines = part.value.split("\n").filter((l, i, arr) => {
        // Keep empty lines except the last one if it's empty
        return i < arr.length - 1 || l !== ""
      })

      lines.forEach((line) => {
        if (!part.added && !part.removed) {
          // Unchanged line
          blocks.push({
            lineNumber: blocks.length + 1,
            type: "unchanged",
            leftContent: line,
            rightContent: line,
            resolved: true,
            acceptedSide: "both",
          })
          leftIndex++
          rightIndex++
        } else if (part.added) {
          // Line added in right
          blocks.push({
            lineNumber: blocks.length + 1,
            type: "added",
            leftContent: "",
            rightContent: line,
            resolved: false,
            acceptedSide: "none",
          })
          rightIndex++
        } else if (part.removed) {
          // Line removed from left
          blocks.push({
            lineNumber: blocks.length + 1,
            type: "removed",
            leftContent: line,
            rightContent: "",
            resolved: false,
            acceptedSide: "none",
          })
          leftIndex++
        }
      })
    })

    // Detect conflicts: consecutive removed + added = conflict
    for (let i = 0; i < blocks.length - 1; i++) {
      const current = blocks[i]
      const next = blocks[i + 1]
      
      if (current.type === "removed" && next.type === "added") {
        // This is a conflict - same line modified on both sides
        current.type = "conflict"
        next.type = "conflict"
      }
    }

    setDiffBlocks(blocks)
    rebuildMergeText(blocks)
  }

  const rebuildMergeText = (blocks: DiffBlock[]) => {
    const mergedLines: string[] = []
    
    blocks.forEach((block) => {
      if (block.acceptedSide === "both") {
        mergedLines.push(block.leftContent || block.rightContent)
      } else if (block.acceptedSide === "left" && block.leftContent) {
        mergedLines.push(block.leftContent)
      } else if (block.acceptedSide === "right" && block.rightContent) {
        mergedLines.push(block.rightContent)
      }
      // "none" means skip this line
    })
    
    setMergeText(mergedLines.join("\n"))
  }

  const handleCompare = () => {
    computeDiff()
    setIsComparing(true)
  }

  const handleAcceptLeft = (blockIndex: number) => {
    const updatedBlocks = diffBlocks.map((b, i) =>
      i === blockIndex ? { ...b, resolved: true, acceptedSide: "left" as const } : b
    )
    setDiffBlocks(updatedBlocks)
    rebuildMergeText(updatedBlocks)
  }

  const handleAcceptRight = (blockIndex: number) => {
    const updatedBlocks = diffBlocks.map((b, i) =>
      i === blockIndex ? { ...b, resolved: true, acceptedSide: "right" as const } : b
    )
    setDiffBlocks(updatedBlocks)
    rebuildMergeText(updatedBlocks)
  }

  const handleRejectLeft = (blockIndex: number) => {
    const updatedBlocks = diffBlocks.map((b, i) =>
      i === blockIndex ? { ...b, resolved: true, acceptedSide: "none" as const } : b
    )
    setDiffBlocks(updatedBlocks)
    rebuildMergeText(updatedBlocks)
  }

  const handleRejectRight = (blockIndex: number) => {
    const updatedBlocks = diffBlocks.map((b, i) =>
      i === blockIndex ? { ...b, resolved: true, acceptedSide: "none" as const } : b
    )
    setDiffBlocks(updatedBlocks)
    rebuildMergeText(updatedBlocks)
  }

  const handleClear = () => {
    setLeftText("")
    setRightText("")
    setMergeText("")
    setIsComparing(false)
    setDiffBlocks([])
  }

  const handleReset = () => {
    setIsComparing(false)
    setMergeText("")
    setDiffBlocks([])
  }

  const unresolvedConflicts = diffBlocks.filter((b) => !b.resolved && b.type !== "unchanged").length

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Text Diff & Merge</h2>
          <p className="text-muted-foreground">Compare and merge text with git-style diff</p>
        </div>
        <div className="flex items-center gap-2">
          {isComparing && unresolvedConflicts > 0 && (
            <Badge variant="destructive">{unresolvedConflicts} conflicts remaining</Badge>
          )}
          <Badge variant="outline">Changes persist in browser</Badge>
          <Button variant="outline" size="sm" onClick={handleClear}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Clear All
          </Button>
        </div>
      </div>

      {!isComparing ? (
        <>
          <Tabs value={inputMode} onValueChange={(v) => setInputMode(v as typeof inputMode)}>
            <TabsList>
              <TabsTrigger value="plaintext">Plain Text</TabsTrigger>
              <TabsTrigger value="json">JSON</TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Original Text (Left)</CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={leftText}
                  onChange={(e) => setLeftText(e.target.value)}
                  placeholder="Enter original text here..."
                  className="min-h-[400px] font-mono text-sm"
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Modified Text (Right)</CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={rightText}
                  onChange={(e) => setRightText(e.target.value)}
                  placeholder="Enter modified text here..."
                  className="min-h-[400px] font-mono text-sm"
                />
              </CardContent>
            </Card>
          </div>

          <div className="flex justify-center">
            <Button
              size="lg"
              onClick={handleCompare}
              disabled={!leftText || !rightText}
            >
              <GitCompareArrows className="h-4 w-4 mr-2" />
              Compare Texts
            </Button>
          </div>
        </>
      ) : (
        <>
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">3-Panel Merge View</h3>
            <Button variant="outline" size="sm" onClick={handleReset}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Back to Edit
            </Button>
          </div>

          <div className="grid grid-cols-3 gap-4">
            {/* Left Panel - Original */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full bg-blue-500"></span>
                  Original (Left)
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <ScrollArea className="h-[500px]">
                  <div className="p-2 pr-14 font-mono text-xs">
                    {diffBlocks.map((block, index) => {
                      const getBgClass = () => {
                        if (block.type === "unchanged") return ""
                        return "bg-red-50 dark:bg-red-950/20 border-l-2 border-red-500"
                      }

                      return (
                        <div
                          key={index}
                          className={`relative flex items-start gap-2 py-0.5 px-1 min-h-[20px] ${getBgClass()}`}
                        >
                          <span className="text-muted-foreground w-8 text-right shrink-0 text-[10px]">
                            {block.leftContent ? index + 1 : ""}
                          </span>
                          <span className="flex-1">
                            {block.leftContent || (
                              <span className="text-muted-foreground/30">·</span>
                            )}
                          </span>
                          
                          {/* Buttons on the right */}
                          {block.type !== "unchanged" && !block.resolved && block.leftContent && (
                            <div className="absolute right-1 top-0.5 flex gap-0.5">
                              <button
                                onClick={() => handleRejectLeft(index)}
                                className="p-0.5 hover:bg-red-500/20 rounded transition-colors bg-background border border-border shadow-sm"
                                title="Reject"
                              >
                                <X className="h-3.5 w-3.5 text-red-600 dark:text-red-400" />
                              </button>
                              <button
                                onClick={() => handleAcceptLeft(index)}
                                className="p-0.5 hover:bg-blue-500/20 rounded transition-colors bg-background border border-border shadow-sm"
                                title="Accept to center"
                              >
                                <ChevronsRight className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                              </button>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>

            {/* Center Panel - Merge Result */}
            <Card className="border-2 border-primary">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <span className="h-3 w-3 rounded-full bg-green-500"></span>
                    Merge Result (Center)
                  </span>
                  {unresolvedConflicts === 0 && diffBlocks.length > 0 && (
                    <Badge variant="default" className="text-xs">Resolved ✓</Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <ScrollArea className="h-[500px]">
                  <div className="p-2">
                    {diffBlocks.map((block, index) => {
                      const getBlockStyle = () => {
                        if (block.type === "unchanged") {
                          return "bg-transparent border-transparent"
                        } else {
                          return block.resolved 
                            ? "bg-muted/50 border-transparent" 
                            : "bg-red-50 dark:bg-red-950/20 border-l-2 border-red-500"
                        }
                      }

                      return (
                        <div
                          key={index}
                          className={`relative flex items-center gap-1 py-0.5 px-1 text-xs font-mono ${getBlockStyle()}`}
                        >
                          {/* Left chevrons */}
                          {block.type !== "unchanged" && !block.resolved && block.leftContent && (
                            <div className="flex gap-0.5 absolute left-0 -translate-x-full pr-1">
                              <button
                                onClick={() => handleAcceptLeft(index)}
                                className="p-0.5 hover:bg-blue-500/20 rounded transition-colors"
                                title="Accept from left"
                              >
                                <ChevronsRight className="h-3 w-3 text-blue-600 dark:text-blue-400" />
                              </button>
                              <button
                                onClick={() => handleRejectLeft(index)}
                                className="p-0.5 hover:bg-red-500/20 rounded transition-colors"
                                title="Reject"
                              >
                                <X className="h-3 w-3 text-muted-foreground hover:text-red-600" />
                              </button>
                            </div>
                          )}

                          {/* Content */}
                          <div className="flex-1 flex items-center gap-2 min-h-[20px]">
                            <span className="text-muted-foreground w-8 text-right shrink-0 text-[10px]">
                              {index + 1}
                            </span>
                            <span className="flex-1">
                              {block.resolved ? (
                                <>
                                  {block.acceptedSide === "both" && (
                                    <span>{block.leftContent || block.rightContent}</span>
                                  )}
                                  {block.acceptedSide === "left" && block.leftContent && (
                                    <span>{block.leftContent}</span>
                                  )}
                                  {block.acceptedSide === "right" && block.rightContent && (
                                    <span>{block.rightContent}</span>
                                  )}
                                  {block.acceptedSide === "none" && (
                                    <span className="text-muted-foreground/30">·</span>
                                  )}
                                </>
                              ) : (
                                <span className="text-muted-foreground/30">·</span>
                              )}
                            </span>
                          </div>

                          {/* Right chevrons */}
                          {block.type !== "unchanged" && !block.resolved && block.rightContent && (
                            <div className="flex gap-0.5 absolute right-0 translate-x-full pl-1">
                              <button
                                onClick={() => handleRejectRight(index)}
                                className="p-0.5 hover:bg-red-500/20 rounded transition-colors"
                                title="Reject"
                              >
                                <X className="h-3 w-3 text-muted-foreground hover:text-red-600" />
                              </button>
                              <button
                                onClick={() => handleAcceptRight(index)}
                                className="p-0.5 hover:bg-green-500/20 rounded transition-colors"
                                title="Accept from right"
                              >
                                <ChevronsLeft className="h-3 w-3 text-green-600 dark:text-green-400" />
                              </button>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>

            {/* Right Panel - Modified */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full bg-green-500"></span>
                  Modified (Right)
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <ScrollArea className="h-[500px]">
                  <div className="p-2 pl-2 font-mono text-xs">
                    {diffBlocks.map((block, index) => {
                      const getBgClass = () => {
                        if (block.type === "unchanged") return ""
                        return "bg-red-50 dark:bg-red-950/20 border-l-2 border-red-500"
                      }

                      return (
                        <div
                          key={index}
                          className={`relative flex items-start gap-2 py-0.5 px-1 min-h-[20px] ${getBgClass()}`}
                        >
                          {/* Buttons on the left - fixed position */}
                          <div className="w-8 shrink-0 flex items-center justify-start gap-0.5">
                            {block.type !== "unchanged" && !block.resolved && block.rightContent && (
                              <>
                                <button
                                  onClick={() => handleAcceptRight(index)}
                                  className="p-0.5 hover:bg-green-500/20 rounded transition-colors bg-background border border-border shadow-sm"
                                  title="Accept to center"
                                >
                                  <ChevronsLeft className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />
                                </button>
                                <button
                                  onClick={() => handleRejectRight(index)}
                                  className="p-0.5 hover:bg-red-500/20 rounded transition-colors bg-background border border-border shadow-sm"
                                  title="Reject"
                                >
                                  <X className="h-3.5 w-3.5 text-red-600 dark:text-red-400" />
                                </button>
                              </>
                            )}
                          </div>
                          
                          <span className="text-muted-foreground w-8 text-right shrink-0 text-[10px]">
                            {block.rightContent ? index + 1 : ""}
                          </span>
                          <span className="flex-1">
                            {block.rightContent || (
                              <span className="text-muted-foreground/30">·</span>
                            )}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Final Merged Result</CardTitle>
            </CardHeader>
            <CardContent>
              <Editor
                height="200px"
                language={inputMode === "json" ? "json" : "plaintext"}
                value={mergeText}
                onChange={(value) => setMergeText(value || "")}
                theme={getMonacoTheme()}
                options={{
                  minimap: { enabled: false },
                  fontSize: 13,
                  lineNumbers: "on",
                  scrollBeyondLastLine: false,
                }}
              />
              <div className="flex justify-end gap-2 mt-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    navigator.clipboard.writeText(mergeText)
                  }}
                >
                  Copy to Clipboard
                </Button>
                <Button
                  onClick={() => {
                    const blob = new Blob([mergeText], { type: "text/plain" })
                    const url = URL.createObjectURL(blob)
                    const a = document.createElement("a")
                    a.href = url
                    a.download = "merged-result.txt"
                    a.click()
                    URL.revokeObjectURL(url)
                  }}
                >
                  Download Result
                </Button>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}

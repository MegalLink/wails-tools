import { useState, useEffect } from "react"
import Editor from "@monaco-editor/react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useTheme } from "@/components/theme-provider"
import { 
  Copy, 
  Download, 
  Upload, 
  Trash2, 
  FileCode,
  Maximize2,
  Minimize2,
  ZoomIn,
  ZoomOut
} from "lucide-react"

const STORAGE_KEY = "codeEditor_content"
const STORAGE_LANGUAGE_KEY = "codeEditor_language"
const STORAGE_FONTSIZE_KEY = "codeEditor_fontSize"

const LANGUAGES = [
  { value: "javascript", label: "JavaScript" },
  { value: "typescript", label: "TypeScript" },
  { value: "python", label: "Python" },
  { value: "java", label: "Java" },
  { value: "csharp", label: "C#" },
  { value: "cpp", label: "C++" },
  { value: "c", label: "C" },
  { value: "go", label: "Go" },
  { value: "rust", label: "Rust" },
  { value: "php", label: "PHP" },
  { value: "ruby", label: "Ruby" },
  { value: "swift", label: "Swift" },
  { value: "kotlin", label: "Kotlin" },
  { value: "json", label: "JSON" },
  { value: "html", label: "HTML" },
  { value: "css", label: "CSS" },
  { value: "scss", label: "SCSS" },
  { value: "xml", label: "XML" },
  { value: "yaml", label: "YAML" },
  { value: "markdown", label: "Markdown" },
  { value: "sql", label: "SQL" },
  { value: "shell", label: "Shell" },
  { value: "dockerfile", label: "Dockerfile" },
  { value: "plaintext", label: "Plain Text" },
]

export default function CodeEditor() {
  const { theme } = useTheme()
  const [code, setCode] = useState(() => {
    return localStorage.getItem(STORAGE_KEY) || "// Start coding here...\n"
  })
  const [language, setLanguage] = useState(() => {
    return localStorage.getItem(STORAGE_LANGUAGE_KEY) || "javascript"
  })
  const [fontSize, setFontSize] = useState(() => {
    return parseInt(localStorage.getItem(STORAGE_FONTSIZE_KEY) || "14")
  })
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [selectedCharCount, setSelectedCharCount] = useState(0)

  const getMonacoTheme = () => {
    if (theme === "system") {
      return window.matchMedia("(prefers-color-scheme: dark)").matches ? "vs-dark" : "vs"
    }
    return theme === "dark" ? "vs-dark" : "vs"
  }

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, code)
  }, [code])

  useEffect(() => {
    localStorage.setItem(STORAGE_LANGUAGE_KEY, language)
  }, [language])

  useEffect(() => {
    localStorage.setItem(STORAGE_FONTSIZE_KEY, fontSize.toString())
  }, [fontSize])

  const handleZoomIn = () => {
    setFontSize(prev => Math.min(prev + 2, 32))
  }

  const handleZoomOut = () => {
    setFontSize(prev => Math.max(prev - 2, 10))
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(code)
  }

  const handleClear = () => {
    setCode("")
  }

  const handleDownload = () => {
    const extension = LANGUAGES.find(l => l.value === language)?.value || "txt"
    const blob = new Blob([code], { type: "text/plain" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `code.${extension}`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const handleUpload = () => {
    const input = document.createElement("input")
    input.type = "file"
    input.accept = ".txt,.js,.ts,.py,.java,.cs,.cpp,.c,.go,.rs,.php,.rb,.swift,.kt,.json,.html,.css,.scss,.xml,.yaml,.yml,.md,.sql,.sh,.dockerfile"
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (file) {
        const reader = new FileReader()
        reader.onload = (e) => {
          const content = e.target?.result as string
          setCode(content)
          
          // Auto-detect language from file extension
          const ext = file.name.split('.').pop()?.toLowerCase()
          const langMap: Record<string, string> = {
            'js': 'javascript',
            'ts': 'typescript',
            'py': 'python',
            'java': 'java',
            'cs': 'csharp',
            'cpp': 'cpp',
            'c': 'c',
            'go': 'go',
            'rs': 'rust',
            'php': 'php',
            'rb': 'ruby',
            'swift': 'swift',
            'kt': 'kotlin',
            'json': 'json',
            'html': 'html',
            'css': 'css',
            'scss': 'scss',
            'xml': 'xml',
            'yaml': 'yaml',
            'yml': 'yaml',
            'md': 'markdown',
            'sql': 'sql',
            'sh': 'shell',
          }
          if (ext && langMap[ext]) {
            setLanguage(langMap[ext])
          }
        }
        reader.readAsText(file)
      }
    }
    input.click()
  }

  const editorHeight = isFullscreen ? "calc(100vh - 200px)" : "600px"

  return (
    <div className="container mx-auto p-6 max-w-7xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Code Editor</h1>
          <p className="text-muted-foreground">Full-featured code editor with syntax highlighting</p>
        </div>
        <Badge variant="outline" className="gap-2">
          <FileCode className="h-4 w-4" />
          {LANGUAGES.find(l => l.value === language)?.label}
        </Badge>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Editor</CardTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleZoomOut}
                title="Zoom Out"
              >
                <ZoomOut className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleZoomIn}
                title="Zoom In"
              >
                <ZoomIn className="h-4 w-4" />
              </Button>
              <div className="h-6 w-px bg-border mx-1" />
              <Button
                variant="outline"
                size="sm"
                onClick={handleUpload}
              >
                <Upload className="h-4 w-4 mr-2" />
                Open File
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownload}
              >
                <Download className="h-4 w-4 mr-2" />
                Download
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopy}
              >
                <Copy className="h-4 w-4 mr-2" />
                Copy
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleClear}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Clear
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsFullscreen(!isFullscreen)}
              >
                {isFullscreen ? (
                  <Minimize2 className="h-4 w-4" />
                ) : (
                  <Maximize2 className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="border rounded-md overflow-hidden">
            <Editor
              height={editorHeight}
              language={language}
              value={code}
              onChange={(value) => setCode(value || "")}
              onMount={(editor) => {
                editor.onDidChangeCursorSelection(() => {
                  const selection = editor.getSelection()
                  if (selection) {
                    const model = editor.getModel()
                    if (model) {
                      const selectedText = model.getValueInRange(selection)
                      setSelectedCharCount(selectedText.length)
                    }
                  }
                })
              }}
              theme={getMonacoTheme()}
              options={{
                fontSize: fontSize,
                minimap: { enabled: true },
                lineNumbers: "on",
                scrollBeyondLastLine: false,
                wordWrap: "on",
                automaticLayout: true,
                tabSize: 2,
                formatOnPaste: true,
                formatOnType: true,
                renderWhitespace: "selection",
                bracketPairColorization: {
                  enabled: true,
                },
                suggest: {
                  showKeywords: true,
                  showSnippets: true,
                },
              }}
            />
          </div>

          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Lines: {code.split('\n').length}</span>
            <span>Characters: {code.length}</span>
            <span>Words: {code.split(/\s+/).filter(w => w.length > 0).length}</span>
            {selectedCharCount > 0 && (
              <>
                <span className="text-primary font-medium">Selected: {selectedCharCount}</span>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

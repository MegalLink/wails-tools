import { useState, useEffect } from "react"
import Editor from "@monaco-editor/react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Separator } from "@/components/ui/separator"
import { 
  Check, 
  X, 
  Copy, 
  Minimize2, 
  Maximize2, 
  ArrowDownAZ,
  Wrench,
  FileCode,
  FileJson
} from "lucide-react"
import { useTheme } from "@/components/theme-provider"

const STORAGE_KEY = "jsonUtils_text"

export default function JsonUtils() {
  const { theme } = useTheme()
  const [jsonText, setJsonText] = useState(() => {
    return localStorage.getItem(STORAGE_KEY) || ""
  })
  const [validationError, setValidationError] = useState<{
    message: string
    line?: number
    column?: number
  } | null>(null)
  const [isValid, setIsValid] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const [isJsonString, setIsJsonString] = useState(false)

  const getMonacoTheme = () => {
    if (theme === "system") {
      return window.matchMedia("(prefers-color-scheme: dark)").matches ? "vs-dark" : "vs"
    }
    return theme === "dark" ? "vs-dark" : "vs"
  }

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, jsonText)
    
    // Auto-detect if it's a JSON string
    const trimmed = jsonText.trim()
    if (trimmed.startsWith('"') && trimmed.endsWith('"') && trimmed.includes('\\"')) {
      setIsJsonString(true)
      setIsValid(false)
    } else {
      setIsJsonString(false)
    }
  }, [jsonText])

  const validateJson = () => {
    setShowSuccess(false)
    setValidationError(null)
    setIsValid(false)

    if (!jsonText.trim()) {
      setValidationError({ message: "JSON is empty" })
      return
    }

    // Check if it's a JSON string (escaped JSON)
    const trimmed = jsonText.trim()
    if (trimmed.startsWith('"') && trimmed.endsWith('"') && trimmed.includes('\\"')) {
      setValidationError({ 
        message: "This appears to be a JSON string. Use 'From String' to convert it." 
      })
      return
    }

    try {
      JSON.parse(jsonText)
      setIsValid(true)
      setShowSuccess(true)
      setTimeout(() => setShowSuccess(false), 3000)
    } catch (error) {
      if (error instanceof SyntaxError) {
        // Extract line and column from error message
        const match = error.message.match(/position (\d+)/)
        let line: number | undefined
        let column: number | undefined

        if (match) {
          const position = parseInt(match[1])
          const lines = jsonText.substring(0, position).split("\n")
          line = lines.length
          column = lines[lines.length - 1].length + 1
        }

        setValidationError({
          message: error.message,
          line,
          column,
        })
      } else {
        setValidationError({ message: "Unknown error occurred" })
      }
      setIsValid(false)
    }
  }

  const tryFix = () => {
    try {
      let textToFix = jsonText
      let wasJsonString = false

      // Check if it's a JSON string first
      const trimmed = jsonText.trim()
      if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
        try {
          // Try to decode the JSON string
          textToFix = JSON.parse(jsonText)
          wasJsonString = true
        } catch {
          // If decoding fails, try to fix the string format first
          textToFix = jsonText
        }
      }

      // Try common fixes
      let fixed = textToFix
        .replace(/'/g, '"') // Replace single quotes with double quotes
        .replace(/,(\s*[}\]])/g, '$1') // Remove trailing commas
        .replace(/([{,]\s*)(\w+):/g, '$1"$2":') // Quote unquoted keys
        .replace(/("[^"]*")(\s*)("[^"]*")/g, '$1:$3') // Fix missing colons between strings
      
      // Try to parse to verify it's valid
      const parsed = JSON.parse(fixed)
      
      // If it was a JSON string, encode it back
      if (wasJsonString) {
        const minified = JSON.stringify(parsed)
        const asString = JSON.stringify(minified)
        setJsonText(asString)
        setIsJsonString(true)
        setIsValid(false)
      } else {
        setJsonText(JSON.stringify(parsed, null, 2))
        setIsValid(true)
        setIsJsonString(false)
      }
      
      setValidationError(null)
      setShowSuccess(true)
      setTimeout(() => setShowSuccess(false), 3000)
    } catch (error) {
      setValidationError({
        message: "Auto-fix failed. Please fix manually.",
      })
    }
  }

  const prettify = () => {
    try {
      const parsed = JSON.parse(jsonText)
      const formatted = JSON.stringify(parsed, null, 2)
      setJsonText(formatted)
    } catch (error) {
      // Validation should catch this
    }
  }

  const minify = () => {
    try {
      const parsed = JSON.parse(jsonText)
      const minified = JSON.stringify(parsed)
      setJsonText(minified)
    } catch (error) {
      // Validation should catch this
    }
  }

  const sortKeysRecursive = (obj: any): any => {
    if (Array.isArray(obj)) {
      return obj.map(sortKeysRecursive)
    } else if (obj !== null && typeof obj === 'object') {
      return Object.keys(obj)
        .sort()
        .reduce((result: any, key) => {
          result[key] = sortKeysRecursive(obj[key])
          return result
        }, {})
    }
    return obj
  }

  const sortAllKeys = () => {
    try {
      const parsed = JSON.parse(jsonText)
      const sorted = sortKeysRecursive(parsed)
      const formatted = JSON.stringify(sorted, null, 2)
      setJsonText(formatted)
    } catch (error) {
      // Validation should catch this
    }
  }

  const copyToClipboard = () => {
    navigator.clipboard.writeText(jsonText)
  }

  const jsonToString = () => {
    try {
      const parsed = JSON.parse(jsonText)
      // First minify, then convert to escaped string
      const minified = JSON.stringify(parsed)
      // Wrap in quotes and escape
      const asString = JSON.stringify(minified)
      setJsonText(asString)
      setIsJsonString(true)
      setIsValid(false)
    } catch (error) {
      // Validation should catch this
    }
  }

  const stringToJson = () => {
    try {
      // First, parse the outer string to get the escaped JSON
      const unescaped = JSON.parse(jsonText)
      
      // Now try to parse the inner JSON
      try {
        const parsed = JSON.parse(unescaped)
        const formatted = JSON.stringify(parsed, null, 2)
        setJsonText(formatted)
        setIsValid(true)
        setIsJsonString(false)
        setValidationError(null)
        setShowSuccess(true)
        setTimeout(() => setShowSuccess(false), 3000)
      } catch (innerError) {
        // The string was decoded successfully, but the JSON inside is invalid
        // Show the decoded JSON with error location
        if (innerError instanceof SyntaxError) {
          const match = innerError.message.match(/position (\d+)/)
          let line: number | undefined
          let column: number | undefined

          if (match) {
            const position = parseInt(match[1])
            const lines = unescaped.substring(0, position).split("\n")
            line = lines.length
            column = lines[lines.length - 1].length + 1
          }

          // Show the unescaped JSON so user can see the error
          setJsonText(unescaped)
          setIsJsonString(false)
          setIsValid(false)
          setValidationError({
            message: `JSON syntax error: ${innerError.message}`,
            line,
            column,
          })
        } else {
          setValidationError({
            message: "Cannot parse the decoded JSON string."
          })
        }
      }
    } catch (outerError) {
      // Failed to parse the outer string itself
      setValidationError({
        message: "Cannot decode the string. It's not a valid JSON string format."
      })
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">JSON Utils</h2>
          <p className="text-muted-foreground">Validate, format, and manipulate JSON</p>
        </div>
        <Badge variant="outline">Auto-saved</Badge>
      </div>

      {validationError && (
        <Alert variant="destructive">
          <X className="h-4 w-4" />
          <AlertDescription>
            <div className="font-semibold">Validation Error</div>
            <div className="text-sm mt-1">{validationError.message}</div>
            {validationError.line && (
              <div className="text-sm mt-1">
                Line {validationError.line}
                {validationError.column && `, Column ${validationError.column}`}
              </div>
            )}
          </AlertDescription>
        </Alert>
      )}

      {showSuccess && (
        <Alert className="border-green-500 bg-green-50 dark:bg-green-950">
          <Check className="h-4 w-4 text-green-600 dark:text-green-400" />
          <AlertDescription className="text-green-600 dark:text-green-400">
            ✓ JSON is valid!
          </AlertDescription>
        </Alert>
      )}

      <div className="flex items-center gap-2">
        <Button onClick={validateJson}>
          <Check className="h-4 w-4 mr-2" />
          Validate
        </Button>

        {validationError && (
          <Button variant="outline" onClick={tryFix}>
            <Wrench className="h-4 w-4 mr-2" />
            Try Fix
          </Button>
        )}

        {isValid && (
          <>
            <Separator orientation="vertical" className="h-6" />
            <Button variant="outline" onClick={prettify}>
              <Maximize2 className="h-4 w-4 mr-2" />
              Prettify
            </Button>
            <Button variant="outline" onClick={minify}>
              <Minimize2 className="h-4 w-4 mr-2" />
              Minify
            </Button>
            <Button variant="outline" onClick={sortAllKeys}>
              <ArrowDownAZ className="h-4 w-4 mr-2" />
              Sort Keys
            </Button>
            <Separator orientation="vertical" className="h-6" />
            <Button variant="outline" onClick={jsonToString}>
              <FileCode className="h-4 w-4 mr-2" />
              To String
            </Button>
            <Separator orientation="vertical" className="h-6" />
            <Button variant="outline" onClick={copyToClipboard}>
              <Copy className="h-4 w-4 mr-2" />
              Copy
            </Button>
          </>
        )}

        {isJsonString && (
          <>
            <Separator orientation="vertical" className="h-6" />
            <Button variant="outline" onClick={stringToJson}>
              <FileJson className="h-4 w-4 mr-2" />
              From String
            </Button>
            <Separator orientation="vertical" className="h-6" />
            <Button variant="outline" onClick={copyToClipboard}>
              <Copy className="h-4 w-4 mr-2" />
              Copy
            </Button>
          </>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">JSON Editor</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Editor
            height="600px"
            language="json"
            value={jsonText}
            onChange={(value) => setJsonText(value || "")}
            theme={getMonacoTheme()}
            options={{
              minimap: { enabled: false },
              fontSize: 14,
              lineNumbers: "on",
              scrollBeyondLastLine: false,
              automaticLayout: true,
              tabSize: 2,
              wordWrap: "on",
              formatOnPaste: true,
              formatOnType: true,
            }}
          />
        </CardContent>
      </Card>
    </div>
  )
}

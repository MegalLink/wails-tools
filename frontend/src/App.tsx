import { BrowserRouter, Routes, Route } from "react-router-dom"
import { ThemeProvider } from "@/components/theme-provider"
import { AppLayout } from "@/components/layout/AppLayout"
import Home from "@/pages/Home"
import TextDiff from "@/pages/TextDiff"
import JsonUtils from "@/pages/JsonUtils"
import EpochTools from "@/pages/EpochTools"
import CodeEditor from "@/pages/CodeEditor"
import CsvViewer from "@/pages/CsvViewer"

function App() {
  return (
    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<AppLayout />}>
            <Route index element={<Home />} />
            <Route path="text-diff" element={<TextDiff />} />
            <Route path="json-utils" element={<JsonUtils />} />
            <Route path="epoch-tools" element={<EpochTools />} />
            <Route path="code-editor" element={<CodeEditor />} />
            <Route path="csv-viewer" element={<CsvViewer />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  )
}

export default App

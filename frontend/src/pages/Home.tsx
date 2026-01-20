import { Link } from "react-router-dom"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { FileText, Clock, Braces } from "lucide-react"

const tools = [
  {
    title: "Text Diff",
    description: "Compare and merge text with a professional git-style diff editor",
    icon: FileText,
    path: "/text-diff",
  },
  {
    title: "JSON Utils",
    description: "Validate, format, minify, and manipulate JSON with ease",
    icon: Braces,
    path: "/json-utils",
  },
  {
    title: "Epoch Tools",
    description: "Convert between timestamps and human-readable dates",
    icon: Clock,
    path: "/epoch-tools",
  },
]

export default function Home() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Welcome to Modern Tools</h2>
        <p className="text-muted-foreground mt-2">
          A collection of developer utilities to make your work easier
        </p>
      </div>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {tools.map((tool) => {
          const Icon = tool.icon
          return (
            <Link key={tool.path} to={tool.path}>
              <Card className="transition-colors hover:bg-accent cursor-pointer h-full">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Icon className="h-5 w-5" />
                    <CardTitle>{tool.title}</CardTitle>
                  </div>
                  <CardDescription>{tool.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">Click to open →</p>
                </CardContent>
              </Card>
            </Link>
          )
        })}
      </div>
    </div>
  )
}

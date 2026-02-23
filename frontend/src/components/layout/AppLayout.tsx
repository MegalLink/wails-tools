import { Link, Outlet, useLocation } from "react-router-dom"
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarInset,
  useSidebar,
} from "@/components/ui/sidebar"
import { ModeToggle } from "@/components/mode-toogle"
import { Button } from "@/components/ui/button"
import { Home, FileText, Clock, Braces, Code, Table2, PanelLeft, ChevronLeft, ChevronRight } from "lucide-react"

function SidebarToggleButton() {
  const { state, toggleSidebar } = useSidebar()
  const isOpen = state === "expanded"
  return (
    <Button
      variant="ghost"
      size="sm"
      className="flex items-center gap-1 px-2"
      onClick={toggleSidebar}
    >
      <PanelLeft className="h-4 w-4" />
      {isOpen ? (
        <ChevronLeft className="h-3.5 w-3.5" />
      ) : (
        <ChevronRight className="h-3.5 w-3.5" />
      )}
      <span className="sr-only">Toggle Sidebar</span>
    </Button>
  )
}

const navItems = [
  { title: "Home", path: "/", icon: Home },
  { title: "Text Diff", path: "/text-diff", icon: FileText },
  { title: "JSON Utils", path: "/json-utils", icon: Braces },
  { title: "Epoch Tools", path: "/epoch-tools", icon: Clock },
  { title: "Code Editor", path: "/code-editor", icon: Code },
  { title: "CSV Viewer", path: "/csv-viewer", icon: Table2 },
]

export function AppLayout() {
  const location = useLocation()

  return (
    <div className="flex h-screen flex-col" style={{ paddingTop: "28px" }}>
    <SidebarProvider className="flex-1 min-h-0">
      <Sidebar>
        <SidebarHeader className="border-b px-6 py-4">
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                {navItems.map((item) => {
                  const Icon = item.icon
                  const isActive = location.pathname === item.path
                  return (
                    <SidebarMenuItem key={item.path}>
                      <SidebarMenuButton asChild isActive={isActive}>
                        <Link to={item.path}>
                          <Icon className="h-4 w-4" />
                          <span>{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  )
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
      </Sidebar>
      <SidebarInset>
        <header className="flex h-14 items-center justify-between border-b px-6">
          <div className="flex items-center gap-2">
            <SidebarToggleButton />
            <h1 className="text-xl font-semibold">
              {navItems.find((item) => item.path === location.pathname)?.title || "Modern Tools"}
            </h1>
          </div>
          <ModeToggle />
        </header>
        <main className="flex-1 overflow-auto p-6">
          <Outlet />
        </main>
      </SidebarInset>
    </SidebarProvider>
    </div>
  )
}

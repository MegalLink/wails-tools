import { Link, Outlet, useLocation } from "react-router-dom"
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarInset,
} from "@/components/ui/sidebar"
import { ModeToggle } from "@/components/mode-toogle"
import { Home, FileText, Clock, Braces } from "lucide-react"

const navItems = [
  { title: "Home", path: "/", icon: Home },
  { title: "Text Diff", path: "/text-diff", icon: FileText },
  { title: "JSON Utils", path: "/json-utils", icon: Braces },
  { title: "Epoch Tools", path: "/epoch-tools", icon: Clock },
]

export function AppLayout() {
  const location = useLocation()

  return (
    <SidebarProvider>
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
          <h1 className="text-xl font-semibold">
            {navItems.find((item) => item.path === location.pathname)?.title || "Modern Tools"}
          </h1>
          <ModeToggle />
        </header>
        <main className="flex-1 overflow-auto p-6">
          <Outlet />
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}

import { useState, useCallback, useRef, useMemo } from "react"
import {
    useReactTable,
    getCoreRowModel,
    getFilteredRowModel,
    getPaginationRowModel,
    getSortedRowModel,
    flexRender,
    type ColumnDef,
    type ColumnFiltersState,
    type VisibilityState,
    type SortingState,
} from "@tanstack/react-table"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
    DropdownMenu,
    DropdownMenuCheckboxItem,
    DropdownMenuContent,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import {
    Upload,
    Clipboard,
    FileSpreadsheet,
    SlidersHorizontal,
    Search,
    ChevronLeft,
    ChevronRight,
    ChevronsLeft,
    ChevronsRight,
    X,
    Filter,
    Columns2,
    ArrowUpDown,
    ArrowUp,
    ArrowDown,
} from "lucide-react"

// ─── Types ────────────────────────────────────────────────────────────────────
type CsvRow = Record<string, string>

const SEPARATOR_OPTIONS = [
    { label: "Comma (,)", value: "," },
    { label: "Semicolon (;)", value: ";" },
    { label: "Tab (\\t)", value: "\t" },
    { label: "Pipe (|)", value: "|" },
    { label: "Custom…", value: "custom" },
]

// ─── CSV Parser ────────────────────────────────────────────────────────────────
function parseCsv(text: string, sep: string): { headers: string[]; rows: CsvRow[] } {
    const lines = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n")
    const nonEmpty = lines.filter((l) => l.trim() !== "")
    if (nonEmpty.length === 0) return { headers: [], rows: [] }

    const parseLine = (line: string): string[] => {
        if (sep === ",") {
            // RFC 4180-ish parsing for comma
            const result: string[] = []
            let current = ""
            let inQuotes = false
            for (let i = 0; i < line.length; i++) {
                const ch = line[i]
                if (ch === '"') {
                    if (inQuotes && line[i + 1] === '"') { current += '"'; i++ }
                    else inQuotes = !inQuotes
                } else if (ch === sep && !inQuotes) {
                    result.push(current); current = ""
                } else {
                    current += ch
                }
            }
            result.push(current)
            return result.map((c) => c.trim())
        }
        return line.split(sep).map((c) => c.trim())
    }

    const headers = parseLine(nonEmpty[0])
    const rows: CsvRow[] = nonEmpty.slice(1).map((line) => {
        const values = parseLine(line)
        const row: CsvRow = {}
        headers.forEach((h, i) => { row[h] = values[i] ?? "" })
        return row
    })
    return { headers, rows }
}

// ─── Column Filter Input ───────────────────────────────────────────────────────
function ColumnFilter({ columnId, table }: { columnId: string; table: ReturnType<typeof useReactTable<CsvRow>> }) {
    const column = table.getColumn(columnId)
    const value = (column?.getFilterValue() as string) ?? ""
    return (
        <Input
            placeholder={`Filter ${columnId}…`}
            value={value}
            onChange={(e) => column?.setFilterValue(e.target.value)}
            className="h-7 text-xs mt-1 w-full"
        />
    )
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function CsvViewer() {
    const [inputTab, setInputTab] = useState("drop")
    const [pasteText, setPasteText] = useState("")
    const [separator, setSeparator] = useState(",")
    const [customSep, setCustomSep] = useState("")
    const [isDragging, setIsDragging] = useState(false)
    const [fileName, setFileName] = useState<string | null>(null)
    const [rawText, setRawText] = useState("")
    const [globalFilter, setGlobalFilter] = useState("")
    const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
    const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({})
    const [advancedFilters, setAdvancedFilters] = useState(false)
    const [sorting, setSorting] = useState<SortingState>([])
    const [pageSize, setPageSize] = useState(25)
    const fileInputRef = useRef<HTMLInputElement>(null)

    const effectiveSep = separator === "custom" ? (customSep || ",") : separator

    const { headers, rows } = useMemo(() => parseCsv(rawText, effectiveSep), [rawText, effectiveSep])

    // Build columns dynamically – give each column a fixed min-width so the
    // sticky header cells don't collapse/misalign on horizontal scroll
    const columns = useMemo<ColumnDef<CsvRow>[]>(
        () =>
            headers.map((h) => ({
                id: h,
                accessorKey: h,
                header: h,
                filterFn: "includesString" as const,
                size: 160,
                minSize: 120,
            })),
        [headers]
    )

    const table = useReactTable({
        data: rows,
        columns,
        state: { globalFilter, columnFilters, columnVisibility, sorting },
        onGlobalFilterChange: setGlobalFilter,
        onColumnFiltersChange: setColumnFilters,
        onColumnVisibilityChange: setColumnVisibility,
        onSortingChange: setSorting,
        getCoreRowModel: getCoreRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        initialState: { pagination: { pageSize } },
        globalFilterFn: "includesString",
    })

    // Sync pageSize into table
    useMemo(() => { table.setPageSize(pageSize) }, [pageSize])

    // ── Handlers ──────────────────────────────────────────────────────────────
    const loadText = (text: string, name?: string) => {
        setRawText(text)
        if (name) setFileName(name)
        setColumnVisibility({})
        setColumnFilters([])
        setGlobalFilter("")
    }

    const handleFile = (file: File) => {
        const reader = new FileReader()
        reader.onload = (e) => loadText(e.target?.result as string, file.name)
        reader.readAsText(file)
    }

    const onDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault()
        setIsDragging(false)
        const file = e.dataTransfer.files[0]
        if (file) handleFile(file)
    }, [])

    const onDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true) }
    const onDragLeave = () => setIsDragging(false)

    const clearData = () => {
        setRawText("")
        setFileName(null)
        setPasteText("")
        setColumnVisibility({})
        setColumnFilters([])
        setGlobalFilter("")
    }

    const hasData = rows.length > 0

    const filteredCount = table.getFilteredRowModel().rows.length

    return (
        <div className="space-y-3">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">CSV Viewer</h1>
                    <p className="text-muted-foreground text-sm">
                        Load a CSV/DSV file and explore data with filters and search
                    </p>
                </div>
                {hasData && (
                    <Button variant="outline" size="sm" onClick={clearData} className="gap-1.5">
                        <X className="h-3.5 w-3.5" /> Clear
                    </Button>
                )}
            </div>

            {/* Input Section */}
            {!hasData && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <FileSpreadsheet className="h-5 w-5" />
                            Load Data
                        </CardTitle>
                        <CardDescription>Drag &amp; drop a file, pick one from disk, or paste CSV content</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {/* Separator selector */}
                        <div className="flex items-center gap-3">
                            <span className="text-sm font-medium text-muted-foreground shrink-0">Separator:</span>
                            <Select value={separator} onValueChange={setSeparator}>
                                <SelectTrigger className="w-48">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {SEPARATOR_OPTIONS.map((o) => (
                                        <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            {separator === "custom" && (
                                <Input
                                    value={customSep}
                                    onChange={(e) => setCustomSep(e.target.value)}
                                    placeholder="Enter separator"
                                    className="w-32"
                                    maxLength={5}
                                />
                            )}
                        </div>

                        <Tabs value={inputTab} onValueChange={setInputTab}>
                            <TabsList>
                                <TabsTrigger value="drop" className="gap-2">
                                    <Upload className="h-4 w-4" /> File
                                </TabsTrigger>
                                <TabsTrigger value="paste" className="gap-2">
                                    <Clipboard className="h-4 w-4" /> Paste
                                </TabsTrigger>
                            </TabsList>

                            {/* Drag & drop / file picker tab */}
                            <TabsContent value="drop" className="mt-4">
                                <div
                                    onDrop={onDrop}
                                    onDragOver={onDragOver}
                                    onDragLeave={onDragLeave}
                                    className={`
                    relative flex flex-col items-center justify-center gap-4
                    border-2 border-dashed rounded-xl p-16 transition-all cursor-pointer
                    ${isDragging
                                            ? "border-primary bg-primary/5 scale-[1.01]"
                                            : "border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/30"
                                        }
                  `}
                                    onClick={() => fileInputRef.current?.click()}
                                >
                                    <div className={`rounded-full p-4 ${isDragging ? "bg-primary/10" : "bg-muted"}`}>
                                        <Upload className={`h-8 w-8 ${isDragging ? "text-primary" : "text-muted-foreground"}`} />
                                    </div>
                                    <div className="text-center">
                                        <p className="font-semibold text-lg">
                                            {isDragging ? "Release to load file" : "Drop your file here"}
                                        </p>
                                        <p className="text-muted-foreground text-sm mt-1">
                                            or click to browse — supports .csv, .tsv, .txt and any delimited format
                                        </p>
                                    </div>
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept=".csv,.tsv,.txt"
                                        className="sr-only"
                                        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
                                    />
                                </div>
                            </TabsContent>

                            {/* Paste tab */}
                            <TabsContent value="paste" className="mt-4 space-y-3">
                                <textarea
                                    className="w-full h-48 rounded-md border bg-background px-3 py-2 text-sm font-mono resize-y focus:outline-none focus:ring-2 focus:ring-ring"
                                    placeholder={`Paste CSV content here…\ne.g. name,age,city\nAlice,30,NYC`}
                                    value={pasteText}
                                    onChange={(e) => setPasteText(e.target.value)}
                                />
                                <div className="flex gap-2">
                                    <Button
                                        onClick={() => loadText(pasteText)}
                                        disabled={!pasteText.trim()}
                                        className="gap-2"
                                    >
                                        <FileSpreadsheet className="h-4 w-4" /> Load CSV
                                    </Button>
                                    <Button
                                        variant="outline"
                                        onClick={async () => {
                                            const text = await navigator.clipboard.readText()
                                            setPasteText(text)
                                        }}
                                        className="gap-2"
                                    >
                                        <Clipboard className="h-4 w-4" /> Paste from clipboard
                                    </Button>
                                </div>
                            </TabsContent>
                        </Tabs>
                    </CardContent>
                </Card>
            )}

            {/* Data section */}
            {hasData && (
                <div className="space-y-2">
                    {/* Toolbar — single compact row */}
                    <div className="flex items-center gap-1.5">
                        {/* Info badges */}
                        <div className="flex items-center gap-1 shrink-0">
                            {fileName && (
                                <Badge variant="secondary" className="gap-1 text-xs h-6 px-2">
                                    <FileSpreadsheet className="h-3 w-3" />
                                    <span className="max-w-[120px] truncate">{fileName}</span>
                                </Badge>
                            )}
                            <Badge variant="outline" className="text-xs h-6 px-2 font-normal">
                                {rows.length}r · {headers.length}c
                            </Badge>
                            {filteredCount < rows.length && (
                                <Badge variant="default" className="text-xs h-6 px-2 font-normal">
                                    {filteredCount} shown
                                </Badge>
                            )}
                        </div>

                        {/* Spacer */}
                        <div className="flex-1" />

                        {/* Separator */}
                        <div className="flex items-center gap-1 shrink-0">
                            <span className="text-xs text-muted-foreground">Sep:</span>
                            <Select value={separator} onValueChange={setSeparator}>
                                <SelectTrigger className="h-7 w-32 text-xs">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {SEPARATOR_OPTIONS.map((o) => (
                                        <SelectItem key={o.value} value={o.value} className="text-xs">{o.label}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            {separator === "custom" && (
                                <Input
                                    value={customSep}
                                    onChange={(e) => setCustomSep(e.target.value)}
                                    placeholder="sep"
                                    className="h-7 w-14 text-xs"
                                    maxLength={5}
                                />
                            )}
                        </div>

                        {/* Global search */}
                        <div className="relative shrink-0">
                            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground pointer-events-none" />
                            <Input
                                placeholder="Search all columns…"
                                value={globalFilter}
                                onChange={(e) => setGlobalFilter(e.target.value)}
                                className="pl-7 h-7 w-44 text-xs"
                            />
                            {globalFilter && (
                                <button
                                    className="absolute right-1.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                    onClick={() => setGlobalFilter("")}
                                >
                                    <X className="h-3 w-3" />
                                </button>
                            )}
                        </div>

                        {/* Column filters toggle */}
                        <Button
                            variant={advancedFilters ? "default" : "outline"}
                            size="sm"
                            onClick={() => setAdvancedFilters(!advancedFilters)}
                            className="gap-1 h-7 text-xs px-2 shrink-0"
                        >
                            <Filter className="h-3 w-3" />
                            Filters
                            {columnFilters.length > 0 && (
                                <Badge className="ml-0.5 h-4 min-w-4 px-1 text-[10px] rounded-full">{columnFilters.length}</Badge>
                            )}
                        </Button>

                        {/* Column visibility */}
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="sm" className="gap-1 h-7 text-xs px-2 shrink-0">
                                    <Columns2 className="h-3 w-3" />
                                    Columns
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="max-h-80 overflow-y-auto w-52">
                                <DropdownMenuLabel>Toggle Columns</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuCheckboxItem
                                    checked={table.getIsAllColumnsVisible()}
                                    onCheckedChange={(v) => table.toggleAllColumnsVisible(v)}
                                >
                                    Show all
                                </DropdownMenuCheckboxItem>
                                <DropdownMenuSeparator />
                                {table.getAllColumns().map((col) => (
                                    <DropdownMenuCheckboxItem
                                        key={col.id}
                                        checked={col.getIsVisible()}
                                        onCheckedChange={(v) => col.toggleVisibility(v)}
                                    >
                                        {col.id}
                                    </DropdownMenuCheckboxItem>
                                ))}
                            </DropdownMenuContent>
                        </DropdownMenu>

                        {/* Clear column filters */}
                        {columnFilters.length > 0 && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setColumnFilters([])}
                                className="h-7 gap-1 text-xs px-2 text-muted-foreground shrink-0"
                            >
                                <SlidersHorizontal className="h-3 w-3" />
                                Clear
                            </Button>
                        )}
                    </div>

                    {/* Table */}
                    <div className="rounded-md border overflow-hidden">
                        {/* Single scroll container — horizontal + vertical — so the sticky thead
                            scrolls horizontally with the body, avoiding misalignment with filters */}
                        <div className="overflow-auto max-h-[calc(100vh-20rem)]">
                            <Table style={{ minWidth: "max-content" }}>
                                <TableHeader className="sticky top-0 z-10">
                                    {table.getHeaderGroups().map((hg) => (
                                        <TableRow key={hg.id} className="border-b hover:bg-transparent">
                                            {hg.headers.map((header) => (
                                                <TableHead
                                                    key={header.id}
                                                    className="bg-card font-semibold text-xs uppercase tracking-wide px-3 border-b"
                                                    style={{ minWidth: `${header.column.columnDef.minSize ?? 120}px` }}
                                                >
                                                    {/* Sortable header button */}
                                                    <button
                                                        className="flex items-center gap-1 w-full text-left group select-none"
                                                        onClick={header.column.getToggleSortingHandler()}
                                                        title={`Sort by ${header.column.id}`}
                                                    >
                                                        <span className="truncate flex-1">
                                                            {flexRender(header.column.columnDef.header, header.getContext())}
                                                        </span>
                                                        {header.column.getIsSorted() === "asc" ? (
                                                            <ArrowUp className="h-3 w-3 shrink-0 text-primary" />
                                                        ) : header.column.getIsSorted() === "desc" ? (
                                                            <ArrowDown className="h-3 w-3 shrink-0 text-primary" />
                                                        ) : (
                                                            <ArrowUpDown className="h-3 w-3 shrink-0 opacity-0 group-hover:opacity-40 transition-opacity" />
                                                        )}
                                                    </button>
                                                    {advancedFilters && (
                                                        <ColumnFilter columnId={header.column.id} table={table} />
                                                    )}
                                                </TableHead>
                                            ))}
                                        </TableRow>
                                    ))}
                                </TableHeader>
                                <TableBody>
                                    {table.getRowModel().rows.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={headers.length} className="h-24 text-center text-muted-foreground">
                                                No rows match your filters.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        table.getRowModel().rows.map((row) => (
                                            <TableRow key={row.id}>
                                                {row.getVisibleCells().map((cell) => (
                                                    <TableCell key={cell.id} className="px-3 text-sm font-mono">
                                                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                                    </TableCell>
                                                ))}
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </div>

                    {/* Pagination */}
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                        <div className="flex items-center gap-2">
                            <span>Rows per page:</span>
                            <Select value={String(pageSize)} onValueChange={(v) => setPageSize(Number(v))}>
                                <SelectTrigger className="h-7 w-24 text-xs">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {[10, 25, 50, 100, 250].map((s) => (
                                        <SelectItem key={s} value={String(s)} className="text-xs">{s}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <span>
                            Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
                        </span>

                        <div className="flex items-center gap-1">
                            <Button
                                variant="outline"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => table.setPageIndex(0)}
                                disabled={!table.getCanPreviousPage()}
                            >
                                <ChevronsLeft className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                                variant="outline"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => table.previousPage()}
                                disabled={!table.getCanPreviousPage()}
                            >
                                <ChevronLeft className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                                variant="outline"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => table.nextPage()}
                                disabled={!table.getCanNextPage()}
                            >
                                <ChevronRight className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                                variant="outline"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => table.setPageIndex(table.getPageCount() - 1)}
                                disabled={!table.getCanNextPage()}
                            >
                                <ChevronsRight className="h-3.5 w-3.5" />
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

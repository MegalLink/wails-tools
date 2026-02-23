import { create } from "zustand"
import { persist } from "zustand/middleware"
import type { ColumnFiltersState, SortingState, VisibilityState } from "@tanstack/react-table"

export interface CsvViewerState {
    rawText: string
    fileName: string | null
    separator: string
    customSep: string
    globalFilter: string
    columnFilters: ColumnFiltersState
    columnVisibility: VisibilityState
    sorting: SortingState
    advancedFilters: boolean
    pageSize: number
    // actions
    setRawText: (text: string) => void
    setFileName: (name: string | null) => void
    setSeparator: (sep: string) => void
    setCustomSep: (sep: string) => void
    setGlobalFilter: (filter: string) => void
    setColumnFilters: (filters: ColumnFiltersState) => void
    setColumnVisibility: (visibility: VisibilityState) => void
    setSorting: (sorting: SortingState) => void
    setAdvancedFilters: (v: boolean) => void
    setPageSize: (size: number) => void
    loadText: (text: string, name?: string) => void
    clearData: () => void
}

export const useCsvViewerStore = create<CsvViewerState>()(
    persist(
        (set) => ({
            // ── State ───────────────────────────────────────
            rawText: "",
            fileName: null,
            separator: ",",
            customSep: "",
            globalFilter: "",
            columnFilters: [],
            columnVisibility: {},
            sorting: [],
            advancedFilters: false,
            pageSize: 25,

            // ── Actions ─────────────────────────────────────
            setRawText: (rawText) => set({ rawText }),
            setFileName: (fileName) => set({ fileName }),
            setSeparator: (separator) => set({ separator }),
            setCustomSep: (customSep) => set({ customSep }),
            setGlobalFilter: (globalFilter) => set({ globalFilter }),
            setColumnFilters: (columnFilters) => set({ columnFilters }),
            setColumnVisibility: (columnVisibility) => set({ columnVisibility }),
            setSorting: (sorting) => set({ sorting }),
            setAdvancedFilters: (advancedFilters) => set({ advancedFilters }),
            setPageSize: (pageSize) => set({ pageSize }),

            loadText: (rawText, fileName) =>
                set({
                    rawText,
                    fileName: fileName ?? null,
                    columnVisibility: {},
                    columnFilters: [],
                    sorting: [],
                    globalFilter: "",
                }),

            clearData: () =>
                set({
                    rawText: "",
                    fileName: null,
                    globalFilter: "",
                    columnFilters: [],
                    columnVisibility: {},
                    sorting: [],
                }),
        }),
        {
            name: "csv-viewer-store", // localStorage key
            // Skip persisting ephemeral table state if rawText is empty
            partialize: (state) => ({
                rawText: state.rawText,
                fileName: state.fileName,
                separator: state.separator,
                customSep: state.customSep,
                globalFilter: state.globalFilter,
                columnFilters: state.columnFilters,
                columnVisibility: state.columnVisibility,
                sorting: state.sorting,
                advancedFilters: state.advancedFilters,
                pageSize: state.pageSize,
            }),
        }
    )
)

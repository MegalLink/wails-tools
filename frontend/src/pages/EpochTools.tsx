import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DatePickerTime } from "@/components/ui/date-picker-time"
import { Clock, Copy } from "lucide-react"

type TimeUnit = "seconds" | "milliseconds" | "nanoseconds"

const TIMEZONES = [
  { label: "GMT-12:00", offset: -12 },
  { label: "GMT-11:00", offset: -11 },
  { label: "GMT-10:00", offset: -10 },
  { label: "GMT-09:00", offset: -9 },
  { label: "GMT-08:00", offset: -8 },
  { label: "GMT-07:00", offset: -7 },
  { label: "GMT-06:00", offset: -6 },
  { label: "GMT-05:00", offset: -5 },
  { label: "GMT-04:00", offset: -4 },
  { label: "GMT-03:00", offset: -3 },
  { label: "GMT-02:00", offset: -2 },
  { label: "GMT-01:00", offset: -1 },
  { label: "GMT+00:00", offset: 0 },
  { label: "GMT+01:00", offset: 1 },
  { label: "GMT+02:00", offset: 2 },
  { label: "GMT+03:00", offset: 3 },
  { label: "GMT+04:00", offset: 4 },
  { label: "GMT+05:00", offset: 5 },
  { label: "GMT+06:00", offset: 6 },
  { label: "GMT+07:00", offset: 7 },
  { label: "GMT+08:00", offset: 8 },
  { label: "GMT+09:00", offset: 9 },
  { label: "GMT+10:00", offset: 10 },
  { label: "GMT+11:00", offset: 11 },
  { label: "GMT+12:00", offset: 12 },
  { label: "Local Time", offset: -new Date().getTimezoneOffset() / 60 },
]

export default function EpochTools() {
  const [currentEpoch, setCurrentEpoch] = useState(Math.floor(Date.now() / 1000))
  const [timestampInput, setTimestampInput] = useState("")
  const [timestampUnit, setTimestampUnit] = useState<TimeUnit>("seconds")
  const [timestampTimezone, setTimestampTimezone] = useState<number>(-new Date().getTimezoneOffset() / 60)
  const [timestampError, setTimestampError] = useState("")
  
  const [dateInputMode, setDateInputMode] = useState<"text" | "separated">("separated")
  const [dateInput, setDateInput] = useState("")
  const [dateTimezone, setDateTimezone] = useState<number>(-new Date().getTimezoneOffset() / 60)
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date())
  const [selectedTime, setSelectedTime] = useState("00:00:00")
  
  const [convertedDate, setConvertedDate] = useState("")
  const [convertedTimestamp, setConvertedTimestamp] = useState("")

  // Update current epoch every second
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentEpoch(Math.floor(Date.now() / 1000))
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  // Auto-detect timestamp unit based on length
  useEffect(() => {
    if (!timestampInput.trim()) {
      setTimestampError("")
      return
    }

    const trimmed = timestampInput.trim()
    const isNumeric = /^\d+$/.test(trimmed)
    
    if (!isNumeric) {
      setTimestampError("Timestamp must contain only numbers")
      return
    }

    const length = trimmed.length
    
    if (length === 10) {
      setTimestampUnit("seconds")
      setTimestampError("")
    } else if (length === 13) {
      setTimestampUnit("milliseconds")
      setTimestampError("")
    } else if (length === 19) {
      setTimestampUnit("nanoseconds")
      setTimestampError("")
    } else {
      setTimestampError("Invalid timestamp length. Expected 10 digits (seconds), 13 digits (milliseconds), or 19 digits (nanoseconds)")
    }
  }, [timestampInput])

  const convertTimestampToDate = () => {
    if (timestampError) {
      return
    }

    try {
      const timestamp = parseInt(timestampInput)
      if (isNaN(timestamp)) {
        setConvertedDate("Invalid timestamp")
        return
      }

      const dateMs = timestampUnit === "seconds" 
        ? timestamp * 1000 
        : timestampUnit === "milliseconds" 
        ? timestamp 
        : timestamp / 1000000 // nanoseconds to milliseconds
      
      const date = new Date(dateMs)
      
      // Apply timezone offset
      const utcDate = new Date(date.getTime() + (timestampTimezone * 60 * 60 * 1000))
      
      const year = utcDate.getUTCFullYear()
      const month = String(utcDate.getUTCMonth() + 1).padStart(2, '0')
      const day = String(utcDate.getUTCDate()).padStart(2, '0')
      const hours = String(utcDate.getUTCHours()).padStart(2, '0')
      const minutes = String(utcDate.getUTCMinutes()).padStart(2, '0')
      const seconds = String(utcDate.getUTCSeconds()).padStart(2, '0')
      
      const tzName = TIMEZONES.find(tz => tz.offset === timestampTimezone)?.label || `GMT${timestampTimezone >= 0 ? '+' : ''}${timestampTimezone}:00`
      
      // Get relative time
      const now = Date.now()
      const diff = now - dateMs
      const diffSeconds = Math.floor(Math.abs(diff) / 1000)
      const diffMinutes = Math.floor(diffSeconds / 60)
      const diffHours = Math.floor(diffMinutes / 60)
      const diffDays = Math.floor(diffHours / 24)
      
      let relativeTime = ""
      if (diffDays > 0) {
        relativeTime = `${diffDays} day${diffDays > 1 ? 's' : ''} ${diff > 0 ? 'ago' : 'from now'}`
      } else if (diffHours > 0) {
        relativeTime = `${diffHours} hour${diffHours > 1 ? 's' : ''} ${diff > 0 ? 'ago' : 'from now'}`
      } else if (diffMinutes > 0) {
        relativeTime = `${diffMinutes} minute${diffMinutes > 1 ? 's' : ''} ${diff > 0 ? 'ago' : 'from now'}`
      } else {
        relativeTime = `${diffSeconds} second${diffSeconds > 1 ? 's' : ''} ${diff > 0 ? 'ago' : 'from now'}`
      }
      
      // Format for display
      const gmtDate = new Date(dateMs)
      const gmtFormatted = gmtDate.toUTCString()
      
      const localDate = new Date(dateMs)
      const localFormatted = localDate.toLocaleString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        timeZoneName: 'short'
      })
      
      const result = {
        main: `${year}-${month}-${day} ${hours}:${minutes}:${seconds} ${tzName}`,
        unit: timestampUnit,
        gmt: gmtFormatted,
        local: localFormatted,
        relative: relativeTime
      }
      
      setConvertedDate(JSON.stringify(result))
    } catch (error) {
      setConvertedDate("Error converting timestamp")
    }
  }

  const convertDateToTimestamp = () => {
    try {
      let date: Date
      
      if (dateInputMode === "text") {
        date = new Date(dateInput)
        if (isNaN(date.getTime())) {
          setConvertedTimestamp("Invalid date format")
          return
        }
      } else {
        // Use DatePickerTime component
        if (!selectedDate) {
          setConvertedTimestamp("Please select a date")
          return
        }
        
        // Parse time from selectedTime (format: HH:MM:SS)
        const [hours, minutes, seconds] = selectedTime.split(':').map(Number)
        
        // Combine date and time
        date = new Date(selectedDate)
        date.setHours(hours, minutes, seconds, 0)
        
        if (isNaN(date.getTime())) {
          setConvertedTimestamp("Invalid date values")
          return
        }
      }

      // Apply timezone offset (subtract because we're going from human date to UTC)
      const adjustedDate = new Date(date.getTime() - (dateTimezone * 60 * 60 * 1000))
      const timestampSeconds = Math.floor(adjustedDate.getTime() / 1000)
      const timestampMilliseconds = adjustedDate.getTime()
      const timestampNanoseconds = adjustedDate.getTime() * 1000000
      
      const gmtFormatted = adjustedDate.toUTCString()
      const localFormatted = date.toLocaleString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        timeZoneName: 'short'
      })
      
      const result = {
        seconds: timestampSeconds.toString(),
        milliseconds: timestampMilliseconds.toString(),
        nanoseconds: timestampNanoseconds.toString(),
        gmt: gmtFormatted,
        local: localFormatted
      }
      
      setConvertedTimestamp(JSON.stringify(result))
    } catch (error) {
      setConvertedTimestamp("Error converting date")
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Epoch Tools</h1>
        <p className="text-muted-foreground">Convert between timestamps and human-readable dates</p>
      </div>

      {/* Current Unix Epoch - Destacado */}
      <Card className="border-2">
        <CardContent className="pt-6">
          <div className="flex flex-col items-center justify-center space-y-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span className="font-medium">Current Unix Epoch Time</span>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant="outline" className="text-3xl font-mono px-6 py-3">
                {currentEpoch}
              </Badge>
              <Button
                variant="outline"
                size="icon"
                onClick={() => copyToClipboard(currentEpoch.toString())}
                title="Copy to clipboard"
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="timestamp-to-date" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="timestamp-to-date">Timestamp → Date</TabsTrigger>
          <TabsTrigger value="date-to-timestamp">Date → Timestamp</TabsTrigger>
        </TabsList>

        <TabsContent value="timestamp-to-date" className="mt-6">
        <Card>
          <CardHeader className="space-y-1">
            <CardTitle>Timestamp → Human Date</CardTitle>
            <p className="text-sm text-muted-foreground">Convert Unix timestamp to readable format</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="timestamp-input">Timestamp</Label>
              <Input
                id="timestamp-input"
                type="text"
                placeholder="1770315758"
                value={timestampInput}
                onChange={(e) => setTimestampInput(e.target.value)}
                className={`font-mono text-lg ${timestampError ? "border-destructive" : ""}`}
              />
              {timestampError && (
                <p className="text-xs text-destructive flex items-start gap-1">
                  <span>⚠️</span>
                  <span>{timestampError}</span>
                </p>
              )}
              {!timestampError && timestampInput && (
                <Badge variant="secondary" className="text-xs">
                  Auto-detected: {timestampUnit === "seconds" ? "Seconds (10 digits)" : timestampUnit === "milliseconds" ? "Milliseconds (13 digits)" : "Nanoseconds (19 digits)"}
                </Badge>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="timestamp-unit" className="text-xs">Unit</Label>
                <Select value={timestampUnit} onValueChange={(v) => setTimestampUnit(v as TimeUnit)} disabled>
                  <SelectTrigger id="timestamp-unit" className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="seconds">Seconds</SelectItem>
                    <SelectItem value="milliseconds">Milliseconds</SelectItem>
                    <SelectItem value="nanoseconds">Nanoseconds</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="timestamp-timezone" className="text-xs">Timezone</Label>
                <Select 
                  value={timestampTimezone.toString()} 
                  onValueChange={(v) => setTimestampTimezone(parseFloat(v))}
                >
                  <SelectTrigger id="timestamp-timezone" className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TIMEZONES.map((tz) => (
                      <SelectItem key={tz.label} value={tz.offset.toString()}>
                        {tz.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button onClick={convertTimestampToDate} className="w-full" size="lg" disabled={!!timestampError || !timestampInput}>
              Convert to Date
            </Button>

            {convertedDate && convertedDate !== "Invalid timestamp" && convertedDate !== "Error converting timestamp" && (
              <div className="space-y-3 pt-2">
                {(() => {
                  try {
                    const result = JSON.parse(convertedDate)
                    return (
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <Input
                            value={result.main}
                            readOnly
                            className="font-mono text-base bg-muted/50"
                          />
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => copyToClipboard(result.main)}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                        </div>
                        
                        <div className="rounded-lg bg-muted/50 p-4 space-y-2.5 text-sm border">
                          <div className="flex items-start gap-2">
                            <span className="text-xs text-muted-foreground min-w-[80px] pt-0.5">Unit:</span>
                            <span className="font-medium">{result.unit}</span>
                          </div>
                          <div className="flex items-start gap-2">
                            <span className="text-xs text-muted-foreground min-w-[80px] pt-0.5">GMT 0:00:</span>
                            <span className="font-mono text-xs">{result.gmt}</span>
                          </div>
                          <div className="flex items-start gap-2">
                            <span className="text-xs text-muted-foreground min-w-[80px] pt-0.5">Your timezone:</span>
                            <span className="font-mono text-xs">{result.local}</span>
                          </div>
                          <div className="flex items-start gap-2">
                            <span className="text-xs text-muted-foreground min-w-[80px] pt-0.5">Relative:</span>
                            <span className="text-xs">{result.relative}</span>
                          </div>
                        </div>
                      </div>
                    )
                  } catch {
                    return (
                      <div className="flex items-center gap-2">
                        <Input
                          value={convertedDate}
                          readOnly
                          className="font-mono bg-muted"
                        />
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => copyToClipboard(convertedDate)}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                    )
                  }
                })()}
              </div>
            )}
          </CardContent>
        </Card>
        </TabsContent>

        <TabsContent value="date-to-timestamp" className="mt-6">
        <Card>
          <CardHeader className="space-y-1">
            <CardTitle>Human Date → Timestamp</CardTitle>
            <p className="text-sm text-muted-foreground">Convert readable date to Unix timestamp</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs">Input Method</Label>
              <Select value={dateInputMode} onValueChange={(v) => setDateInputMode(v as "text" | "separated")}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="separated">Separated Fields</SelectItem>
                  <SelectItem value="text">Text Format</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {dateInputMode === "text" ? (
              <div className="space-y-2">
                <Label htmlFor="date-input">Date & Time</Label>
                <Input
                  id="date-input"
                  type="text"
                  placeholder="2026-02-05 13:20:42"
                  value={dateInput}
                  onChange={(e) => setDateInput(e.target.value)}
                  className="font-mono"
                />
                <p className="text-xs text-muted-foreground">
                  Format: YYYY-MM-DD HH:MM:SS or RFC 2822
                </p>
              </div>
            ) : (
              <DatePickerTime
                date={selectedDate}
                onDateChange={setSelectedDate}
                onTimeChange={setSelectedTime}
                defaultTime={selectedTime}
              />
            )}

            <div className="space-y-2">
              <Label htmlFor="date-timezone" className="text-xs">Timezone</Label>
              <Select 
                value={dateTimezone.toString()} 
                onValueChange={(v) => setDateTimezone(parseFloat(v))}
              >
                <SelectTrigger id="date-timezone" className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIMEZONES.map((tz) => (
                    <SelectItem key={tz.label} value={tz.offset.toString()}>
                      {tz.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button onClick={convertDateToTimestamp} className="w-full" size="lg">
              Convert to Timestamp
            </Button>

            {convertedTimestamp && convertedTimestamp !== "Invalid date format" && convertedTimestamp !== "Invalid date values" && convertedTimestamp !== "Error converting date" && (
              <div className="space-y-3 pt-2">
                {(() => {
                  try {
                    const result = JSON.parse(convertedTimestamp)
                    return (
                      <div className="rounded-lg bg-muted/50 p-4 space-y-3 text-sm border">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs text-muted-foreground">Seconds:</span>
                          <div className="flex items-center gap-2">
                            <code className="font-mono text-sm">{result.seconds}</code>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => copyToClipboard(result.seconds)}
                            >
                              <Copy className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs text-muted-foreground">Milliseconds:</span>
                          <div className="flex items-center gap-2">
                            <code className="font-mono text-xs">{result.milliseconds}</code>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => copyToClipboard(result.milliseconds)}
                            >
                              <Copy className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs text-muted-foreground">Nanoseconds:</span>
                          <div className="flex items-center gap-2">
                            <code className="font-mono text-xs">{result.nanoseconds}</code>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => copyToClipboard(result.nanoseconds)}
                            >
                              <Copy className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                        <div className="h-px bg-border my-2" />
                        <div className="space-y-2">
                          <div className="flex items-start gap-2">
                            <span className="text-xs text-muted-foreground min-w-[60px]">GMT:</span>
                            <span className="font-mono text-xs">{result.gmt}</span>
                          </div>
                          <div className="flex items-start gap-2">
                            <span className="text-xs text-muted-foreground min-w-[60px]">Local:</span>
                            <span className="font-mono text-xs">{result.local}</span>
                          </div>
                        </div>
                      </div>
                    )
                  } catch {
                    return (
                      <div className="flex items-center gap-2">
                        <Input
                          value={convertedTimestamp}
                          readOnly
                          className="font-mono bg-muted"
                        />
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => copyToClipboard(convertedTimestamp)}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                    )
                  }
                })()}
              </div>
            )}
          </CardContent>
        </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

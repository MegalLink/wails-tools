import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
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
  
  const [dateInputMode, setDateInputMode] = useState<"text" | "separated">("text")
  const [dateInput, setDateInput] = useState("")
  const [dateTimezone, setDateTimezone] = useState<number>(-new Date().getTimezoneOffset() / 60)

  
  // Separated date inputs
  const now = new Date()
  const [dateYear, setDateYear] = useState(now.getFullYear().toString())
  const [dateMonth, setDateMonth] = useState((now.getMonth() + 1).toString())
  const [dateDay, setDateDay] = useState(now.getDate().toString())
  const [dateHour, setDateHour] = useState(now.getHours().toString())
  const [dateMinute, setDateMinute] = useState(now.getMinutes().toString())
  const [dateSecond, setDateSecond] = useState(now.getSeconds().toString())
  
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

  // Validation helpers for date inputs
  const validateAndSetMonth = (value: string) => {
    const num = parseInt(value) || 0
    if (num >= 1 && num <= 12) {
      setDateMonth(value)
    } else if (num > 12) {
      setDateMonth("12")
    } else if (num < 1 && value !== "") {
      setDateMonth("1")
    } else {
      setDateMonth(value)
    }
  }

  const validateAndSetDay = (value: string) => {
    const num = parseInt(value) || 0
    if (num >= 1 && num <= 31) {
      setDateDay(value)
    } else if (num > 31) {
      setDateDay("31")
    } else if (num < 1 && value !== "") {
      setDateDay("1")
    } else {
      setDateDay(value)
    }
  }

  const validateAndSetHour = (value: string) => {
    const num = parseInt(value) || 0
    if (num >= 0 && num <= 23) {
      setDateHour(value)
    } else if (num > 23) {
      setDateHour("23")
    } else if (num < 0 && value !== "") {
      setDateHour("0")
    } else {
      setDateHour(value)
    }
  }

  const validateAndSetMinute = (value: string) => {
    const num = parseInt(value) || 0
    if (num >= 0 && num <= 59) {
      setDateMinute(value)
    } else if (num > 59) {
      setDateMinute("59")
    } else if (num < 0 && value !== "") {
      setDateMinute("0")
    } else {
      setDateMinute(value)
    }
  }

  const validateAndSetSecond = (value: string) => {
    const num = parseInt(value) || 0
    if (num >= 0 && num <= 59) {
      setDateSecond(value)
    } else if (num > 59) {
      setDateSecond("59")
    } else if (num < 0 && value !== "") {
      setDateSecond("0")
    } else {
      setDateSecond(value)
    }
  }

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
        // Use separated inputs
        const year = parseInt(dateYear)
        const month = parseInt(dateMonth) - 1 // Month is 0-indexed
        const day = parseInt(dateDay)
        const hour = parseInt(dateHour)
        const minute = parseInt(dateMinute)
        const second = parseInt(dateSecond)
        
        date = new Date(year, month, day, hour, minute, second)
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
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Epoch Tools</h2>
        <p className="text-muted-foreground">Convert between timestamps and human-readable dates</p>
      </div>

      {/* Current Unix Epoch */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Current Unix Epoch Time
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="text-2xl font-mono px-4 py-2">
              {currentEpoch}
            </Badge>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => copyToClipboard(currentEpoch.toString())}
              title="Copy"
            >
              <Copy className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Timestamp to Human Date */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Convert Timestamp to Human Date</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="timestamp-input">Timestamp</Label>
              <Input
                id="timestamp-input"
                type="text"
                placeholder="1769012683"
                value={timestampInput}
                onChange={(e) => setTimestampInput(e.target.value)}
                className={`font-mono ${timestampError ? "border-red-500" : ""}`}
              />
              {timestampError && (
                <p className="text-xs text-red-600 dark:text-red-400">{timestampError}</p>
              )}
              {!timestampError && timestampInput && (
                <p className="text-xs text-muted-foreground">
                  Auto-detected: {timestampUnit === "seconds" ? "Seconds (10 digits)" : timestampUnit === "milliseconds" ? "Milliseconds (13 digits)" : "Nanoseconds (19 digits)"}
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-2">
                <Label htmlFor="timestamp-unit">Unit</Label>
                <Select value={timestampUnit} onValueChange={(v) => setTimestampUnit(v as TimeUnit)} disabled>
                  <SelectTrigger id="timestamp-unit">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="seconds">Seconds</SelectItem>
                    <SelectItem value="milliseconds">Milliseconds</SelectItem>
                    <SelectItem value="nanoseconds">Nanoseconds</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">Auto-detected</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="timestamp-timezone">Timezone</Label>
                <Select 
                  value={timestampTimezone.toString()} 
                  onValueChange={(v) => setTimestampTimezone(parseFloat(v))}
                >
                  <SelectTrigger id="timestamp-timezone">
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

            <Button onClick={convertTimestampToDate} className="w-full" disabled={!!timestampError || !timestampInput}>
              Convert to Date
            </Button>

            {convertedDate && convertedDate !== "Invalid timestamp" && convertedDate !== "Error converting timestamp" && (
              <div className="space-y-3">
                <Label>Result</Label>
                {(() => {
                  try {
                    const result = JSON.parse(convertedDate)
                    return (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Input
                            value={result.main}
                            readOnly
                            className="font-mono bg-muted"
                          />
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => copyToClipboard(result.main)}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                        </div>
                        
                        <div className="rounded-md bg-muted p-3 space-y-2 text-sm">
                          <p className="text-xs text-muted-foreground font-medium">
                            Assuming that this timestamp is in <strong>{result.unit}</strong>:
                          </p>
                          <p>
                            <span className="font-medium">GMT 0:00:</span> {result.gmt}
                          </p>
                          <p>
                            <span className="font-medium">Your time zone:</span> {result.local}
                          </p>
                          <p>
                            <span className="font-medium">Relative:</span> {result.relative}
                          </p>
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

        {/* Human Date to Timestamp */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Convert Human Date to Timestamp</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Input Method</Label>
              <Select value={dateInputMode} onValueChange={(v) => setDateInputMode(v as "text" | "separated")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="text">Text Format</SelectItem>
                  <SelectItem value="separated">Separated Fields</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {dateInputMode === "text" ? (
              <div className="space-y-2">
                <Label htmlFor="date-input">Date & Time</Label>
                <Input
                  id="date-input"
                  type="text"
                  placeholder="2026-01-21 15:49:28"
                  value={dateInput}
                  onChange={(e) => setDateInput(e.target.value)}
                  className="font-mono"
                />
                <p className="text-xs text-muted-foreground">
                  <strong>Format:</strong> YYYY-MM-DD HH:MM:SS or RFC 2822
                </p>
                <p className="text-xs text-muted-foreground">
                  <strong>Example:</strong> 2026-01-21 11:33:19 GMT-05:00
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <Label>Date & Time Fields</Label>
                <div className="grid grid-cols-6 gap-2 items-end">
                  <div className="space-y-1">
                    <Label htmlFor="year" className="text-xs">Yr</Label>
                    <Input
                      id="year"
                      type="number"
                      value={dateYear}
                      onChange={(e) => setDateYear(e.target.value)}
                      className="font-mono text-center"
                    />
                  </div>
                  <span className="text-muted-foreground pb-2">-</span>
                  <div className="space-y-1">
                    <Label htmlFor="month" className="text-xs">Mon</Label>
                    <Input
                      id="month"
                      type="number"
                      min="1"
                      max="12"
                      value={dateMonth}
                      onChange={(e) => validateAndSetMonth(e.target.value)}
                      onBlur={(e) => {
                        if (e.target.value === "" || parseInt(e.target.value) < 1) {
                          setDateMonth("1")
                        }
                      }}
                      className="font-mono text-center"
                    />
                  </div>
                  <span className="text-muted-foreground pb-2">-</span>
                  <div className="space-y-1">
                    <Label htmlFor="day" className="text-xs">Day</Label>
                    <Input
                      id="day"
                      type="number"
                      min="1"
                      max="31"
                      value={dateDay}
                      onChange={(e) => validateAndSetDay(e.target.value)}
                      onBlur={(e) => {
                        if (e.target.value === "" || parseInt(e.target.value) < 1) {
                          setDateDay("1")
                        }
                      }}
                      className="font-mono text-center"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-6 gap-2 items-end">
                  <div className="space-y-1">
                    <Label htmlFor="hour" className="text-xs">Hr</Label>
                    <Input
                      id="hour"
                      type="number"
                      min="0"
                      max="23"
                      value={dateHour}
                      onChange={(e) => validateAndSetHour(e.target.value)}
                      onBlur={(e) => {
                        if (e.target.value === "") {
                          setDateHour("0")
                        }
                      }}
                      className="font-mono text-center"
                    />
                  </div>
                  <span className="text-muted-foreground pb-2">:</span>
                  <div className="space-y-1">
                    <Label htmlFor="minute" className="text-xs">Min</Label>
                    <Input
                      id="minute"
                      type="number"
                      min="0"
                      max="59"
                      value={dateMinute}
                      onChange={(e) => validateAndSetMinute(e.target.value)}
                      onBlur={(e) => {
                        if (e.target.value === "") {
                          setDateMinute("0")
                        }
                      }}
                      className="font-mono text-center"
                    />
                  </div>
                  <span className="text-muted-foreground pb-2">:</span>
                  <div className="space-y-1">
                    <Label htmlFor="second" className="text-xs">Sec</Label>
                    <Input
                      id="second"
                      type="number"
                      min="0"
                      max="59"
                      value={dateSecond}
                      onChange={(e) => validateAndSetSecond(e.target.value)}
                      onBlur={(e) => {
                        if (e.target.value === "") {
                          setDateSecond("0")
                        }
                      }}
                      className="font-mono text-center"
                    />
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="date-timezone">Timezone</Label>
              <Select 
                value={dateTimezone.toString()} 
                onValueChange={(v) => setDateTimezone(parseFloat(v))}
              >
                <SelectTrigger id="date-timezone">
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

            <Button onClick={convertDateToTimestamp} className="w-full">
              Convert to Timestamp
            </Button>

            {convertedTimestamp && convertedTimestamp !== "Invalid date format" && convertedTimestamp !== "Invalid date values" && convertedTimestamp !== "Error converting date" && (
              <div className="space-y-3">
                <Label>Results</Label>
                {(() => {
                  try {
                    const result = JSON.parse(convertedTimestamp)
                    return (
                      <div className="space-y-3">
                        <div className="rounded-md bg-muted p-3 space-y-2 text-sm">
                          <p>
                            <span className="font-medium">Epoch timestamp:</span>{" "}
                            <span className="font-mono">{result.seconds}</span>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 ml-1"
                              onClick={() => copyToClipboard(result.seconds)}
                            >
                              <Copy className="h-3 w-3" />
                            </Button>
                          </p>
                          <p>
                            <span className="font-medium">Timestamp in milliseconds:</span>{" "}
                            <span className="font-mono">{result.milliseconds}</span>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 ml-1"
                              onClick={() => copyToClipboard(result.milliseconds)}
                            >
                              <Copy className="h-3 w-3" />
                            </Button>
                          </p>
                          <p>
                            <span className="font-medium">Timestamp in nanoseconds:</span>{" "}
                            <span className="font-mono">{result.nanoseconds}</span>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 ml-1"
                              onClick={() => copyToClipboard(result.nanoseconds)}
                            >
                              <Copy className="h-3 w-3" />
                            </Button>
                          </p>
                          <p>
                            <span className="font-medium">Date and time (GMT):</span> {result.gmt}
                          </p>
                          <p>
                            <span className="font-medium">Date and time (your time zone):</span> {result.local}
                          </p>
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
      </div>
    </div>
  )
}

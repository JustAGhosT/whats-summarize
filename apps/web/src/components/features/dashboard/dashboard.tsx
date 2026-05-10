
"use client"

import { useMemo, useState } from "react"
import { useApp } from "@convolens/contexts"
import { DashboardStats } from "./DashboardStats"
import { DashboardControls } from "./DashboardControls"
import { SummariesList } from "./SummariesList"
import { useDashboard } from "@/hooks/useDashboard"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"
import { SortOption } from "@utils/dashboard-utils"
import { PLATFORM_OPTIONS, type Platform, type PlatformFilter } from "@/types/platform"

type SortOrder = "asc" | "desc"

export default function Dashboard() {
  const { deleteSummary } = useApp()
  const [isScoring, setIsScoring] = useState(false)
  
  // Get dashboard data and methods from custom hook
  const {
    searchTerm,
    setSearchTerm,
    filterType,
    setFilterType,
    sortBy,
    sortOrder,
    handleSort,
    getSortIndicator,
    stats = { total: 0, active: 0 },
    filteredSummaries = [],
    isLoading = false,
    error = null
  } = useDashboard()
  
  // Create platform options including 'all' filter with proper typing
  const platformOptions = useMemo(() => [
    { value: 'all' as const, label: 'All Platforms' },
    ...PLATFORM_OPTIONS.map(option => ({
      value: option.value as Platform,
      label: option.label,
      disabled: false
    }))
  ], [])

  // Add active percentage to stats
  const statsWithPercentage = useMemo(() => ({
    ...stats,
    activePercentage: stats.total > 0 ? Math.round((stats.active / stats.total) * 100) : 0
  }), [stats])
  

  // Use PlatformFilter type to handle both 'all' and Platform values
  const [selectedPlatform, setSelectedPlatform] = useState<PlatformFilter>('all' as const);

  // Handle score all action
  const handleScoreAll = async () => {
    setIsScoring(true)
    try {
      // TODO: Implement actual scoring logic
      await new Promise(resolve => setTimeout(resolve, 1000))
    } finally {
      setIsScoring(false)
    }
  }

  // Handle platform change with type safety
  const handlePlatformChange = (platform: PlatformFilter) => {
    setSelectedPlatform(platform);
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (error) {
    const errorMessage = typeof error === 'string' ? error : 'Failed to load dashboard data. Please try again later.'
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>
          {errorMessage}
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight">Dashboard</h2>
        <div className="flex items-center space-x-2">
          <Button
            onClick={handleScoreAll}
            disabled={isScoring || filteredSummaries.length === 0}
            className="ml-2"
            variant="outline"
          >
            {isScoring ? 'Scoring...' : 'Score All'}
          </Button>
        </div>
      </div>

      <DashboardStats stats={statsWithPercentage} />

      <div className="flex flex-col space-y-4">
        <DashboardControls
          selectedPlatform={selectedPlatform}
          onPlatformChange={handlePlatformChange}
          platforms={platformOptions}
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          filterType={filterType}
          onFilterChange={setFilterType}
          sortBy={sortBy}
          onSort={handleSort}
          sortOrder={sortOrder}
          getSortIndicator={getSortIndicator}
        />

        {filteredSummaries && filteredSummaries.length > 0 ? (
          <SummariesList 
            summaries={filteredSummaries} 
            onDelete={deleteSummary}
            isScoring={isScoring}
          />
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            No summaries found. Try adjusting your filters or create a new summary.
          </div>
        )}
      </div>
    </div>
  )
}

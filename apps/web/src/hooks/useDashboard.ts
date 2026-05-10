import { useState, useMemo } from "react"
import { useApp } from "@convolens/contexts"
import { 
  filterAndSortSummaries, 
  calculateDashboardStats, 
  SortOption, 
  SortOrder 
} from "@utils/dashboard-utils"

export const useDashboard = () => {
  const { 
    summaries = [], 
    isLoading = false, 
    error = null,
    selectedPlatform,
    setSelectedPlatform,
    groups = [],
    crossPlatformGroups = []
  } = useApp()

  const [searchTerm, setSearchTerm] = useState("")
  const [filterType, setFilterType] = useState("all")
  const [sortBy, setSortBy] = useState<SortOption>("date")
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc")
  const [isScoring, setIsScoring] = useState(false)

  // Calculate statistics
  const stats = useMemo(() => calculateDashboardStats(summaries), [summaries])

  // Filter and sort summaries
  const filteredSummaries = useMemo(
    () => filterAndSortSummaries(summaries, searchTerm, filterType, sortBy, sortOrder),
    [summaries, searchTerm, filterType, sortBy, sortOrder]
  )

  // Toggle sort order
  const handleSort = (field: SortOption) => {
    if (sortBy === field) {
      setSortOrder(prev => prev === "asc" ? "desc" : "asc")
    } else {
      setSortBy(field)
      setSortOrder("asc")
    }
  }

  // Get sort indicator
  const getSortIndicator = (field: SortOption) => {
    if (sortBy !== field) return null
    return sortOrder === "asc" ? "↑" : "↓"
  }

  return {
    // State
    searchTerm,
    filterType,
    sortBy,
    sortOrder,
    isScoring,
    isLoading,
    error,
    selectedPlatform,
    groups,
    crossPlatformGroups,
    
    // Computed
    stats,
    filteredSummaries,
    
    // Actions
    setSearchTerm,
    setFilterType,
    setSelectedPlatform,
    handleSort,
    getSortIndicator,
    setIsScoring
  }
}

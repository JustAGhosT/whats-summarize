"use client"

import type { PersonalSummary } from "@convolens/contexts/types"
import styles from "./personal-summary-card.module.css"

interface PersonalSummaryCardProps {
  summary: PersonalSummary
  onShare: () => void
}

export function PersonalSummaryCard({ summary, onShare }: PersonalSummaryCardProps) {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    })
  }

  const getStatusClass = (status: PersonalSummary["status"]) => {
    switch (status) {
      case "draft":
        return styles.statusDraft
      case "generated":
        return styles.statusGenerated
      case "shared":
        return styles.statusShared
      default:
        return styles.statusDefault
    }
  }

  const getStatusIcon = (status: PersonalSummary["status"]) => {
    switch (status) {
      case "draft":
        return "📝"
      case "generated":
        return "✅"
      case "shared":
        return "📤"
      default:
        return "❓"
    }
  }

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <div className={styles.titleSection}>
          <h3 className={styles.title}>{summary.title}</h3>
          <p className={styles.dateRange}>
            {formatDate(summary.dateRange.start)} - {formatDate(summary.dateRange.end)}
          </p>
        </div>
        <div className={`${styles.status} ${getStatusClass(summary.status)}`}>
          <span className={styles.statusIcon}>{getStatusIcon(summary.status)}</span>
          <span className={styles.statusText}>{summary.status}</span>
        </div>
      </div>

      <div className={styles.stats}>
        <div className={styles.statItem}>
          <span className={styles.statValue}>{summary.stats.totalMessages}</span>
          <span className={styles.statLabel}>Messages</span>
        </div>
        <div className={styles.statItem}>
          <span className={styles.statValue}>{summary.stats.activeGroups}</span>
          <span className={styles.statLabel}>Groups</span>
        </div>
        <div className={styles.statItem}>
          <span className={styles.statValue}>{summary.stats.topGroup}</span>
          <span className={styles.statLabel}>Top Group</span>
        </div>
      </div>

      <div className={styles.topGroups}>
        <h4 className={styles.sectionTitle}>Top Groups</h4>
        <div className={styles.groupsList}>
          {summary.topGroups.map((group, index) => (
            <div key={index} className={styles.groupItem}>
              <span className={styles.groupName}>{group.name}</span>
              <span className={styles.groupCount}>{group.messageCount} messages</span>
            </div>
          ))}
        </div>
      </div>

      <div className={styles.insights}>
        <h4 className={styles.sectionTitle}>Key Insights</h4>
        <ul className={styles.insightsList}>
          {summary.insights.map((insight, index) => (
            <li key={index} className={styles.insightItem}>
              {insight}
            </li>
          ))}
        </ul>
      </div>

      <div className={styles.actions}>
        <button className={styles.viewBtn} type="button">
          <span className={styles.btnIcon}>👁️</span>
          View Details
        </button>
        <button className={styles.shareBtn} onClick={onShare} type="button">
          <span className={styles.btnIcon}>📤</span>
          Share
        </button>
      </div>
    </div>
  )
}

"use client"

import { ShareModal } from "@ui/common/share-modal"
import { useApp } from "@convolens/contexts"
import { useState } from "react"
import styles from "./summary-card.module.css"

import type { Summary as AppSummary } from "@convolens/contexts/types"

interface Summary extends Omit<AppSummary, 'participants'> {
  status?: "draft" | "generated" | "shared"
  participants?: number | string[]
  groupName: string
  isArchived?: boolean
}

interface SummaryCardProps {
  summary: Summary
  viewMode?: "grid" | "list"
  onDelete?: (id: string) => void
  onUpdate?: (id: string, updates: Partial<Summary>) => void
}

export function SummaryCard({ summary, viewMode = "grid", onDelete, onUpdate }: SummaryCardProps) {
  const { isLoading } = useApp()
  const [shareModalOpen, setShareModalOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)
  const [isSharing, setIsSharing] = useState(false)

  const handleShare = () => {
    setShareModalOpen(true)
  }

  const handleShareConfirm = async (channels: string[]) => {
    setIsSharing(true)
    try {
      // Simulate sharing API call
      await new Promise((resolve) => setTimeout(resolve, 1500))

      // Update summary status to shared if it has onUpdate
      if (onUpdate) {
        await onUpdate(summary.id, { status: "shared" })
      }

      // Close modal after successful share
      setShareModalOpen(false)
    } catch (err) {
      console.error("Failed to share summary:", err)
    } finally {
      setIsSharing(false)
    }
  }

  const handleShareClose = () => {
    if (!isSharing) {
      setShareModalOpen(false)
    }
  }

  const handleDelete = async () => {
    if (window.confirm("Are you sure you want to delete this summary?")) {
      setIsDeleting(true)
      try {
        if (onDelete) {
          await onDelete(summary.id)
        }
      } catch (err) {
        console.error("Failed to delete summary:", err)
      } finally {
        setIsDeleting(false)
      }
    }
  }

  const handleArchive = async () => {
    if (onUpdate) {
      try {
        await onUpdate(summary.id, { isArchived: !summary.isArchived })
      } catch (err) {
        console.error("Failed to archive summary:", err)
      }
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const getStatusClass = (status?: string) => {
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

  const getSentimentEmoji = (sentiment?: string) => {
    switch (sentiment) {
      case "positive":
        return "😊"
      case "negative":
        return "😔"
      case "neutral":
      default:
        return "😐"
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "daily":
        return "📝"
      case "weekly":
        return "📅"
      case "monthly":
        return "📊"
      case "custom":
        return "⚙️"
      default:
        return "📄"
    }
  }

  const cardClassName = `${styles.card} ${styles[viewMode]} ${summary.isArchived ? styles.archived : ""} ${isDeleting ? styles.deleting : ""}`

  return (
    <>
      <div className={cardClassName}>
        {isDeleting && (
          <div className={styles.loadingOverlay}>
            <div className={styles.spinner}></div>
          </div>
        )}

        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <div className={styles.typeIcon}>{getTypeIcon(summary.type)}</div>
            <div className={styles.titleContent}>
              <h3 className={styles.title}>{summary.title}</h3>
              <div className={styles.meta}>
                <span className={styles.groupName}>{summary.groupName}</span>
                <span className={styles.separator}>•</span>
                <span className={styles.date}>{formatDate(summary.createdAt)}</span>
              </div>
            </div>
          </div>
          <div className={styles.headerRight}>
            {summary.status && (
              <span className={`${styles.status} ${getStatusClass(summary.status)}`}>
                {summary.status}
              </span>
            )}
          </div>
        </div>

        <div className={styles.content}>
          <p className={`${styles.summary} ${isExpanded ? styles.expanded : ""}`}>{summary.content}</p>
          {summary.content.length > 150 && (
            <button className={styles.expandButton} onClick={() => setIsExpanded(!isExpanded)} type="button">
              {isExpanded ? "Show Less" : "Show More"}
            </button>
          )}
        </div>

        <div className={styles.stats}>
          <div className={styles.stat}>
            <span className={styles.statIcon}>💬</span>
            <span className={styles.statValue}>{summary.messageCount || 0}</span>
            <span className={styles.statLabel}>messages</span>
          </div>
          <div className={styles.stat}>
            <span className={styles.statIcon}>👥</span>
            <span className={styles.statValue}>{summary.participants || 0}</span>
            <span className={styles.statLabel}>participants</span>
          </div>
          <div className={styles.stat}>
            <span className={styles.statIcon}>{getSentimentEmoji(summary.sentiment)}</span>
            <span className={styles.statLabel}>{summary.sentiment || "neutral"}</span>
          </div>
        </div>

        {summary.keyTopics && summary.keyTopics.length > 0 && (
          <div className={styles.topics}>
            {summary.keyTopics.slice(0, 3).map((topic, index) => (
              <span key={index} className={styles.topic}>
                #{topic}
              </span>
            ))}
            {summary.keyTopics.length > 3 && (
              <span className={styles.topicMore}>+{summary.keyTopics.length - 3} more</span>
            )}
          </div>
        )}

        <div className={styles.actions}>
          <button className={styles.actionBtn} onClick={handleShare} disabled={isLoading || isSharing} type="button">
            <span className={styles.actionIcon}>📤</span>
            {isSharing ? "Sharing..." : "Share"}
          </button>
          <button className={styles.actionBtn} onClick={handleArchive} disabled={isLoading} type="button">
            <span className={styles.actionIcon}>{summary.isArchived ? "📤" : "📦"}</span>
            {summary.isArchived ? "Restore" : "Archive"}
          </button>
          <button
            className={`${styles.actionBtn} ${styles.deleteBtn}`}
            onClick={handleDelete}
            disabled={isDeleting || isLoading}
            type="button"
          >
            <span className={styles.actionIcon}>🗑️</span>
            {isDeleting ? "Deleting..." : "Delete"}
          </button>
        </div>
      </div>

      <ShareModal
        isOpen={shareModalOpen}
        onClose={handleShareClose}
        onShare={handleShareConfirm}
        isLoading={isSharing}
      />
    </>
  )
}

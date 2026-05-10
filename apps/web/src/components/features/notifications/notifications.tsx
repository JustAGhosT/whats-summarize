"use client"

import { useState, useEffect, JSX } from "react"
import { useRouter } from "next/navigation"
import { NotificationBase, NotificationsPageProps, NotificationType } from "@/types/notifications"
import { useApp } from "@convolens/contexts"
import { Button } from "@/components/ui/button"
import { Check, Trash2, Clock, BellRing, FileText, Inbox, AlertCircle } from "lucide-react"
import { mockNotifications } from "@/data/mockNotifications"
import styles from "./notifications.module.css"

const getNotificationIcon = (type: NotificationType): JSX.Element => {
  const iconProps = { className: styles.notificationIcon, 'aria-hidden': true }
  switch (type) {
    case 'summary-ready':
      return <FileText {...iconProps} />
    case 'while-away':
      return <Inbox {...iconProps} />
    case 'scheduled-digest':
      return <BellRing {...iconProps} />
    default:
      return <BellRing {...iconProps} />
  }
}

const formatDate = (dateString: string) => {
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

// API Service stubs
const notificationService = {
  fetchNotifications: async (): Promise<NotificationBase[]> => {
    // In a real app, this would be an API call
    await new Promise(resolve => setTimeout(resolve, 500))
    return [...mockNotifications] // Return a copy to avoid mutations
  },
  
  markAsRead: async (id: string): Promise<void> => {
    // In a real app, this would be an API call
    await new Promise(resolve => setTimeout(resolve, 200))
  },
  
  markAllAsRead: async (ids: string[]): Promise<void> => {
    // In a real app, this would be an API call
    await new Promise(resolve => setTimeout(resolve, 200))
  },
  
  deleteNotification: async (id: string): Promise<void> => {
    // In a real app, this would be an API call
    await new Promise(resolve => setTimeout(resolve, 200))
  }
}

export default function Notifications({ onMarkAsRead, onDeleteNotification }: NotificationsPageProps) {
  const router = useRouter()
  const { markNotificationAsRead: markReadInContext } = useApp()
  
  const [notifications, setNotifications] = useState<NotificationBase[]>([])
  const [filter, setFilter] = useState<"all" | "unread" | "read">("all")
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        setError(null)
        setIsLoading(true)
        const data = await notificationService.fetchNotifications()
        setNotifications(data)
      } catch (err) {
        console.error('Failed to fetch notifications:', err)
        setError('Failed to load notifications. Please try again later.')
      } finally {
        setIsLoading(false)
      }
    }

    fetchNotifications()
  }, [])

  const filteredNotifications = notifications.filter((notification) => {
    if (filter === "all") return true
    if (filter === "unread") return !notification.isRead
    if (filter === "read") return notification.isRead
    return true
  })

  const handleMarkAsRead = async (id: string) => {
    try {
      setError(null)
      
      // Update optimistically
      setNotifications(prev =>
        prev.map(notification =>
          notification.id === id ? { ...notification, isRead: true } : notification
        )
      )
      
      // Call the appropriate handler
      if (onMarkAsRead) {
        await onMarkAsRead(id)
      } else if (markReadInContext) {
        await markReadInContext(id)
      } else {
        await notificationService.markAsRead(id)
      }
    } catch (error) {
      console.error('Failed to mark notification as read:', error)
      setError('Failed to mark notification as read. Please try again.')
      
      // Revert on error
      setNotifications(prev =>
        prev.map(notification =>
          notification.id === id ? { ...notification, isRead: false } : notification
        )
      )
    }
  }

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    
    if (!window.confirm('Are you sure you want to delete this notification?')) {
      return
    }
    
    // Store the notification before removing it
    const notificationToDelete = notifications.find(n => n.id === id)
    if (!notificationToDelete) return
    
    try {
      setError(null)
      
      // Optimistic update
      setNotifications(prev => prev.filter(notification => notification.id !== id))
      
      // Call the appropriate handler
      if (onDeleteNotification) {
        await onDeleteNotification(id)
      } else {
        await notificationService.deleteNotification(id)
      }
    } catch (error) {
      console.error('Failed to delete notification:', error)
      setError('Failed to delete notification. Please try again.')
      
      // Revert on error
      setNotifications(prev => [...prev, notificationToDelete].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      ))
    }
  }

  const handleNotificationClick = (notification: NotificationBase) => {
    handleMarkAsRead(notification.id)
    if (notification.actionUrl) {
      router.push(notification.actionUrl)
    }
  }

  const markAllAsRead = async () => {
    // Get unread notifications before any state changes
    const unreadNotifications = notifications.filter((n: NotificationBase) => !n.isRead)
    const unreadIds = unreadNotifications.map((n: NotificationBase) => n.id)
    
    if (unreadIds.length === 0) return
    
    // Store the current state for potential rollback
    const previousState = [...notifications]
    
    try {
      setError(null)
      
      // Optimistic update
      setNotifications(prev =>
        prev.map(notification => ({
          ...notification,
          isRead: true
        }))
      )
      
      // Call the appropriate handler
      if (markReadInContext) {
        await Promise.all(unreadIds.map(id => markReadInContext(id)))
      } else {
        await notificationService.markAllAsRead(unreadIds)
      }
    } catch (error) {
      console.error('Failed to mark all as read:', error)
      setError('Failed to mark all notifications as read. Please try again.')
      
      // Revert to previous state on error
      setNotifications(previousState)
    }
  }

  if (isLoading) {
    return (
      <div className={styles.loadingState} role="status" aria-live="polite">
        <div className={styles.loadingSpinner} aria-hidden="true"></div>
        <p>Loading notifications...</p>
      </div>
    )
  }
  
  if (error) {
    return (
      <div className={styles.errorState} role="alert">
        <AlertCircle className={styles.errorIcon} />
        <p>{error}</p>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => window.location.reload()}
          className={styles.retryButton}
        >
          Retry
        </Button>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Notifications</h1>
          <p className={styles.subtitle}>Manage your alerts and updates</p>
        </div>
        <div className={styles.headerActions}>
          <Button
            variant="outline"
            size="sm"
            onClick={markAllAsRead}
            disabled={!notifications.some(n => !n.isRead)}
          >
            <Check className="mr-2 h-4 w-4" />
            Mark all as read
          </Button>
        </div>
      </div>

      <div className={styles.content}>
        <div className={styles.sidebar}>
          <div className={styles.filterGroup}>
            <h3 className={styles.filterTitle}>Filter by</h3>
            <button
              className={`${styles.filterButton} ${filter === "all" ? styles.active : ""}`}
              onClick={() => setFilter("all")}
              aria-pressed={filter === "all" ? 'true' : 'false'}
              aria-label="Show all notifications"
              type="button"
            >
              All Notifications
            </button>
            <button
              className={`${styles.filterButton} ${filter === "unread" ? styles.active : ""}`}
              onClick={() => setFilter("unread")}
              aria-pressed={filter === "unread" ? 'true' : 'false'}
              aria-label="Show unread notifications"
              type="button"
            >
              Unread
              {notifications.some(n => !n.isRead) && (
                <span className={styles.unreadBadge} aria-hidden="true">
                  {notifications.filter(n => !n.isRead).length}
                </span>
              )}
            </button>
            <button
              className={`${styles.filterButton} ${filter === "read" ? styles.active : ""}`}
              onClick={() => setFilter("read")}
              aria-pressed={filter === "read" ? 'true' : 'false'}
              aria-label="Show read notifications"
              type="button"
            >
              Read
            </button>
          </div>
        </div>

        <div className={styles.mainContent}>
          {filteredNotifications.length === 0 ? (
            <div className={styles.emptyState}>
              <div className={styles.emptyIcon}>
                <Inbox size={48} />
              </div>
              <h3>No notifications found</h3>
              <p>When you get new notifications, they'll appear here.</p>
            </div>
          ) : (
            <div className={styles.notificationsList} role="list">
              {filteredNotifications.map((notification) => (
                <div 
                  key={notification.id}
                  className={`${styles.notificationItem} ${
                    !notification.isRead ? styles.unread : ""
                  }`}
                  onClick={() => handleNotificationClick(notification)}
                  role="listitem"
                  aria-labelledby={`notification-${notification.id}-title`}
                  aria-describedby={`notification-${notification.id}-message`}
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleNotificationClick(notification);
                    }
                  }}
                >
                  <div className={styles.notificationIconContainer}>
                    {getNotificationIcon(notification.type)}
                  </div>
                  <div className={styles.notificationContent}>
                    <div className={styles.notificationHeader}>
                      <h4 
                        id={`notification-${notification.id}-title`}
                        className={styles.notificationTitle}
                      >
                        {notification.title}
                      </h4>
                      <span className={styles.notificationTime}>
                        <Clock className="mr-1 h-3.5 w-3.5" />
                        {formatDate(notification.createdAt)}
                      </span>
                    </div>
                    <p 
                      id={`notification-${notification.id}-message`}
                      className={styles.notificationMessage}
                    >
                      {notification.message}
                    </p>
                    <div className={styles.notificationActions}>
                      {!notification.isRead && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleMarkAsRead(notification.id)
                          }}
                        >
                          <Check className="mr-2 h-4 w-4" />
                          Mark as read
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => handleDelete(notification.id, e)}
                        aria-label={`Delete notification: ${notification.title}`}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

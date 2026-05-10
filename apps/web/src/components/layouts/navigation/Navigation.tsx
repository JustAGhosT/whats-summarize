"use client"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { useAuth } from "@convolens/contexts"
import { cn } from "@/lib/utils"
import {
  ChevronDown,
  LogOut,
  Menu,
  Search as SearchIcon,
  Settings,
  User,
  X
} from "lucide-react"
import { ThemeToggle } from "@/components/ui/theme-toggle"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import * as React from "react"
import { useNavigation } from "./hooks/useNavigation"
import styles from "./navigation.module.css"

type NavItem = {
  href: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  description?: string
  requiresAuth?: boolean
  onClick?: (e: React.MouseEvent) => void | Promise<void>
}

type NavLinkProps = {
  item: NavItem
  isActive: boolean
  onClick?: () => void
  className?: string
}

const NavLink = ({ item, isActive, onClick, className = '' }: NavLinkProps) => {
  const Icon = item.icon
  return (
    <Link
      href={item.href}
      className={cn(
        styles.navLink,
        isActive && styles.active,
        className
      )}
      onClick={onClick}
      aria-current={isActive ? 'page' : undefined}
    >
      <Icon className={styles.navIcon} />
      <span>{item.label}</span>
    </Link>
  )
}

const MobileNavLink = ({ item, isActive, onClick, className = '' }: NavLinkProps) => {
  const Icon = item.icon
  return (
    <Link
      href={item.href}
      className={cn(
        styles.mobileNavLink,
        isActive && styles.active,
        className
      )}
      onClick={onClick}
      aria-current={isActive ? 'page' : undefined}
    >
      <Icon className={styles.mobileNavIcon} />
      <span>{item.label}</span>
    </Link>
  )
}

export function Navigation() {
  const pathname = usePathname()
  const router = useRouter()
  const { user, isAuthenticated, logout } = useAuth()
  
  const {
    isScrolled,
    mobileMenuOpen,
    searchOpen,
    moreDropdownOpen,
    userDropdownOpen,
    toggleMobileMenu,
    toggleSearch,
    toggleMoreDropdown,
    toggleUserDropdown,
    handleUserMenuItemClick,
    moreDropdownRef,
    userDropdownRef,
    mobileMenuRef,
    searchBarRef,
    filteredNavItems,
    filteredMoreItems,
  } = useNavigation(isAuthenticated)

  const userMenuItems = [
    { 
      href: '/profile', 
      label: 'Your Profile', 
      icon: User,
      onClick: () => router.push('/profile')
    },
    { 
      href: '/settings', 
      label: 'Settings', 
      icon: Settings,
      onClick: () => router.push('/settings')
    },
    { 
      href: '#', 
      label: 'Sign out', 
      icon: LogOut,
      onClick: async (e: React.MouseEvent) => {
        e.preventDefault()
        try {
          // Use the logout function from the auth context
          if (typeof window !== 'undefined') {
            await logout()
            router.push('/')
          }
        } catch (error) {
          console.error('Error during logout:', error)
          // Fallback to a full page reload if there's an error
          window.location.href = '/'
        }
      }
    }
  ]

  return (
    <>
      <nav 
        className={cn(styles.nav, { 
          [styles.scrolled]: isScrolled,
          [styles.mobileMenuOpen]: mobileMenuOpen
        })} 
        ref={mobileMenuRef as React.RefObject<HTMLDivElement>}
      >
        <div className={styles.container}>
          {/* Mobile menu button */}
          <Button
            variant="ghost"
            size="icon"
            className={styles.mobileMenuButton}
            onClick={toggleMobileMenu}
            aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </Button>

          {/* Logo */}
          <div className={styles.logo}>
            <Link href="/" className={styles.logoLink}>
              <span className={styles.logoText}>ConvoLens</span>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className={styles.desktopNav}>
            <ul className={styles.navList}>
              {filteredNavItems.map((item) => (
                <li key={item.href}>
                  <NavLink
                    item={item}
                    isActive={pathname === item.href}
                    onClick={toggleMobileMenu}
                  />
                </li>
              ))}
              
              {filteredMoreItems.length > 0 && (
                <li className={styles.dropdownContainer}>
<DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        className={cn(styles.dropdownButton, {
                          [styles.dropdownOpen]: moreDropdownOpen,
                        })}
                        onClick={toggleMoreDropdown}
                        aria-expanded={moreDropdownOpen}
                        aria-haspopup="true"
                      >
                        More
                        <ChevronDown 
                          className={cn(styles.dropdownIcon, {
                            [styles.dropdownIconOpen]: moreDropdownOpen,
                          })} 
                          aria-hidden="true"
                        />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
                      {filteredMoreItems.map((item) => (
                        <DropdownMenuItem
                          key={item.href}
                          onClick={() => {
                            toggleMoreDropdown()
                            router.push(item.href)
                          }}
                        >
                          <item.icon className="mr-2 h-4 w-4" />
                          <span>{item.label}</span>
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </li>
              )}
            </ul>
          </div>

          {/* User Actions */}
          <div className={styles.actions}>
            {/* Search button */}
            <Button
              variant="ghost"
              size="icon"
              className={styles.searchButton}
              onClick={toggleSearch}
              aria-label="Search"
              aria-expanded={searchOpen}
            >
              <SearchIcon className={styles.icon} />
            </Button>

            {/* Theme Toggle */}
            <div className={styles.themeToggle}>
              <ThemeToggle />
            </div>

            {isAuthenticated ? (
              <div className={styles.dropdown} ref={userDropdownRef as React.RefObject<HTMLDivElement>}>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button 
                      className={cn(styles.userButton, userDropdownOpen && styles.active)}
                      onClick={toggleUserDropdown}
                      aria-expanded={userDropdownOpen}
                      aria-haspopup="true"
                    >
                      <User className={styles.userIcon} />
                      <span className={styles.userName}>
                        {user?.name || 'Account'}
                      </span>
                      <ChevronDown 
                        className={cn(styles.dropdownIcon, {
                          [styles.dropdownIconOpen]: userDropdownOpen,
                        })} 
                        aria-hidden="true"
                      />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    {userMenuItems.map((item) => (
                      <DropdownMenuItem
                        key={item.href}
                        onClick={(e) => {
                          handleUserMenuItemClick(e, item.href, () => {
                            if (item.onClick) {
                              item.onClick(e);
                            }
                          });
                        }}
                      >
                        <item.icon className="mr-2 h-4 w-4" />
                        <span>{item.label}</span>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ) : (
              <div className={styles.authButtons}>
                <Link 
                  href="/login" 
                  className={cn(styles.button, styles.loginButton)}
                  onClick={toggleMobileMenu}
                >
                  Log in
                </Link>
                <Link 
                  href="/signup" 
                  className={cn(styles.button, styles.signupButton)}
                  onClick={toggleMobileMenu}
                >
                  Sign up
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Mobile menu */}
        <div 
          className={cn(styles.mobileMenu, { [styles.open]: mobileMenuOpen })}
          aria-hidden={!mobileMenuOpen}
        >
          <div className={styles.mobileMenuContent}>
            <nav>
              <ul className={styles.mobileNavList}>
                {[...filteredNavItems, ...filteredMoreItems].map((item) => (
                  <li key={item.href}>
                    <MobileNavLink
                      item={item}
                      isActive={pathname === item.href}
                      onClick={toggleMobileMenu}
                    />
                  </li>
                ))}
              </ul>
            </nav>

            {!isAuthenticated && (
              <div className={styles.mobileAuthButtons}>
                <Link 
                  href="/login" 
                  className={cn(styles.button, styles.loginButton)}
                  onClick={toggleMobileMenu}
                >
                  Log in
                </Link>
                <Link 
                  href="/signup" 
                  className={cn(styles.button, styles.signupButton)}
                  onClick={toggleMobileMenu}
                >
                  Sign up
                </Link>
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* Search modal */}
      <div 
        ref={searchBarRef as React.RefObject<HTMLDivElement>}
        className={cn(styles.searchModal, { [styles.open]: searchOpen })}
      >
        <div className={styles.searchModalContent}>
          <div className="relative w-full">
            <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search..."
              autoFocus
              className={cn("pl-9 pr-9", styles.searchInput)}
              onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
                if (e.key === 'Escape') {
                  toggleSearch()
                }
              }}
            />
            <button
              onClick={toggleSearch}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label="Clear search"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className={styles.searchResults}>
            {/* Search results will be rendered here */}
          </div>
        </div>
      </div>
    </>
  )
}
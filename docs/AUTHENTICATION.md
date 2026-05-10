# Authentication System Documentation

This document outlines the authentication system implemented in the ConvoLens application.

## Features

- Email/Password authentication
- Social login (Google, GitHub)
- Password reset flow
- Protected routes
- Session management
- Error handling

## Setup

### Environment Variables

Create a `.env.local` file in the root directory with the following variables:

```env
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
NEXT_PUBLIC_APP_NAME=convolens
```

### Supabase Configuration

1. Create a new project in Supabase
2. Enable Email/Password authentication in Authentication > Providers
3. Configure Google and GitHub OAuth providers if needed
4. Update the site URL in Authentication > URL Configuration to include your local development URL (e.g., `http://localhost:3000`)
5. Add the following redirect URLs to your Supabase project:
   - `http://localhost:3000/auth/callback`
   - `http://localhost:3000/auth/callback?next=/`
   - `http://localhost:3000/auth/callback?next=/dashboard`
   - `http://localhost:3000/auth/callback?next=/login`
   - `http://localhost:3000/auth/callback?next=/signup`
   - `http://localhost:3000/auth/callback?next=/forgot-password`

## Authentication Flow

### 1. Sign Up

1. User navigates to `/signup`
2. User enters email and password
3. Form validates input
4. On submit, `signUp` function is called from `auth-context`
5. On success, user is redirected to the dashboard (`/`)
6. On error, error message is displayed

### 2. Sign In

1. User navigates to `/login`
2. User enters email and password or selects a social provider
3. For email/password:
   - Form validates input
   - `signInWithEmail` function is called
   - On success, user is redirected to the dashboard or the page they were trying to access
   - On error, error message is displayed
4. For social providers:
   - User is redirected to the provider's login page
   - After authentication, they are redirected back to `/auth/callback`
   - The callback route exchanges the auth code for a session
   - User is then redirected to the dashboard or the page they were trying to access

### 3. Password Reset

1. User navigates to `/forgot-password`
2. User enters their email
3. Form validates input
4. On submit, `resetPassword` function is called
5. User sees a success message with instructions to check their email
6. User clicks the reset link in their email
7. User is taken to a page to enter a new password
8. After setting a new password, user is logged in and redirected to the dashboard

### 4. Protected Routes

- Routes that require authentication are wrapped in the `ProtectedRoute` component
- If an unauthenticated user tries to access a protected route, they are redirected to the login page with a `redirectedFrom` parameter
- After successful login, they are redirected back to the original page they were trying to access

## Components

### AuthProvider

- Wraps the application in `app/layout.tsx`
- Manages authentication state and provides auth methods
- Handles session persistence

### ProtectedRoute

- Wraps protected routes
- Redirects unauthenticated users to the login page
- Shows a loading state while checking authentication status

## API Routes

### `/auth/callback`

- Handles OAuth callbacks from social providers
- Exchanges the auth code for a session
- Redirects the user to the appropriate page

## Error Handling

- Authentication errors are displayed to the user in a user-friendly way
- Network errors are logged to the console
- Form validation errors are shown inline with the relevant fields

## Security Considerations

- Passwords are never stored in the client
- All authentication is handled by Supabase
- Session tokens are stored in HTTP-only cookies
- CSRF protection is enabled
- Rate limiting is handled by Supabase

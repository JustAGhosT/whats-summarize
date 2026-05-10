"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { useAuth } from "@convolens/contexts"
import { Loader2, AlertCircle, CheckCircle } from "lucide-react"
import PageWrapper from "../page-wrapper"

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const { resetPassword } = useAuth()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!email) {
      setError("Please enter your email")
      return
    }

    try {
      setError(null)
      setIsLoading(true)
      await resetPassword(email)
      setSuccess(true)
    } catch (err: any) {
      console.error("Password reset error:", err)
      setError(err.message || "Failed to send password reset email")
    } finally {
      setIsLoading(false)
    }
  }

  if (success) {
    return (
      <PageWrapper>
        <div className="flex items-center justify-center min-h-[80vh]">
          <Card className="w-full max-w-md shadow-lg card-border-animation relative">
          {/* Animated gradient border effect */}
          <div className="h-1.5 bg-gradient-to-r from-[#25D366] via-[#34E89E] to-[#128C7E] animate-gradient-x"></div>
          
          <CardHeader className="space-y-2 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
            <CardTitle className="text-2xl font-bold">Check your email</CardTitle>
            <CardDescription>
              We've sent a password reset link to {email}
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-sm text-muted-foreground">
              If you don't see the email, check your spam folder or try again.
            </p>
          </CardContent>
          <CardFooter className="flex justify-center">
            <Button asChild variant="link" className="text-sm">
              <Link href="/login">Back to login</Link>
            </Button>
          </CardFooter>
        </Card>
        </div>
      </PageWrapper>
    )
  }

  return (
    <PageWrapper>
      <div className="flex items-center justify-center min-h-[80vh]">
        <Card className="w-full max-w-md shadow-lg card-border-animation relative">
        {/* Animated gradient border effect */}
        <div className="h-1.5 bg-gradient-to-r from-[#25D366] via-[#34E89E] to-[#128C7E] animate-gradient-x"></div>
        
        <CardHeader className="space-y-2 text-center">
          <CardTitle className="text-2xl font-bold">Forgot your password?</CardTitle>
          <CardDescription>
            Enter your email and we'll send you a link to reset your password
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            {error && (
              <div className="bg-destructive/10 text-destructive p-3 rounded-md text-sm flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                <span>{error}</span>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="m@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Send reset link
            </Button>
          </CardContent>
        </form>
        <CardFooter className="flex justify-center">
          <Button asChild variant="link" className="text-sm">
            <Link href="/login">Back to login</Link>
          </Button>
        </CardFooter>
      </Card>
      </div>
    </PageWrapper>
  )
}

"use client";

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@convolens/contexts';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, User, Mail, Lock, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { toast } from '@/components/ui/toaster';
import { cn } from '@/lib/utils';
import Link from 'next/link';

interface SignupFormProps {
  onSuccess?: () => void;
  onSwitchToLogin?: () => void;
  showHeader?: boolean;
  showLoginLink?: boolean;
  className?: string;
}

const validateEmail = (email: string) => {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
};

type FormState = {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  showPassword: boolean;
  errors: {
    name?: string;
    email?: string;
    password?: string;
    confirmPassword?: string;
  };
};

export function SignupForm({
  onSuccess,
  onSwitchToLogin,
  showHeader = true,
  showLoginLink = true,
  className,
}: SignupFormProps) {
  const { signUpWithEmail, updateUser } = useAuth();
  const [form, setForm] = useState<FormState>({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    showPassword: false,
    errors: {}
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    // Pre-fill email if passed as query param
    const emailParam = searchParams?.get('email');
    if (emailParam) {
      setForm(prev => ({ ...prev, email: emailParam }));
    }
  }, [searchParams]);

  const validateForm = (): boolean => {
    const errors: FormState['errors'] = {};
    
    if (!form.name.trim()) {
      errors.name = 'Name is required';
    }
    
    if (!form.email.trim()) {
      errors.email = 'Email is required';
    } else if (!validateEmail(form.email)) {
      errors.email = 'Please enter a valid email address';
    }
    
    if (!form.password) {
      errors.password = 'Password is required';
    } else if (form.password.length < 6) {
      errors.password = 'Password must be at least 6 characters';
    }
    
    if (form.password !== form.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }
    
    setForm(prev => ({ ...prev, errors }));
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setIsSubmitting(true);
    
    try {
      // First, sign up with email and password
      const { error } = await signUpWithEmail(form.email, form.password);
      
      if (error) throw error;
      
      // Then update the user's profile with their name
      if (form.name) {
        const success = await updateUser({ name: form.name });
        if (!success) {
          console.warn('Failed to update user profile');
          // Continue anyway since the account was created successfully
        }
      }
      
      toast({
        title: 'Account created!',
        description: 'Your account has been successfully created.',
        variant: 'success',
      });
      
      if (onSuccess) {
        onSuccess();
      } else {
        // Default behavior: redirect to login with email pre-filled
        router.push(`/login?email=${encodeURIComponent(form.email)}`);
      }
    } catch (error: any) {
      toast({
        title: 'Signup failed',
        description: error?.message || 'An error occurred during signup',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm(prev => ({
      ...prev,
      [name]: value,
      errors: {
        ...prev.errors,
        [name]: undefined // Clear error when user types
      }
    }));
  };

  const togglePasswordVisibility = () => {
    setForm(prev => ({
      ...prev,
      showPassword: !prev.showPassword
    }));
  };

  return (
    <div className={cn('space-y-6', className)}>
      {showHeader && (
        <div className="space-y-2 text-center">
          <h2 className="text-2xl font-bold">Create an account</h2>
          <p className="text-muted-foreground">
            Enter your information to get started
          </p>
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Name Field */}
        <div className="space-y-2">
          <Label htmlFor="name" className="text-sm font-medium">
            Full Name
          </Label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <User className="h-4 w-4 text-muted-foreground" />
            </div>
            <Input
              id="name"
              name="name"
              type="text"
              placeholder="John Doe"
              value={form.name}
              onChange={handleInputChange}
              className={cn(
                'pl-10',
                form.errors.name && 'border-destructive focus-visible:ring-destructive',
              )}
              disabled={isSubmitting}
              autoComplete="name"
              aria-invalid={!!form.errors.name}
              aria-describedby={form.errors.name ? 'name-error' : undefined}
            />
          </div>
          {form.errors.name && (
            <p id="name-error" className="text-xs text-destructive flex items-start mt-1">
              <AlertCircle className="h-3 w-3 mr-1 mt-0.5 flex-shrink-0" />
              <span>{form.errors.name}</span>
            </p>
          )}
        </div>
        
        {/* Email Field */}
        <div className="space-y-2">
          <Label htmlFor="email" className="text-sm font-medium">
            Email
          </Label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Mail className="h-4 w-4 text-muted-foreground" />
            </div>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="you@example.com"
              value={form.email}
              onChange={handleInputChange}
              className={cn(
                'pl-10',
                form.errors.email && 'border-destructive focus-visible:ring-destructive',
              )}
              disabled={isSubmitting}
              autoComplete="email"
              aria-invalid={!!form.errors.email}
              aria-describedby={form.errors.email ? 'email-error' : undefined}
            />
          </div>
          {form.errors.email && (
            <p id="email-error" className="text-xs text-destructive flex items-start mt-1">
              <AlertCircle className="h-3 w-3 mr-1 mt-0.5 flex-shrink-0" />
              <span>{form.errors.email}</span>
            </p>
          )}
        </div>
        
        {/* Password Field */}
        <div className="space-y-2">
          <Label htmlFor="password" className="text-sm font-medium">
            Password
          </Label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Lock className="h-4 w-4 text-muted-foreground" />
            </div>
            <Input
              id="password"
              name="password"
              type={form.showPassword ? 'text' : 'password'}
              placeholder="••••••••"
              value={form.password}
              onChange={handleInputChange}
              className={cn(
                'pl-10 pr-10',
                form.errors.password && 'border-destructive focus-visible:ring-destructive',
              )}
              disabled={isSubmitting}
              autoComplete="new-password"
              aria-invalid={!!form.errors.password}
              aria-describedby={form.errors.password ? 'password-error' : undefined}
            />
            <button
              type="button"
              onClick={togglePasswordVisibility}
              disabled={isSubmitting}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-muted-foreground hover:text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 rounded"
              aria-label={form.showPassword ? 'Hide password' : 'Show password'}
            >
              {form.showPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>
          {form.errors.password && (
            <p id="password-error" className="text-xs text-destructive flex items-start mt-1">
              <AlertCircle className="h-3 w-3 mr-1 mt-0.5 flex-shrink-0" />
              <span>{form.errors.password}</span>
            </p>
          )}
        </div>
        
        {/* Confirm Password Field */}
        <div className="space-y-2">
          <Label htmlFor="confirmPassword" className="text-sm font-medium">
            Confirm Password
          </Label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Lock className="h-4 w-4 text-muted-foreground" />
            </div>
            <Input
              id="confirmPassword"
              name="confirmPassword"
              type={form.showPassword ? 'text' : 'password'}
              placeholder="••••••••"
              value={form.confirmPassword}
              onChange={handleInputChange}
              className={cn(
                'pl-10',
                form.errors.confirmPassword && 'border-destructive focus-visible:ring-destructive',
              )}
              disabled={isSubmitting}
              autoComplete="new-password"
              aria-invalid={!!form.errors.confirmPassword}
              aria-describedby={form.errors.confirmPassword ? 'confirm-password-error' : undefined}
            />
          </div>
          {form.errors.confirmPassword && (
            <p id="confirm-password-error" className="text-xs text-destructive flex items-start mt-1">
              <AlertCircle className="h-3 w-3 mr-1 mt-0.5 flex-shrink-0" />
              <span>{form.errors.confirmPassword}</span>
            </p>
          )}
        </div>
        
        <Button 
          type="submit" 
          variant="primary"
          className="w-full h-11 text-base font-medium"
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Creating account...
            </>
          ) : (
            'Create Account'
          )}
        </Button>
      </form>
      
      {showLoginLink && (
        <div className="text-center text-sm">
          <span className="text-muted-foreground">Already have an account? </span>
          {onSwitchToLogin ? (
            <button
              type="button"
              onClick={onSwitchToLogin}
              className="font-medium text-primary hover:underline"
              disabled={isSubmitting}
            >
              Sign in
            </button>
          ) : (
            <Link 
              href="/login" 
              className="font-medium text-primary hover:underline"
              tabIndex={isSubmitting ? -1 : 0}
            >
              Sign in
            </Link>
          )}
        </div>
      )}
    </div>
  );
}

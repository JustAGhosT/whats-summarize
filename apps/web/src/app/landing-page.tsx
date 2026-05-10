"use client"

import Image from "next/image"
import Link from "next/link"
import { ArrowRight, MessageSquare, BarChart2, Search, Shield, Zap } from "lucide-react"
import styles from "./landing-page.module.css"
import { useEffect, useRef, ComponentType, MouseEvent as ReactMouseEvent } from "react"
import { initMouseTracking, initStaggeredAnimations } from "@/lib/animation-utils"
import "./enhanced-styles.css"

interface FeatureCardProps {
  icon: ComponentType<{ className?: string }>;
  title: string;
  description: string;
}

type MouseEvent = ReactMouseEvent<HTMLDivElement>;

const FeatureCard = ({ icon: Icon, title, description }: FeatureCardProps) => {
  const cardRef = useRef<HTMLDivElement>(null)
  
  useEffect(() => {
    const card = cardRef.current
    if (!card) return
    
    const handleMouseMove = (e: MouseEvent) => {
      const rect = card.getBoundingClientRect()
      const x = ((e.clientX - rect.left) / rect.width) * 100
      const y = ((e.clientY - rect.top) / rect.height) * 100
      card.style.setProperty('--x', `${x}%`)
      card.style.setProperty('--y', `${y}%`)
    }
    
    const mouseMoveHandler = (e: MouseEvent) => handleMouseMove(e as unknown as MouseEvent<HTMLDivElement>)
    card.addEventListener('mousemove', mouseMoveHandler as EventListener)
    return () => card.removeEventListener('mousemove', mouseMoveHandler as EventListener)
  }, [])
  
  return (
    <div 
      ref={cardRef}
      className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md border border-gray-100 dark:border-gray-700 hover-card"
    >
      <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mb-4">
        <Icon className="h-6 w-6 text-green-600 dark:text-green-400" />
      </div>
      <h3 className="text-xl font-semibold mb-2 text-gray-900 dark:text-white">{title}</h3>
      <p className="text-gray-600 dark:text-gray-400">{description}</p>
    </div>
  )
}

const LandingPage = () => {
  useEffect(() => {
    // Initialize mouse tracking for hover cards
    initMouseTracking('.hover-card')
    
    // Initialize staggered animations for feature cards
    initStaggeredAnimations('.feature-card', {
      threshold: 0.1,
      baseDelay: 100,
      className: 'animate-fade-in'
    })
    
    // Initialize staggered animations for testimonials
    initStaggeredAnimations('.testimonial-card', {
      threshold: 0.1,
      baseDelay: 150,
      className: 'animate-fade-in'
    })
  }, [])
  
  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Vector Shapes Background - Only in hero section */}
      <div className={`${styles.vectorShapes} vector-shapes`}>
        <div className="vector-circle"></div>
        <div className="vector-square"></div>
        <div className="vector-hexagon"></div>
        <div className="vector-diamond"></div>
      </div>
      
      {/* Hero Section */}
      <section className={`relative pt-24 pb-32 overflow-hidden bg-gradient ${styles.heroGradient}`}>
        <div className="absolute inset-0 z-0 opacity-30 dark:opacity-20">
          <div className="absolute right-0 top-0 w-80 h-80 bg-green-300 dark:bg-green-700 rounded-full filter blur-3xl -translate-y-1/2 translate-x-1/4"></div>
          <div className="absolute left-0 bottom-0 w-80 h-80 bg-green-200 dark:bg-green-800 rounded-full filter blur-3xl translate-y-1/2 -translate-x-1/4"></div>
        </div>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="flex flex-col lg:flex-row items-center">
            <div className="lg:w-1/2 lg:pr-12">
              <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-gray-900 dark:text-white leading-tight text-gradient">
                Understand your WhatsApp conversations better
              </h1>
              <p className="mt-6 text-xl text-gray-600 dark:text-gray-300 max-w-2xl">
                Analyze, summarize, and gain insights from your WhatsApp chats with our powerful AI-driven tools.
              </p>
              <div className="mt-10 flex flex-col sm:flex-row gap-4">
                <Link 
                  href="/signup" 
                  className="px-8 py-3 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg shadow-md hover:shadow-lg transition-all duration-200 text-center btn-glow"
                >
                  Get Started Free
                </Link>
                <Link 
                  href="/features" 
                  className="px-8 py-3 glassmorphism text-gray-900 dark:text-white font-medium rounded-lg shadow-md hover:shadow-lg transition-all duration-200 text-center flex items-center justify-center"
                >
                  Learn More <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </div>
            </div>
            <div className="lg:w-1/2 mt-12 lg:mt-0">
              <div className="relative w-full max-w-lg mx-auto">
                <div className="absolute top-0 -left-4 w-72 h-72 bg-green-300 dark:bg-green-700 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob"></div>
                <div className="absolute top-0 -right-4 w-72 h-72 bg-green-400 dark:bg-green-600 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-2000"></div>
                <div className="absolute -bottom-8 left-20 w-72 h-72 bg-green-200 dark:bg-green-800 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-4000"></div>
                <div className="relative">
                  <div className="relative shadow-2xl rounded-2xl overflow-hidden border-8 border-white dark:border-gray-800 hover-card">
                    <Image 
                      src="/images/dashboard.png" 
                      alt="ConvoLens Dashboard"
                      width={600} 
                      height={400} 
                      className="w-full h-auto"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-gray-50 dark:bg-gray-900 relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white sm:text-4xl text-shadow">
              Powerful features to analyze your conversations
            </h2>
            <p className="mt-4 text-xl text-gray-600 dark:text-gray-400">
              Everything you need to understand and get insights from your WhatsApp chats.
            </p>
          </div>

          <div className="mt-16 grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            <div className="feature-card">
              <FeatureCard 
                icon={MessageSquare}
                title="Chat Analysis"
                description="Analyze message patterns, response times, and conversation flow to understand communication dynamics."
              />
            </div>
            <div className="feature-card">
              <FeatureCard 
                icon={BarChart2}
                title="Visual Analytics"
                description="View beautiful charts and visualizations that make it easy to understand your conversation data."
              />
            </div>
            <div className="feature-card">
              <FeatureCard 
                icon={Search}
                title="Smart Search"
                description="Quickly find messages across all your conversations with our powerful search capabilities."
              />
            </div>
            <div className="feature-card">
              <FeatureCard 
                icon={Shield}
                title="Privacy Focused"
                description="Your data never leaves your device. All processing happens locally for maximum privacy."
              />
            </div>
            <div className="feature-card">
              <FeatureCard 
                icon={Zap}
                title="Fast Processing"
                description="Our optimized algorithms process even large chat histories in seconds."
              />
            </div>
            <div className="feature-card">
              <div className="bg-gradient-to-br from-green-500 to-green-600 dark:from-green-600 dark:to-green-700 p-6 rounded-xl shadow-md text-white hover-card">
                <h3 className="text-xl font-semibold mb-2">Ready to get started?</h3>
                <p className="mb-4">Try ConvoLens today and gain new insights from your conversations.</p>
                <Link 
                  href="/signup" 
                  className="inline-block px-5 py-2 bg-white text-green-600 font-medium rounded-lg hover:bg-gray-100 transition-colors duration-200 btn-glow"
                >
                  Sign up free
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 bg-white dark:bg-gray-800 relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white sm:text-4xl text-shadow">
              Loved by users worldwide
            </h2>
            <p className="mt-4 text-xl text-gray-600 dark:text-gray-400">
              See what people are saying about ConvoLens
            </p>
          </div>

          <div className="mt-16 grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {[
              {
                quote: "ConvoLens helped me understand communication patterns in my team chat that I never noticed before.",
                author: "Sarah J.",
                role: "Project Manager"
              },
              {
                quote: "The insights I got from analyzing my business chats were invaluable. Highly recommended!",
                author: "Michael T.",
                role: "Small Business Owner"
              },
              {
                quote: "Clean interface, powerful features, and respects my privacy. What more could I ask for?",
                author: "Priya K.",
                role: "Software Developer"
              }
            ].map((testimonial, i) => (
              <div key={i} className="testimonial-card">
                <div className="bg-gray-50 dark:bg-gray-700 p-6 rounded-xl shadow-md hover-card">
                  <div className="flex items-center mb-4">
                    <div className="h-10 w-10 rounded-full bg-green-100 dark:bg-green-800 flex items-center justify-center">
                      <span className="text-green-600 dark:text-green-400 font-bold">{testimonial.author[0]}</span>
                    </div>
                    <div className="ml-4">
                      <h4 className="font-semibold text-gray-900 dark:text-white">{testimonial.author}</h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400">{testimonial.role}</p>
                    </div>
                  </div>
                  <p className="text-gray-600 dark:text-gray-300 italic">"<span className="text-shadow">{testimonial.quote}</span>"</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className={`py-20 bg-gradient relative z-10 ${styles.ctaGradient}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold sm:text-4xl text-white text-shadow">
            Ready to understand your conversations better?
          </h2>
          <p className="mt-4 text-xl text-green-100 max-w-2xl mx-auto">
            Join thousands of users who are gaining insights from their WhatsApp chats.
          </p>
          <div className="mt-10">
            <Link 
              href="/signup" 
              className="px-8 py-3 bg-white text-green-700 font-medium rounded-lg shadow-md hover:bg-gray-100 transition-colors duration-200 inline-block transform-none"
              style={{ backfaceVisibility: 'hidden' }}
            >
              Get Started Free
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}

export default LandingPage
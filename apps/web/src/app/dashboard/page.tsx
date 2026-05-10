"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@convolens/contexts';
import { BarChart2, MessageSquare, Shield, Zap, Plus, Settings, FileText } from 'lucide-react';
import PageWrapper from '../page-wrapper';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { StyledCard } from '@/components/ui/styled-card';
import { EmptyState } from '@/components/ui/empty-state';

export default function DashboardPage() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login?redirectTo=/dashboard');
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null; // Will redirect in useEffect
  }

  return (
    <PageWrapper>
        <PageHeader 
          title="Dashboard"
          description="Welcome to your WhatsApp Conversation Summarizer dashboard"
          actions={
            <Button className="btn-primary">
              <Plus className="mr-2 h-4 w-4" />
              New Summary
            </Button>
          }
        />
        
        <div className="card-grid">
        <StyledCard
          title="Recent Summaries"
          icon={<MessageSquare className="h-6 w-6" />}
          footer={
            <Button 
              className="w-full"
              onClick={() => router.push('/summaries')}
            >
              Create Summary
            </Button>
          }
        >
          <p className="text-muted-foreground">You have no recent summaries.</p>
        </StyledCard>
        
        <StyledCard
          title="Statistics"
          icon={<BarChart2 className="h-6 w-6" />}
        >
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total Summaries</span>
              <span className="font-medium text-foreground">0</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total Chats</span>
              <span className="font-medium text-foreground">0</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Last Activity</span>
              <span className="font-medium text-foreground">Today</span>
            </div>
          </div>
        </StyledCard>
        
        <StyledCard
          title="Quick Actions"
          icon={<Zap className="h-6 w-6" />}
        >
          <div className="space-y-3">
            <Button 
              variant="secondary"
              className="w-full"
              onClick={() => router.push('/summaries')}
            >
              Upload Chat
            </Button>
            <Button 
              variant="outline"
              className="w-full"
              onClick={() => router.push('/settings')}
            >
              <Settings className="mr-2 h-4 w-4" />
              Settings
            </Button>
          </div>
        </StyledCard>
      </div>
      
      <div className="mt-8">
        <div className="section">
          <h2>Recent Activity</h2>
          <StyledCard>
            <EmptyState
              title="No recent activity"
              description="When you start using the app, your recent activities will appear here."
              icon={<FileText className="h-6 w-6 text-muted-foreground" />}
            />
          </StyledCard>
        </div>
        
        <div className="section">
          <h2>Recommended Actions</h2>
          <div className="stats-grid">
            <StyledCard gradient={false} className="text-center">
              <div className="card-icon mx-auto mb-2">
                <MessageSquare className="h-6 w-6" />
              </div>
              <div className="text-3xl font-bold mb-1">0</div>
              <div className="text-xs uppercase tracking-wider text-muted-foreground">Chats Analyzed</div>
            </StyledCard>
            <StyledCard gradient={false} className="text-center">
              <div className="card-icon mx-auto mb-2">
                <BarChart2 className="h-6 w-6" />
              </div>
              <div className="text-3xl font-bold mb-1">0</div>
              <div className="text-xs uppercase tracking-wider text-muted-foreground">Insights Generated</div>
            </StyledCard>
            <StyledCard gradient={false} className="text-center">
              <div className="card-icon mx-auto mb-2">
                <Shield className="h-6 w-6" />
              </div>
              <div className="text-3xl font-bold mb-1">0</div>
              <div className="text-xs uppercase tracking-wider text-muted-foreground">Privacy Score</div>
            </StyledCard>
          </div>
        </div>
      </div>
    </PageWrapper>
  );
}
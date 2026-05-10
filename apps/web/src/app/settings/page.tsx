"use client";

import { useState } from "react";
import { useAuth } from "@convolens/contexts";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { StyledCard } from "@/components/ui/styled-card";
import PageWrapper from "../page-wrapper";
import { Settings, Bell, Shield, User, Moon } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function SettingsPage() {
  const { user } = useAuth();
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(true);
  const [dataCollection, setDataCollection] = useState(false);

  return (
    <PageWrapper>
      <PageHeader
        title="Settings"
        description="Manage your account preferences and settings"
      />

      <Tabs defaultValue="general" className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="general">
            <Settings className="h-4 w-4 mr-2" />
            General
          </TabsTrigger>
          <TabsTrigger value="notifications">
            <Bell className="h-4 w-4 mr-2" />
            Notifications
          </TabsTrigger>
          <TabsTrigger value="privacy">
            <Shield className="h-4 w-4 mr-2" />
            Privacy
          </TabsTrigger>
          <TabsTrigger value="account">
            <User className="h-4 w-4 mr-2" />
            Account
          </TabsTrigger>
        </TabsList>

        <TabsContent value="general">
          <div className="grid gap-6">
            <StyledCard title="Theme" icon={<Moon className="h-6 w-6" />}>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="dark-mode">Dark Mode</Label>
                    <p className="text-sm text-muted-foreground">
                      Enable dark mode for the application
                    </p>
                  </div>
                  <Switch id="dark-mode" />
                </div>
              </div>
            </StyledCard>

            <StyledCard title="Language" icon={<Settings className="h-6 w-6" />}>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Application Language</Label>
                    <p className="text-sm text-muted-foreground">
                      Select your preferred language
                    </p>
                  </div>
                  <select className="border rounded p-2">
                    <option>English</option>
                    <option>Spanish</option>
                    <option>French</option>
                    <option>German</option>
                  </select>
                </div>
              </div>
            </StyledCard>
          </div>
        </TabsContent>

        <TabsContent value="notifications">
          <StyledCard title="Notification Settings" icon={<Bell className="h-6 w-6" />}>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="email-notifications">Email Notifications</Label>
                  <p className="text-sm text-muted-foreground">
                    Receive notifications via email
                  </p>
                </div>
                <Switch 
                  id="email-notifications" 
                  checked={emailNotifications}
                  onCheckedChange={setEmailNotifications}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="push-notifications">Push Notifications</Label>
                  <p className="text-sm text-muted-foreground">
                    Receive push notifications in your browser
                  </p>
                </div>
                <Switch 
                  id="push-notifications" 
                  checked={pushNotifications}
                  onCheckedChange={setPushNotifications}
                />
              </div>
            </div>
          </StyledCard>
        </TabsContent>

        <TabsContent value="privacy">
          <StyledCard title="Privacy Settings" icon={<Shield className="h-6 w-6" />}>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="data-collection">Data Collection</Label>
                  <p className="text-sm text-muted-foreground">
                    Allow anonymous usage data collection to improve the app
                  </p>
                </div>
                <Switch 
                  id="data-collection" 
                  checked={dataCollection}
                  onCheckedChange={setDataCollection}
                />
              </div>
            </div>
          </StyledCard>
        </TabsContent>

        <TabsContent value="account">
          <StyledCard title="Account Information" icon={<User className="h-6 w-6" />}>
            <div className="space-y-4">
              <div>
                <Label>Email</Label>
                <p className="text-sm font-medium">{user?.email || 'example@email.com'}</p>
              </div>
              
              <div className="pt-4 flex justify-end space-x-2">
                <Button variant="outline">Change Password</Button>
                <Button variant="destructive">Delete Account</Button>
              </div>
            </div>
          </StyledCard>
        </TabsContent>
      </Tabs>
    </PageWrapper>
  );
}
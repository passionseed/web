'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Cookie, Settings, Shield, BarChart3, Wrench, Users, ExternalLink } from 'lucide-react'

export default function CookiesPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
      <div className="container mx-auto px-6 py-20 max-w-4xl">
        <div className="text-center mb-12">
          <div className="flex justify-center mb-4">
            <Cookie className="h-16 w-16 text-amber-600" />
          </div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent mb-4">
            Cookie Policy
          </h1>
          <p className="text-lg text-muted-foreground">
            Last updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>

        <Card className="shadow-lg mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Cookie className="h-5 w-5" />
              What Are Cookies?
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground leading-relaxed">
              Cookies are small text files that are stored on your device when you visit Passion Seed. They help us provide you with a better experience by remembering your preferences, keeping you logged in, and helping us understand how you use our educational platform.
            </p>
          </CardContent>
        </Card>

        <div className="grid gap-6 md:grid-cols-3 mb-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Shield className="h-5 w-5 text-green-500" />
                Essential Only
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                We use only necessary cookies for core functionality - no tracking for ads.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Settings className="h-5 w-5 text-blue-500" />
                Your Control
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                You can manage cookie preferences in your browser settings.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Users className="h-5 w-5 text-purple-500" />
                Education First
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                All cookies serve educational purposes and platform functionality.
              </p>
            </CardContent>
          </Card>
        </div>

        <Card className="shadow-lg">
          <CardContent className="space-y-8 p-8">
            <section>
              <h2 className="text-2xl font-semibold mb-6">Types of Cookies We Use</h2>
              
              <div className="space-y-6">
                <Card className="border-green-200 bg-green-50 dark:bg-green-950 dark:border-green-800">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Shield className="h-5 w-5 text-green-600" />
                      1. Essential Cookies
                      <Badge variant="outline" className="ml-auto">Always Active</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-4">
                      These cookies are necessary for the website to function and cannot be switched off. They are usually set in response to actions you take.
                    </p>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="font-medium">Authentication</span>
                        <span className="text-sm text-muted-foreground">Keeps you logged in</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="font-medium">Security</span>
                        <span className="text-sm text-muted-foreground">Prevents unauthorized access</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="font-medium">Session Management</span>
                        <span className="text-sm text-muted-foreground">Maintains your session state</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="font-medium">Preferences</span>
                        <span className="text-sm text-muted-foreground">Remembers your settings</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-blue-200 bg-blue-50 dark:bg-blue-950 dark:border-blue-800">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Wrench className="h-5 w-5 text-blue-600" />
                      2. Functional Cookies
                      <Badge variant="outline" className="ml-auto">Optional</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-4">
                      These cookies enhance functionality and personalization, such as language preferences and region selection.
                    </p>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="font-medium">Language Preference</span>
                        <span className="text-sm text-muted-foreground">Remembers your language choice</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="font-medium">Dark/Light Mode</span>
                        <span className="text-sm text-muted-foreground">Saves your theme preference</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="font-medium">Dashboard Layout</span>
                        <span className="text-sm text-muted-foreground">Remembers your layout choices</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950 dark:border-amber-800">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <BarChart3 className="h-5 w-5 text-amber-600" />
                      3. Analytics Cookies
                      <Badge variant="outline" className="ml-auto">Optional</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-4">
                      These cookies help us understand how you interact with our platform to improve the educational experience.
                    </p>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="font-medium">Usage Analytics</span>
                        <span className="text-sm text-muted-foreground">Anonymous usage patterns</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="font-medium">Performance Monitoring</span>
                        <span className="text-sm text-muted-foreground">Page load times and errors</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="font-medium">Feature Usage</span>
                        <span className="text-sm text-muted-foreground">Which features are most helpful</span>
                      </div>
                    </div>
                    <div className="mt-4 p-3 bg-amber-100 dark:bg-amber-900 rounded-lg">
                      <p className="text-sm">
                        <strong>Note:</strong> All analytics data is anonymized and never tied to individual student identities.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </section>

            <Separator />

            <section>
              <h2 className="text-2xl font-semibold mb-4">Third-Party Services</h2>
              <div className="space-y-4 text-muted-foreground">
                <p>We use select third-party services that may set cookies to help provide our educational platform:</p>
                
                <div className="grid gap-4 md:grid-cols-2">
                  <Card className="p-4">
                    <h4 className="font-semibold text-foreground mb-2">Supabase (Database & Auth)</h4>
                    <p className="text-sm">Provides secure authentication and data storage for the platform.</p>
                  </Card>
                  
                  <Card className="p-4">
                    <h4 className="font-semibold text-foreground mb-2">Vercel (Hosting)</h4>
                    <p className="text-sm">Hosts our platform and may use cookies for performance optimization.</p>
                  </Card>
                </div>

                <p className="text-sm italic">
                  All third-party services are carefully selected and comply with our privacy standards and educational data protection requirements.
                </p>
              </div>
            </section>

            <Separator />

            <section>
              <h2 className="text-2xl font-semibold mb-4">Managing Your Cookie Preferences</h2>
              <div className="space-y-6 text-muted-foreground">
                <div>
                  <h3 className="text-lg font-semibold mb-3 text-foreground">Browser Settings</h3>
                  <p className="mb-3">You can control cookies through your browser settings:</p>
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="p-3 bg-muted/50 rounded-lg">
                      <h4 className="font-medium text-foreground">Block All Cookies</h4>
                      <p className="text-sm">Note: This may affect platform functionality</p>
                    </div>
                    <div className="p-3 bg-muted/50 rounded-lg">
                      <h4 className="font-medium text-foreground">Delete Existing Cookies</h4>
                      <p className="text-sm">Clear all stored cookies from your device</p>
                    </div>
                    <div className="p-3 bg-muted/50 rounded-lg">
                      <h4 className="font-medium text-foreground">Third-Party Cookies</h4>
                      <p className="text-sm">Block cookies from external services</p>
                    </div>
                    <div className="p-3 bg-muted/50 rounded-lg">
                      <h4 className="font-medium text-foreground">Incognito/Private Mode</h4>
                      <p className="text-sm">Browse without storing cookies</p>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-3 text-foreground">Browser-Specific Instructions</h3>
                  <div className="space-y-2">
                    <Button variant="outline" size="sm" className="w-full justify-between">
                      Chrome Cookie Settings
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="sm" className="w-full justify-between">
                      Firefox Cookie Settings
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="sm" className="w-full justify-between">
                      Safari Cookie Settings
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="sm" className="w-full justify-between">
                      Edge Cookie Settings
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </section>

            <Separator />

            <section>
              <h2 className="text-2xl font-semibold mb-4">Educational Context</h2>
              <div className="space-y-4 text-muted-foreground">
                <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 p-4 rounded-lg">
                  <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">Student Privacy Protection</h3>
                  <ul className="list-disc list-inside space-y-1 text-blue-800 dark:text-blue-200 text-sm">
                    <li>We do not use cookies for advertising or commercial tracking</li>
                    <li>Student data is never shared with advertisers or non-educational services</li>
                    <li>All cookies serve educational purposes or platform functionality</li>
                    <li>Schools and parents can request information about cookies used for their students</li>
                  </ul>
                </div>
                
                <p>
                  As an educational platform, we take extra care to ensure our use of cookies complies with educational privacy laws such as FERPA and COPPA.
                </p>
              </div>
            </section>

            <Separator />

            <section>
              <h2 className="text-2xl font-semibold mb-4">Cookie Retention</h2>
              <div className="space-y-4 text-muted-foreground">
                <p>Different types of cookies are stored for different periods:</p>
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="p-3 border rounded-lg">
                    <h4 className="font-medium text-foreground">Session Cookies</h4>
                    <p className="text-sm">Deleted when you close your browser</p>
                  </div>
                  <div className="p-3 border rounded-lg">
                    <h4 className="font-medium text-foreground">Persistent Cookies</h4>
                    <p className="text-sm">Stored for up to 1 year or until manually deleted</p>
                  </div>
                </div>
              </div>
            </section>

            <Separator />

            <section>
              <h2 className="text-2xl font-semibold mb-4">Changes to This Cookie Policy</h2>
              <p className="text-muted-foreground leading-relaxed">
                We may update this Cookie Policy from time to time to reflect changes in our practices or for operational, legal, or regulatory reasons. We will notify users of any material changes through the platform or email.
              </p>
            </section>

            <Separator />

            <section>
              <h2 className="text-2xl font-semibold mb-4">Contact Us</h2>
              <div className="space-y-4 text-muted-foreground">
                <p>If you have any questions about our use of cookies, please contact us:</p>
                <div className="bg-muted/50 p-4 rounded-lg">
                  <ul className="space-y-2">
                    <li><strong>Email:</strong> seedpassion@gmail.com</li>
                    <li><strong>Company:</strong> PassionSeed Company Limited</li>
                    <li><strong>Address:</strong> 135/4 Patak Street, Karon, Phuket 83100, Thailand</li>
                  </ul>
                </div>
                <p className="text-sm italic">
                  We're committed to transparency about our data practices and will respond to your questions promptly.
                </p>
              </div>
            </section>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
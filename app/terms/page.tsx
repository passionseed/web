'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
      <div className="container mx-auto px-6 py-20 max-w-4xl">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent mb-4">
            Terms of Service
          </h1>
          <p className="text-lg text-muted-foreground">
            Last updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>

        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>Agreement to Terms</CardTitle>
          </CardHeader>
          <CardContent className="space-y-8">
            <section>
              <p className="text-muted-foreground leading-relaxed">
                By accessing and using Passion Seed ("the Service"), operated by PassionSeed Company Limited ("we," "our," or "us"), you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use our Service.
              </p>
            </section>

            <Separator />

            <section>
              <h2 className="text-2xl font-semibold mb-4">1. Description of Service</h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                Passion Seed is an educational platform designed for schools to help students discover their purpose and reach their fullest potential through:
              </p>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
                <li>Interactive learning maps and educational content</li>
                <li>Classroom management tools for educators</li>
                <li>Student reflection and goal-setting features</li>
                <li>Team collaboration and project management</li>
                <li>Progress tracking and assessment tools</li>
              </ul>
            </section>

            <Separator />

            <section>
              <h2 className="text-2xl font-semibold mb-4">2. User Accounts and Eligibility</h2>
              <div className="space-y-4 text-muted-foreground">
                <p>
                  <strong>Eligibility:</strong> The Service is intended for educational institutions, teachers, and students. Users under 13 must have parental consent and school supervision.
                </p>
                <p>
                  <strong>Account Responsibility:</strong> You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account.
                </p>
                <p>
                  <strong>Accurate Information:</strong> You agree to provide accurate, current, and complete information when creating your account.
                </p>
              </div>
            </section>

            <Separator />

            <section>
              <h2 className="text-2xl font-semibold mb-4">3. Acceptable Use</h2>
              <div className="space-y-4 text-muted-foreground">
                <p>You agree to use the Service only for lawful purposes and in accordance with these Terms. You agree NOT to:</p>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li>Use the Service for any illegal or unauthorized purpose</li>
                  <li>Violate any laws or regulations in your jurisdiction</li>
                  <li>Transmit any harmful, threatening, abusive, or offensive content</li>
                  <li>Attempt to gain unauthorized access to any part of the Service</li>
                  <li>Upload or share any content that violates intellectual property rights</li>
                  <li>Interfere with or disrupt the Service or servers</li>
                  <li>Share inappropriate content in educational settings</li>
                </ul>
              </div>
            </section>

            <Separator />

            <section>
              <h2 className="text-2xl font-semibold mb-4">4. Educational Content and User-Generated Content</h2>
              <div className="space-y-4 text-muted-foreground">
                <p>
                  <strong>Our Content:</strong> All educational materials, learning maps, and platform features are owned by PassionSeed Company Limited and protected by intellectual property laws.
                </p>
                <p>
                  <strong>User Content:</strong> You retain ownership of content you create (projects, reflections, assessments). By using the Service, you grant us a license to host, store, and display your content as necessary to provide the Service.
                </p>
                <p>
                  <strong>Content Standards:</strong> All content must be appropriate for educational environments and comply with our community guidelines.
                </p>
              </div>
            </section>

            <Separator />

            <section>
              <h2 className="text-2xl font-semibold mb-4">5. Privacy and Data Protection</h2>
              <p className="text-muted-foreground leading-relaxed">
                Your privacy is important to us. Our collection and use of personal information is governed by our Privacy Policy, which is incorporated into these Terms by reference. We are committed to protecting student data in compliance with educational privacy laws.
              </p>
            </section>

            <Separator />

            <section>
              <h2 className="text-2xl font-semibold mb-4">6. Subscription and Payment Terms</h2>
              <div className="space-y-4 text-muted-foreground">
                <p>
                  <strong>Subscription Plans:</strong> We offer various subscription plans for educational institutions. Pricing and features are detailed on our website.
                </p>
                <p>
                  <strong>Payment:</strong> Payments are processed securely through our payment partners. All fees are non-refundable unless required by law.
                </p>
                <p>
                  <strong>Cancellation:</strong> You may cancel your subscription at any time. Access to premium features will continue until the end of your billing period.
                </p>
              </div>
            </section>

            <Separator />

            <section>
              <h2 className="text-2xl font-semibold mb-4">7. Service Availability and Modifications</h2>
              <div className="space-y-4 text-muted-foreground">
                <p>
                  We strive to provide continuous service but do not guarantee uninterrupted access. We may modify, suspend, or discontinue the Service with reasonable notice.
                </p>
                <p>
                  We reserve the right to modify these Terms at any time. Material changes will be communicated to users in advance.
                </p>
              </div>
            </section>

            <Separator />

            <section>
              <h2 className="text-2xl font-semibold mb-4">8. Limitation of Liability</h2>
              <p className="text-muted-foreground leading-relaxed">
                To the maximum extent permitted by law, PassionSeed Company Limited shall not be liable for any indirect, incidental, special, consequential, or punitive damages resulting from your use of the Service.
              </p>
            </section>

            <Separator />

            <section>
              <h2 className="text-2xl font-semibold mb-4">9. Termination</h2>
              <div className="space-y-4 text-muted-foreground">
                <p>
                  We may terminate or suspend your access immediately, without prior notice, for any violation of these Terms.
                </p>
                <p>
                  Upon termination, your right to use the Service will cease immediately, but provisions regarding liability limitation and governing law will survive.
                </p>
              </div>
            </section>

            <Separator />

            <section>
              <h2 className="text-2xl font-semibold mb-4">10. Governing Law</h2>
              <p className="text-muted-foreground leading-relaxed">
                These Terms shall be governed by and construed in accordance with the laws of Thailand, without regard to conflict of law principles.
              </p>
            </section>

            <Separator />

            <section>
              <h2 className="text-2xl font-semibold mb-4">11. Contact Information</h2>
              <div className="space-y-2 text-muted-foreground">
                <p>If you have any questions about these Terms of Service, please contact us:</p>
                <ul className="space-y-1 ml-4">
                  <li><strong>Email:</strong> seedpassion@gmail.com</li>
                  <li><strong>Company:</strong> PassionSeed Company Limited</li>
                  <li><strong>Address:</strong> 135/4 Patak Street, Karon, Phuket 83100, Thailand</li>
                </ul>
              </div>
            </section>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
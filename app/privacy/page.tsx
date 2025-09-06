'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Shield, Users, Lock, Eye, Database, Mail } from 'lucide-react'

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
      <div className="container mx-auto px-6 py-20 max-w-4xl">
        <div className="text-center mb-12">
          <div className="flex justify-center mb-4">
            <Shield className="h-16 w-16 text-purple-600" />
          </div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent mb-4">
            Privacy Policy
          </h1>
          <p className="text-lg text-muted-foreground">
            Last updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>

        <Card className="shadow-lg mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Our Commitment to Your Privacy
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground leading-relaxed">
              At PassionSeed Company Limited ("we," "our," or "us"), we are committed to protecting the privacy and security of our users, especially students. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use Passion Seed ("the Service").
            </p>
          </CardContent>
        </Card>

        <div className="grid gap-6 md:grid-cols-2 mb-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Users className="h-5 w-5 text-blue-500" />
                Student Privacy First
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                We comply with educational privacy laws and prioritize student data protection above all else.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Lock className="h-5 w-5 text-green-500" />
                Secure by Design
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                We implement industry-standard security measures to protect your personal information.
              </p>
            </CardContent>
          </Card>
        </div>

        <Card className="shadow-lg">
          <CardContent className="space-y-8 p-8">
            <section>
              <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">
                <Database className="h-6 w-6 text-purple-600" />
                1. Information We Collect
              </h2>
              
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold mb-3">Personal Information</h3>
                  <p className="text-muted-foreground mb-3">We may collect the following types of personal information:</p>
                  <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
                    <li><strong>Account Information:</strong> Name, email address, school affiliation, role (student/teacher/admin)</li>
                    <li><strong>Profile Information:</strong> Optional profile picture, bio, learning preferences</li>
                    <li><strong>Educational Content:</strong> Learning progress, completed assignments, reflections, and assessments</li>
                    <li><strong>Communication Data:</strong> Messages within the platform, feedback, and support requests</li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-3">Technical Information</h3>
                  <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
                    <li>Device information (type, operating system, browser)</li>
                    <li>IP address and general location information</li>
                    <li>Usage data (pages visited, time spent, features used)</li>
                    <li>Performance and error logs</li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-3">Educational Records</h3>
                  <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
                    <li>Learning map progress and completion status</li>
                    <li>Assessment scores and feedback</li>
                    <li>Reflection entries and goal-setting data</li>
                    <li>Team project contributions and collaboration data</li>
                  </ul>
                </div>
              </div>
            </section>

            <Separator />

            <section>
              <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">
                <Eye className="h-6 w-6 text-blue-600" />
                2. How We Use Your Information
              </h2>
              <div className="space-y-4 text-muted-foreground">
                <p>We use the collected information for the following purposes:</p>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li><strong>Educational Services:</strong> Provide personalized learning experiences and track academic progress</li>
                  <li><strong>Platform Operation:</strong> Maintain, improve, and secure the Service</li>
                  <li><strong>Communication:</strong> Send important updates, notifications, and support responses</li>
                  <li><strong>Analytics:</strong> Understand usage patterns to improve educational outcomes (anonymized data only)</li>
                  <li><strong>Compliance:</strong> Meet legal and regulatory requirements</li>
                </ul>
                <p className="text-sm italic">
                  <strong>Student Data:</strong> We never use student personal information for advertising or commercial purposes unrelated to education.
                </p>
              </div>
            </section>

            <Separator />

            <section>
              <h2 className="text-2xl font-semibold mb-4">3. Information Sharing and Disclosure</h2>
              <div className="space-y-4 text-muted-foreground">
                <p>We do not sell, trade, or rent your personal information. We may share information only in these limited circumstances:</p>
                
                <div className="space-y-4">
                  <div>
                    <h4 className="font-semibold text-foreground">Within Educational Context:</h4>
                    <ul className="list-disc list-inside space-y-1 ml-4">
                      <li>Teachers can view their students' progress and work</li>
                      <li>School administrators can access classroom and student data for their institution</li>
                      <li>Team members can see shared project work and collaboration</li>
                    </ul>
                  </div>

                  <div>
                    <h4 className="font-semibold text-foreground">Service Providers:</h4>
                    <ul className="list-disc list-inside space-y-1 ml-4">
                      <li>Trusted third-party services that help us operate the platform (hosting, analytics, support)</li>
                      <li>All service providers must comply with strict data protection agreements</li>
                    </ul>
                  </div>

                  <div>
                    <h4 className="font-semibold text-foreground">Legal Requirements:</h4>
                    <ul className="list-disc list-inside space-y-1 ml-4">
                      <li>When required by law, court order, or government request</li>
                      <li>To protect the safety and security of our users and platform</li>
                    </ul>
                  </div>
                </div>
              </div>
            </section>

            <Separator />

            <section>
              <h2 className="text-2xl font-semibold mb-4">4. Data Retention</h2>
              <div className="space-y-4 text-muted-foreground">
                <p>We retain your information only as long as necessary for educational purposes:</p>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li><strong>Student Records:</strong> Retained during enrollment and for a reasonable period after graduation or transfer</li>
                  <li><strong>Account Data:</strong> Deleted within 30 days of account closure request</li>
                  <li><strong>Technical Data:</strong> Anonymized after 12 months for platform improvement</li>
                  <li><strong>Legal Compliance:</strong> Some data may be retained longer if required by law</li>
                </ul>
              </div>
            </section>

            <Separator />

            <section>
              <h2 className="text-2xl font-semibold mb-4">5. Data Security</h2>
              <div className="space-y-4 text-muted-foreground">
                <p>We implement comprehensive security measures to protect your information:</p>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li><strong>Encryption:</strong> All data is encrypted in transit and at rest</li>
                  <li><strong>Access Controls:</strong> Strict authentication and authorization protocols</li>
                  <li><strong>Regular Audits:</strong> Security assessments and vulnerability testing</li>
                  <li><strong>Staff Training:</strong> All employees receive data protection training</li>
                  <li><strong>Incident Response:</strong> Procedures for handling any security incidents</li>
                </ul>
              </div>
            </section>

            <Separator />

            <section>
              <h2 className="text-2xl font-semibold mb-4">6. Your Rights and Choices</h2>
              <div className="space-y-4 text-muted-foreground">
                <p>You have the following rights regarding your personal information:</p>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li><strong>Access:</strong> Request a copy of your personal information</li>
                  <li><strong>Correction:</strong> Update or correct inaccurate information</li>
                  <li><strong>Deletion:</strong> Request deletion of your personal information (subject to educational record requirements)</li>
                  <li><strong>Data Portability:</strong> Request your data in a machine-readable format</li>
                  <li><strong>Opt-Out:</strong> Unsubscribe from non-essential communications</li>
                </ul>
                <p className="text-sm italic">
                  For students under 18, these requests may require parental consent or school authorization.
                </p>
              </div>
            </section>

            <Separator />

            <section>
              <h2 className="text-2xl font-semibold mb-4">7. Children's Privacy (COPPA Compliance)</h2>
              <div className="space-y-4 text-muted-foreground">
                <p>We take special care to protect children's privacy:</p>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li>We do not knowingly collect personal information from children under 13 without school consent</li>
                  <li>Schools act as agents for parents in providing consent for educational services</li>
                  <li>Children's data is never used for non-educational purposes</li>
                  <li>Parents can request access to their child's information through the school</li>
                </ul>
              </div>
            </section>

            <Separator />

            <section>
              <h2 className="text-2xl font-semibold mb-4">8. International Data Transfers</h2>
              <p className="text-muted-foreground leading-relaxed">
                Your information may be transferred to and processed in countries other than your country of residence. We ensure that such transfers comply with applicable privacy laws and that your information receives adequate protection.
              </p>
            </section>

            <Separator />

            <section>
              <h2 className="text-2xl font-semibold mb-4">9. Changes to This Privacy Policy</h2>
              <p className="text-muted-foreground leading-relaxed">
                We may update this Privacy Policy from time to time. Material changes will be communicated to users and schools in advance. Your continued use of the Service after changes become effective constitutes acceptance of the revised policy.
              </p>
            </section>

            <Separator />

            <section>
              <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">
                <Mail className="h-6 w-6 text-green-600" />
                10. Contact Us
              </h2>
              <div className="space-y-4 text-muted-foreground">
                <p>If you have any questions about this Privacy Policy or our data practices, please contact us:</p>
                <div className="bg-muted/50 p-4 rounded-lg">
                  <ul className="space-y-2">
                    <li><strong>Email:</strong> seedpassion@gmail.com</li>
                    <li><strong>Company:</strong> PassionSeed Company Limited</li>
                    <li><strong>Address:</strong> 135/4 Patak Street, Karon, Phuket 83100, Thailand</li>
                    <li><strong>Data Protection Officer:</strong> Available upon request</li>
                  </ul>
                </div>
                <p className="text-sm italic">
                  We are committed to resolving any privacy concerns you may have and will respond to your inquiries within 30 days.
                </p>
              </div>
            </section>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
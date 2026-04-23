"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { 
  ArrowLeft, 
  Mail, 
  MessageCircle, 
  HelpCircle, 
  LifeBuoy, 
  Shield, 
  BookOpen, 
  CheckCircle2, 
  Instagram,
  Clock,
  Send
} from "lucide-react";
import Link from "next/link";

export default function SupportPage() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "General Support",
    message: ""
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    // Simulation delay
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    setSubmitted(true);
    setIsSubmitting(false);
    setFormData({ name: "", email: "", subject: "General Support", message: "" });
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSelectChange = (value: string) => {
    setFormData({
      ...formData,
      subject: value
    });
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col">
      {/* Header */}
      <header className="border-b bg-background/80 backdrop-blur-md sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/">
              <Button variant="ghost" size="icon" className="rounded-full h-9 w-9">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div className="h-6 w-px bg-slate-200 dark:bg-slate-800 mx-1 hidden sm:block" />
            <h1 className="text-xl font-bold tracking-tight">Support</h1>
          </div>
          <div className="flex items-center gap-2 sm:gap-4">
            <Link href="mailto:support@passionseed.org" className="hidden sm:block">
              <Button variant="ghost" size="sm" className="text-slate-600 dark:text-slate-400 font-medium">
                support@passionseed.org
              </Button>
            </Link>
            <Link href="/contact">
              <Button variant="outline" size="sm">Contact Sales</Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-grow container mx-auto px-4 py-12 max-w-6xl">
        {/* Hero Section */}
        <div className="max-w-3xl mx-auto text-center mb-16">
          <h2 className="text-4xl font-extrabold tracking-tight sm:text-5xl mb-6 text-slate-900 dark:text-white">
            We're here to help you grow.
          </h2>
          <p className="text-xl text-slate-600 dark:text-slate-400">
            Have a question or running into trouble? Our support team is ready to assist you.
          </p>
        </div>

        {/* Support Grid */}
        <div className="grid lg:grid-cols-12 gap-8 items-start">
          
          {/* Left Column: Form */}
          <div className="lg:col-span-7">
            <Card className="shadow-xl shadow-slate-200/50 dark:shadow-none border-slate-200 dark:border-slate-800 overflow-hidden">
              <div className="h-1.5 w-full bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500" />
              <CardHeader className="pt-8">
                <CardTitle className="text-2xl font-bold flex items-center gap-3">
                  <div className="bg-blue-100 dark:bg-blue-900/30 p-2 rounded-lg">
                    <Send className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  Send us a message
                </CardTitle>
                <CardDescription className="text-base mt-2">
                  Fill out the form below and we'll get back to you within 24 hours.
                </CardDescription>
              </CardHeader>
              <CardContent className="pb-8">
                {submitted ? (
                  <div className="text-center py-12 px-6">
                    <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-100 dark:bg-green-900/30 mb-6">
                      <CheckCircle2 className="h-10 w-10 text-green-600 dark:text-green-400" />
                    </div>
                    <h3 className="text-2xl font-bold mb-3 text-slate-900 dark:text-white">Message Sent Successfully!</h3>
                    <p className="text-slate-600 dark:text-slate-400 mb-8 max-w-md mx-auto">
                      Thank you for reaching out. We've received your inquiry and our team will respond shortly to your email.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-3 justify-center">
                      <Button 
                        onClick={() => setSubmitted(false)} 
                        variant="default"
                        size="lg"
                        className="font-semibold"
                      >
                        Send Another Message
                      </Button>
                      <Link href="/">
                        <Button variant="outline" size="lg">Return Home</Button>
                      </Link>
                    </div>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-6 mt-4">
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label htmlFor="name" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                          Full Name
                        </label>
                        <Input
                          id="name"
                          name="name"
                          value={formData.name}
                          onChange={handleInputChange}
                          required
                          placeholder="John Doe"
                          className="h-11"
                        />
                      </div>
                      <div className="space-y-2">
                        <label htmlFor="email" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                          Email Address
                        </label>
                        <Input
                          id="email"
                          name="email"
                          type="email"
                          value={formData.email}
                          onChange={handleInputChange}
                          required
                          placeholder="john@example.com"
                          className="h-11"
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <label htmlFor="subject" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                        Topic
                      </label>
                      <Select value={formData.subject} onValueChange={handleSelectChange}>
                        <SelectTrigger className="h-11">
                          <SelectValue placeholder="Select a topic" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="General Support">General Support</SelectItem>
                          <SelectItem value="Technical Issue">Technical Issue</SelectItem>
                          <SelectItem value="Account Access">Account Access</SelectItem>
                          <SelectItem value="Feature Request">Feature Request</SelectItem>
                          <SelectItem value="Feedback">App Feedback</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2">
                      <label htmlFor="message" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                        Message
                      </label>
                      <Textarea
                        id="message"
                        name="message"
                        value={formData.message}
                        onChange={handleInputChange}
                        required
                        placeholder="Tell us how we can help..."
                        className="min-h-[160px] resize-none"
                      />
                    </div>
                    
                    <Button 
                      type="submit" 
                      disabled={isSubmitting}
                      className="w-full h-12 text-base font-bold transition-all hover:scale-[1.01]"
                    >
                      {isSubmitting ? (
                        <span className="flex items-center gap-2">
                          <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                          Sending...
                        </span>
                      ) : "Submit Support Request"}
                    </Button>
                  </form>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Column: Info Cards */}
          <div className="lg:col-span-5 space-y-6">
            <Card className="border-slate-200 dark:border-slate-800">
              <CardHeader>
                <CardTitle className="text-xl">Common Questions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 rounded-xl bg-slate-100/50 dark:bg-slate-900/50 border border-slate-200/60 dark:border-slate-800/60 transition-all hover:border-blue-400/50">
                  <h4 className="font-bold text-sm mb-1 flex items-center gap-2 text-slate-900 dark:text-slate-100">
                    <LifeBuoy className="h-4 w-4 text-blue-500" />
                    How do I reset my password?
                  </h4>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    You can reset your password via the login page by clicking "Forgot Password".
                  </p>
                </div>
                <div className="p-4 rounded-xl bg-slate-100/50 dark:bg-slate-900/50 border border-slate-200/60 dark:border-slate-800/60 transition-all hover:border-green-400/50">
                  <h4 className="font-bold text-sm mb-1 flex items-center gap-2 text-slate-900 dark:text-slate-100">
                    <Shield className="h-4 w-4 text-green-500" />
                    Is my data private?
                  </h4>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    Yes, we use industry-standard encryption and follow strict privacy protocols.
                  </p>
                </div>
              </CardContent>
            </Card>

            <div className="grid gap-4">
              <Link 
                href="mailto:support@passionseed.org"
                className="flex items-center gap-4 p-5 rounded-2xl border bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-blue-500 transition-all group shadow-sm"
              >
                <div className="h-12 w-12 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center group-hover:bg-blue-600 transition-colors">
                  <Mail className="h-6 w-6 text-blue-600 dark:text-blue-400 group-hover:text-white" />
                </div>
                <div className="flex-1">
                  <p className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider mb-0.5">Direct Email</p>
                  <p className="font-bold text-slate-900 dark:text-slate-100">support@passionseed.org</p>
                </div>
              </Link>

              <Link 
                href="https://instagram.com/passion_seed.th" 
                target="_blank"
                className="flex items-center gap-4 p-5 rounded-2xl border bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-pink-500 transition-all group shadow-sm"
              >
                <div className="h-12 w-12 rounded-xl bg-pink-50 dark:bg-pink-900/20 flex items-center justify-center group-hover:bg-pink-600 transition-colors">
                  <Instagram className="h-6 w-6 text-pink-600 dark:text-pink-400 group-hover:text-white" />
                </div>
                <div className="flex-1">
                  <p className="text-xs font-bold text-pink-600 dark:text-pink-400 uppercase tracking-wider mb-0.5">Social Media</p>
                  <p className="font-bold text-slate-900 dark:text-slate-100">@passion_seed.th</p>
                </div>
              </Link>
            </div>

            <div className="bg-slate-900 dark:bg-slate-900 p-6 rounded-3xl text-white overflow-hidden relative shadow-lg">
              <div className="absolute top-0 right-0 p-4 opacity-10">
                <Clock className="h-24 w-24 rotate-12" />
              </div>
              <h4 className="font-bold text-lg mb-2 relative z-10">Typical Response Time</h4>
              <p className="text-slate-400 text-sm mb-4 relative z-10 leading-relaxed">
                We're a small, dedicated team. We usually respond within <span className="text-white font-bold">12-24 hours</span> during business days.
              </p>
              <div className="flex items-center gap-2 text-xs font-medium text-slate-300 bg-white/10 p-2.5 rounded-lg w-fit">
                <Clock className="h-3.5 w-3.5" />
                Mon — Fri: 9:00 — 18:00 (ICT)
              </div>
            </div>
          </div>

        </div>
      </main>

      <footer className="py-12 border-t bg-white dark:bg-slate-950 mt-auto">
        <div className="container mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="text-sm font-medium text-slate-500">
            © {new Date().getFullYear()} PassionSeed
          </div>
          <div className="flex items-center gap-6">
            <Link href="/privacy" className="text-sm text-slate-500 hover:text-slate-900 dark:hover:text-slate-100">Privacy Policy</Link>
            <Link href="/terms" className="text-sm text-slate-500 hover:text-slate-900 dark:hover:text-slate-100">Terms of Service</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

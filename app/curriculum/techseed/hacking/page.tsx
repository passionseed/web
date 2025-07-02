import React from "react";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "TechSeed Hacking Curriculum",
  description:
    "Comprehensive hacking curriculum covering CTF, web security, cryptography, and more",
};

export default function HackingCurriculum() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-extrabold text-gray-900 sm:text-5xl sm:tracking-tight lg:text-6xl">
            Hacking Curriculum
          </h1>
          <p className="mt-3 max-w-2xl mx-auto text-xl text-gray-500 sm:mt-4">
            Master the art of ethical hacking through hands-on challenges and
            real-world scenarios
          </p>
        </div>

        <div className="bg-gray-500 shadow overflow-hidden sm:rounded-lg mb-12">
          <div className="px-4 py-5 sm:px-6 bg-gray-50">
            <h2 className="text-lg leading-6 font-medium text-gray-900">
              Teaching Style
            </h2>
          </div>
          <div className="border-t border-gray-200 px-4 py-5 sm:p-0">
            <dl className="sm:divide-y sm:divide-gray-200">
              <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">
                  Daily Structure
                </dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                  <ul className="list-disc pl-5 space-y-1">
                    <li>1-2 hands-on tutorials & homework explanations</li>
                    <li>2 in-class questions</li>
                    <li>1 homework assignment</li>
                    <li>1 optional challenging homework</li>
                  </ul>
                </dd>
              </div>
              <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">Approach</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                  Follow-along sessions where everyone participates in practical
                  exercises and challenges
                </dd>
              </div>
            </dl>
          </div>
        </div>

        <div className="space-y-12">
          {/* Day 1 */}
          <div className="bg-white shadow overflow-hidden sm:rounded-lg">
            <div className="px-4 py-5 sm:px-6 bg-indigo-50">
              <h2 className="text-lg leading-6 font-medium text-indigo-900">
                Day 1: Hacking Introduction
              </h2>
            </div>
            <div className="border-t border-gray-200 px-4 py-5 sm:p-6">
              <ul className="list-disc pl-5 space-y-2">
                <li>Introduction to ethical hacking</li>
                <li>Course overview and expectations</li>
                <li>Setting up your environment</li>
                <li>Basic security concepts</li>
              </ul>
            </div>
          </div>

          {/* Day 2 */}
          <div className="bg-white shadow overflow-hidden sm:rounded-lg">
            <div className="px-4 py-5 sm:px-6 bg-indigo-50">
              <h2 className="text-lg leading-6 font-medium text-indigo-900">
                Day 2: Basic CTF
              </h2>
            </div>
            <div className="border-t border-gray-200 px-4 py-5 sm:p-6">
              <ul className="list-disc pl-5 space-y-2">
                <li>Introduction to Capture The Flag (CTF) challenges</li>
                <li>Command line basics for security</li>
                <li>Hands-on practice with beginner CTF challenges</li>
              </ul>
            </div>
          </div>

          {/* Day 3 */}
          <div className="bg-white shadow overflow-hidden sm:rounded-lg">
            <div className="px-4 py-5 sm:px-6 bg-indigo-50">
              <h2 className="text-lg leading-6 font-medium text-indigo-900">
                Day 3: Web Hacking & Ethics
              </h2>
            </div>
            <div className="border-t border-gray-200 px-4 py-5 sm:p-6">
              <ul className="list-disc pl-5 space-y-2">
                <li>Common web vulnerabilities (SQLi, XSS, CSRF)</li>
                <li>Web application security testing</li>
                <li>Ethical considerations in hacking</li>
                <li>Legal aspects of penetration testing</li>
              </ul>
            </div>
          </div>

          {/* Day 4 */}
          <div className="bg-white shadow overflow-hidden sm:rounded-lg">
            <div className="px-4 py-5 sm:px-6 bg-indigo-50">
              <h2 className="text-lg leading-6 font-medium text-indigo-900">
                Day 4: Cryptography & Forensics
              </h2>
            </div>
            <div className="border-t border-gray-200 px-4 py-5 sm:p-6">
              <ul className="list-disc pl-5 space-y-2">
                <li>Basic cryptographic concepts</li>
                <li>Common cryptographic attacks</li>
                <li>Digital forensics fundamentals</li>
                <li className="font-semibold">Final Project Introduction:</li>
                <ul className="list-disc pl-5 mt-2 space-y-1">
                  <li>Find a CTF challenge you enjoy</li>
                  <li>Create a detailed writeup</li>
                  <li>Publish on GitHub/Medium</li>
                </ul>
              </ul>
            </div>
          </div>

          {/* Day 5 */}
          <div className="bg-white shadow overflow-hidden sm:rounded-lg">
            <div className="px-4 py-5 sm:px-6 bg-indigo-50">
              <h2 className="text-lg leading-6 font-medium text-indigo-900">
                Day 5: PWN & Certifications
              </h2>
            </div>
            <div className="border-t border-gray-200 px-4 py-5 sm:p-6">
              <ul className="list-disc pl-5 space-y-2">
                <li>Binary exploitation basics</li>
                <li>Memory corruption vulnerabilities</li>
                <li>Introduction to PWN challenges</li>
                <li>Overview of security certifications</li>
                <li>Career paths in cybersecurity</li>
              </ul>
            </div>
          </div>

          {/* Day 6 */}
          <div className="bg-white shadow overflow-hidden sm:rounded-lg">
            <div className="px-4 py-5 sm:px-6 bg-indigo-50">
              <h2 className="text-lg leading-6 font-medium text-indigo-900">
                Day 6: Reverse Engineering & Beyond
              </h2>
            </div>
            <div className="border-t border-gray-200 px-4 py-5 sm:p-6">
              <ul className="list-disc pl-5 space-y-2">
                <li>Introduction to reverse engineering</li>
                <li>Tools and techniques</li>
                <li>Real-world CTF challenges</li>
                <li>Career paths in cybersecurity</li>
                <li>Next steps after the course</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="mt-12 bg-white shadow overflow-hidden sm:rounded-lg">
          <div className="px-4 py-5 sm:px-6 bg-gray-50">
            <h2 className="text-lg leading-6 font-medium text-gray-900">
              Additional Resources
            </h2>
          </div>
          <div className="border-t border-gray-200 px-4 py-5 sm:p-6">
            <ul className="list-disc pl-5 space-y-2">
              <li>Recommended tools and software</li>
              <li>Online learning platforms</li>
              <li>Practice CTF platforms</li>
              <li>Security blogs and communities</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

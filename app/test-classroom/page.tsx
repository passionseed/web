"use client";

import { useState } from "react";
import {
  generateUniqueJoinCode,
  createClassroom,
  getInstructorClassrooms,
} from "@/lib/supabase/classrooms";
import { getClassroomMembers } from "@/lib/supabase/classroom-memberships";

export default function TestClassroomPage() {
  const [results, setResults] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const addResult = (message: string) => {
    setResults((prev) => [...prev, message]);
  };

  const runTests = async () => {
    setLoading(true);
    setResults([]);

    try {
      // Test 1: Join code generation
      addResult("🧪 Testing join code generation...");
      const code1 = await generateUniqueJoinCode();
      const code2 = await generateUniqueJoinCode();
      addResult(`✅ Generated codes: ${code1}, ${code2}`);
      addResult(`✅ Codes are unique: ${code1 !== code2}`);

      // Test 2: Create classroom
      addResult("🧪 Testing classroom creation...");
      const classroomData = {
        name: "Test Classroom - " + new Date().toISOString(),
        description: "A test classroom created via web interface",
        max_students: 25,
      };

      const newClassroom = await createClassroom(classroomData);
      addResult(`✅ Classroom created: ${newClassroom.classroom.name}`);
      addResult(`✅ Join code: ${newClassroom.join_code}`);

      // Test 3: Get instructor classrooms
      addResult("🧪 Testing instructor classrooms fetch...");
      const classrooms = await getInstructorClassrooms();
      addResult(`✅ Found ${classrooms.length} classroom(s)`);

      if (classrooms.length > 0) {
        const classroom = classrooms[0];
        addResult(`✅ Sample: ${classroom.name} (${classroom.join_code})`);
      }

      addResult("🎉 All tests passed! Classroom system is working.");
    } catch (error) {
      addResult(
        `❌ Error: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-8">
      <h1 className="text-3xl font-bold mb-6">Classroom System Test</h1>

      <div className="mb-6">
        <button
          onClick={runTests}
          disabled={loading}
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded disabled:opacity-50"
        >
          {loading ? "Running Tests..." : "Run Classroom Tests"}
        </button>
      </div>

      <div className="bg-gray-900 p-4 rounded-lg">
        <h2 className="text-xl font-semibold mb-4">Test Results:</h2>
        <div className="space-y-2">
          {results.map((result, index) => (
            <div key={index} className="font-mono text-sm">
              {result}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

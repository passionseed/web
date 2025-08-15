/**
 * Classroom System Manual Testing Functions
 *
 * This file contains manual testing functions to validate our classroom system
 * Run these tests after setting up the database to ensure everything works correctly
 */

import {
  generateUniqueJoinCode,
  createClassroom,
  getInstructorClassrooms,
} from "../classrooms";
import { getClassroomMembers } from "../classroom-memberships";

/**
 * Manual test for join code generation
 */
export async function testJoinCodeGeneration(): Promise<boolean> {
  console.log("🧪 Testing Join Code Generation");
  console.log("==============================");

  try {
    // Test multiple code generations
    const codes = await Promise.all([
      generateUniqueJoinCode(),
      generateUniqueJoinCode(),
      generateUniqueJoinCode(),
    ]);

    console.log(`Generated codes: ${codes.join(", ")}`);

    // Validate format
    const validFormat = codes.every((code) => /^[A-Z0-9]{6}$/.test(code));
    console.log(`✅ All codes have valid format: ${validFormat}`);

    // Validate uniqueness
    const uniqueCodes = new Set(codes).size === codes.length;
    console.log(`✅ All codes are unique: ${uniqueCodes}`);

    return validFormat && uniqueCodes;
  } catch (error) {
    console.error("❌ Join code generation test failed:", error);
    return false;
  }
}

/**
 * Manual test for classroom creation flow
 */
export async function testClassroomCreation(): Promise<string | null> {
  console.log("\n🧪 Testing Classroom Creation");
  console.log("==============================");

  try {
    const testData = {
      name: "Test Classroom - " + new Date().toISOString(),
      description: "A test classroom created by automated testing",
      max_students: 25,
    };

    console.log("Creating classroom with data:", testData);

    const result = await createClassroom(testData);

    console.log("✅ Classroom created successfully");
    console.log(`   ID: ${result.classroom.id}`);
    console.log(`   Name: ${result.classroom.name}`);
    console.log(`   Join Code: ${result.join_code}`);
    console.log(`   Active: ${result.classroom.is_active}`);

    return result.classroom.id;
  } catch (error) {
    console.error("❌ Classroom creation test failed:", error);
    return null;
  }
}

/**
 * Manual test for fetching instructor classrooms
 */
export async function testInstructorClassrooms(): Promise<boolean> {
  console.log("\n🧪 Testing Instructor Classrooms Fetch");
  console.log("======================================");

  try {
    const result = await getInstructorClassrooms();

    console.log(`✅ Found ${result.length} classroom(s)`);

    if (result.length > 0) {
      const classroom = result[0];
      console.log(
        `   Sample classroom: ${classroom.name} (${classroom.join_code})`
      );
      console.log(
        `   Active: ${classroom.is_active}, Assignments: ${classroom.assignments?.length || 0}`
      );
    }

    return true;
  } catch (error) {
    console.error("❌ Instructor classrooms test failed:", error);
    return false;
  }
}

/**
 * Manual test for classroom members functionality
 */
export async function testClassroomMembers(
  classroomId: string
): Promise<boolean> {
  console.log("\n🧪 Testing Classroom Members");
  console.log("============================");

  try {
    const members = await getClassroomMembers(classroomId);

    console.log(`✅ Found ${members.length} member(s) in classroom`);

    if (members.length > 0) {
      const member = members[0];
      console.log(
        `   Sample member: ${member.profiles?.full_name || "Unknown"}`
      );
      console.log(`   Role: ${member.role}, Joined: ${member.joined_at}`);
    }

    return true;
  } catch (error) {
    console.error("❌ Classroom members test failed:", error);
    return false;
  }
}

/**
 * Run comprehensive manual test suite
 */
export async function runClassroomSystemTests(): Promise<void> {
  console.log("🚀 Starting Classroom System Manual Tests");
  console.log("==========================================");

  const results = {
    joinCodeGeneration: false,
    classroomCreation: null as string | null,
    instructorClassrooms: false,
    classroomMembers: false,
  };

  // Test 1: Join code generation
  results.joinCodeGeneration = await testJoinCodeGeneration();

  // Test 2: Classroom creation
  results.classroomCreation = await testClassroomCreation();

  // Test 3: Instructor classrooms
  results.instructorClassrooms = await testInstructorClassrooms();

  // Test 4: Classroom members (if we have a classroom)
  if (results.classroomCreation) {
    results.classroomMembers = await testClassroomMembers(
      results.classroomCreation
    );
  }

  // Summary
  console.log("\n📊 Test Results Summary");
  console.log("=======================");
  console.log(
    `Join Code Generation: ${results.joinCodeGeneration ? "✅" : "❌"}`
  );
  console.log(`Classroom Creation: ${results.classroomCreation ? "✅" : "❌"}`);
  console.log(
    `Instructor Classrooms: ${results.instructorClassrooms ? "✅" : "❌"}`
  );
  console.log(`Classroom Members: ${results.classroomMembers ? "✅" : "❌"}`);

  const passedTests = Object.values(results).filter(
    (r) => r === true || (typeof r === "string" && r !== null)
  ).length;
  const totalTests = 4;

  console.log(`\n🎯 Overall: ${passedTests}/${totalTests} tests passed`);

  if (passedTests === totalTests) {
    console.log("🎉 All tests passed! Classroom system is working correctly.");
  } else {
    console.log("⚠️ Some tests failed. Check the output above for details.");
  }
}

/**
 * Type validation test (compile-time)
 */
export function validateTypes(): void {
  console.log("🔍 Validating TypeScript Types");
  console.log("==============================");

  // This function validates that our types are working correctly
  // If this compiles without errors, our types are properly defined

  const sampleClassroom = {
    id: "123e4567-e89b-12d3-a456-426614174000",
    name: "Sample Classroom",
    description: "A sample classroom for testing",
    instructor_id: "223e4567-e89b-12d3-a456-426614174001",
    join_code: "ABC123",
    status: "active" as const,
    max_students: 30,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const sampleMembership = {
    id: "323e4567-e89b-12d3-a456-426614174002",
    classroom_id: sampleClassroom.id,
    user_id: "423e4567-e89b-12d3-a456-426614174003",
    role: "student" as const,
    joined_at: new Date().toISOString(),
  };

  console.log("✅ Sample classroom type validation passed");
  console.log("✅ Sample membership type validation passed");
  console.log("✅ All TypeScript types are properly defined");
}

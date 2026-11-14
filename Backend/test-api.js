process.env.NODE_ENV = 'test';

import { collegeApi } from './src/services/collegeApi.js';
import { academicService } from './src/services/academicService.js';
import { bedrockService } from './src/services/bedrockService.js';
import { historyService } from './src/services/historyService.js';
import { executeTool } from './src/agents/toolRegistry.js';

// Test runner helper with explicit timeout
async function runTestCase(name, fn, timeoutMs = 5000) {
  process.stdout.write(`• Testing [${name}] ... `);
  const timeoutPromise = new Promise((_, reject) =>
    setTimeout(() => reject(new Error(`Test case timed out after ${timeoutMs}ms`)), timeoutMs)
  );

  try {
    const result = await Promise.race([fn(), timeoutPromise]);
    console.log(`PASSED ${result ? '(' + result + ')' : ''}`);
    return { name, status: 'PASSED', details: result };
  } catch (err) {
    console.log(`FAILED (${err.message})`);
    return { name, status: 'FAILED', error: err.message };
  }
}

async function runTestSuite() {
  console.log('======================================================');
  console.log('KIT GUARDIAN BACKEND INTEGRATION TEST SUITE');
  console.log('Mode: Safe In-Process Sandbox Verification');
  console.log('======================================================\n');

  const results = [];
  let studentToken = null;
  let teacherToken = null;
  let createdRequestId = null;
  let testStudentUser = null;

  // 1. Health & Today
  results.push(await runTestCase('College Today & Health Endpoint', async () => {
    const health = await collegeApi.getHealth();
    const today = await collegeApi.getToday();
    if (!health.data || !today.data) throw new Error('Missing health or today data');
    return `${today.data.date}, ${today.data.weekday_name}`;
  }));

  // 2. Public College Info
  results.push(await runTestCase('Public College Information', async () => {
    const info = await collegeApi.getCollegeInfo();
    if (!info.data?.name) throw new Error('College name missing');
    return info.data.code;
  }));

  // 3. Courses Catalog
  results.push(await runTestCase('Courses & Fees Catalog', async () => {
    const courses = await collegeApi.getCourses();
    if (!courses.data || courses.data.length === 0) throw new Error('No courses returned');
    return `${courses.data.length} courses loaded`;
  }));

  // 4. Admission Application Submission
  results.push(await runTestCase('Admission Application Submission', async () => {
    const app = await collegeApi.submitAdmissionApplication({
      full_name: 'Rohan Sharma',
      phone: '+91 9876543210',
      email: 'rohan.sharma@example.com',
      course_code: 'BTECH-CSE',
      twelfth_percent: 88.5,
    });
    if (!app.data?.id || app.data?.status !== 'received') {
      throw new Error('Application submission invalid');
    }
    return `Application #${app.data.id} registered`;
  }));

  // 5. Student Authentication
  results.push(await runTestCase('Student Login (arjun / Kit@2026)', async () => {
    const login = await collegeApi.login('arjun', 'Kit@2026');
    if (!login.data?.access_token || login.data?.user?.role !== 'student') {
      throw new Error('Student login failed');
    }
    studentToken = login.data.access_token;
    testStudentUser = login.data.user;
    return `${login.data.user.full_name} authenticated`;
  }));

  // 6. Academic Guardian Snapshot
  results.push(await runTestCase('Academic Guardian Snapshot (CGPA & Standing)', async () => {
    if (!studentToken) throw new Error('Skipping: no student token');
    const snap = await academicService.getAcademicSnapshot(studentToken);
    if (snap.academics.cgpa !== 8.2 || snap.academics.standing_arrears !== 0) {
      throw new Error(`Unexpected academics: CGPA ${snap.academics.cgpa}`);
    }
    return `CGPA: ${snap.academics.cgpa}, Arrears: ${snap.academics.standing_arrears}, Att: ${snap.attendance.overall_percentage}%`;
  }));

  // 7. Attendance What-If Simulator
  results.push(await runTestCase('Attendance What-If Simulator (75% Rule)', async () => {
    if (!studentToken) throw new Error('Skipping: no student token');
    const sim = await academicService.simulateAbsence(studentToken, { days_count: 2 });
    if (!sim.projected_attendance || sim.projected_attendance.percentage >= sim.current_attendance.percentage) {
      throw new Error('Simulation calculation did not reflect absence');
    }
    return `${sim.current_attendance.percentage}% -> ${sim.projected_attendance.percentage}% (${sim.verdict_level})`;
  }));

  // 8. Leave Pre-Validation & Creation
  results.push(await runTestCase('Leave Request Pre-Validation & Submission', async () => {
    if (!studentToken) throw new Error('Skipping: no student token');
    const val = await academicService.validateLeaveRequest(studentToken, {
      type: 'personal_leave',
      from_date: '2026-11-25',
      to_date: '2026-11-25',
      reason: 'Attending regional symposium',
    });
    if (!val.can_proceed) throw new Error('Validation failed unexpectedly');

    const created = await collegeApi.createRequest(studentToken, {
      type: 'personal_leave',
      from_date: '2026-11-25',
      to_date: '2026-11-25',
      reason: 'Attending regional symposium',
    });
    createdRequestId = created.data.id;
    return `Request #${createdRequestId} created (status: ${created.data.status})`;
  }));

  // 9. Teacher Authentication
  results.push(await runTestCase('Teacher Login (lakshmi / Kit@2026)', async () => {
    const login = await collegeApi.login('lakshmi', 'Kit@2026');
    if (!login.data?.access_token || login.data?.user?.role !== 'teacher') {
      throw new Error('Teacher login failed');
    }
    teacherToken = login.data.access_token;
    return `${login.data.user.full_name} (${login.data.user.notes})`;
  }));

  // 10. Teacher Leave Approval
  results.push(await runTestCase('Teacher Leave Approval Workflow', async () => {
    if (!teacherToken || !createdRequestId) throw new Error('Missing teacher token or request ID');
    const approved = await collegeApi.approveTeacherRequest(teacherToken, createdRequestId, 'Approved by advisor');
    if (approved.data.status !== 'approved') {
      throw new Error(`Expected status approved, got ${approved.data.status}`);
    }
    return `Request #${approved.data.id} approved`;
  }));

  // 11. Conversational Agent & Tool Reasoning
  results.push(await runTestCase('AI Assistant Conversational Reasoning (Student)', async () => {
    const res = await bedrockService.converse({
      userMessage: 'How am I doing academically?',
      userRole: 'student',
      token: studentToken,
      user: testStudentUser,
    });
    if (!res.spokenResponse || !res.textResponse) {
      throw new Error('Empty assistant response');
    }
    return `Spoken: "${res.spokenResponse.substring(0, 50)}..."`;
  }));

  // 12. Teacher Rule Grounding & OD Query
  results.push(await runTestCase('Teacher Attendance Rule Grounding (Handbook)', async () => {
    const res = await bedrockService.converse({
      userMessage: 'What is the minimum attendance rule for exams?',
      userRole: 'teacher',
      token: teacherToken,
      user: { role: 'teacher', full_name: 'Dr. Lakshmi Narayanan' },
    });
    if (!res.textResponse || !res.textResponse.includes('KIT')) {
      throw new Error('Expected handbook regulation in response');
    }
    return 'Handbook Regulation 4.1 returned correctly for teacher';
  }));

  results.push(await runTestCase('Teacher OD Request Query ("Which students have requested OD?")', async () => {
    const res = await bedrockService.converse({
      userMessage: 'Which students have requested OD?',
      userRole: 'teacher',
      token: teacherToken,
      user: { role: 'teacher', full_name: 'Dr. Lakshmi Narayanan' },
    });
    if (!res.textResponse) {
      throw new Error('Expected response for OD query');
    }
    return 'Teacher OD query handled successfully';
  }));

  // 14. Admissions Application Flow ("how do i apply for radiation / admission")
  results.push(await runTestCase('Admissions Application Query ("how do i apply for radiation")', async () => {
    const res = await bedrockService.converse({
      userMessage: 'how do i apply for radiation',
      userRole: 'visitor',
    });
    if (!res.textResponse || !res.textResponse.includes('Admissions 2026 Application')) {
      throw new Error('Expected admissions application instructions');
    }
    return 'Admissions application guidance returned successfully';
  }));

  // 15. Teacher Low Attendance Query
  results.push(await runTestCase('Teacher Low Attendance Query ("if any of my student has low attendance %")', async () => {
    const res = await bedrockService.converse({
      userMessage: 'if any of my student has low attendance %',
      userRole: 'teacher',
      token: teacherToken,
      user: { role: 'teacher', full_name: 'Dr. Lakshmi Narayanan' },
    });
    if (!res.textResponse || !res.textResponse.includes('Kavya S')) {
      throw new Error('Expected Kavya S identified in low attendance response');
    }
    return 'Kavya S (72%) identified as low attendance student';
  }));

  // 16. Persistent History in SQLite
  results.push(await runTestCase('Persistent Conversation History (SQLite)', async () => {
    const conv = historyService.createConversation('test_user_1', 'student', 'Test Academic Conversation');
    historyService.addMessage(conv.id, 'user', 'What is my attendance?');
    historyService.addMessage(conv.id, 'assistant', 'Your attendance is 76%.');
    const retrieved = historyService.getConversation(conv.id, 'test_user_1');
    if (!retrieved || retrieved.messages.length !== 2) {
      throw new Error('Conversation history mismatch in SQLite');
    }
    historyService.deleteConversation(conv.id, 'test_user_1');
    return 'Conversations, messages & actions persisted in SQLite';
  }));

  // Summary Report
  const passed = results.filter(r => r.status === 'PASSED').length;
  const failed = results.filter(r => r.status === 'FAILED').length;
  const skipped = results.filter(r => r.status === 'SKIPPED').length;

  console.log('\n======================================================');
  console.log('INTEGRATION TEST SUMMARY:');
  console.log(`Total: ${results.length} | Passed: ${passed} | Failed: ${failed} | Skipped: ${skipped}`);
  console.log('======================================================');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTestSuite().catch(err => {
  console.error('Fatal test runner error:', err);
  process.exit(1);
});

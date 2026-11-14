import { collegeApi } from './src/services/collegeApi.js';
import { academicService } from './src/services/academicService.js';
import { bedrockService } from './src/services/bedrockService.js';
import { historyService } from './src/services/historyService.js';
import { executeTool } from './src/agents/toolRegistry.js';

async function runInProcessTests() {
  console.log('--- Testing In-Process KIT Guardian Services ---');

  // 1. College Today & Info
  const today = await collegeApi.getToday();
  console.log('✓ Today:', today.data.date, today.data.weekday_name);

  const collegeInfo = await collegeApi.getCollegeInfo();
  console.log('✓ College:', collegeInfo.data.name);

  // 2. Courses
  const courses = await collegeApi.getCourses();
  console.log(`✓ Courses: ${courses.data.length} courses loaded`);

  // 3. Admission Application
  const adm = await collegeApi.submitAdmissionApplication({
    full_name: 'Rohan Sharma',
    phone: '+91 9876543210',
    email: 'rohan.sharma@example.com',
    course_code: 'BTECH-CSE',
    twelfth_percent: 88.5,
  });
  console.log(`✓ Admission submitted: Application #${adm.data.id} status: ${adm.data.status}`);

  // 4. Student Login
  const loginRes = await collegeApi.login('arjun', 'Kit@2026');
  console.log(`✓ Student Login: ${loginRes.data.user.full_name} (token: ${loginRes.data.access_token.substring(0, 20)}...)`);
  const token = loginRes.data.access_token;

  // 5. Academic Guardian Snapshot
  const snapshot = await academicService.getAcademicSnapshot(token);
  console.log(`✓ Academic Guardian Snapshot: CGPA: ${snapshot.academics.cgpa}, Arrears: ${snapshot.academics.standing_arrears}, Attendance: ${snapshot.attendance.overall_percentage}%, Status: ${snapshot.attendance.status}`);

  // 6. Attendance What-If Simulator
  const sim = await academicService.simulateAbsence(token, { days_count: 2 });
  console.log(`✓ What-If Simulator: ${sim.current_attendance.percentage}% -> Projected: ${sim.projected_attendance.percentage}% (${sim.verdict_level})`);
  console.log(`  Verdict: ${sim.verdict}`);

  // 7. Pre-validate Leave Request
  const val = await academicService.validateLeaveRequest(token, {
    type: 'personal_leave',
    from_date: '2026-11-25',
    to_date: '2026-11-25',
    reason: 'Family event',
  });
  console.log(`✓ Leave Pre-Validation: Can proceed? ${val.can_proceed}. Projected attendance: ${val.simulation.projected_attendance.percentage}%`);

  // 8. Submit Leave Request
  const leave = await collegeApi.createRequest(token, {
    type: 'personal_leave',
    from_date: '2026-11-25',
    to_date: '2026-11-25',
    reason: 'Family event',
  });
  console.log(`✓ Leave Request Created: ID #${leave.data.id}, status: ${leave.data.status}`);

  // 9. Teacher Login & Approval
  const teacherLogin = await collegeApi.login('lakshmi', 'Kit@2026');
  console.log(`✓ Teacher Login: ${teacherLogin.data.user.full_name}`);
  const teacherToken = teacherLogin.data.access_token;

  const approved = await collegeApi.approveTeacherRequest(teacherToken, leave.data.id, 'Approved by class advisor');
  console.log(`✓ Teacher Approved Request #${approved.data.id}: status ${approved.data.status}`);

  // 10. Agent Conversational Reasoning
  const agentResponse = await bedrockService.converse({
    userMessage: 'How am I doing academically?',
    userRole: 'student',
    token,
    user: loginRes.data.user,
  });
  console.log(`✓ Agent Spoken Response: "${agentResponse.spokenResponse}"`);

  console.log('\n=============================================');
  console.log('ALL IN-PROCESS CORE SERVICES PASSED 100%!');
  console.log('=============================================');
}

runInProcessTests().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});

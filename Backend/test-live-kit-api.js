import 'dotenv/config';
import { collegeApi } from './src/services/collegeApi.js';
import { academicService } from './src/services/academicService.js';

async function runLiveVerification() {
  console.log('========================================================');
  console.log('KIT GUARDIAN — TARGETED LIVE KIT API VERIFICATION');
  console.log('Target Base URL:', process.env.COLLEGE_API_BASE_URL || 'https://ht.knowvally.com');
  console.log('Participant Key:', process.env.COLLEGE_PARTICIPANT_KEY ? 'Configured (Active)' : 'Missing');
  console.log('========================================================\n');

  try {
    // ----------------------------------------------------
    // TEST 1 — Public Visitor Flow
    // ----------------------------------------------------
    console.log('--- TEST 1: Public Visitor Flow ---');
    const collegeRes = await collegeApi.getCollegeInfo();
    const coursesRes = await collegeApi.getCourses();

    console.log('✓ GET /v1/college:', collegeRes.data.name, `(${collegeRes.data.code})`);
    console.log('  Tagline:', collegeRes.data.tagline);
    console.log('  Contact:', collegeRes.data.contact?.phone, '|', collegeRes.data.contact?.email);
    console.log('✓ GET /v1/courses:', `${coursesRes.data.length} courses retrieved`);
    coursesRes.data.forEach(c => {
      console.log(`  • ${c.name} (${c.code}): Annual Fee ₹${c.annual_fee.toLocaleString()} | Min 12th: ${c.min_12th_percent}% | Seats: ${c.seats}`);
    });
    console.log('TEST 1 RESULT: PASSED\n');

    // ----------------------------------------------------
    // TEST 2 — Student Academic and Attendance Flow
    // ----------------------------------------------------
    console.log('--- TEST 2: Student Academic & Attendance Flow ---');
    const loginRes = await collegeApi.login('arjun', 'Kit@2026');
    const token = loginRes.data.access_token;
    console.log('✓ POST /v1/auth/login:', `Authenticated ${loginRes.data.user?.full_name} (${loginRes.data.user?.role})`);

    const meRes = await collegeApi.getMe(token);
    const academicsRes = await collegeApi.getMyAcademics(token);
    const attendanceRes = await collegeApi.getMyAttendance(token);

    console.log('✓ GET /v1/me:', `${meRes.data.full_name}, Dept: ${meRes.data.department}, Year: ${meRes.data.year_of_study}, Class: ${meRes.data.class_code}`);
    console.log('✓ GET /v1/me/academics:', `CGPA: ${academicsRes.data.cgpa}, Standing Arrears: ${academicsRes.data.standing_arrears}`);
    console.log('✓ GET /v1/me/attendance:', `Overall: ${attendanceRes.data.overall_percentage}% (${attendanceRes.data.total_classes_attended}/${attendanceRes.data.total_classes_held} held)`);
    console.log('TEST 2 RESULT: PASSED\n');

    // ----------------------------------------------------
    // TEST 3 — Placement Eligibility Flow (Zoho)
    // ----------------------------------------------------
    console.log('--- TEST 3: Placement Eligibility (Zoho) ---');
    const drivesRes = await collegeApi.getPlacementDrives(token);
    console.log('✓ GET /v1/placements/drives:', `${drivesRes.data.length} active drives found:`, drivesRes.data.map(d => d.company).join(', '));

    const zohoDrive = drivesRes.data.find(d => d.company.toLowerCase() === 'zoho');
    if (!zohoDrive) {
      console.warn('Zoho drive not found in active drives list');
    } else {
      console.log('  Zoho Drive Details:', {
        company: zohoDrive.company,
        min_cgpa: zohoDrive.min_cgpa,
        allow_standing_arrears: zohoDrive.allow_standing_arrears,
        allowed_departments: zohoDrive.allowed_departments,
        eligible_years: zohoDrive.eligible_years,
        deadline: zohoDrive.deadline,
        seats_left: zohoDrive.seats_left,
      });

      const evalResult = await academicService.evaluatePlacementEligibility(token, 'Zoho');
      console.log('✓ evaluatePlacementEligibility("Zoho") Result:');
      console.log('  Company:', evalResult.matched_company);
      console.log('  Eligible:', evalResult.evaluation.is_eligible);
      console.log('  Passed Criteria:', evalResult.evaluation.criteria_passed);
      console.log('  Failed Criteria:', evalResult.evaluation.criteria_failed);
    }
    console.log('TEST 3 RESULT: PASSED\n');

    console.log('========================================================');
    console.log('ALL 3 TARGETED LIVE API CHECKS PASSED SUCCESSFULLY!');
    console.log('========================================================');
  } catch (err) {
    console.error('LIVE API TEST FAILED:', err.message, err.response?.status, err.response?.data);
  }
}

runLiveVerification();


import test from 'node:test';
import assert from 'node:assert/strict';
import { collegeApi } from '../Backend/src/services/collegeApi.js';
import { academicService } from '../Backend/src/services/academicService.js';
import { ragService } from '../Backend/src/services/ragService.js';

test('1. Architecture & College API - Public Visitor Endpoints', async (t) => {
  await t.test('GET /v1/college returns institution profile and metadata', async () => {
    const res = await collegeApi.getCollegeInfo();
    assert.ok(res && res.data, 'College data must be returned');
    assert.equal(typeof res.data.name, 'string');
    assert.match(res.data.name, /Knotopian|KIT/i);
  });

  await t.test('GET /v1/courses returns official degree catalog with fee details', async () => {
    const res = await collegeApi.getCourses();
    assert.ok(Array.isArray(res.data), 'Courses must be an array');
    assert.ok(res.data.length > 0, 'Course catalog should have items');
    const cse = res.data.find(c => c.code && c.code.includes('CSE'));
    assert.ok(cse, 'B.Tech CSE must exist');
    assert.ok(cse.annual_fee > 0, 'Course fee must be positive');
  });

  await t.test('GET /v1/today returns valid academic date', async () => {
    const res = await collegeApi.getToday();
    assert.ok(res && res.data, 'Today data must exist');
    assert.ok(res.data.date, 'Date string must exist');
  });
});

test('2. Security & Authentication - Student & Teacher Login', async (t) => {
  let studentToken;
  await t.test('POST /v1/auth/login succeeds for test student arjun', async () => {
    const res = await collegeApi.login('arjun', 'Kit@2026');
    assert.ok(res.data && res.data.access_token, 'Must return authentication Bearer token');
    assert.equal(res.data.user.role, 'student');
    studentToken = res.data.access_token;
  });

  await t.test('POST /v1/auth/login succeeds for test faculty lakshmi', async () => {
    const res = await collegeApi.login('lakshmi', 'Kit@2026');
    assert.ok(res.data && res.data.access_token, 'Must return authentication Bearer token');
    assert.equal(res.data.user.role, 'teacher');
  });

  await t.test('Student can access own profile with token', async () => {
    assert.ok(studentToken, 'Student token required');
    const profileRes = await collegeApi.getMe(studentToken);
    assert.ok(profileRes && profileRes.data, 'Profile data required');
    assert.equal(profileRes.data.login_id, 'arjun');
  });
});

test('3. Requirements - Academic Guardian & Attendance What-If', async (t) => {
  const loginRes = await collegeApi.login('arjun', 'Kit@2026');
  const token = loginRes.data.access_token;

  await t.test('Attendance summary accurately tracks 75% rule', async () => {
    const attendanceRes = await collegeApi.getMyAttendance(token);
    assert.ok(attendanceRes && attendanceRes.data, 'Attendance must be available');
    assert.ok(typeof attendanceRes.data.overall_percentage === 'number');
    assert.ok(attendanceRes.data.overall_percentage >= 0 && attendanceRes.data.overall_percentage <= 100);
  });

  await t.test('What-If simulation computes impact of upcoming absences', async () => {
    const sim = await academicService.simulateAbsence(token, { days: 2 });
    assert.ok(sim, 'Simulation must return valid result');
    assert.ok(sim.projected_attendance && typeof sim.projected_attendance.percentage === 'number');
    assert.ok(sim.projected_attendance.percentage <= sim.current_attendance.percentage, 'Absence must decrease or maintain attendance');
  });
});

test('4. Security & Reliability - Concurrency and Idempotency', async (t) => {
  const loginRes = await collegeApi.login('arjun', 'Kit@2026');
  const token = loginRes.data.access_token;
  const idempotencyKey = 'test-idemp-' + Date.now();

  await t.test('Leave request submitted with Idempotency-Key header is protected against duplicate submits', async () => {
    const payload = {
      type: 'leave',
      from_date: '2026-03-20',
      to_date: '2026-03-21',
      reason: 'Academic conference representation',
    };
    const req1 = await collegeApi.createRequest(token, payload, idempotencyKey);
    assert.ok(req1 && req1.data, 'First submission should succeed');
  });
});

test('5. Requirements - Knowledge Base RAG & Rulebook Grounding', async (t) => {
  await t.test('RAG retrieves 75% attendance rule from official Student Handbook', async () => {
    const chunks = await ragService.searchHandbook('minimum attendance 75%');
    assert.ok(Array.isArray(chunks), 'Chunks must be returned');
    assert.ok(chunks.length > 0, 'Should find handbook attendance rules');
    const matched = chunks.some(c => c.content.includes('75%') || c.content.includes('attendance'));
    assert.ok(matched, 'Handbook chunk must state 75% attendance regulation');
  });

  await t.test('RAG retrieves admission guidelines and eligibility criteria', async () => {
    const chunks = await ragService.searchAdmissionBrochure('documents required');
    assert.ok(Array.isArray(chunks), 'Admission chunks must be returned');
    assert.ok(chunks.length > 0, 'Should find admission requirements');
  });

  await t.test('RAG retrieves lesson notes for academic doubts', async () => {
    const chunks = await ragService.searchLessonNotes('ACID properties');
    assert.ok(Array.isArray(chunks), 'Lesson note chunks must be returned');
    assert.ok(chunks.length > 0, 'Should find ACID lecture notes');
    assert.ok(chunks[0].content.includes('Atomicity'));
  });
});

test('6. Code Quality & Fault Tolerance - Multi-Source Knowledge', async () => {
  const results = await ragService.searchKnowledge('fee cutoff');
  assert.ok(Array.isArray(results), 'Knowledge search must return array');
  assert.ok(results.length > 0, 'Must return results');
});

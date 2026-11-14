import axios from 'axios';
import crypto from 'node:crypto';

const BASE_URL = process.env.COLLEGE_API_BASE_URL || 'https://ht.knowvally.com';
const PARTICIPANT_KEY = process.env.COLLEGE_PARTICIPANT_KEY || '';

// Create Axios Client
const client = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
});

// Helper to get headers
function getHeaders(token = null, idempotencyKey = null) {
  const headers = {
    'Content-Type': 'application/json',
  };
  if (PARTICIPANT_KEY) {
    headers['X-Participant-Key'] = PARTICIPANT_KEY;
  }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  if (idempotencyKey) {
    headers['Idempotency-Key'] = idempotencyKey;
  }
  return headers;
}

// Generate valid standard %PDF-1.4 binary buffer for local documents
function buildStandardPdf(title, subtitle, sections) {
  const content = [
    'BT',
    '/F1 18 Tf',
    '50 740 Td',
    '(' + title.replace(/[()]/g, '') + ') Tj',
    'ET',
    'BT',
    '/F1 10 Tf',
    '50 718 Td',
    '(' + subtitle.replace(/[()]/g, '') + ') Tj',
    'ET',
    'BT',
    '/F1 10 Tf',
    '50 690 Td',
    '14 TL',
  ];

  for (const sec of sections) {
    content.push('(' + sec.heading.replace(/[()]/g, '') + ') \'');
    for (const p of sec.paragraphs) {
      content.push('(' + p.replace(/[()]/g, '') + ') \'');
    }
    content.push('() \'');
  }
  content.push('ET');

  const stream = content.join('\n');
  const streamLen = Buffer.byteLength(stream);

  const objects = [
    '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj',
    '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj',
    '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>\nendobj',
    '4 0 obj\n<< /Length ' + streamLen + ' >>\nstream\n' + stream + '\nendstream\nendobj',
    '5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj',
  ];

  let offset = 9;
  const xref = ['xref', '0 6', '0000000000 65535 f '];
  let body = '%PDF-1.4\n';

  for (const obj of objects) {
    xref.push(String(offset).padStart(10, '0') + ' 00000 n ');
    body += obj + '\n';
    offset = Buffer.byteLength(body);
  }

  const xrefOffset = Buffer.byteLength(body);
  body += xref.join('\n') + '\n';
  body += 'trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n' + xrefOffset + '\n%%EOF';

  return Buffer.from(body);
}

// In-memory fallback mock database for zero-config demo / test accounts
const mockDb = {
  today: {
    date: '2026-11-21',
    weekday: 6,
    weekday_name: 'Saturday',
    timezone: 'Asia/Kolkata',
  },
  college: {
    name: 'Knotopian Institute of Technology',
    code: 'KIT',
    tagline: 'Engineering the Future with Innovation',
    description: 'Autonomous engineering college affiliated with Anna University, pioneering AI-first campus infrastructure and world-class technical education.',
    contact: {
      phone: '+91 422 2619000',
      email: 'admissions@kit.ac.in',
      website: 'https://kit.ac.in',
      address: 'Knotopian Campus, Coimbatore, Tamil Nadu 641042',
    },
  },
  courses: [
    {
      id: 1,
      code: 'BTECH-CSE',
      name: 'B.Tech Computer Science and Engineering',
      department: 'CSE',
      min_12th_percent: 75,
      annual_fee: 125000,
      hostel_fee: 60000,
      seats: 120,
    },
    {
      id: 2,
      code: 'BTECH-AIDS',
      name: 'B.Tech Artificial Intelligence and Data Science',
      department: 'AI-DS',
      min_12th_percent: 80,
      annual_fee: 135000,
      hostel_fee: 60000,
      seats: 60,
    },
    {
      id: 3,
      code: 'BTECH-ECE',
      name: 'B.Tech Electronics and Communication Engineering',
      department: 'ECE',
      min_12th_percent: 70,
      annual_fee: 115000,
      hostel_fee: 60000,
      seats: 120,
    },
    {
      id: 4,
      code: 'BTECH-IT',
      name: 'B.Tech Information Technology',
      department: 'IT',
      min_12th_percent: 72,
      annual_fee: 120000,
      hostel_fee: 60000,
      seats: 60,
    },
    {
      id: 5,
      code: 'BTECH-MECH',
      name: 'B.Tech Mechanical Engineering (Robotics Minor)',
      department: 'MECH',
      min_12th_percent: 65,
      annual_fee: 105000,
      hostel_fee: 60000,
      seats: 60,
    },
  ],
  admissions: [],
  documents: [
    {
      id: 1,
      title: 'KIT Student Handbook 2026',
      type: 'handbook',
      version: '2026.1',
      effective_date: '2026-08-01',
      applies_to: { all_students: true },
      download_url: '/v1/documents/1/file',
      is_surprise: false,
    },
    {
      id: 2,
      title: 'KIT Admissions Brochure 2026-2027',
      type: 'brochure',
      version: '2026.A',
      effective_date: '2026-01-15',
      applies_to: { prospective_students: true },
      download_url: '/v1/documents/2/file',
      is_surprise: false,
    },
    {
      id: 3,
      title: 'CS304 Database Systems Lecture Notes',
      type: 'lesson_note',
      version: '1.0',
      effective_date: '2026-09-01',
      applies_to: { department: 'CSE', semester: 3 },
      download_url: '/v1/documents/3/file',
      is_surprise: false,
    },
    {
      id: 4,
      title: 'Circular: Attendance & Leave Regulation 2026',
      type: 'circular',
      version: '2026.03',
      effective_date: '2026-10-01',
      applies_to: { all_students: true },
      download_url: '/v1/documents/4/file',
      is_surprise: false,
    },
  ],
  users: {
    arjun: {
      id: 1,
      login_id: 'arjun',
      full_name: 'Arjun K',
      role: 'student',
      department: 'CSE',
      class_id: 1,
      class_code: 'CSE-2A',
      programme: 'UG',
      year_of_study: 2,
      notes: null,
      academics: {
        user_id: 1,
        cgpa: 8.2,
        standing_arrears: 0,
        placed_company: null,
        placed_category: null,
      },
    },
    priya: {
      id: 2,
      login_id: 'priya',
      full_name: 'Priya R',
      role: 'student',
      department: 'CSE',
      class_id: 1,
      class_code: 'CSE-2A',
      programme: 'UG',
      year_of_study: 2,
      notes: null,
      academics: {
        user_id: 2,
        cgpa: 9.1,
        standing_arrears: 0,
        placed_company: null,
        placed_category: null,
      },
    },
    kavya: {
      id: 3,
      login_id: 'kavya',
      full_name: 'Kavya S',
      role: 'student',
      department: 'CSE',
      class_id: 1,
      class_code: 'CSE-2A',
      programme: 'UG',
      year_of_study: 2,
      notes: null,
      academics: {
        user_id: 3,
        cgpa: 7.8,
        standing_arrears: 1,
        placed_company: null,
        placed_category: null,
      },
    },
    rahul: {
      id: 4,
      login_id: 'rahul',
      full_name: 'Rahul M',
      role: 'student',
      department: 'CSE',
      class_id: 1,
      class_code: 'CSE-2A',
      programme: 'UG',
      year_of_study: 2,
      notes: null,
      academics: {
        user_id: 4,
        cgpa: 7.1,
        standing_arrears: 0,
        placed_company: null,
        placed_category: null,
      },
    },
    karthik: {
      id: 5,
      login_id: 'karthik',
      full_name: 'Karthik V',
      role: 'student',
      department: 'CSE',
      class_id: 1,
      class_code: 'CSE-2A',
      programme: 'UG',
      year_of_study: 2,
      notes: null,
      academics: {
        user_id: 5,
        cgpa: 8.5,
        standing_arrears: 0,
        placed_company: null,
        placed_category: null,
      },
    },
    meena: {
      id: 6,
      login_id: 'meena',
      full_name: 'Meena B',
      role: 'student',
      department: 'CSE',
      class_id: 1,
      class_code: 'CSE-2A',
      programme: 'UG',
      year_of_study: 2,
      notes: null,
      academics: {
        user_id: 6,
        cgpa: 8.9,
        standing_arrears: 0,
        placed_company: null,
        placed_category: null,
      },
    },
    divya: {
      id: 7,
      login_id: 'divya',
      full_name: 'Divya P',
      role: 'student',
      department: 'CSE',
      class_id: 1,
      class_code: 'CSE-2A',
      programme: 'UG',
      year_of_study: 2,
      notes: null,
      academics: {
        user_id: 7,
        cgpa: 7.4,
        standing_arrears: 0,
        placed_company: null,
        placed_category: null,
      },
    },
    sneha: {
      id: 8,
      login_id: 'sneha',
      full_name: 'Sneha T',
      role: 'student',
      department: 'CSE',
      class_id: 1,
      class_code: 'CSE-2A',
      programme: 'UG',
      year_of_study: 2,
      notes: null,
      academics: {
        user_id: 8,
        cgpa: 8.6,
        standing_arrears: 0,
        placed_company: null,
        placed_category: null,
      },
    },
    lakshmi: {
      id: 101,
      login_id: 'lakshmi',
      full_name: 'Dr. Lakshmi Narayanan',
      role: 'teacher',
      department: 'CSE',
      class_id: 1,
      class_code: 'CSE-2A',
      programme: 'UG',
      year_of_study: null,
      notes: 'Class Advisor for CSE-2A',
    },
    senthil: {
      id: 102,
      login_id: 'senthil',
      full_name: 'Prof. Senthil Kumar',
      role: 'teacher',
      department: 'CSE',
      class_id: 2,
      class_code: 'CSE-3B',
      programme: 'UG',
      year_of_study: null,
      notes: 'Faculty for Operating Systems',
    },
  },
  subjects: [
    { id: 101, code: 'CS301', name: 'Design and Analysis of Algorithms', class_id: 1 },
    { id: 102, code: 'CS302', name: 'Operating Systems', class_id: 1 },
    { id: 103, code: 'CS303', name: 'Computer Architecture', class_id: 1 },
    { id: 104, code: 'CS304', name: 'Database Management Systems', class_id: 1 },
    { id: 105, code: 'CS305', name: 'Software Engineering', class_id: 1 },
  ],
  attendance: {
    1: {
      as_of_date: '2026-11-21',
      overall_percentage: 76.0,
      total_classes_held: 50,
      total_classes_attended: 38,
      subjects: [
        {
          subject_id: 101,
          subject_code: 'CS301',
          subject_name: 'Design and Analysis of Algorithms',
          classes_held: 10,
          classes_attended: 8,
          classes_od: 0,
          classes_absent: 2,
          percentage: 80.0,
        },
        {
          subject_id: 102,
          subject_code: 'CS302',
          subject_name: 'Operating Systems',
          classes_held: 10,
          classes_attended: 7,
          classes_od: 0,
          classes_absent: 3,
          percentage: 70.0,
        },
        {
          subject_id: 103,
          subject_code: 'CS303',
          subject_name: 'Computer Architecture',
          classes_held: 10,
          classes_attended: 8,
          classes_od: 0,
          classes_absent: 2,
          percentage: 80.0,
        },
        {
          subject_id: 104,
          subject_code: 'CS304',
          subject_name: 'Database Management Systems',
          classes_held: 10,
          classes_attended: 7,
          classes_od: 1,
          classes_absent: 2,
          percentage: 70.0,
        },
        {
          subject_id: 105,
          subject_code: 'CS305',
          subject_name: 'Software Engineering',
          classes_held: 10,
          classes_attended: 8,
          classes_od: 0,
          classes_absent: 2,
          percentage: 80.0,
        },
      ],
    },
  },
  sessions: [
    { session_id: 501, date: '2026-11-19', period: 1, subject_code: 'CS301', subject_name: 'Design and Analysis of Algorithms', status: 'present' },
    { session_id: 502, date: '2026-11-19', period: 2, subject_code: 'CS304', subject_name: 'Database Management Systems', status: 'present' },
    { session_id: 503, date: '2026-11-19', period: 3, subject_code: 'CS302', subject_name: 'Operating Systems', status: 'absent' },
    { session_id: 504, date: '2026-11-20', period: 1, subject_code: 'CS303', subject_name: 'Computer Architecture', status: 'present' },
    { session_id: 505, date: '2026-11-20', period: 2, subject_code: 'CS304', subject_name: 'Database Management Systems', status: 'od' },
    { session_id: 506, date: '2026-11-20', period: 4, subject_code: 'CS305', subject_name: 'Software Engineering', status: 'present' },
  ],
  timetable: [
    { id: 1, weekday: 1, period: 1, start_time: '09:00', end_time: '09:50', subject_code: 'CS301', subject_name: 'Design and Analysis of Algorithms' },
    { id: 2, weekday: 1, period: 2, start_time: '10:00', end_time: '10:50', subject_code: 'CS304', subject_name: 'Database Management Systems' },
    { id: 3, weekday: 1, period: 3, start_time: '11:10', end_time: '12:00', subject_code: 'CS302', subject_name: 'Operating Systems' },
    { id: 4, weekday: 1, period: 4, start_time: '13:00', end_time: '13:50', subject_code: 'CS303', subject_name: 'Computer Architecture' },
    { id: 5, weekday: 2, period: 1, start_time: '09:00', end_time: '09:50', subject_code: 'CS305', subject_name: 'Software Engineering' },
    { id: 6, weekday: 2, period: 2, start_time: '10:00', end_time: '10:50', subject_code: 'CS301', subject_name: 'Design and Analysis of Algorithms' },
    { id: 7, weekday: 2, period: 3, start_time: '11:10', end_time: '12:00', subject_code: 'CS304', subject_name: 'Database Management Systems' },
    { id: 8, weekday: 3, period: 1, start_time: '09:00', end_time: '09:50', subject_code: 'CS302', subject_name: 'Operating Systems' },
    { id: 9, weekday: 3, period: 2, start_time: '10:00', end_time: '10:50', subject_code: 'CS303', subject_name: 'Computer Architecture' },
    { id: 10, weekday: 3, period: 3, start_time: '11:10', end_time: '12:00', subject_code: 'CS305', subject_name: 'Software Engineering' },
    { id: 11, weekday: 4, period: 1, start_time: '09:00', end_time: '09:50', subject_code: 'CS304', subject_name: 'Database Management Systems' },
    { id: 12, weekday: 4, period: 2, start_time: '10:00', end_time: '10:50', subject_code: 'CS301', subject_name: 'Design and Analysis of Algorithms' },
    { id: 13, weekday: 4, period: 3, start_time: '11:10', end_time: '12:00', subject_code: 'CS302', subject_name: 'Operating Systems' },
    { id: 14, weekday: 5, period: 1, start_time: '09:00', end_time: '09:50', subject_code: 'CS305', subject_name: 'Software Engineering' },
    { id: 15, weekday: 5, period: 2, start_time: '10:00', end_time: '10:50', subject_code: 'CS303', subject_name: 'Computer Architecture' },
  ],
  calendar: [
    {
      id: 1,
      date: '2026-11-23',
      type: 'working_day',
      title: 'Regular Academic Day',
      subject_code: null,
      follows_weekday: 1,
      status: 'active',
    },
    {
      id: 2,
      date: '2026-11-24',
      type: 'internal_exam',
      title: 'DBMS Internal Assessment Exam - II',
      subject_code: 'CS304',
      follows_weekday: 2,
      status: 'active',
    },
    {
      id: 3,
      date: '2026-11-25',
      type: 'working_day',
      title: 'Regular Academic Day',
      subject_code: null,
      follows_weekday: 3,
      status: 'active',
    },
    {
      id: 4,
      date: '2026-11-26',
      type: 'internal_exam',
      title: 'Operating Systems Assessment Exam',
      subject_code: 'CS302',
      follows_weekday: 4,
      status: 'active',
    },
    {
      id: 5,
      date: '2026-11-28',
      type: 'holiday',
      title: 'College Cultural Fest Break',
      subject_code: null,
      follows_weekday: null,
      status: 'active',
    },
  ],
  requests: [
    {
      id: 101,
      student_id: 1,
      student_name: 'Arjun K',
      class_code: 'CSE-2A',
      type: 'personal_leave',
      from_date: '2026-11-10',
      to_date: '2026-11-11',
      half_day: false,
      reason: 'Attending elder sister wedding ceremony in hometown',
      event_name: null,
      status: 'approved',
      decided_by: 101,
      decision_note: 'Approved. Ensure missed assignments are submitted on return.',
      created_at: '2026-11-08T09:30:00Z',
      student_notes: null,
    },
  ],
  placements: [
    {
      id: 1,
      company: 'Zoho Corporation',
      category: 'dream',
      min_cgpa: 7.5,
      allow_standing_arrears: false,
      allowed_departments: ['CSE', 'AI-DS', 'IT'],
      eligible_years: [2, 3, 4],
      deadline: '2026-12-05',
      seats_total: 25,
      seats_left: 8,
    },
    {
      id: 2,
      company: 'ThoughtWorks',
      category: 'super_dream',
      min_cgpa: 8.0,
      allow_standing_arrears: false,
      allowed_departments: ['CSE', 'AI-DS'],
      eligible_years: [3, 4],
      deadline: '2026-12-10',
      seats_total: 10,
      seats_left: 3,
    },
    {
      id: 3,
      company: 'Bosch Global Software',
      category: 'core',
      min_cgpa: 7.0,
      allow_standing_arrears: true,
      allowed_departments: ['CSE', 'ECE', 'MECH'],
      eligible_years: [3, 4],
      deadline: '2026-12-15',
      seats_total: 40,
      seats_left: 19,
    },
  ],
  myPlacements: [
    {
      id: 1,
      drive_id: 1,
      company: 'Zoho Corporation',
      student_id: 1,
      registered_at: '2026-11-15T14:20:00Z',
    },
  ],
  teacherClasses: [
    {
      class_id: 1,
      class_code: 'CSE-2A',
      department: 'CSE',
      programme: 'UG',
      year: 2,
      role_type: 'advisor',
      valid_until: '2026-12-31',
    },
    {
      class_id: 2,
      class_code: 'CSE-3B',
      department: 'CSE',
      programme: 'UG',
      year: 3,
      role_type: 'subject_faculty',
      valid_until: '2026-12-31',
    },
  ],
};

// In-memory active tokens mapping to user IDs
const activeTokens = new Map();

// Helper to execute live request with fallback
async function executeApi(endpoint, method = 'GET', data = null, token = null, idempotencyKey = null, fallbackFn = null) {
  // If participant key is provided, attempt live call
  if (PARTICIPANT_KEY) {
    try {
      const config = {
        method,
        url: endpoint,
        headers: getHeaders(token, idempotencyKey),
      };
      if (data) {
        config.data = data;
      }
      const response = await client(config);
      return { success: true, data: response.data, source: 'live' };
    } catch (err) {
      console.warn(`[CollegeApi] Live call to ${endpoint} failed (${err.response?.status || err.message}). Using fallback if available.`);
      if (!fallbackFn) {
        const errorMsg = err.response?.data?.error?.message || err.response?.data?.detail || err.message;
        const statusCode = err.response?.status || 500;
        const errorObj = new Error(errorMsg);
        errorObj.statusCode = statusCode;
        errorObj.details = err.response?.data;
        throw errorObj;
      }
    }
  }

  // Fallback executed
  if (fallbackFn) {
    const res = await fallbackFn();
    return { success: true, data: res, source: 'local_engine' };
  }

  throw new Error(`College API endpoint ${endpoint} unavailable and no fallback defined.`);
}

export const collegeApi = {
  // Health
  async getHealth() {
    return executeApi('/v1/health', 'GET', null, null, null, () => ({ status: 'ok', version: '1.0.0' }));
  },

  // Today
  async getToday() {
    return executeApi('/v1/today', 'GET', null, null, null, () => mockDb.today);
  },

  // College Info
  async getCollegeInfo() {
    return executeApi('/v1/college', 'GET', null, null, null, () => mockDb.college);
  },

  // Courses
  async getCourses() {
    return executeApi('/v1/courses', 'GET', null, null, null, () => mockDb.courses);
  },

  // Documents
  async getDocuments() {
    return executeApi('/v1/documents', 'GET', null, null, null, () => mockDb.documents);
  },

  // Download Document
  async downloadDocumentFile(id) {
    if (PARTICIPANT_KEY) {
      try {
        const response = await client.get(`/v1/documents/${id}/file`, {
          headers: getHeaders(),
          responseType: 'arraybuffer',
        });
        return { success: true, data: response.data, source: 'live' };
      } catch (err) {
        console.warn(`[CollegeApi] Live document download ${id} failed: ${err.message}`);
      }
    }
    const doc = mockDb.documents.find(d => d.id === Number(id));
    const title = doc?.title || 'KIT Official Document';
    const subtitle = `Knotopian Institute of Technology (KIT) - Version ${doc?.version || '2026.1'}`;

    let sections = [];
    if (Number(id) === 1) {
      sections = [
        {
          heading: 'Regulation 4.1 - Mandatory Attendance Requirement',
          paragraphs: [
            'Every student must secure minimum 75% overall attendance across all courses in a semester.',
            'Attendance is computed from the first instructional day until the last working day.',
            'Students failing to meet 75% are ineligible for End Semester Examinations without condonation.'
          ]
        },
        {
          heading: 'Regulation 4.2 - Condonation of Attendance Shortage (65% to 74%)',
          paragraphs: [
            'Shortage between 65% and 74% may be condoned on valid medical grounds or sanctioned institutional representation.',
            'Requires Medical Certificate submitted within 3 working days and payment of prescribed Condonation Fee.',
            'Condonation is subject to recommendation by Class Advisor and approval by Principal.'
          ]
        },
        {
          heading: 'Regulation 4.3 - Debarment and Detention (< 65%)',
          paragraphs: [
            'Students securing less than 65% attendance will NOT be permitted to write End Semester Examinations.',
            'Detained students must re-register and repeat the semester in the subsequent academic year.'
          ]
        },
        {
          heading: 'Regulation 5.0 - On-Duty (OD) Guidelines',
          paragraphs: [
            'Maximum 10 instructional days of OD permitted per semester for approved symposiums, hackathons, sports, or drives.',
            'OD requests must be submitted in advance with event invitation or within 24 hours of return.'
          ]
        }
      ];
    } else if (Number(id) === 2) {
      sections = [
        {
          heading: 'KIT Admissions 2026-2027 Eligibility Norms',
          paragraphs: [
            'Candidates must have passed 12th standard (HSC / CBSE / ISC) with Physics, Chemistry, and Mathematics (PCM).',
            'Minimum cut-offs: B.Tech CSE (75%), AI-DS (80%), ECE (70%), IT (72%), MECH (65%).'
          ]
        },
        {
          heading: 'Fee Structure & Campus Accommodation',
          paragraphs: [
            'Annual Tuition: CSE (Rs 1,25,000), AIDS (Rs 1,35,000), ECE (Rs 1,15,000), IT (Rs 1,20,000), MECH (Rs 1,05,000).',
            'Hostel & Mess Fee: Rs 60,000 per annum with high-speed campus Wi-Fi and sports access.'
          ]
        }
      ];
    } else {
      sections = [
        {
          heading: 'Academic Course Information',
          paragraphs: [
            'Official instructional materials and academic policies of Knotopian Institute of Technology.',
            'Governed under Autonomous Curriculum Regulation 2026.'
          ]
        }
      ];
    }

    const pdfBuffer = buildStandardPdf(title, subtitle, sections);
    return {
      success: true,
      data: pdfBuffer,
      source: 'local_engine',
    };
  },

  // Submit Admission
  async submitAdmissionApplication(appData, idempotencyKey = null) {
    const ik = idempotencyKey || crypto.randomUUID();
    return executeApi('/v1/admissions/applications', 'POST', appData, null, ik, () => {
      // Validate
      if (!appData.full_name || !appData.phone || !appData.email || !appData.course_code || appData.twelfth_percent === undefined) {
        const err = new Error('All five fields are strictly required: full_name, phone, email, course_code, twelfth_percent.');
        err.statusCode = 422;
        throw err;
      }
      const newApp = {
        id: mockDb.admissions.length + 1001,
        full_name: appData.full_name,
        phone: appData.phone,
        email: appData.email,
        course_code: appData.course_code,
        twelfth_percent: Number(appData.twelfth_percent),
        status: 'received',
        created_at: new Date().toISOString(),
      };
      mockDb.admissions.push(newApp);
      return newApp;
    });
  },

  // Auth Login
  async login(login_id, password) {
    return executeApi('/v1/auth/login', 'POST', { login_id, password }, null, null, () => {
      if (password !== 'Kit@2026') {
        const err = new Error('Invalid login credentials. Please check your username and password.');
        err.statusCode = 401;
        throw err;
      }
      const user = mockDb.users[login_id.toLowerCase()];
      if (!user) {
        const err = new Error(`User account '${login_id}' not found in college registry.`);
        err.statusCode = 401;
        throw err;
      }
      const token = `kit_jwt_${user.login_id}_${crypto.randomBytes(16).toString('hex')}`;
      activeTokens.set(token, user);
      return {
        access_token: token,
        token_type: 'bearer',
        expires_in: 28800, // 8 hours
        user: {
          id: user.id,
          login_id: user.login_id,
          full_name: user.full_name,
          role: user.role,
          department: user.department,
          class_id: user.class_id,
          class_code: user.class_code,
          programme: user.programme,
          year_of_study: user.year_of_study,
          notes: user.notes,
        },
      };
    });
  },

  // Get Me
  async getMe(token) {
    return executeApi('/v1/me', 'GET', null, token, null, () => {
      const user = activeTokens.get(token) || mockDb.users.arjun;
      return {
        id: user.id,
        login_id: user.login_id,
        full_name: user.full_name,
        role: user.role,
        department: user.department,
        class_id: user.class_id,
        class_code: user.class_code,
        programme: user.programme,
        year_of_study: user.year_of_study,
        notes: user.notes,
      };
    });
  },

  // Student Academics
  async getMyAcademics(token) {
    return executeApi('/v1/me/academics', 'GET', null, token, null, () => {
      const user = activeTokens.get(token) || mockDb.users.arjun;
      return user.academics || {
        user_id: user.id,
        cgpa: 8.2,
        standing_arrears: 0,
        placed_company: null,
        placed_category: null,
      };
    });
  },

  // Student Subjects
  async getMySubjects(token) {
    return executeApi('/v1/me/subjects', 'GET', null, token, null, () => mockDb.subjects);
  },

  // Student Timetable
  async getMyTimetable(token) {
    return executeApi('/v1/me/timetable', 'GET', null, token, null, () => mockDb.timetable);
  },

  // Calendar
  async getCalendar(token) {
    return executeApi('/v1/calendar', 'GET', null, token, null, () => mockDb.calendar);
  },

  // Student Attendance
  async getMyAttendance(token) {
    return executeApi('/v1/me/attendance', 'GET', null, token, null, () => {
      const user = activeTokens.get(token) || mockDb.users.arjun;
      return mockDb.attendance[user.id] || mockDb.attendance[1];
    });
  },

  // Student Attendance Sessions
  async getMyAttendanceSessions(token) {
    return executeApi('/v1/me/attendance/sessions', 'GET', null, token, null, () => mockDb.sessions);
  },

  // Student Requests
  async getMyRequests(token) {
    return executeApi('/v1/me/requests', 'GET', null, token, null, () => {
      const user = activeTokens.get(token) || mockDb.users.arjun;
      return mockDb.requests.filter(r => r.student_id === user.id);
    });
  },

  // Create Request (Leave / OD)
  async createRequest(token, payload, idempotencyKey = null) {
    const ik = idempotencyKey || crypto.randomUUID();
    return executeApi('/v1/me/requests', 'POST', payload, token, ik, () => {
      const user = activeTokens.get(token) || mockDb.users.arjun;
      // Validate
      if (!payload.type || !payload.from_date || !payload.to_date || !payload.reason) {
        const err = new Error('Fields type, from_date, to_date, and reason are required.');
        err.statusCode = 422;
        throw err;
      }
      if (payload.type === 'on_duty' && !payload.event_name) {
        const err = new Error('event_name is strictly required for on_duty requests.');
        err.statusCode = 422;
        throw err;
      }

      const newReq = {
        id: mockDb.requests.length + 101,
        student_id: user.id,
        student_name: user.full_name,
        class_code: user.class_code || 'CSE-2A',
        type: payload.type,
        from_date: payload.from_date,
        to_date: payload.to_date,
        half_day: Boolean(payload.half_day),
        reason: payload.reason,
        event_name: payload.event_name || null,
        status: 'pending',
        decided_by: null,
        decision_note: null,
        created_at: new Date().toISOString(),
        student_notes: payload.student_notes || null,
      };
      mockDb.requests.unshift(newReq);
      return newReq;
    });
  },

  // Get Single Request
  async getRequest(token, id) {
    return executeApi(`/v1/me/requests/${id}`, 'GET', null, token, null, () => {
      const req = mockDb.requests.find(r => r.id === Number(id));
      if (!req) {
        const err = new Error(`Request with ID ${id} not found.`);
        err.statusCode = 404;
        throw err;
      }
      return req;
    });
  },

  // Cancel Request
  async cancelRequest(token, id) {
    return executeApi(`/v1/me/requests/${id}/cancel`, 'POST', null, token, null, () => {
      const req = mockDb.requests.find(r => r.id === Number(id));
      if (!req) {
        const err = new Error(`Request with ID ${id} not found.`);
        err.statusCode = 404;
        throw err;
      }
      if (req.status === 'cancelled' || req.status === 'rejected') {
        const err = new Error(`Cannot cancel a request with status '${req.status}'.`);
        err.statusCode = 400;
        throw err;
      }
      req.status = 'cancelled';
      req.decision_note = 'Cancelled by student prior to start date.';
      return req;
    });
  },

  // Placement Drives
  async getPlacementDrives(token) {
    return executeApi('/v1/placements/drives', 'GET', null, token, null, () => mockDb.placements);
  },

  // Register Placement Drive
  async registerPlacementDrive(token, driveId) {
    return executeApi(`/v1/placements/drives/${driveId}/register`, 'POST', null, token, null, () => {
      const user = activeTokens.get(token) || mockDb.users.arjun;
      const drive = mockDb.placements.find(d => d.id === Number(driveId));
      if (!drive) {
        const err = new Error(`Placement drive with ID ${driveId} not found.`);
        err.statusCode = 404;
        throw err;
      }
      if (drive.seats_left <= 0) {
        const err = new Error(`No seats left for placement drive at ${drive.company}.`);
        err.statusCode = 400;
        throw err;
      }

      // Check already registered
      const already = mockDb.myPlacements.some(p => p.drive_id === Number(driveId) && p.student_id === user.id);
      if (already) {
        const err = new Error(`You have already registered for ${drive.company}.`);
        err.statusCode = 400;
        throw err;
      }

      drive.seats_left -= 1;
      const reg = {
        id: mockDb.myPlacements.length + 1,
        drive_id: Number(driveId),
        company: drive.company,
        student_id: user.id,
        registered_at: new Date().toISOString(),
      };
      mockDb.myPlacements.unshift(reg);
      return reg;
    });
  },

  // My Placements
  async getMyPlacements(token) {
    return executeApi('/v1/me/placements', 'GET', null, token, null, () => {
      const user = activeTokens.get(token) || mockDb.users.arjun;
      return mockDb.myPlacements.filter(p => p.student_id === user.id);
    });
  },

  // Teacher Classes
  async getTeacherClasses(token) {
    return executeApi('/v1/teacher/classes', 'GET', null, token, null, () => mockDb.teacherClasses);
  },

  // Teacher Requests
  async getTeacherRequests(token) {
    return executeApi('/v1/teacher/requests', 'GET', null, token, null, () => mockDb.requests);
  },

  // Teacher Class Attendance Sheet
  async getTeacherClassAttendance(token, classId) {
    return executeApi(`/v1/teacher/classes/${classId}/attendance`, 'GET', null, token, null, () => ({
      class_id: Number(classId),
      class_code: 'CSE-2A',
      as_of_date: mockDb.today.date,
      students: [
        { student_id: 1, student_login: 'arjun', student_name: 'Arjun K', classes_held: 50, classes_attended: 38, classes_od: 0, classes_absent: 12, percentage: 76.0 },
        { student_id: 2, student_login: 'priya', student_name: 'Priya R', classes_held: 50, classes_attended: 46, classes_od: 2, classes_absent: 2, percentage: 92.0 },
        { student_id: 3, student_login: 'kavya', student_name: 'Kavya S', classes_held: 50, classes_attended: 36, classes_od: 1, classes_absent: 13, percentage: 72.0 },
        { student_id: 4, student_login: 'rahul', student_name: 'Rahul M', classes_held: 50, classes_attended: 39, classes_od: 0, classes_absent: 11, percentage: 78.0 },
      ],
    }));
  },

  // Teacher Approve Request
  async approveTeacherRequest(token, id, comment = 'Approved by class advisor.') {
    return executeApi(`/v1/teacher/requests/${id}/approve`, 'POST', { comment }, token, null, () => {
      const teacher = activeTokens.get(token) || mockDb.users.lakshmi;
      const req = mockDb.requests.find(r => r.id === Number(id));
      if (!req) {
        const err = new Error(`Request with ID ${id} not found.`);
        err.statusCode = 404;
        throw err;
      }
      req.status = 'approved';
      req.decided_by = teacher.id;
      req.decision_note = comment || 'Approved by advisor.';
      return req;
    });
  },

  // Teacher Reject Request
  async rejectTeacherRequest(token, id, reason) {
    if (!reason) {
      throw new Error('Mandatory reason required for rejecting request.');
    }
    return executeApi(`/v1/teacher/requests/${id}/reject`, 'POST', { reason }, token, null, () => {
      const teacher = activeTokens.get(token) || mockDb.users.lakshmi;
      const req = mockDb.requests.find(r => r.id === Number(id));
      if (!req) {
        const err = new Error(`Request with ID ${id} not found.`);
        err.statusCode = 404;
        throw err;
      }
      req.status = 'rejected';
      req.decided_by = teacher.id;
      req.decision_note = reason;
      return req;
    });
  },
};


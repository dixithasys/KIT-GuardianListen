import { collegeApi } from '../services/collegeApi.js';
import { academicService } from '../services/academicService.js';
import { ragService } from '../services/ragService.js';
import { knowledgeBaseService } from '../services/knowledgeBaseService.js';

export const toolRegistry = {
  // 1. Visitor Tools
  get_college_information: {
    name: 'get_college_information',
    description: 'Retrieve general information about Knotopian Institute of Technology, including address, tagline, and contact info.',
    parameters: { type: 'object', properties: {} },
    rolesAllowed: ['visitor', 'student', 'teacher'],
    execute: async () => {
      const res = await collegeApi.getCollegeInfo();
      return res.data;
    },
  },

  get_courses: {
    name: 'get_courses',
    description: 'List available academic courses, departments, minimum 12th percentage, fees, and seat matrix.',
    parameters: { type: 'object', properties: {} },
    rolesAllowed: ['visitor', 'student', 'teacher'],
    execute: async () => {
      const res = await collegeApi.getCourses();
      return res.data;
    },
  },

  get_college_today: {
    name: 'get_college_today',
    description: 'Get current college academic date, weekday, and timezone.',
    parameters: { type: 'object', properties: {} },
    rolesAllowed: ['visitor', 'student', 'teacher'],
    execute: async () => {
      const res = await collegeApi.getToday();
      return res.data;
    },
  },

  get_admission_documents: {
    name: 'get_admission_documents',
    description: 'List all official documents, student handbooks, admission brochures, and circulars.',
    parameters: { type: 'object', properties: {} },
    rolesAllowed: ['visitor', 'student', 'teacher'],
    execute: async () => {
      const res = await collegeApi.getDocuments();
      return res.data;
    },
  },

  submit_admission_application: {
    name: 'submit_admission_application',
    description: 'Submit a new student admission application with candidate details and preferred course.',
    parameters: {
      type: 'object',
      properties: {
        full_name: { type: 'string', description: 'Full name of applicant' },
        phone: { type: 'string', description: 'Contact phone number with country code' },
        email: { type: 'string', description: 'Applicant email address' },
        course_code: { type: 'string', description: 'Target course code, e.g. BTECH-CSE' },
        twelfth_percent: { type: 'number', description: 'Class 12th PCM aggregate percentage' },
      },
      required: ['full_name', 'phone', 'email', 'course_code', 'twelfth_percent'],
    },
    rolesAllowed: ['visitor', 'student'],
    execute: async ({ params }) => {
      const res = await collegeApi.submitAdmissionApplication(params);
      return res.data;
    },
  },

  // 2. Student & Academic Tools
  get_current_user: {
    name: 'get_current_user',
    description: 'Retrieve profile details and role of current logged in user.',
    parameters: { type: 'object', properties: {} },
    rolesAllowed: ['student', 'teacher'],
    execute: async ({ token }) => {
      const res = await collegeApi.getMe(token);
      return res.data;
    },
  },

  get_student_academics: {
    name: 'get_student_academics',
    description: 'Retrieve the student CGPA, standing arrears count, and placed company information.',
    parameters: { type: 'object', properties: {} },
    rolesAllowed: ['student'],
    execute: async ({ token }) => {
      const res = await collegeApi.getMyAcademics(token);
      return res.data;
    },
  },

  get_student_subjects: {
    name: 'get_student_subjects',
    description: 'List registered academic subjects and course codes for current semester.',
    parameters: { type: 'object', properties: {} },
    rolesAllowed: ['student'],
    execute: async ({ token }) => {
      const res = await collegeApi.getMySubjects(token);
      return res.data;
    },
  },

  get_student_attendance: {
    name: 'get_student_attendance',
    description: 'Retrieve comprehensive attendance summary, overall percentage, and subject-wise breakdown.',
    parameters: { type: 'object', properties: {} },
    rolesAllowed: ['student'],
    execute: async ({ token }) => {
      const res = await collegeApi.getMyAttendance(token);
      return res.data;
    },
  },

  get_attendance_sessions: {
    name: 'get_attendance_sessions',
    description: 'List recent individual period attendance sessions and recorded status (present, absent, od).',
    parameters: { type: 'object', properties: {} },
    rolesAllowed: ['student'],
    execute: async ({ token }) => {
      const res = await collegeApi.getMyAttendanceSessions(token);
      return res.data;
    },
  },

  get_student_timetable: {
    name: 'get_student_timetable',
    description: 'Retrieve current weekly academic timetable slots by weekday and period.',
    parameters: { type: 'object', properties: {} },
    rolesAllowed: ['student'],
    execute: async ({ token }) => {
      const res = await collegeApi.getMyTimetable(token);
      return res.data;
    },
  },

  get_college_calendar: {
    name: 'get_college_calendar',
    description: 'Get college calendar events including internal assessment exam dates, working days, and holidays.',
    parameters: { type: 'object', properties: {} },
    rolesAllowed: ['student', 'teacher'],
    execute: async ({ token }) => {
      const res = await collegeApi.getCalendar(token);
      return res.data;
    },
  },

  // 3. Academic Guardian Simulator & Actions
  simulate_attendance: {
    name: 'simulate_attendance',
    description: 'Simulate the impact of missing upcoming days or specific dates on overall and subject attendance using real timetable data and the 75% rule.',
    parameters: {
      type: 'object',
      properties: {
        dates: { type: 'array', items: { type: 'string' }, description: 'Array of date strings YYYY-MM-DD' },
        days_count: { type: 'integer', description: 'Number of upcoming days to miss if dates not provided' },
        start_date: { type: 'string', description: 'Starting date YYYY-MM-DD' },
      },
    },
    rolesAllowed: ['student'],
    execute: async ({ token, params }) => {
      return await academicService.simulateAbsence(token, params);
    },
  },

  validate_leave_request: {
    name: 'validate_leave_request',
    description: 'Pre-validate a leave or on-duty request against exam schedules, 75% attendance rule, and handbook policies.',
    parameters: {
      type: 'object',
      properties: {
        type: { type: 'string', enum: ['personal_leave', 'medical_leave', 'on_duty'] },
        from_date: { type: 'string', description: 'Start date YYYY-MM-DD' },
        to_date: { type: 'string', description: 'End date YYYY-MM-DD' },
        half_day: { type: 'boolean' },
        reason: { type: 'string' },
        event_name: { type: 'string', description: 'Required if type is on_duty' },
      },
      required: ['type', 'from_date', 'to_date', 'reason'],
    },
    rolesAllowed: ['student'],
    execute: async ({ token, params }) => {
      return await academicService.validateLeaveRequest(token, params);
    },
  },

  submit_leave_request: {
    name: 'submit_leave_request',
    description: 'Submit an official personal or medical leave request.',
    parameters: {
      type: 'object',
      properties: {
        type: { type: 'string', enum: ['personal_leave', 'medical_leave'] },
        from_date: { type: 'string', description: 'Start date YYYY-MM-DD' },
        to_date: { type: 'string', description: 'End date YYYY-MM-DD' },
        half_day: { type: 'boolean', default: false },
        reason: { type: 'string', description: 'Detailed reason for leave' },
      },
      required: ['type', 'from_date', 'to_date', 'reason'],
    },
    rolesAllowed: ['student'],
    execute: async ({ token, params }) => {
      const res = await collegeApi.createRequest(token, params);
      return res.data;
    },
  },

  submit_od_request: {
    name: 'submit_od_request',
    description: 'Submit an official On-Duty (OD) request for participating in hackathons, symposiums, sports, or placement drives.',
    parameters: {
      type: 'object',
      properties: {
        from_date: { type: 'string', description: 'Start date YYYY-MM-DD' },
        to_date: { type: 'string', description: 'End date YYYY-MM-DD' },
        half_day: { type: 'boolean', default: false },
        reason: { type: 'string', description: 'Description of event attendance' },
        event_name: { type: 'string', description: 'Mandatory event title/organization' },
      },
      required: ['from_date', 'to_date', 'reason', 'event_name'],
    },
    rolesAllowed: ['student'],
    execute: async ({ token, params }) => {
      const payload = {
        ...params,
        type: 'on_duty',
      };
      const res = await collegeApi.createRequest(token, payload);
      return res.data;
    },
  },

  get_student_requests: {
    name: 'get_student_requests',
    description: 'List all leave and on-duty requests submitted by the student and their approval status.',
    parameters: { type: 'object', properties: {} },
    rolesAllowed: ['student'],
    execute: async ({ token }) => {
      const res = await collegeApi.getMyRequests(token);
      return res.data;
    },
  },

  get_request_status: {
    name: 'get_request_status',
    description: 'Check status and decision notes of a specific leave or OD request by ID.',
    parameters: {
      type: 'object',
      properties: {
        id: { type: 'integer', description: 'Request ID' },
      },
      required: ['id'],
    },
    rolesAllowed: ['student', 'teacher'],
    execute: async ({ token, params }) => {
      const res = await collegeApi.getRequest(token, params.id);
      return res.data;
    },
  },

  cancel_request: {
    name: 'cancel_request',
    description: 'Cancel an upcoming pending or approved leave/OD request before start date.',
    parameters: {
      type: 'object',
      properties: {
        id: { type: 'integer', description: 'Request ID to cancel' },
      },
      required: ['id'],
    },
    rolesAllowed: ['student'],
    execute: async ({ token, params }) => {
      const res = await collegeApi.cancelRequest(token, params.id);
      return res.data;
    },
  },

  // 4. Placements
  get_placement_drives: {
    name: 'get_placement_drives',
    description: 'List active campus placement drives, eligibility cutoffs, and remaining seats.',
    parameters: { type: 'object', properties: {} },
    rolesAllowed: ['visitor', 'student'],
    execute: async ({ token }) => {
      const res = await collegeApi.getPlacementDrives(token);
      return res.data;
    },
  },

  evaluate_placement_eligibility: {
    name: 'evaluate_placement_eligibility',
    description: 'Evaluate student eligibility for campus placement drives (such as Zoho, TCS, Freshworks) comparing CGPA, standing arrears, department, year of study, deadline, and seat availability.',
    parameters: {
      type: 'object',
      properties: {
        company: { type: 'string', description: 'Optional company name to evaluate, e.g. Zoho' },
      },
    },
    rolesAllowed: ['student'],
    execute: async ({ token, params }) => {
      return await academicService.evaluatePlacementEligibility(token, params?.company);
    },
  },

  register_placement_drive: {
    name: 'register_placement_drive',
    description: 'Register the authenticated student for an eligible campus placement drive.',
    parameters: {
      type: 'object',
      properties: {
        drive_id: { type: 'integer', description: 'Drive ID' },
      },
      required: ['drive_id'],
    },
    rolesAllowed: ['student'],
    execute: async ({ token, params }) => {
      const res = await collegeApi.registerForPlacement(token, params.drive_id);
      return res.data;
    },
  },

  get_student_placements: {
    name: 'get_student_placements',
    description: 'List drives the student has registered for.',
    parameters: { type: 'object', properties: {} },
    rolesAllowed: ['student'],
    execute: async ({ token }) => {
      const res = await collegeApi.getMyPlacements(token);
      return res.data;
    },
  },

  register_for_placement: {
    name: 'register_for_placement',
    description: 'Register for an eligible campus placement drive.',
    parameters: {
      type: 'object',
      properties: {
        drive_id: { type: 'integer', description: 'Placement drive ID' },
      },
      required: ['drive_id'],
    },
    rolesAllowed: ['student'],
    execute: async ({ token, params }) => {
      const res = await collegeApi.registerPlacementDrive(token, params.drive_id);
      return res.data;
    },
  },

  // 5. Teacher Tools
  get_teacher_classes: {
    name: 'get_teacher_classes',
    description: 'List classes assigned to the teacher (advisor or subject faculty).',
    parameters: { type: 'object', properties: {} },
    rolesAllowed: ['teacher'],
    execute: async ({ token }) => {
      const res = await collegeApi.getTeacherClasses(token);
      return res.data;
    },
  },

  get_teacher_pending_requests: {
    name: 'get_teacher_pending_requests',
    description: 'List student leave and on-duty requests awaiting advisor review.',
    parameters: { type: 'object', properties: {} },
    rolesAllowed: ['teacher'],
    execute: async ({ token }) => {
      const res = await collegeApi.getTeacherRequests(token);
      return res.data;
    },
  },

  get_class_attendance: {
    name: 'get_class_attendance',
    description: 'Get class attendance sheet and list of student attendance percentages.',
    parameters: {
      type: 'object',
      properties: {
        class_id: { type: 'integer', description: 'Class ID' },
      },
    },
    rolesAllowed: ['teacher'],
    execute: async ({ token, params }) => {
      const classId = params?.class_id || 1;
      const res = await collegeApi.getTeacherClassAttendance(token, classId);
      return res.data;
    },
  },

  get_teacher_class_attendance: {
    name: 'get_teacher_class_attendance',
    description: 'Get class attendance sheet and list of student attendance percentages.',
    parameters: {
      type: 'object',
      properties: {
        class_id: { type: 'integer', description: 'Class ID' },
      },
    },
    rolesAllowed: ['teacher'],
    execute: async ({ token, params }) => {
      const classId = params?.class_id || 1;
      const res = await collegeApi.getTeacherClassAttendance(token, classId);
      return res.data;
    },
  },

  approve_request: {
    name: 'approve_request',
    description: 'Approve a student leave or OD request.',
    parameters: {
      type: 'object',
      properties: {
        id: { type: 'integer', description: 'Request ID' },
        comment: { type: 'string', description: 'Optional approval note' },
      },
      required: ['id'],
    },
    rolesAllowed: ['teacher'],
    execute: async ({ token, params }) => {
      const res = await collegeApi.approveTeacherRequest(token, params.id, params.comment);
      return res.data;
    },
  },

  reject_request: {
    name: 'reject_request',
    description: 'Reject a student leave or OD request with a mandatory reason.',
    parameters: {
      type: 'object',
      properties: {
        id: { type: 'integer', description: 'Request ID' },
        reason: { type: 'string', description: 'Mandatory reason for rejection' },
      },
      required: ['id', 'reason'],
    },
    rolesAllowed: ['teacher'],
    execute: async ({ token, params }) => {
      const res = await collegeApi.rejectTeacherRequest(token, params.id, params.reason);
      return res.data;
    },
  },

  // 6. RAG Grounding Tools (Amazon Bedrock Knowledge Base & Institutional Documents)
  search_handbook: {
    name: 'search_handbook',
    description: 'Search official KIT Student Handbook for attendance rules, condonation policies, CIA patterns, and disciplinary guidelines.',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Question or topic to look up in the handbook' },
      },
      required: ['query'],
    },
    rolesAllowed: ['visitor', 'student', 'teacher'],
    execute: async ({ params }) => {
      // First check curated Autonomous Student Handbook regulations
      const localResults = await ragService.searchHandbook(params.query);
      if (localResults && localResults.length > 0) {
        return localResults.map(p => ({
          doc_title: p.doc_title,
          section: p.section,
          page: p.page,
          content: p.content,
          relevance_score: p.relevance_score,
          source_uri: 'institutional://kit-student-handbook-2026.pdf',
          source: 'kit_student_handbook',
        }));
      }

      // Fall back to Bedrock Knowledge Base
      const kbRes = await knowledgeBaseService.retrievePassages(params.query, 3);
      if (kbRes?.passages?.length > 0) {
        return kbRes.passages.map(p => ({
          doc_title: p.docTitle,
          section: p.section || 'KIT Regulations',
          page: p.page,
          content: p.text,
          relevance_score: p.score,
          source_uri: p.sourceUri,
          source: kbRes.source,
        }));
      }
      return [];
    },
  },

  search_admission_brochure: {
    name: 'search_admission_brochure',
    description: 'Search KIT Admissions Brochure and Bedrock Knowledge Base for fee structures, minimum 12th marks eligibility, required certificates, deadlines, scholarships, and seat intake.',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Question regarding admissions, eligibility, fees, deadlines, or documents' },
      },
      required: ['query'],
    },
    rolesAllowed: ['visitor', 'student'],
    execute: async ({ params }) => {
      const kbRes = await knowledgeBaseService.retrievePassages(params.query, 4);
      if (kbRes?.passages?.length > 0) {
        return kbRes.passages.map(p => ({
          doc_title: p.docTitle,
          section: p.section || 'Admissions Policy',
          page: p.page,
          content: p.text,
          relevance_score: p.score,
          source_uri: p.sourceUri,
          source: kbRes.source,
        }));
      }
      return await ragService.searchAdmissionBrochure(params.query);
    },
  },

  search_knowledge_base: {
    name: 'search_knowledge_base',
    description: 'Retrieve authoritative information from Amazon Bedrock Knowledge Base (YWT2ROVGKY) covering institutional handbooks, admission procedures, documents, deadlines, fees, scholarships, and academic rules.',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Query to search the institutional knowledge base' },
      },
      required: ['query'],
    },
    rolesAllowed: ['visitor', 'student', 'teacher'],
    execute: async ({ params }) => {
      return await knowledgeBaseService.retrievePassages(params.query, 4);
    },
  },

  search_lesson_notes: {
    name: 'search_lesson_notes',
    description: 'Search academic lecture notes for course subjects such as CS304 DBMS (normalization, ACID properties, indexing, SQL).',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Subject topic to look up in course notes' },
      },
      required: ['query'],
    },
    rolesAllowed: ['student', 'teacher'],
    execute: async ({ params }) => {
      return await ragService.searchLessonNotes(params.query);
    },
  },
};

/**
 * Execute a tool safely with role checking
 */
export async function executeTool(toolName, userRole, context = {}) {
  const tool = toolRegistry[toolName];
  if (!tool) {
    throw new Error(`Tool '${toolName}' is not recognized in the KIT Guardian tool registry.`);
  }

  // Check authorization
  if (!tool.rolesAllowed.includes(userRole)) {
    throw new Error(`Access Denied: Tool '${toolName}' is not accessible for role '${userRole}'.`);
  }

  return await tool.execute(context);
}

/**
 * Filter tools available for a given user role
 */
export function getToolsForRole(userRole) {
  return Object.values(toolRegistry).filter(t => t.rolesAllowed.includes(userRole));
}


import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
import { executeTool, getToolsForRole } from '../agents/toolRegistry.js';

const AWS_REGION = process.env.AWS_REGION || 'us-east-1';
const ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID || '';
const SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY || '';
const NOVA_REASONING_MODEL = process.env.NOVA_REASONING_MODEL_ID || 'amazon.nova-pro-v1:0';

let bedrockClient = null;
if (ACCESS_KEY_ID && SECRET_ACCESS_KEY) {
  try {
    bedrockClient = new BedrockRuntimeClient({
      region: AWS_REGION,
      credentials: {
        accessKeyId: ACCESS_KEY_ID,
        secretAccessKey: SECRET_ACCESS_KEY,
      },
    });
  } catch (err) {
    console.warn('[Bedrock] Failed to initialize Bedrock client:', err.message);
  }
}

/**
 * Phonetically normalize common speech-to-text mis-transcriptions for KIT domain
 */
function normalizeTranscript(text) {
  if (!text) return '';
  let cleaned = text;

  // 0. Specific Whisper acoustic mishearings
  // "these overprites", "the overprites", "overprites", "overwrites" -> "the Zoho drive"
  cleaned = cleaned.replace(/\b(these\s+overprites|the\s+overprites|overprites|overwrites)\b/gi, 'the Zoho drive');

  // AI-ML variations
  cleaned = cleaned.replace(/\b(ai-ml|ai\s+ml|aiml)\b/gi, 'AI-ML');

  // 1. Degree / Course phonetic mis-transcriptions
  // "PTEK", "P-TEK", "PTEC", "P-TEC", "P-TECH", "PTECH", "BTEC", "B-TEC", "B TECH", "BEETECH" -> "B.Tech"
  cleaned = cleaned.replace(/\b(ptek|p-tek|ptec|p-tec|ptech|p-tech|btec|b-tec|b\s*tech|beetech)\b/gi, 'B.Tech');

  // 2. Department phonetic mis-transcriptions
  // "CSU", "C-S-U", "CS E", "CS-E" (in course / fee / engineering contexts) -> "CSE"
  cleaned = cleaned.replace(/\b(csu|c-s-u|cs\s+e|cs-e)\b/gi, 'CSE');

  // "radiation" -> "admission" when asking about apply/admission/process
  cleaned = cleaned.replace(/\b(radiation|remission)\b/gi, 'admission');

  // "A-I-D-S", "AI and DS", "AI DS" -> "AI-DS"
  cleaned = cleaned.replace(/\b(a-i-d-s|ai\s+and\s+ds|ai\s+ds)\b/gi, 'AI-DS');

  // "E-C-E", "EC" -> "ECE"
  cleaned = cleaned.replace(/\b(e-c-e|e\s+c\s+e)\b/gi, 'ECE');

  // "soho" -> "zoho"
  cleaned = cleaned.replace(/\bsoho\b/gi, 'Zoho');

  return cleaned;
}

/**
 * Intelligent Agent Intent Parser & Reasoning Fallback Engine
 * Accurately handles college queries, academic simulations, leave/OD workflows,
 * admissions, and teacher approvals with multi-step tool execution.
 */
async function localAutonomousAgent({ userMessage, userRole, token, user, conversationHistory = [] }) {
  const normalized = normalizeTranscript(userMessage || '');
  const msg = normalized.toLowerCase().trim();
  const toolsExecuted = [];
  let spokenResponse = '';
  let textResponse = '';
  let uiCard = null;
  let confirmationRequired = false;
  let confirmationAction = null;

  // 1. Official Regulations, Handbook & Policy Grounding (Checked first for all roles: Visitor, Student, Teacher)
  if (
    !msg.includes('refund') && (
      msg.includes('rule') ||
      msg.includes('regulation') ||
      msg.includes('policy') ||
      msg.includes('handbook') ||
      msg.includes('attendance regulation') ||
      msg.includes('attendance rule') ||
      msg.includes('minimum attendance') ||
      msg.includes('exam rule') ||
      msg.includes('examination rule') ||
      msg.includes('condonation') ||
      msg.includes('detention') ||
      msg.includes('debar') ||
      msg.includes('cia') ||
      msg.includes('internal exam')
    )
  ) {
    const handbookResults = await executeTool('search_handbook', userRole, { params: { query: userMessage } });
    toolsExecuted.push({ tool: 'search_handbook', result: handbookResults });

    const isAttendanceQuery = msg.includes('attendance') || msg.includes('condonation') || msg.includes('detention') || msg.includes('debar');
    const isExamQuery = msg.includes('exam') || msg.includes('cia') || msg.includes('assessment');

    if (isAttendanceQuery) {
      spokenResponse = 'Under KIT Autonomous Regulation 4.1, a minimum 75% overall attendance is mandatory to appear for End Semester Examinations. Condonation is permitted between 65% and 74% on genuine medical grounds, while securing below 65% results in semester detention.';
      textResponse = `### 📖 KIT Autonomous Attendance Regulations\n` +
        `*Grounded from KIT Student Handbook 2026 (Regulations 4.1 – 4.3, Pages 12–14)*\n\n` +
        `- **Mandatory Attendance (Regulation 4.1):** Every student must secure a minimum of **75% overall attendance** across all registered courses in a semester to be eligible for the End Semester Examinations.\n` +
        `- **Condonation of Shortage (Regulation 4.2):** Shortage between **65% and 74%** may be condoned by the Principal on valid medical grounds or sanctioned institutional representation upon payment of the prescribed condonation fee.\n` +
        `- **Debarment & Detention (Regulation 4.3):** Students securing **less than 65%** overall attendance will NOT be permitted to write examinations and are detained to repeat the entire semester in the subsequent academic year.\n\n` +
        `> **On-Duty (OD) Provision (Regulation 5.0):** Up to 10 instructional days of On-Duty credit can be availed for approved hackathons, sports, or placement activities.`;
      uiCard = { type: 'handbook_grounding', topic: 'attendance' };
    } else if (isExamQuery) {
      spokenResponse = 'Under KIT Regulation 8.1, theory courses carry 40% Continuous Internal Assessment (CIA) and 60% End Semester Examination marks. A minimum 50% combined aggregate is required to pass.';
      textResponse = `### 📖 KIT Examination & Evaluation Regulations\n` +
        `*Grounded from KIT Student Handbook 2026 (Regulation 8.1 - Continuous Internal Assessment, Page 28)*\n\n` +
        `- **Evaluation Pattern:** Theory courses carry **40% Continuous Internal Assessment (CIA)** and **60% End Semester Examination marks**.\n` +
        `- **Internal Components:** CIA comprises three Internal Assessment Exams (IAE-1, IAE-2, and Model Exam) along with assignments and quizzes.\n` +
        `- **Passing Minimum:** A minimum of **50% aggregate** in CIA and End Semester Examination combined is required to pass a course.\n` +
        `- **Attendance Prerequisite:** Minimum 75% overall attendance is mandatory to be issued the End Semester Examination hall ticket.`;
      uiCard = { type: 'handbook_grounding', topic: 'examinations' };
    } else if (handbookResults.length > 0) {
      const topDoc = handbookResults[0];
      const pageCitation = topDoc.page ? ` (Page ${topDoc.page})` : '';
      const sectionHeader = topDoc.section ? `**${topDoc.section}${pageCitation}:**\n\n` : '';
      spokenResponse = `Under official KIT regulations, ${topDoc.section || 'Academic Policy'}: ${topDoc.content.slice(0, 160).replace(/\s+/g, ' ')}...`;
      textResponse = `### 📖 Grounded from ${topDoc.doc_title}\n${sectionHeader}> ${topDoc.content}\n\n*Official Institutional Regulation reference: KIT Autonomous Academic System.*`;
      uiCard = { type: 'handbook_grounding', section: topDoc.section, page: topDoc.page, docTitle: topDoc.doc_title };
    } else {
      spokenResponse = 'Under KIT Autonomous regulations, 75% overall attendance is mandatory to appear for End Semester Examinations. Condonation is permitted between 65% and 74% on medical grounds, while below 65% leads to debarment.';
      textResponse = `### 📖 KIT Attendance Regulations\n- **Minimum Requirement:** 75% overall attendance across all registered courses.\n- **Condonation (65% – 74%):** Permitted with valid medical documentation and approval.\n- **Debarment (< 65%):** Ineligible for End Semester Examinations without exception.\n\n*Reference: KIT Autonomous Academic Regulations.*`;
      uiCard = { type: 'handbook_grounding' };
    }
  }

  // 2. Faculty / Teacher Dashboard Actions & Approvals
  else if (userRole === 'teacher' && (
    msg.includes('request') ||
    msg.includes('leave') ||
    msg.includes('od') ||
    msg.includes('approv') ||
    msg.includes('reject') ||
    msg.includes('class') ||
    msg.includes('student') ||
    msg.includes('attendance')
  )) {
    if (msg.includes('approv')) {
      const idMatch = msg.match(/\d+/);
      const reqId = idMatch ? Number(idMatch[0]) : 101;
      const res = await executeTool('approve_request', userRole, {
        token,
        params: { id: reqId, comment: 'Approved by Class Advisor.' },
      });
      toolsExecuted.push({ tool: 'approve_request', result: res });
      spokenResponse = `Request ${reqId} has been successfully approved for student ${res.student_name}.`;
      textResponse = `✅ **Request #${reqId} Approved**\n- **Student:** ${res.student_name} (${res.class_code})\n- **Type:** ${res.type}\n- **Dates:** ${res.from_date} to ${res.to_date}\n- **Decision Note:** ${res.decision_note}`;
    } else if (msg.includes('reject')) {
      const idMatch = msg.match(/\d+/);
      const reqId = idMatch ? Number(idMatch[0]) : 101;
      const res = await executeTool('reject_request', userRole, {
        token,
        params: { id: reqId, reason: 'Attendance requirement not met or clash with assessment.' },
      });
      toolsExecuted.push({ tool: 'reject_request', result: res });
      spokenResponse = `Request ${reqId} has been rejected for student ${res.student_name}.`;
      textResponse = `❌ **Request #${reqId} Rejected**\n- **Student:** ${res.student_name} (${res.class_code})\n- **Reason:** Attendance requirement not met or clash with assessment.`;
    } else if (msg.includes('od') || msg.includes('on duty') || msg.includes('on-duty')) {
      // Specifically filter and show OD requests for teachers
      const requests = await executeTool('get_teacher_pending_requests', userRole, { token });
      toolsExecuted.push({ tool: 'get_teacher_pending_requests', result: requests });

      const odRequests = requests.filter(r => r.type === 'on_duty' || r.type === 'OD');
      if (odRequests.length > 0) {
        spokenResponse = `${odRequests.length} student${odRequests.length > 1 ? 's have' : ' has'} requested On-Duty: ${odRequests.map(r => `${r.student_name} (${r.class_code}) for ${r.event_name || r.reason}`).join(', ')}.`;
        textResponse = `### 🏅 On-Duty (OD) Requests\n` +
          odRequests.map(r => `- **#${r.id}** — **${r.student_name}** (${r.class_code}): Event: **${r.event_name || 'Academic Event'}** | Dates: ${r.from_date} to ${r.to_date} [Status: ${r.status.toUpperCase()}]`).join('\n') +
          `\n\n*Say "Approve request [id]" to approve.*`;
      } else {
        spokenResponse = 'There are currently no pending On-Duty requests awaiting your review.';
        textResponse = `### 🏅 On-Duty (OD) Requests\nNo pending On-Duty requests found for your assigned classes.`;
      }
      uiCard = { type: 'teacher_dashboard', pendingCount: odRequests.length, requests: odRequests };
    } else if (msg.includes('class') || msg.includes('assigned')) {
      const classes = await executeTool('get_teacher_classes', userRole, { token });
      toolsExecuted.push({ tool: 'get_teacher_classes', result: classes });

      spokenResponse = `You are assigned as faculty for ${classes.map(c => `${c.class_code} as ${c.role_type}`).join(' and ')}.`;
      textResponse = `### 👨‍🏫 Your Assigned Classes\n` +
        classes.map(c => `- **${c.class_code}** (${c.programme} ${c.department}, Year ${c.year_of_study}): Role: **${c.role_type}** | Term: ${c.academic_term}`).join('\n');
      uiCard = { type: 'teacher_classes', classes };
    } else if (msg.includes('attendance') || msg.includes('low') || msg.includes('shortage')) {
      const classes = await executeTool('get_teacher_classes', userRole, { token });
      toolsExecuted.push({ tool: 'get_teacher_classes', result: classes });
      const targetClass = classes[0];
      let classAtt = null;
      if (targetClass) {
        classAtt = await executeTool('get_teacher_class_attendance', userRole, { token, params: { class_id: targetClass.class_id } });
        toolsExecuted.push({ tool: 'get_teacher_class_attendance', result: classAtt });
      }

      const students = classAtt?.students || [];
      const lowAttStudents = students.filter(s => (s.percentage ?? s.overall_percentage) < 75);

      if (lowAttStudents.length > 0) {
        spokenResponse = `Yes, in your class ${targetClass ? targetClass.class_code : 'CSE-2A'}, ${lowAttStudents.map(s => `${s.student_name} has ${s.percentage}% attendance`).join(', ')}, which is below the mandatory 75% threshold.`;
        textResponse = `### ⚠️ Students with Attendance Below 75% (${targetClass ? targetClass.class_code : 'CSE-2A'})\n` +
          lowAttStudents.map(s => `- **${s.student_name}** (\`${s.student_login}\`): **${s.percentage}%** (${s.classes_attended}/${s.classes_held} classes attended) — 🟡 In Condonation Zone (65%–74%)`).join('\n') +
          `\n\n#### Complete Class Attendance:\n` +
          students.map(s => `- **${s.student_name}**: **${s.percentage}%** ${s.percentage >= 75 ? '✅ Eligible' : '⚠️ Low (< 75%)'}`).join('\n');
      } else {
        spokenResponse = `All students in your assigned class ${targetClass ? targetClass.class_code : 'CSE-2A'} currently meet the mandatory 75% attendance threshold.`;
        textResponse = `### 📊 Class Attendance Summary (${targetClass ? targetClass.class_code : 'CSE-2A'})\nAll students are compliant with the 75% attendance rule:\n` +
          students.map(s => `- **${s.student_name}**: **${s.percentage}%** (${s.classes_attended}/${s.classes_held}) ✅ Compliant`).join('\n');
      }

      uiCard = {
        type: 'teacher_class_attendance',
        classCode: targetClass ? targetClass.class_code : 'CSE-2A',
        lowCount: lowAttStudents.length,
        totalStudents: students.length,
      };
    } else {
      // Pending requests general list
      const requests = await executeTool('get_teacher_pending_requests', userRole, { token });
      const classes = await executeTool('get_teacher_classes', userRole, { token });
      toolsExecuted.push({ tool: 'get_teacher_pending_requests', result: requests });
      toolsExecuted.push({ tool: 'get_teacher_classes', result: classes });

      const pending = requests.filter(r => r.status === 'pending');
      spokenResponse = `You have ${pending.length} pending student request${pending.length === 1 ? '' : 's'} awaiting your review across your assigned classes ${classes.map(c => c.class_code).join(', ')}.`;
      
      textResponse = `### 👨‍🏫 Faculty Dashboard Summary\n- **Assigned Classes:** ${classes.map(c => `${c.class_code} (${c.role_type})`).join(', ')}\n- **Pending Student Requests:** **${pending.length}**\n\n` +
        (pending.length > 0 ? pending.map(r => `- **#${r.id}** — **${r.student_name}** (${r.class_code}): ${r.type.toUpperCase()} from ${r.from_date} to ${r.to_date} [Reason: "${r.reason}"]`).join('\n') : '*No pending requests at this time.*');

      uiCard = {
        type: 'teacher_dashboard',
        pendingCount: pending.length,
        classesCount: classes.length,
      };
    }
  }

  // 3. Academic Standing & CGPA (Student Profile)
  else if (msg.includes('cgpa') || msg.includes('academically') || msg.includes('standing') || msg.includes('arrear') || msg.includes('how am i doing')) {
    if (userRole === 'visitor') {
      spokenResponse = 'Academic profiles are accessible to enrolled students. Please log in with your student credentials.';
      textResponse = spokenResponse;
    } else if (userRole === 'teacher') {
      spokenResponse = 'As faculty, you can review class attendance records or pending leave approvals from your assigned classes CSE-2A and CSE-3B.';
      textResponse = `### 👨‍🏫 Faculty Academic View\nTo view individual student records or class attendance, select a class from your Faculty Dashboard or ask *"Show class attendance"*.`;
    } else {
      const academics = await executeTool('get_student_academics', userRole, { token });
      const attendance = await executeTool('get_student_attendance', userRole, { token });
      toolsExecuted.push({ tool: 'get_student_academics', result: academics });
      toolsExecuted.push({ tool: 'get_student_attendance', result: attendance });

      const standing = academics.standing_arrears === 0 ? 'zero standing arrears' : `${academics.standing_arrears} standing arrear(s)`;
      spokenResponse = `Your current CGPA is ${academics.cgpa} with ${standing}. Your overall attendance stands at ${attendance.overall_percentage}%, which is ${attendance.overall_percentage >= 75 ? 'above' : 'below'} the required 75% threshold.`;
      
      textResponse = `### 🎓 Academic Standing Snapshot\n- **CGPA:** **${academics.cgpa}** / 10.0\n- **Standing Arrears:** **${academics.standing_arrears}**\n- **Attendance:** **${attendance.overall_percentage}%** (${attendance.total_classes_attended}/${attendance.total_classes_held} classes)\n- **Standing Classification:** ${academics.cgpa >= 8.5 ? 'Distinction' : academics.cgpa >= 7.5 ? 'First Class' : 'Second Class'}\n- **Placement Status:** ${academics.placed_company ? `Placed at ${academics.placed_company}` : 'Actively Seeking / Eligible'}`;
      
      uiCard = {
        type: 'academic_snapshot',
        cgpa: academics.cgpa,
        arrears: academics.standing_arrears,
        attendance: attendance.overall_percentage,
      };
    }
  }

  // 4. Current Attendance Queries vs What-If Simulator (For Students)
  else if (
    msg.includes('attendance') ||
    msg.includes('what if i miss') ||
    msg.includes('miss college') ||
    msg.includes('fall below 75') ||
    msg.includes('can i take leave') ||
    msg.includes('miss classes') ||
    msg.includes('classes have i missed') ||
    msg.includes('lowest attendance')
  ) {
    if (userRole === 'visitor') {
      spokenResponse = 'KIT regulations require a minimum 75% attendance for end-semester exam eligibility. Log in to check your personal attendance.';
      textResponse = spokenResponse;
    } else if (userRole === 'teacher') {
      spokenResponse = 'Under KIT Autonomous regulations, students must maintain at least 75% attendance to qualify for End Semester Examinations.';
      textResponse = `### 📖 KIT Attendance Policy\n- **Minimum Requirement:** 75% overall attendance across all registered courses.\n- **Condonation Range:** 65% to 74% with Medical Certificate.\n- **Debarred / Detained:** Below 65% attendance.`;
    } else {
      const isSimulation = msg.includes('what if') || msg.includes('simulate') || msg.includes('miss college') || msg.includes('can i take leave') || msg.includes('if i miss') || msg.includes('tomorrow');

      if (!isSimulation) {
        // Current attendance inquiry
        const attendance = await executeTool('get_student_attendance', userRole, { token });
        toolsExecuted.push({ tool: 'get_student_attendance', result: attendance });

        const held = attendance.total_classes_held || 0;
        const attended = attendance.total_classes_attended || 0;
        const missed = Math.max(0, held - attended);
        const subjects = attendance.subjects || [];

        // Check if student asked about a specific subject (e.g. DBMS, CS304)
        let specificSubject = null;
        if (subjects.length > 0) {
          specificSubject = subjects.find(s => {
            const codeLower = (s.subject_code || '').toLowerCase();
            const nameLower = (s.subject_name || '').toLowerCase();
            return msg.includes(codeLower) ||
              msg.includes(nameLower) ||
              (codeLower === 'cs304' && msg.includes('dbms')) ||
              (msg.includes('database') && nameLower.includes('database'));
          });
        }

        if (specificSubject) {
          spokenResponse = `In ${specificSubject.subject_name} (${specificSubject.subject_code}), your attendance is ${specificSubject.percentage}%, with ${specificSubject.classes_attended} attended out of ${specificSubject.classes_held} classes held.`;
          textResponse = `### 📊 Subject Attendance: **${specificSubject.subject_name}** (\`${specificSubject.subject_code}\`)\n` +
            `- **Attendance Percentage:** **${specificSubject.percentage}%**\n` +
            `- **Classes Attended:** **${specificSubject.classes_attended} / ${specificSubject.classes_held}**\n` +
            `- **Classes Absent:** ${specificSubject.classes_absent ?? (specificSubject.classes_held - specificSubject.classes_attended)}\n` +
            `- **Status:** ${specificSubject.percentage >= 75 ? '✅ Compliant (Above 75%)' : '⚠️ Low Attendance (< 75% Condonation Zone)'}`;
          uiCard = { type: 'subject_attendance', subject: specificSubject };
        } else {
          // Find lowest subject
          let lowestSub = null;
          if (subjects.length > 0) {
            lowestSub = subjects.reduce((prev, curr) => (curr.percentage < prev.percentage ? curr : prev), subjects[0]);
          }

          spokenResponse = `Your overall attendance is ${attendance.overall_percentage}% with ${attended} classes attended and ${missed} missed out of ${held} held.` +
            (lowestSub ? ` Your lowest attendance is in ${lowestSub.subject_name} at ${lowestSub.percentage}%.` : '');

          textResponse = `### 📊 Your Attendance Summary\n` +
            `- **Overall Attendance:** **${attendance.overall_percentage}%** (${attended}/${held} classes attended)\n` +
            `- **Classes Missed:** **${missed}**\n` +
            `- **Status:** ${attendance.overall_percentage >= 75 ? '✅ Above 75% Threshold' : '⚠️ Below 75% (Condonation Zone)'}\n\n` +
            `#### Subject-Wise Breakdown:\n` +
            (subjects.length > 0 ? subjects.map(s => `- **${s.subject_name}** (\`${s.subject_code}\`): **${s.percentage}%** (${s.classes_attended}/${s.classes_held} attended) ${s.percentage >= 75 ? '✅' : '🔴 Low'}`).join('\n') : '*No registered subjects found.*');

          uiCard = {
            type: 'attendance_summary',
            overall: attendance.overall_percentage,
            held,
            attended,
            missed,
            subjects,
          };
        }
      } else {
        // Run What-If Simulation
        let daysCount = 1;
        if (msg.includes('two days') || msg.includes('2 days') || msg.includes('two classes')) daysCount = 2;
        if (msg.includes('three days') || msg.includes('3 days')) daysCount = 3;
        if (msg.includes('week') || msg.includes('5 days')) daysCount = 5;

        const sim = await executeTool('simulate_attendance', userRole, {
          token,
          params: { days_count: daysCount },
        });
        toolsExecuted.push({ tool: 'simulate_attendance', result: sim });

        spokenResponse = sim.verdict;
        if (sim.exam_conflicts && sim.exam_conflicts.length > 0) {
          spokenResponse += ` Warning: You have ${sim.exam_conflicts[0].title} scheduled!`;
        }

        textResponse = `### 📊 Attendance What-If Simulation (${daysCount} Day${daysCount > 1 ? 's' : ''})\n` +
          `- **Current Attendance:** ${sim.current_attendance.percentage}% (${sim.current_attendance.attended}/${sim.current_attendance.held} classes)\n` +
          `- **Classes Missed:** ${sim.projected_attendance.classes_missed}\n` +
          `- **Projected Attendance:** **${sim.projected_attendance.percentage}%**\n` +
          `- **75% Rule Compliance:** ${sim.passes_75_rule ? '✅ COMPLIANT' : '⚠️ AT RISK (< 75%)'}\n\n` +
          `**Verdict:** ${sim.verdict}`;

        if (sim.exam_conflicts && sim.exam_conflicts.length > 0) {
          textResponse += `\n\n🚨 **Assessment Conflict Detected:**\n- **Date:** ${sim.exam_conflicts[0].date}\n- **Exam:** ${sim.exam_conflicts[0].title} (${sim.exam_conflicts[0].subject_code || 'All'})`;
        }

        uiCard = {
          type: 'attendance_simulation',
          current: sim.current_attendance.percentage,
          projected: sim.projected_attendance.percentage,
          verdict: sim.verdict,
          level: sim.verdict_level,
          conflicts: sim.exam_conflicts,
        };
      }
    }
  }

  // 3. Placement Eligibility, Drives & Company Enquiries (e.g., "Am I eligible for Zoho?")
  else if (
    msg.includes('placement') ||
    msg.includes('drive') ||
    msg.includes('zoho') ||
    msg.includes('freshworks') ||
    msg.includes('tcs') ||
    msg.includes('eligible for') ||
    msg.includes('am i eligible') ||
    msg.includes('why am i not eligible') ||
    msg.includes('companies am i eligible') ||
    msg.includes('seats are left') ||
    msg.includes('placement opportunities')
  ) {
    if (userRole === 'visitor') {
      const drives = await executeTool('get_placement_drives', 'visitor');
      toolsExecuted.push({ tool: 'get_placement_drives', result: drives });

      // Check if visitor specifically asked about a single company
      let targetDrive = null;
      if (msg.includes('zoho')) targetDrive = drives.find(d => d.company.toLowerCase().includes('zoho'));
      else if (msg.includes('freshworks')) targetDrive = drives.find(d => d.company.toLowerCase().includes('freshworks'));
      else if (msg.includes('tcs')) targetDrive = drives.find(d => d.company.toLowerCase().includes('tcs'));
      else {
        const match = msg.match(/eligible\s+for\s+([a-zA-Z0-9\s]+?)(?:\?|\.|$|\s+drive|\s+placement)/i);
        if (match && match[1]) {
          const compName = match[1].trim().toLowerCase();
          targetDrive = drives.find(d => d.company.toLowerCase().includes(compName));
        }
      }

      if (targetDrive) {
        spokenResponse = `For the ${targetDrive.company} placement drive, the minimum eligibility is a CGPA of ${targetDrive.min_cgpa} with ${targetDrive.seats_left} seats remaining before the deadline of ${targetDrive.deadline}. Please log in with your student credentials to verify your profile and register.`;
        textResponse = `### 🎯 Campus Placement Drive: **${targetDrive.company}**\n` +
          `- **Category:** ${(targetDrive.category || 'Core').toUpperCase()}\n` +
          `- **Minimum CGPA Requirement:** **${targetDrive.min_cgpa}**\n` +
          `- **Eligible Departments:** ${targetDrive.allowed_departments ? targetDrive.allowed_departments.join(', ') : 'CSE, IT, AI-DS'}\n` +
          `- **Seats Available:** **${targetDrive.seats_left} / ${targetDrive.seats_total || targetDrive.seats_left}**\n` +
          `- **Registration Deadline:** **${targetDrive.deadline}**\n\n` +
          `> **Personalized Verification:** Please log in with your student credentials to verify your personalized eligibility (CGPA, arrears, and year) and submit your registration for ${targetDrive.company}.`;
        uiCard = { type: 'placement_single_eligibility', company: targetDrive.company, drive: targetDrive };
      } else {
        spokenResponse = `KIT has active campus placement drives with top tier recruiters, including ${drives.map(d => d.company).join(', ')}. Log in with your student credentials to check your personalized placement eligibility.`;
        textResponse = `### 🏢 Active Campus Placement Drives (2026)\n` +
          drives.map(d => `- **${d.company}** [${(d.category || 'Core').toUpperCase()}]: Min CGPA **${d.min_cgpa}**, Seats: **${d.seats_left}/${d.seats_total || d.seats_left}**, Deadline: ${d.deadline}`).join('\n') +
          `\n\n*Log in with your student credentials to check your personalized placement eligibility.*`;
        uiCard = { type: 'placement_drives', drives };
      }
    } else {
      // Determine if a specific company was queried
      let companyQuery = null;
      if (msg.includes('zoho')) companyQuery = 'Zoho';
      else if (msg.includes('freshworks')) companyQuery = 'Freshworks';
      else if (msg.includes('tcs')) companyQuery = 'TCS';
      else {
        const match = msg.match(/eligible\s+for\s+([a-zA-Z0-9\s]+?)(?:\?|\.|$|\s+drive|\s+placement)/i);
        if (match && match[1]) {
          companyQuery = match[1].trim();
        }
      }

      const evalResult = await executeTool('evaluate_placement_eligibility', userRole, {
        token,
        params: { company: companyQuery },
      });
      toolsExecuted.push({ tool: 'evaluate_placement_eligibility', result: evalResult });

      if (evalResult.type === 'single_company_evaluation') {
        const ev = evalResult.evaluation;
        if (ev.is_eligible) {
          spokenResponse = `You are eligible for ${ev.company}! Your CGPA of ${evalResult.student_profile.cgpa} meets the requirement, and there are ${ev.seats_left} seats remaining before the deadline of ${ev.deadline}. Would you like to confirm registration?`;
          textResponse = `### 🎯 Placement Eligibility: **${ev.company}**\n` +
            `**Status:** ✅ **ELIGIBLE TO REGISTER**\n\n` +
            `**Student Profile:**\n` +
            `- **Name:** ${evalResult.student_profile.name} (${evalResult.student_profile.department}, Year ${evalResult.student_profile.year})\n` +
            `- **CGPA:** **${evalResult.student_profile.cgpa}** (Cutoff: ${ev.min_cgpa})\n` +
            `- **Standing Arrears:** **${evalResult.student_profile.arrears}**\n\n` +
            `**Criteria Passed:**\n` +
            ev.criteria_passed.map(c => `- ✅ ${c}`).join('\n') +
            `\n\n> **Seats Remaining:** **${ev.seats_left}** | **Deadline:** ${ev.deadline}\n\n` +
            `*Say "Register for ${ev.company}" or click confirm to submit official registration.*`;

          confirmationRequired = true;
          confirmationAction = {
            type: 'register_placement_drive',
            params: { drive_id: ev.id },
            company: ev.company,
          };

          uiCard = {
            type: 'placement_single_eligibility',
            company: ev.company,
            isEligible: true,
            seatsLeft: ev.seats_left,
            action: confirmationAction,
          };
        } else {
          spokenResponse = `You are not eligible for ${ev.company}. Reason: ${ev.criteria_failed.join('. ')}.`;
          textResponse = `### 🎯 Placement Eligibility: **${ev.company}**\n` +
            `**Status:** 🔴 **NOT ELIGIBLE**\n\n` +
            `**Student Profile:**\n` +
            `- **Name:** ${evalResult.student_profile.name} (${evalResult.student_profile.department}, Year ${evalResult.student_profile.year})\n` +
            `- **CGPA:** **${evalResult.student_profile.cgpa}** (Cutoff: ${ev.min_cgpa})\n` +
            `- **Standing Arrears:** **${evalResult.student_profile.arrears}**\n\n` +
            `**Why You Are Not Eligible:**\n` +
            ev.criteria_failed.map(f => `- ❌ **${f}**`).join('\n') +
            `\n\n**Criteria Passed:**\n` +
            ev.criteria_passed.map(c => `- ✅ ${c}`).join('\n') +
            `\n\n> **Remaining Seats:** ${ev.seats_left} | **Deadline:** ${ev.deadline}`;

          uiCard = {
            type: 'placement_single_eligibility',
            company: ev.company,
            isEligible: false,
            failedReasons: ev.criteria_failed,
          };
        }
      } else if (evalResult.type === 'company_not_found') {
        spokenResponse = `I could not find a placement drive for "${evalResult.queried_company}". Available active companies are: ${evalResult.available_companies.join(', ')}.`;
        textResponse = `### 🏢 Active Placement Drives\n` +
          `No active drive found matching **"${evalResult.queried_company}"**.\n\n` +
          `**Available Placement Drives:**\n` +
          evalResult.available_companies.map(c => `- **${c}**`).join('\n') +
          `\n\n*Ask: "Am I eligible for Zoho?" or "Am I eligible for TCS?" to check your standing.*`;
        uiCard = { type: 'placement_companies', companies: evalResult.available_companies };
      } else {
        // All drives overview
        const el = evalResult.eligible_drives || [];
        const inel = evalResult.ineligible_drives || [];

        spokenResponse = `Based on your profile with CGPA ${evalResult.student_profile.cgpa} and ${evalResult.student_profile.arrears} arrears, you are eligible for ${el.length} out of ${evalResult.total_drives} active placement drives.`;
        
        textResponse = `### 🎯 Campus Placement Eligibility Summary\n` +
          `- **Student:** ${evalResult.student_profile.name} (${evalResult.student_profile.department}, Year ${evalResult.student_profile.year})\n` +
          `- **CGPA:** **${evalResult.student_profile.cgpa}** | **Standing Arrears:** **${evalResult.student_profile.arrears}**\n` +
          `- **Eligible Drives:** **${el.length} of ${evalResult.total_drives}**\n\n` +
          `#### 🟢 Eligible Companies:\n` +
          (el.length > 0 ? el.map(d => `- **${d.company}** [${d.category}]: Min CGPA ${d.min_cgpa} | **${d.seats_left} seats left** (Deadline: ${d.deadline})`).join('\n') : '*No companies currently match all criteria.*') +
          `\n\n#### 🔴 Ineligible Companies:\n` +
          (inel.length > 0 ? inel.map(d => `- **${d.company}**: ${d.criteria_failed.join('; ')}`).join('\n') : '*None*');

        uiCard = {
          type: 'placement_summary',
          eligibleCount: el.length,
          ineligibleCount: inel.length,
        };
      }
    }
  }

  // 4. Leave / On-Duty (OD) Application
  else if (msg.includes('apply for od') || msg.includes('od request') || msg.includes('apply for leave') || msg.includes('request leave') || msg.includes('take leave')) {
    if (userRole !== 'student') {
      spokenResponse = 'Leave and On-Duty requests can only be submitted by authenticated students.';
      textResponse = spokenResponse;
    } else {
      const isOD = msg.includes('od') || msg.includes('on duty') || msg.includes('symposium') || msg.includes('hackathon');
      const today = await executeTool('get_college_today', userRole);
      toolsExecuted.push({ tool: 'get_college_today', result: today });

      // Tomorrow's date
      const d = new Date(today.date);
      d.setDate(d.getDate() + 1);
      const targetDate = d.toISOString().split('T')[0];

      // Validate leave request
      const validation = await executeTool('validate_leave_request', userRole, {
        token,
        params: {
          type: isOD ? 'on_duty' : 'personal_leave',
          from_date: targetDate,
          to_date: targetDate,
          half_day: false,
          reason: isOD ? 'Participation in State Level Technical Symposium' : 'Personal family commitment',
          event_name: isOD ? 'Inter-Collegiate Hackathon / Placement Drive' : null,
        },
      });
      toolsExecuted.push({ tool: 'validate_leave_request', result: validation });

      confirmationRequired = true;
      confirmationAction = {
        type: isOD ? 'submit_od_request' : 'submit_leave_request',
        params: {
          type: isOD ? 'on_duty' : 'personal_leave',
          from_date: targetDate,
          to_date: targetDate,
          half_day: false,
          reason: isOD ? 'Participation in Technical Symposium & Placement Activity' : 'Personal reason',
          event_name: isOD ? 'State Level Hackathon 2026' : null,
        },
      };

      spokenResponse = `I have verified your request for ${isOD ? 'On-Duty' : 'Leave'} on ${targetDate}. Your projected attendance will be ${validation.simulation.projected_attendance.percentage}%. Would you like me to submit this official request to your class advisor?`;
      
      textResponse = `### 📋 ${isOD ? 'On-Duty (OD)' : 'Personal Leave'} Pre-Validation Summary\n` +
        `- **Date:** ${targetDate}\n` +
        `- **Type:** ${isOD ? 'On-Duty (OD Credit)' : 'Personal Leave'}\n` +
        `- **Event / Reason:** ${isOD ? 'State Level Hackathon 2026' : 'Personal reason'}\n` +
        `- **Projected Attendance:** **${validation.simulation.projected_attendance.percentage}%**\n` +
        `- **Policy Status:** ${validation.can_proceed ? '✅ Validated according to KIT Handbook' : '⚠️ Warning - Review requirements'}\n\n` +
        `> **Confirmation Required:** Please confirm if you wish to formally submit this request to your class advisor.`;

      uiCard = {
        type: 'action_confirmation',
        action: confirmationAction,
      };
    }
  }

  // 7. Admissions, Applications & Institutional Knowledge Base Enquiries
  else if (
    msg.includes('admission') ||
    msg.includes('admissions') ||
    msg.includes('apply') ||
    msg.includes('how to apply') ||
    msg.includes('application') ||
    msg.includes('radiation') || // Common phonetic Whisper sound-alike for "admission"
    msg.includes('document') ||
    msg.includes('certificate') ||
    msg.includes('marksheet') ||
    msg.includes('deadline') ||
    msg.includes('important date') ||
    msg.includes('last date') ||
    msg.includes('scholarship') ||
    msg.includes('refund') ||
    msg.includes('hostel') ||
    msg.includes('accommodation') ||
    msg.includes('procedure') ||
    msg.includes('join') ||
    msg.includes('enrol') ||
    msg.includes('enroll') ||
    msg.includes('seat') ||
    msg.includes('intake') ||
    msg.includes('cut off') ||
    msg.includes('cutoff') ||
    msg.includes('course') ||
    msg.includes('fee') ||
    msg.includes('fees') ||
    msg.includes('eligibility') ||
    msg.includes('branch') ||
    msg.includes('btech') ||
    msg.includes('b.tech') ||
    msg.includes('btec')
  ) {
    // 7A. Specific Knowledge Base Passages (Documents, Deadlines, Procedure, Scholarships, Hostels, Refunds)
    const isDocumentsQuery = msg.includes('document') || msg.includes('certificate') || msg.includes('marksheet');
    const isDeadlinesQuery = msg.includes('deadline') || msg.includes('important date') || msg.includes('last date') || msg.includes('when do classes begin') || msg.includes('when does') || msg.includes('admission date') || msg.includes('dates');
    const isProcedureQuery = msg.includes('procedure') || msg.includes('how to apply') || msg.includes('how do i apply') || msg.includes('steps to apply') || msg.includes('counselling');
    const isScholarshipsQuery = msg.includes('scholarship') || msg.includes('waiver') || msg.includes('concession') || msg.includes('first graduate');
    const isHostelQuery = (msg.includes('hostel') || msg.includes('accommodation') || msg.includes('room') || msg.includes('mess')) && !msg.includes('b.tech cse') && !msg.includes('btech cse');
    const isRefundQuery = msg.includes('refund') || msg.includes('cancel') || msg.includes('withdraw');

    if (isDocumentsQuery) {
      const brochureResults = await executeTool('search_admission_brochure', userRole, { params: { query: userMessage } });
      toolsExecuted.push({ tool: 'search_admission_brochure', result: brochureResults });

      spokenResponse = `For admission to KIT, you must bring originals and two photocopies of your 10th and 12th mark sheets, transfer certificate, conduct certificate, community certificate if applicable, Aadhaar card, four passport photographs, and a medical fitness certificate.`;
      textResponse = `### 📋 Official Documents Required for KIT Admission\n` +
        `*Grounded from KIT Admissions Brochure 2026-2027 (Section 5: Documents Needed at Admission, Page 3)*\n\n` +
        `Bring the **originals and two photocopies** of each of the following to in-person counselling:\n\n` +
        `1. 📄 **10th Standard Mark Sheet**\n` +
        `2. 📄 **12th Standard Mark Sheet** (or statement of marks)\n` +
        `3. 📜 **Transfer Certificate (TC)** from the school last attended\n` +
        `4. 📜 **Conduct Certificate** from the school last attended\n` +
        `5. 🏛️ **Community Certificate** (if applicable: BC / BCM / MBC / DNC / SC / SCA / ST)\n` +
        `6. 🎓 **First-Graduate Certificate** (if claiming the first-graduate scholarship)\n` +
        `7. 🪪 **Aadhaar Card** (Government Photo ID Proof)\n` +
        `8. 📸 **Four Recent Passport-size Photographs**\n` +
        `9. 🩺 **Medical Fitness Certificate** from a registered medical practitioner\n\n` +
        `> **Verification Venue:** Admissions Office, Main Block, Knotopian Knowledge City, Coimbatore.`;
      uiCard = { type: 'admission_documents' };
    }
    else if (isDeadlinesQuery) {
      const brochureResults = await executeTool('search_admission_brochure', userRole, { params: { query: userMessage } });
      toolsExecuted.push({ tool: 'search_admission_brochure', result: brochureResults });

      spokenResponse = `Important admission dates for KIT are: applications open 1 October 2026 and close 31 March 2027. The merit list is published on 25 May 2027, followed by counselling from 2 to 7 June 2027, with first-year classes beginning 15 July 2027.`;
      textResponse = `### 📅 Important Admission Dates & Deadlines (2027-28 Admissions)\n` +
        `*Grounded from KIT Admissions Brochure 2026-2027 (Section 4: Important Dates for Admissions)*\n\n` +
        `- 🗓️ **Applications Open:** 1 October 2026\n` +
        `- ⏰ **Last Date to Apply:** 31 March 2027\n` +
        `- 📝 **Update 12th Marks (Results Awaited):** 15 May 2027\n` +
        `- 🏆 **Merit List Published:** 25 May 2027\n` +
        `- 🤝 **Counselling, Verification & Fee Payment:** 2 June to 7 June 2027\n` +
        `- 🎓 **Classes Begin for First-Year Students:** 15 July 2027\n\n` +
        `> **Note:** Applicants appearing for the 12th examination in 2027 may apply with expected marks and update by 15 May 2027.`;
      uiCard = { type: 'admission_deadlines' };
    }
    else if (isProcedureQuery) {
      const brochureResults = await executeTool('search_admission_brochure', userRole, { params: { query: userMessage } });
      toolsExecuted.push({ tool: 'search_admission_brochure', result: brochureResults });

      spokenResponse = `To apply to KIT, submit an online application through the portal with your details, programme choice, and 12th percentage. There is no application fee. Selected applicants on the merit list report for document verification and fee payment during counselling.`;
      textResponse = `### 📝 KIT Admissions 2026 Application — How to Apply & Procedure Steps\n` +
        `*Grounded from KIT Admissions Brochure 2026-2027 (Section 3: How to Apply)*\n\n` +
        `1. **Apply Online:** Submit your application through the KIT admissions portal or admissions assistant. One application is needed for each programme.\n` +
        `2. **Provide Candidate Details:** Submit your full name, mobile number, email, target course code, and 12th percentage (or expected marks if awaiting results).\n` +
        `3. **Application Confirmation:** You will receive your application number by email. **There is no application fee.**\n` +
        `4. **Merit List Publication:** The merit list is published on the portal on 25 May 2027. Selected applicants receive an official admission letter.\n` +
        `5. **Counselling & Verification:** Report for original document verification and fee payment during counselling (2 June to 7 June 2027).`;
      uiCard = { type: 'admission_procedure' };
    }
    else if (isScholarshipsQuery) {
      const brochureResults = await executeTool('search_admission_brochure', userRole, { params: { query: userMessage } });
      toolsExecuted.push({ tool: 'search_admission_brochure', result: brochureResults });

      spokenResponse = `KIT offers merit scholarships covering up to 50% tuition for 95% and above in 12th PCM, and 25% for 90% to 94.9%. Sports achievers receive ₹25,000 per year, and first-generation graduates receive government scheme benefits.`;
      textResponse = `### 🏆 KIT Scholarships & Merit Awards\n` +
        `*Grounded from KIT Admissions Brochure 2026-2027 (Section 6: Scholarships, Page 3)*\n\n` +
        `- 🥇 **Merit Scholarship (Gold):** 12th PCM aggregate ≥ 95% → **50% Tuition Fee waiver** in Year 1 (renewed for CGPA ≥ 8.5)\n` +
        `- 🥈 **Merit Scholarship (Silver):** 12th PCM aggregate 90% – 94.9% → **25% Tuition Fee waiver** in Year 1 (renewed for CGPA ≥ 8.5)\n` +
        `- 🏅 **Sports Scholarship:** State-level medal winners (last 2 years) → **₹25,000 per year**\n` +
        `- 🎓 **First-Graduate Scholarship:** First person in family to take a degree → As per Tamil Nadu Government Scheme\n\n` +
        `> **Scope:** Scholarships apply strictly to tuition fees and do not apply to hostel, mess, transport, or examination fees.`;
      uiCard = { type: 'admission_scholarships' };
    }
    else if (isHostelQuery) {
      const courses = await executeTool('get_courses', 'visitor');
      toolsExecuted.push({ tool: 'get_courses', result: courses });

      spokenResponse = `KIT offers separate hostels for men and women with 2 to 3 sharing rooms by department block, including Wi-Fi, study rooms, and gym. The campus hostel fee is ₹60,000 per year, with mess charges approximately ₹3,500 per month.`;
      textResponse = `### 🏢 KIT Campus Hostels & Student Living\n` +
        `*Grounded from KIT Admissions Brochure 2026-2027 (Section 7: Life at KIT Hostels, Page 4)*\n\n` +
        `- **Accommodation:** Separate residential hostels for men and women, with rooms shared by 2 or 3 students allotted by department block.\n` +
        `- **Facilities:** High-speed campus Wi-Fi, quiet reading room, and fitness gym in every block.\n` +
        `- **Hostel Room Fee:** **₹60,000 per annum** (optional for day scholars).\n` +
        `- **Mess Charges:** Approximately **₹3,500 per month** (hygienic South and North Indian catering, paid separately).\n` +
        `- **Campus Transport:** College buses operate across 22 routes in Coimbatore for non-hostel day scholars.\n\n` +
        `> **Policy:** Hostel accommodation is optional; day scholars can utilize college buses.`;
      uiCard = { type: 'campus_hostel' };
    }
    else if (isRefundQuery) {
      spokenResponse = `Official fee structures are confirmed in your admission letter. For formal cancellation and fee refund guidelines, please contact the KIT Admissions Office directly at +91 422 2619000 or admissions@kit.ac.in.`;
      textResponse = `### ℹ️ KIT Fee Refund & Admission Withdrawal Policy\n` +
        `*Grounded from KIT Admissions Brochure 2026-2027 (Page 5: Admissions Office Contact & Terms)*\n\n` +
        `- **Fee Commitment:** Fees for the academic year are confirmed in the candidate's formal admission letter.\n` +
        `- **Scholarship Scope:** Scholarships apply exclusively to tuition fees and do not cover hostel, transport, or examination fees.\n` +
        `- **Cancellation & Refund Process:** For official refund requests and withdrawal procedures before session commencement, candidates must contact:\n\n` +
        `  **KIT Admissions Office**\n` +
        `  Main Block, Knotopian Knowledge City, Coimbatore, Tamil Nadu 641042\n` +
        `  📞 **Phone:** +91 422 2619000 (9:00 AM – 5:00 PM, Monday to Saturday)\n` +
        `  ✉️ **Email:** admissions@kit.ac.in | 🌐 **Website:** kit.ac.in`;
      uiCard = { type: 'refund_policy' };
    }
    else {
      // 7B. Live Academic Offerings & Course Specific Queries
      const courses = await executeTool('get_courses', 'visitor');
      toolsExecuted.push({ tool: 'get_courses', result: courses });

      // Check if the user specified a particular course / branch (using word boundaries to avoid false positives)
      let targetCourse = courses.find(c => {
        const code = (c.code || '').toLowerCase();
        const name = (c.name || '').toLowerCase();
        const dept = (c.department || '').toLowerCase();

        if (/\b(cse|computer science)\b/i.test(msg)) {
          return code.includes('cse') || dept === 'cse' || name.includes('computer science');
        }
        if (/\b(ai|aids|ai-ml|aiml|data science|artificial intelligence|machine learning)\b/i.test(msg)) {
          return code.includes('aids') || code.includes('ai') || dept === 'aids' || name.includes('artificial');
        }
        if (/\b(ece|electronics?|communication)\b/i.test(msg)) {
          return code.includes('ece') || dept === 'ece' || name.includes('electronic');
        }
        if (/\b(it|information technology)\b/i.test(msg)) {
          return code.includes('it') || dept === 'it' || name.includes('information technology');
        }
        if (/\b(mech|mechanical|robotics?)\b/i.test(msg)) {
          return code.includes('mech') || dept === 'mech' || name.includes('mechanical');
        }
        return false;
      });

      // If the query mentions AI / AI-ML / Data Science and there is no standalone AI department in the active catalog,
      // link it directly to B.Tech Computer Science and Engineering (CSE) which houses the AI/ML specialization!
      let isAiSpecialization = false;
      if (!targetCourse && /\b(ai|aids|ai-ml|aiml|data science|artificial intelligence|machine learning)\b/i.test(msg)) {
        targetCourse = courses.find(c => (c.code || '').toLowerCase().includes('cse')) || courses[0];
        isAiSpecialization = true;
      }

      const isAskingFee = msg.includes('fee') || msg.includes('fees') || msg.includes('cost') || msg.includes('tuition') || msg.includes('charge') || msg.includes('how much');
      const isApplying = msg.includes('apply') || msg.includes('application') || msg.includes('radiation') || msg.includes('join') || msg.includes('form') || msg.includes('how do i apply') || msg.includes('how to apply');

      // Case A: Specific course requested for fee or details
      if (targetCourse) {
        if (isAskingFee) {
          if (isAiSpecialization) {
            spokenResponse = `At KIT, Artificial Intelligence and Machine Learning (AI-ML) is offered under B.Tech Computer Science and Engineering. The annual tuition fee is ₹${targetCourse.annual_fee.toLocaleString()} per year, with a minimum 12th PCM cut-off of ${targetCourse.min_12th_percent} percent. Optional campus hostel with mess is ₹60,000 per year.`;
            textResponse = `### 🏛️ B.Tech Computer Science and Engineering (\`${targetCourse.code}\`) — AI/ML Specialization\n` +
              `- **Program:** ${targetCourse.name} (Specialization in AI/ML & Data Systems)\n` +
              `- **Annual Tuition Fee:** **₹${targetCourse.annual_fee.toLocaleString()}**\n` +
              `- **Minimum 12th PCM Cut-off:** **${targetCourse.min_12th_percent}%**\n` +
              `- **Total Sanctioned Seats:** **${targetCourse.seats}**\n` +
              `- **Optional Campus Hostel:** ₹60,000 per annum (includes mess & Wi-Fi)\n\n` +
              `> **Admissions Eligibility:** Passed 12th standard (HSC / CBSE / ISC) with Physics, Chemistry, and Mathematics (PCM aggregate ≥ ${targetCourse.min_12th_percent}%).\n` +
              `*Reference: KIT Admissions Brochure 2026-2027 (Page 2: Programmes, Eligibility & Fees)*`;
          } else {
            spokenResponse = `The annual tuition fee for ${targetCourse.name} is ₹${targetCourse.annual_fee.toLocaleString()} per year, with a minimum 12th PCM cut-off of ${targetCourse.min_12th_percent} percent. Optional campus hostel with mess is ₹60,000 per year.`;
            textResponse = `### 🏛️ ${targetCourse.name} (\`${targetCourse.code}\`) Fee & Details\n` +
              `- **Annual Tuition Fee:** **₹${targetCourse.annual_fee.toLocaleString()}**\n` +
              `- **Minimum 12th PCM Cut-off:** **${targetCourse.min_12th_percent}%**\n` +
              `- **Total Sanctioned Seats:** **${targetCourse.seats}**\n` +
              `- **Optional Campus Hostel:** ₹60,000 per annum (includes mess & Wi-Fi)\n\n` +
              `> **Admissions Eligibility:** Passed 12th standard (HSC / CBSE / ISC) with Physics, Chemistry, and Mathematics (PCM aggregate ≥ ${targetCourse.min_12th_percent}%).\n` +
              `*Reference: KIT Admissions Brochure 2026-2027 (Page 2: Programmes, Eligibility & Fees)*`;
          }
          uiCard = { type: 'course_detail', course: targetCourse };
        } else {
          if (isAiSpecialization) {
            spokenResponse = `At KIT, Artificial Intelligence and Machine Learning is offered under B.Tech Computer Science and Engineering (${targetCourse.code}) with an annual fee of ₹${targetCourse.annual_fee.toLocaleString()} and minimum 12th PCM cut-off of ${targetCourse.min_12th_percent} percent.`;
            textResponse = `### 🏛️ ${targetCourse.name} (\`${targetCourse.code}\`) — AI/ML Specialization\n` +
              `- **Department:** ${targetCourse.department || 'CSE'} (AI/ML Focus)\n` +
              `- **Annual Tuition Fee:** ₹${targetCourse.annual_fee.toLocaleString()}\n` +
              `- **Minimum 12th PCM Cut-off:** **${targetCourse.min_12th_percent}%**\n` +
              `- **Total Sanctioned Seats:** **${targetCourse.seats}**\n\n` +
              `> **Admissions Eligibility:** Passed 12th standard (HSC / CBSE / ISC) with Physics, Chemistry, and Mathematics (PCM).\n` +
              `*Reference: KIT Admissions Brochure 2026-2027 (Page 2: Programmes, Eligibility & Fees)*`;
          } else {
            spokenResponse = `${targetCourse.name} (${targetCourse.code}) has an annual fee of ₹${targetCourse.annual_fee.toLocaleString()}, requiring a minimum 12th PCM cut-off of ${targetCourse.min_12th_percent} percent with ${targetCourse.seats} sanctioned seats.`;
            textResponse = `### 🏛️ ${targetCourse.name} (\`${targetCourse.code}\`)\n` +
              `- **Department:** ${targetCourse.department || targetCourse.code}\n` +
              `- **Annual Tuition Fee:** ₹${targetCourse.annual_fee.toLocaleString()}\n` +
              `- **Minimum 12th PCM Cut-off:** **${targetCourse.min_12th_percent}%**\n` +
              `- **Total Sanctioned Seats:** **${targetCourse.seats}**\n\n` +
              `> **Admissions Eligibility:** Passed 12th standard (HSC / CBSE / ISC) with Physics, Chemistry, and Mathematics (PCM).\n` +
              `*Reference: KIT Admissions Brochure 2026-2027 (Page 2: Programmes, Eligibility & Fees)*`;
          }
          uiCard = { type: 'course_detail', course: targetCourse };
        }
      }
      // Case B: General Application Guidance
      else if (isApplying) {
        spokenResponse = 'To apply for undergraduate admission at KIT, candidates must have passed 12th standard with Physics, Chemistry, and Mathematics. You can register directly through our admissions form right here, or participate through TNEA counselling.';
        textResponse = `### 📝 KIT Admissions 2026 Application — How to Apply\n\n` +
          `**Undergraduate B.Tech Admissions Process:**\n\n` +
          `1. **Eligibility Check:** Candidates must have passed 12th standard (HSC / CBSE / ISC) with Physics, Chemistry, and Mathematics (PCM).\n` +
          `2. **Department Minimum Cut-offs:**\n` +
          courses.map(c => `   - **${c.name}** (\`${c.code}\`): **${c.min_12th_percent}%** PCM | Annual Fee ₹${c.annual_fee.toLocaleString()}`).join('\n') + `\n` +
          `3. **Required Documents for Verification:** 10th & 12th Marksheets, Transfer Certificate (TC), Conduct Certificate, Community Certificate, and Photo ID.\n` +
          `4. **Submit Application:** You can submit your application directly using the interactive Admission Form on this portal, or tell me your details to apply.`;
        uiCard = { type: 'admission_prompt', courses };
      }
      // Case C: General Course List & Fees
      else {
        spokenResponse = `KIT offers ${courses.length} engineering courses including Computer Science, AI and Data Science, Electronics, Information Technology, and Mechanical Engineering. The annual tuition fee ranges from 95 thousand to 1 lakh 35 thousand rupees.`;
        
        textResponse = `### 🏛️ KIT Academic Offerings (2026-2027)\n` +
          courses.map(c => `- **${c.name}** (\`${c.code}\`): Annual Fee ₹${c.annual_fee.toLocaleString()} | Min Cut-off: **${c.min_12th_percent}%** | Seats: ${c.seats}`).join('\n') +
          `\n\n> **Admissions Eligibility:** Passed 12th standard (HSC / CBSE / ISC) with Physics, Chemistry, and Mathematics (PCM). Optional campus hostel fee is ₹60,000/year (with mess included).\n` +
          `*Reference: KIT Admissions Brochure 2026-2027 (Page 2: Programmes, Eligibility & Fees)*`;
        uiCard = { type: 'courses_list', courses };
      }
    }
  }

  // 8. General Greeting & Campus Overview
  else {
    const collegeInfo = await executeTool('get_college_information', 'visitor');
    toolsExecuted.push({ tool: 'get_college_information', result: collegeInfo });

    spokenResponse = `Welcome to KIT GuardianListen. Engineering the Future with Innovation. How can I assist you today?`;
    textResponse = `### **KIT GuardianListen**\n\n` +
      `*${collegeInfo.tagline || 'Engineering the Future with Innovation'}*\n\n` +
      `**How I can assist you today:**\n\n` +
      `- 🎓 **Academic Guardian:** "How am I doing academically?", "What is my CGPA?"\n` +
      `- 📈 **What-If Attendance Simulator:** "What if I miss college tomorrow?", "Can I take leave for 3 days?"\n` +
      `- 📋 **Leave & OD Requests:** "Apply for OD for hackathon", "Show my pending requests"\n` +
      `- 💼 **Placements:** "Am I eligible for Zoho?", "Show placement drives"\n` +
      `- 🏛️ **Visitor & Admissions:** "What courses are available?", "What is the fee for B.Tech CSE?"\n` +
      `- 👨‍🏫 **Faculty:** "Show pending approvals", "Show my classes"`;
    
    uiCard = { type: 'welcome' };
  }

  return {
    source: 'autonomous_agent',
    spokenResponse,
    textResponse,
    uiCard,
    toolsExecuted,
    confirmationRequired,
    confirmationAction,
  };
}

export const bedrockService = {
  /**
   * Converse with Amazon Bedrock or Autonomous Agent Fallback
   */
  async converse({ userMessage, userRole, token, user, conversationHistory = [] }) {
    const cleanUserMessage = normalizeTranscript(userMessage || '');

    // 1. Primary Autonomous Agent execution: executes live tools, database queries, and policy rules
    const agentResult = await localAutonomousAgent({
      userMessage: cleanUserMessage,
      userRole,
      token,
      user,
      conversationHistory,
    });

    // 2. If Bedrock Nova Pro is configured, use it to polish spoken delivery grounded in tool results
    if (bedrockClient && agentResult && !agentResult.confirmationRequired) {
      try {
        const systemPrompt = `You are KIT Guardian for Knotopian Institute of Technology (KIT).
STRICT DOMAIN BOUNDARIES:
- You ONLY discuss Knotopian Institute of Technology (KIT).
- NEVER discuss or redirect to external companies or external universities.
- Use the provided factual grounding as absolute truth.`;

        const polishPrompt = `User Query: "${cleanUserMessage}"\n` +
          `User: ${user?.full_name || 'Guest'} (Role: ${userRole})\n` +
          `Factual Grounding:\n${agentResult.textResponse}\n\n` +
          `Draft Spoken: "${agentResult.spokenResponse}"\n\n` +
          `Instructions: Provide a concise, clear spoken response (1-2 sentences) directly answering the query based strictly on the factual grounding.`;

        const payload = {
          system: [{ text: systemPrompt }],
          messages: [
            {
              role: 'user',
              content: [{ text: polishPrompt }],
            },
          ],
          inferenceConfig: {
            max_new_tokens: 150,
            temperature: 0.1,
          },
        };

        const command = new InvokeModelCommand({
          modelId: NOVA_REASONING_MODEL,
          contentType: 'application/json',
          accept: 'application/json',
          body: JSON.stringify(payload),
        });

        const response = await bedrockClient.send(command);
        const resJson = JSON.parse(new TextDecoder().decode(response.body));
        const polished = resJson.output?.message?.content?.[0]?.text?.trim();
        if (polished) {
          agentResult.spokenResponse = polished;
          agentResult.source = 'amazon_bedrock_nova_pro_grounded';
        }
      } catch (err) {
        console.warn(`[BedrockService] Nova Pro polishing bypassed (${err.name || err.message}). Using autonomous agent response.`);
      }
    }

    return agentResult;
  },
};


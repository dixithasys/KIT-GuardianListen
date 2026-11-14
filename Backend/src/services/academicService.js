import { collegeApi } from './collegeApi.js';

export const academicService = {
  /**
   * Builds the comprehensive personalized Academic Guardian snapshot
   */
  async getAcademicSnapshot(token) {
    const [academicsRes, attendanceRes, subjectsRes, timetableRes, calendarRes, placementsRes] = await Promise.all([
      collegeApi.getMyAcademics(token),
      collegeApi.getMyAttendance(token),
      collegeApi.getMySubjects(token),
      collegeApi.getMyTimetable(token),
      collegeApi.getCalendar(token),
      collegeApi.getPlacementDrives(token),
    ]);

    const academics = academicsRes.data;
    const attendance = attendanceRes.data;
    const subjects = subjectsRes.data;
    const timetable = timetableRes.data;
    const calendar = calendarRes.data;
    const placementDrives = placementsRes.data;

    // Evaluate Placement Eligibility
    const eligibleDrives = placementDrives.filter(drive => {
      const meetsCgpa = academics.cgpa >= drive.min_cgpa;
      const meetsArrears = drive.allow_standing_arrears ? true : academics.standing_arrears === 0;
      return meetsCgpa && meetsArrears;
    });

    // Attendance Standing Evaluation
    let attendanceStatus = 'Safe';
    let attendanceBadge = 'success';
    let attendanceAnalysis = '';

    if (attendance.overall_percentage >= 80) {
      attendanceStatus = 'Healthy (80%+)';
      attendanceBadge = 'success';
      attendanceAnalysis = 'Your attendance is in the optimal range. You are comfortably above the mandatory 75% threshold.';
    } else if (attendance.overall_percentage >= 75) {
      attendanceStatus = 'Borderline (75% - 79%)';
      attendanceBadge = 'warning';
      attendanceAnalysis = 'Caution: You are above the 75% threshold, but taking even 1-2 days of unexcused leave will push you below 75%.';
    } else if (attendance.overall_percentage >= 65) {
      attendanceStatus = 'Condonation Zone (65% - 74%)';
      attendanceBadge = 'danger';
      attendanceAnalysis = 'Critical: Your current attendance is below 75%. You will need official medical condonation and Dean approval to sit for end-semester examinations.';
    } else {
      attendanceStatus = 'Detention Risk (< 65%)';
      attendanceBadge = 'critical';
      attendanceAnalysis = 'Severe Alert: Below 65% attendance leads to mandatory course repeat/detention under Anna University / KIT guidelines.';
    }

    // Flag subjects below 75%
    const criticalSubjects = (attendance.subjects || []).filter(s => s.percentage < 75.0);

    return {
      academics: {
        cgpa: academics.cgpa,
        standing_arrears: academics.standing_arrears,
        standing_label: academics.cgpa >= 8.5 ? 'Distinction' : academics.cgpa >= 7.5 ? 'First Class' : 'Second Class',
        placed_company: academics.placed_company,
        placed_category: academics.placed_category,
      },
      attendance: {
        as_of_date: attendance.as_of_date,
        overall_percentage: attendance.overall_percentage,
        total_classes_held: attendance.total_classes_held,
        total_classes_attended: attendance.total_classes_attended,
        status: attendanceStatus,
        badge: attendanceBadge,
        analysis: attendanceAnalysis,
        subjects: attendance.subjects || [],
        critical_subjects: criticalSubjects,
      },
      placement: {
        eligible_drives_count: eligibleDrives.length,
        total_drives_count: placementDrives.length,
        eligible_drives: eligibleDrives,
      },
      timetable_summary: {
        total_slots: timetable.length,
        active_subjects: subjects.length,
      },
      calendar_alerts: calendar.filter(c => c.type === 'internal_exam'),
    };
  },

  /**
   * Attendance What-If Simulator:
   * Accurately simulates the impact of missing dates using actual timetable and calendar data
   */
  async simulateAbsence(token, { dates = [], days_count = 1, start_date = null }) {
    const [attendanceRes, timetableRes, calendarRes, todayRes] = await Promise.all([
      collegeApi.getMyAttendance(token),
      collegeApi.getMyTimetable(token),
      collegeApi.getCalendar(token),
      collegeApi.getToday(),
    ]);

    const attendance = attendanceRes.data;
    const timetable = timetableRes.data;
    const calendar = calendarRes.data;
    const today = todayRes.data;

    // Resolve target dates
    let targetDates = [];
    if (dates && dates.length > 0) {
      targetDates = dates;
    } else {
      const baseDate = start_date ? new Date(start_date) : new Date(today.date);
      // Advance by 1 day if start_date wasn't specified (simulating tomorrow)
      if (!start_date) {
        baseDate.setDate(baseDate.getDate() + 1);
      }
      for (let i = 0; i < days_count; i++) {
        const d = new Date(baseDate);
        d.setDate(baseDate.getDate() + i);
        targetDates.push(d.toISOString().split('T')[0]);
      }
    }

    // Analyze each date
    const dateAnalysis = [];
    const missedSubjectCounts = {}; // subject_code -> count
    const examConflicts = [];
    let totalClassesMissed = 0;

    for (const dateStr of targetDates) {
      const d = new Date(dateStr);
      // JS getDay(): 0=Sun, 1=Mon, ..., 6=Sat
      const jsDay = d.getDay();
      const weekday = jsDay === 0 ? 7 : jsDay;

      // Check Calendar for event on that date
      const calEvent = calendar.find(c => c.date === dateStr);
      let dayType = 'regular_working_day';
      let eventTitle = null;
      let effectiveWeekday = weekday;

      if (calEvent) {
        dayType = calEvent.type;
        eventTitle = calEvent.title;
        if (calEvent.type === 'holiday') {
          dateAnalysis.push({
            date: dateStr,
            weekday,
            type: 'holiday',
            title: calEvent.title,
            classes_missed: 0,
            classes: [],
            note: 'Official Holiday - No classes held. Zero attendance impact.',
          });
          continue;
        }
        if (calEvent.type === 'internal_exam') {
          examConflicts.push({
            date: dateStr,
            title: calEvent.title,
            subject_code: calEvent.subject_code,
          });
        }
        if (calEvent.follows_weekday) {
          effectiveWeekday = calEvent.follows_weekday;
        }
      }

      // If Sunday and no special working day
      if (weekday === 7 && (!calEvent || calEvent.type !== 'working_day')) {
        dateAnalysis.push({
          date: dateStr,
          weekday: 7,
          type: 'sunday',
          title: 'Sunday',
          classes_missed: 0,
          classes: [],
          note: 'Sunday - Campus closed. No classes.',
        });
        continue;
      }

      // Find timetable slots for effective weekday
      const slots = timetable.filter(s => s.weekday === effectiveWeekday);
      slots.forEach(slot => {
        missedSubjectCounts[slot.subject_code] = (missedSubjectCounts[slot.subject_code] || 0) + 1;
        totalClassesMissed += 1;
      });

      dateAnalysis.push({
        date: dateStr,
        weekday: effectiveWeekday,
        type: dayType,
        title: eventTitle || `Weekday Schedule (${slots.length} periods)`,
        classes_missed: slots.length,
        classes: slots.map(s => ({
          period: s.period,
          time: `${s.start_time} - ${s.end_time}`,
          subject_code: s.subject_code,
          subject_name: s.subject_name,
        })),
        exam_alert: calEvent?.type === 'internal_exam' ? calEvent.title : null,
      });
    }

    // Calculate Projected Overall Attendance
    // Formula: Projected attendance = attended classes / (held classes + additional missed classes) * 100
    const currentHeld = attendance.total_classes_held;
    const currentAttended = attendance.total_classes_attended;
    const projectedHeld = currentHeld + totalClassesMissed;
    const projectedOverallPct = projectedHeld > 0
      ? Number(((currentAttended / projectedHeld) * 100).toFixed(1))
      : attendance.overall_percentage;

    // Calculate Projected Subject Attendance
    const projectedSubjects = (attendance.subjects || []).map(sub => {
      const additionalMissed = missedSubjectCounts[sub.subject_code] || 0;
      const subHeld = sub.classes_held + additionalMissed;
      const subAttended = sub.classes_attended;
      const projectedPct = subHeld > 0 ? Number(((subAttended / subHeld) * 100).toFixed(1)) : sub.percentage;
      return {
        subject_id: sub.subject_id,
        subject_code: sub.subject_code,
        subject_name: sub.subject_name,
        current_percentage: sub.percentage,
        projected_percentage: projectedPct,
        classes_held_current: sub.classes_held,
        classes_held_projected: subHeld,
        classes_missed_simulated: additionalMissed,
        is_at_risk: projectedPct < 75.0,
      };
    });

    // Check handbook 75% rule
    const passes75Rule = projectedOverallPct >= 75.0;
    const passes65Rule = projectedOverallPct >= 65.0;

    let verdict = '';
    let verdictLevel = 'safe'; // safe | warning | danger

    if (totalClassesMissed === 0) {
      verdict = 'The selected date(s) have no regular classes scheduled. Your attendance will remain unchanged at ' + attendance.overall_percentage + '%.';
      verdictLevel = 'safe';
    } else if (passes75Rule) {
      verdict = `Safe. Missing ${totalClassesMissed} classes across ${targetDates.length} day(s) will lower your overall attendance from ${attendance.overall_percentage}% to ${projectedOverallPct}%, keeping you above the required 75% threshold.`;
      verdictLevel = 'safe';
    } else if (passes65Rule) {
      verdict = `Warning! Missing ${totalClassesMissed} classes will drop your attendance from ${attendance.overall_percentage}% to ${projectedOverallPct}%, which falls below 75% into the Condonation Zone. You will require medical justification and Dean approval.`;
      verdictLevel = 'warning';
    } else {
      verdict = `Critical Alert! Missing ${totalClassesMissed} classes will drop your attendance to ${projectedOverallPct}%, falling below 65%. Under KIT policy, this leads to examination debarment / detention!`;
      verdictLevel = 'danger';
    }

    // Calculate recovery classes needed if below 75%
    let recoveryClassesNeeded = 0;
    if (projectedOverallPct < 75.0) {
      // 0.75 * (projectedHeld + X) <= currentAttended + X
      // 0.75 * projectedHeld + 0.75 * X <= currentAttended + X
      // 0.75 * projectedHeld - currentAttended <= 0.25 * X
      // X = ceil((0.75 * projectedHeld - currentAttended) / 0.25)
      const diff = 0.75 * projectedHeld - currentAttended;
      if (diff > 0) {
        recoveryClassesNeeded = Math.ceil(diff / 0.25);
      }
    }

    return {
      simulation_input: {
        dates: targetDates,
        days_count: targetDates.length,
      },
      current_attendance: {
        percentage: attendance.overall_percentage,
        attended: currentAttended,
        held: currentHeld,
      },
      projected_attendance: {
        percentage: projectedOverallPct,
        attended: currentAttended,
        held: projectedHeld,
        classes_missed: totalClassesMissed,
      },
      verdict,
      verdict_level: verdictLevel,
      passes_75_rule: passes75Rule,
      recovery_classes_needed: recoveryClassesNeeded,
      exam_conflicts: examConflicts,
      dates_breakdown: dateAnalysis,
      subjects_impact: projectedSubjects,
    };
  },

  /**
   * Pre-validates a leave or OD request against college policy & exam calendar
   */
  async validateLeaveRequest(token, { type, from_date, to_date, half_day = false, reason, event_name }) {
    // 1. Run simulation on the date range
    const dStart = new Date(from_date);
    const dEnd = new Date(to_date);
    const dates = [];
    for (let dt = new Date(dStart); dt <= dEnd; dt.setDate(dt.getDate() + 1)) {
      dates.push(dt.toISOString().split('T')[0]);
    }

    const sim = await this.simulateAbsence(token, { dates });

    const issues = [];
    const warnings = [];

    // Check Exam conflicts
    if (sim.exam_conflicts.length > 0) {
      sim.exam_conflicts.forEach(c => {
        issues.push(`Scheduled Exam Conflict: ${c.title} on ${c.date}. Leaves during assessments are strictly prohibited without prior HoD permission.`);
      });
    }

    // Check consecutive days (max 3 consecutive personal leave days)
    if (type === 'personal_leave' && dates.length > 3) {
      warnings.push(`KIT Handbook Policy: Personal leave requests exceeding 3 consecutive days require HoD and Class Advisor endorsement.`);
    }

    // Check OD event name
    if (type === 'on_duty' && !event_name) {
      issues.push('Event name and documentation are strictly mandatory for On-Duty (OD) sanction.');
    }

    // Check Attendance drop
    if (!sim.passes_75_rule) {
      warnings.push(`Attendance Alert: This absence will reduce your attendance to ${sim.projected_attendance.percentage}%, which is below the mandatory 75% threshold.`);
    }

    return {
      can_proceed: issues.length === 0,
      issues,
      warnings,
      simulation: sim,
      request_summary: {
        type,
        from_date,
        to_date,
        half_day,
        reason,
        event_name: event_name || null,
        days_requested: dates.length,
      },
    };
  },

  /**
   * Comprehensive Placement Eligibility Engine (Live API Grounded)
   * Compares student's profile & academics against drive criteria:
   * 1. min_cgpa
   * 2. allow_standing_arrears
   * 3. allowed_departments
   * 4. eligible_years
   * 5. deadline
   * 6. seats_left
   */
  async evaluatePlacementEligibility(token, companyQuery = null) {
    const [profileRes, academicsRes, drivesRes, todayRes] = await Promise.all([
      collegeApi.getMe(token),
      collegeApi.getMyAcademics(token),
      collegeApi.getPlacementDrives(token),
      collegeApi.getToday(),
    ]);

    const student = profileRes.data;
    const academics = academicsRes.data;
    const drives = drivesRes.data || [];
    const todayDate = todayRes?.data?.date || new Date().toISOString().split('T')[0];

    // Evaluate each drive against all 6 criteria
    const evaluations = drives.map(drive => {
      const criteriaPassed = [];
      const criteriaFailed = [];

      // 1. CGPA Criterion
      const studentCgpa = Number(academics.cgpa);
      const minCgpa = Number(drive.min_cgpa);
      if (studentCgpa >= minCgpa) {
        criteriaPassed.push(`CGPA: Your CGPA is ${studentCgpa} (min required: ${minCgpa})`);
      } else {
        criteriaFailed.push(`CGPA Shortage: Minimum required CGPA is ${minCgpa}, but your current CGPA is ${studentCgpa}`);
      }

      // 2. Standing Arrears Criterion
      const arrears = Number(academics.standing_arrears || 0);
      if (drive.allow_standing_arrears || arrears === 0) {
        criteriaPassed.push(`Arrears Status: ${arrears === 0 ? 'Zero standing arrears' : 'Drive permits standing arrears'}`);
      } else {
        criteriaFailed.push(`Standing Arrears: Drive strictly requires 0 standing arrears, but you currently have ${arrears} arrear(s)`);
      }

      // 3. Department Eligibility
      const dept = (student.department || '').toUpperCase();
      const allowedDepts = (drive.allowed_departments || []).map(d => d.toUpperCase());
      if (allowedDepts.length === 0 || allowedDepts.includes(dept)) {
        criteriaPassed.push(`Department Match: ${dept} is in allowed departments [${allowedDepts.join(', ')}]`);
      } else {
        criteriaFailed.push(`Department Restriction: Your department is ${dept}, but drive is restricted to [${allowedDepts.join(', ')}]`);
      }

      // 4. Eligible Years of Study
      const year = Number(student.year_of_study || 0);
      const eligibleYears = (drive.eligible_years || []).map(Number);
      if (eligibleYears.length === 0 || eligibleYears.includes(year)) {
        criteriaPassed.push(`Year of Study: Year ${year} is eligible`);
      } else {
        criteriaFailed.push(`Year Restriction: You are in Year ${year}, but this drive is open to Year(s) ${eligibleYears.join(', ')}`);
      }

      // 5. Registration Deadline
      const isDeadlineActive = !drive.deadline || drive.deadline >= todayDate;
      if (isDeadlineActive) {
        criteriaPassed.push(`Deadline: Active until ${drive.deadline || 'ongoing'}`);
      } else {
        criteriaFailed.push(`Expired: Registration closed on ${drive.deadline}`);
      }

      // 6. Remaining Seats
      const hasSeats = drive.seats_left === undefined || drive.seats_left > 0;
      if (hasSeats) {
        criteriaPassed.push(`Seats: ${drive.seats_left !== undefined ? `${drive.seats_left} seats remaining` : 'Open enrollment'}`);
      } else {
        criteriaFailed.push(`Capacity Full: Zero seats remaining (${drive.seats_total || 0} filled)`);
      }

      const isEligible = criteriaFailed.length === 0;

      return {
        id: drive.id,
        company: drive.company,
        category: drive.category,
        min_cgpa: drive.min_cgpa,
        seats_left: drive.seats_left,
        seats_total: drive.seats_total,
        deadline: drive.deadline,
        is_eligible: isEligible,
        criteria_passed: criteriaPassed,
        criteria_failed: criteriaFailed,
      };
    });

    const eligibleDrives = evaluations.filter(e => e.is_eligible);
    const ineligibleDrives = evaluations.filter(e => !e.is_eligible);

    // If student queried a specific company (e.g. "Am I eligible for Zoho?")
    if (companyQuery && companyQuery.trim()) {
      const q = companyQuery.toLowerCase().trim();
      const matched = evaluations.find(e => e.company.toLowerCase().includes(q));

      if (matched) {
        return {
          type: 'single_company_evaluation',
          matched_company: matched.company,
          evaluation: matched,
          student_profile: {
            name: student.full_name,
            department: student.department,
            year: student.year_of_study,
            cgpa: academics.cgpa,
            arrears: academics.standing_arrears,
          },
          all_companies: evaluations.map(e => e.company),
        };
      } else {
        return {
          type: 'company_not_found',
          queried_company: companyQuery,
          available_companies: evaluations.map(e => e.company),
          all_evaluations: evaluations,
        };
      }
    }

    return {
      type: 'all_drives_evaluation',
      total_drives: drives.length,
      evaluations,
      eligible_count: eligibleDrives.length,
      ineligible_count: ineligibleDrives.length,
      eligible_drives: eligibleDrives,
      ineligible_drives: ineligibleDrives,
      student_profile: {
        name: student.full_name,
        department: student.department,
        year: student.year_of_study,
        cgpa: academics.cgpa,
        arrears: academics.standing_arrears,
      },
    };
  },
};


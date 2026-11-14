import db from '../database/db.js';
import { collegeApi } from './collegeApi.js';

// Pre-grounded curated knowledge chunks from KIT documents
const kitDocumentsKnowledge = [
  // Student Handbook
  {
    doc_id: 1,
    doc_title: 'KIT Student Handbook 2026',
    doc_type: 'handbook',
    section: 'Regulation 4.1 - Mandatory Attendance Requirement',
    page: 12,
    content: `KIT Autonomous Regulation 4.1: Every student must secure a minimum of 75% overall attendance across all registered courses in a semester to be eligible to appear for the End Semester Examinations. Attendance is computed from the first instructional day until the last working day as notified in the academic calendar.`,
    tags: ['attendance', 'minimum attendance', '75%', 'exam eligibility', 'handbook'],
  },
  {
    doc_id: 1,
    doc_title: 'KIT Student Handbook 2026',
    doc_type: 'handbook',
    section: 'Regulation 4.2 - Condonation of Attendance Shortage',
    page: 13,
    content: `KIT Regulation 4.2: Condonation of shortage of attendance between 65% and 74% may be recommended by the Class Advisor and Head of Department on valid medical grounds or sanctioned institutional representation. The student must submit a genuine Medical Certificate and discharge summary within 3 working days of reporting back to campus, accompanied by the prescribed Condonation Fee. Condonation is granted at the sole discretion of the Principal and cannot be claimed as a matter of right.`,
    tags: ['condonation', 'medical leave', 'shortage', '65%', 'handbook', 'fees'],
  },
  {
    doc_id: 1,
    doc_title: 'KIT Student Handbook 2026',
    doc_type: 'handbook',
    section: 'Regulation 4.3 - Debarment and Detention',
    page: 14,
    content: `KIT Regulation 4.3: Students securing less than 65% overall attendance will NOT be permitted to write the End Semester Examinations under any circumstances. Such candidates are declared detained for lack of attendance and must re-register and repeat the entire semester in the subsequent academic year.`,
    tags: ['detention', 'debarred', 'less than 65%', 'repeat semester', 'arrears'],
  },
  {
    doc_id: 1,
    doc_title: 'KIT Student Handbook 2026',
    doc_type: 'handbook',
    section: 'Regulation 5.0 - On-Duty (OD) Regulations',
    page: 18,
    content: `KIT Regulation 5.0: On-Duty (OD) attendance credit is granted to students participating in approved co-curricular, extra-curricular, paper presentations, sports competitions, inter-collegiate hackathons, and on-campus placement drives. The maximum permissible OD in a semester is 10 instructional days. All OD requests must be submitted through the KIT Guardian portal prior to the event or within 24 hours of completion with supporting documentation/invitation letter.`,
    tags: ['od', 'on duty', 'limit', '10 days', 'symposium', 'placement', 'hackathon'],
  },
  {
    doc_id: 1,
    doc_title: 'KIT Student Handbook 2026',
    doc_type: 'handbook',
    section: 'Regulation 6.2 - Leave Application Workflow',
    page: 22,
    content: `KIT Regulation 6.2: Any student intending to take personal leave must submit a leave request via KIT Guardian. Leave up to 3 consecutive days may be approved by the Class Advisor. Leave exceeding 3 consecutive days requires additional endorsement from the Head of the Department (HoD). Leave during Continuous Internal Assessment (CIA) tests is strictly prohibited; unexcused absence results in zero marks for the internal test.`,
    tags: ['leave', 'personal leave', '3 days', 'hod approval', 'internal exam', 'rules'],
  },
  {
    doc_id: 1,
    doc_title: 'KIT Student Handbook 2026',
    doc_type: 'handbook',
    section: 'Regulation 8.1 - Continuous Internal Assessment (CIA)',
    page: 28,
    content: `Evaluation Pattern: Theory courses carry 40% Continuous Internal Assessment (CIA) marks and 60% End Semester Examination marks. CIA comprises three Internal Assessment Exams (IAE-1, IAE-2, and Model Exam) along with assignments and quizzes. A minimum of 50% aggregate in CIA and End Semester Examination combined is required to pass a course.`,
    tags: ['cia', 'internal assessment', 'marks', 'weightage', 'pass criteria', '40%'],
  },

  // Admissions Brochure
  {
    doc_id: 2,
    doc_title: 'KIT Admissions Brochure 2026-2027',
    doc_type: 'brochure',
    section: 'Admissions & Eligibility Criteria 2026',
    page: 4,
    content: `Admissions 2026-2027 Eligibility: Candidates must have passed the 12th standard (HSC / CBSE / ISC) with Physics, Chemistry, and Mathematics (PCM). Minimum aggregate cut-off requirements:
- B.Tech Computer Science and Engineering (CSE): 75% in 12th PCM. Annual Tuition Fee: ₹1,25,000. Total Seats: 120.
- B.Tech Artificial Intelligence & Data Science (AI-DS): 80% in 12th PCM. Annual Tuition Fee: ₹1,35,000. Total Seats: 60.
- B.Tech Electronics & Communication Engineering (ECE): 70% in 12th PCM. Annual Tuition Fee: ₹1,15,000. Total Seats: 120.
- B.Tech Information Technology (IT): 72% in 12th PCM. Annual Tuition Fee: ₹1,20,000. Total Seats: 60.
- B.Tech Mechanical Engineering (Robotics Minor): 65% in 12th PCM. Annual Tuition Fee: ₹1,05,000. Total Seats: 60.
Campus Hostel Fee: ₹60,000 per annum (includes Wi-Fi, air-cooled rooms, and nutritious South/North Indian mess).`,
    tags: ['admission', 'eligibility', '12th percentage', 'fees', 'seats', 'courses', 'hostel fee', 'brochure'],
  },
  {
    doc_id: 2,
    doc_title: 'KIT Admissions Brochure 2026-2027',
    doc_type: 'brochure',
    section: 'Required Application Documents',
    page: 6,
    content: `Required Documents for Verification at Admission:
1. 10th and 12th Marksheets (Original + 3 copies)
2. Transfer Certificate (TC) and Conduct Certificate from the last attended institution
3. Community Certificate (for BC / BCM / MBC / DNC / SC / SCA / ST)
4. Nativity Certificate (if applicable)
5. Government Photo Identity Proof (Aadhaar Card)
6. 6 recent passport-size photographs.`,
    tags: ['documents required', 'admission documents', 'certificates', 'tc', 'marksheet'],
  },

  // Placement Policy
  {
    doc_id: 4,
    doc_title: 'KIT Placement & Career Development Manual 2026',
    doc_type: 'circular',
    section: 'Placement Drive Eligibility Norms',
    page: 2,
    content: `Campus Placement Categories:
1. Super Dream Offers (> 12 LPA CTC): Minimum 8.0 CGPA throughout 10th, 12th, and B.Tech, with zero standing arrears and zero history of arrears.
2. Dream Offers (6 LPA - 12 LPA CTC): Minimum 7.5 CGPA with zero standing arrears.
3. Core & IT Services Offers (< 6 LPA CTC): Minimum 6.5 or 7.0 CGPA, allowing up to 1 standing arrear depending on the hiring company's policy.
Once a student secures a Dream offer, they are eligible to apply only for Super Dream category drives.`,
    tags: ['placement', 'dream offer', 'super dream', 'cgpa cutoff', 'standing arrears', 'eligibility'],
  },

  // CS304 Lesson Notes
  {
    doc_id: 3,
    doc_title: 'CS304 Database Systems Lecture Notes',
    doc_type: 'lesson_note',
    section: 'Unit 3: Relational Database Design and Normalization',
    page: 45,
    content: `Database Normalization: The process of structuring a relational database in accordance with normal forms to reduce data redundancy and improve data integrity.
- 1NF: Atomic values, no repeating groups.
- 2NF: In 1NF and all non-key attributes are fully functionally dependent on the primary key (no partial dependency).
- 3NF: In 2NF and no transitive functional dependencies exist (non-key attribute determining another non-key attribute).
- BCNF (Boyce-Codd Normal Form): A stricter version of 3NF where for every functional dependency X -> Y, X must be a super key.`,
    tags: ['cs304', 'dbms', 'normalization', '1nf', '2nf', '3nf', 'bcnf', 'lesson notes'],
  },
  {
    doc_id: 3,
    doc_title: 'CS304 Database Systems Lecture Notes',
    doc_type: 'lesson_note',
    section: 'Unit 4: Transaction Processing and ACID Properties',
    page: 62,
    content: `Transaction Properties (ACID):
- Atomicity: All or nothing execution guaranteed via commit and rollback mechanisms.
- Consistency: Execution preserves database invariants and constraints.
- Isolation: Concurrent transactions execute without mutual interference (using 2-Phase Locking or Multi-Version Concurrency Control).
- Durability: Once a transaction commits, its updates persist permanently even in case of system power failure.`,
    tags: ['cs304', 'dbms', 'acid', 'transaction', 'isolation', 'concurrency', 'durability'],
  },
];

export const ragService = {
  /**
   * Search knowledge base for grounded answers
   */
  async searchKnowledge(query, docTypeFilter = null, topK = 3) {
    const qTokens = query.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(t => t.length > 2);

    const scored = kitDocumentsKnowledge.map(item => {
      if (docTypeFilter && item.doc_type !== docTypeFilter) {
        return { item, score: 0 };
      }

      let score = 0;
      const fullText = `${item.doc_title} ${item.section} ${item.content} ${item.tags.join(' ')}`.toLowerCase();

      // Check tag matches (high weight)
      item.tags.forEach(tag => {
        if (query.toLowerCase().includes(tag)) {
          score += 15;
        }
      });

      // Token match
      qTokens.forEach(token => {
        if (fullText.includes(token)) {
          score += 3;
        }
        if (item.section.toLowerCase().includes(token)) {
          score += 5;
        }
      });

      return { item, score };
    });

    const results = scored
      .filter(s => s.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, topK)
      .map(s => ({
        doc_id: s.item.doc_id,
        doc_title: s.item.doc_title,
        doc_type: s.item.doc_type,
        section: s.item.section,
        page: s.item.page,
        content: s.item.content,
        relevance_score: s.score,
      }));

    return results;
  },

  /**
   * Specific helper for Handbook queries
   */
  async searchHandbook(query) {
    return this.searchKnowledge(query, 'handbook', 2);
  },

  /**
   * Specific helper for Admission brochure queries
   */
  async searchAdmissionBrochure(query) {
    return this.searchKnowledge(query, 'brochure', 2);
  },

  /**
   * Specific helper for Lesson notes queries
   */
  async searchLessonNotes(query) {
    return this.searchKnowledge(query, 'lesson_note', 2);
  },
};


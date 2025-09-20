/*
  Firestore Seeder for Sampurna ERP
  - Seeds: departments, books, notices, sample student, sample library card
  - Backfills: students.admissionId (if missing), totalFeesDue/totalFeesPaid defaults

  Prereqs:
  - Set GOOGLE_APPLICATION_CREDENTIALS to your Firebase service account key JSON
  - npm install
  - npm run seed:firestore
*/

const admin = require('firebase-admin');
const path = require('path');

function initAdmin(appId) {
  const useEmulator = !!process.env.FIRESTORE_EMULATOR_HOST;
  try {
    if (useEmulator) {
      admin.initializeApp({ projectId: appId });
      console.log('Seeder: Using Firestore Emulator at', process.env.FIRESTORE_EMULATOR_HOST);
    } else {
      const saPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
      if (saPath) {
        const absolute = path.isAbsolute(saPath) ? saPath : path.join(process.cwd(), saPath);
        const key = require(absolute);
        admin.initializeApp({
          credential: admin.credential.cert(key),
          projectId: key.project_id || appId,
        });
        console.log('Seeder: Using Firestore (cloud) with service account for project', key.project_id || appId);
      } else {
        admin.initializeApp({
          credential: admin.credential.applicationDefault(),
          projectId: process.env.FIREBASE_PROJECT_ID || process.env.GCLOUD_PROJECT || process.env.GOOGLE_CLOUD_PROJECT || appId,
        });
        console.log('Seeder: Using Firestore (cloud) with ADC');
      }
    }
  } catch (e) {
    console.error('Failed to initialize firebase-admin.', e);
    process.exit(1);
  }
  return admin.firestore();
}

function rootRef(db, appId) {
  // Path: artifacts/{appId}/public/data
  return db.collection('artifacts').doc(appId).collection('public').doc('data');
}

async function ensureBaseDoc(db, appId) {
  const base = rootRef(db, appId);
  await base.set({ seededAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
}

async function seedDepartments(db, appId) {
  const departments = [
    { id: 'Computer Science', name: 'Computer Science', hod: 'Dr. A. Verma', teachers: ['Prof. K. Rao', 'Prof. S. Iyer'] },
    { id: 'Mechanical Engineering', name: 'Mechanical Engineering', hod: 'Dr. P. Singh', teachers: ['Prof. M. Das', 'Prof. J. Kulkarni'] },
    { id: 'Electrical Engineering', name: 'Electrical Engineering', hod: 'Dr. R. Nair', teachers: ['Prof. L. Gupta', 'Prof. T. Shah'] },
    { id: 'Civil Engineering', name: 'Civil Engineering', hod: 'Dr. S. Banerjee', teachers: ['Prof. V. Mehta'] },
  ];
  const col = rootRef(db, appId).collection('departments');
  for (const d of departments) {
    await col.doc(d.id).set(d, { merge: true });
  }
  console.log('Seeded departments');
}

async function seedBooks(db, appId) {
  const books = [
    { title: 'Introduction to Algorithms', author: 'Cormen et al.', isbn: '9780262033848', totalCount: 5 },
    { title: 'Operating System Concepts', author: 'Silberschatz et al.', isbn: '9781119456339', totalCount: 4 },
    { title: 'Mechanical Engineering Design', author: 'Shigley', isbn: '9780073398204', totalCount: 3 },
  ];
  const col = rootRef(db, appId).collection('books');
  for (const b of books) {
    await col.add({ ...b, availableCount: b.totalCount, createdAt: admin.firestore.FieldValue.serverTimestamp() });
  }
  console.log('Seeded books');
}

async function seedNotices(db, appId) {
  const notices = [
    { title: 'Welcome to the Semester', audience: 'all', message: 'Classes commence from Monday 9 AM.' },
    { title: 'Library Closure', audience: 'library', message: 'Library closed on Friday for maintenance.' },
    { title: 'Hostel Inspection', audience: 'hostel', message: 'Routine inspection on Saturday 10 AM.' },
  ];
  const col = rootRef(db, appId).collection('notices');
  for (const n of notices) {
    await col.add({ ...n, createdAt: admin.firestore.FieldValue.serverTimestamp() });
  }
  console.log('Seeded notices');
}

async function seedExams(db, appId) {
  const col = rootRef(db, appId).collection('exams');
  const now = Date.now();
  const exams = [
    { title: 'Mid-Semester Exam - CSE', course: 'Computer Science', whenMs: now + 5*24*60*60*1000, description: 'Syllabus Units 1-3' },
    { title: 'Workshop Assessment - Mechanical', course: 'Mechanical Engineering', whenMs: now + 7*24*60*60*1000, description: 'Practical Evaluation' },
    { title: 'All Departments: English Test', course: null, whenMs: now + 9*24*60*60*1000, description: 'Common paper' },
  ];
  for (const ex of exams) {
    await col.add({
      title: ex.title,
      course: ex.course || null,
      description: ex.description || null,
      when: admin.firestore.Timestamp.fromMillis(ex.whenMs),
      date: new Date(ex.whenMs).toISOString().slice(0,10),
      time: new Date(ex.whenMs).toTimeString().slice(0,5),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  }
  console.log('Seeded exams');
}

async function seedSampleStudentAndCard(db, appId) {
  const studentsCol = rootRef(db, appId).collection('students');
  const admissionId = 'SMPRNA-0001-ABCD';
  const studentDocRef = studentsCol.doc(admissionId);
  await studentDocRef.set({
    admissionId,
    fullName: 'Sample Student',
    course: 'Computer Science',
    email: 'student@example.com',
    phone: '9999999999',
    totalFeesDue: 50000,
    totalFeesPaid: 0,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  }, { merge: true });
  await rootRef(db, appId).collection('libraryCards').doc(admissionId).set({
    admissionId,
    studentName: 'Sample Student',
    class: 'B.Tech CSE - 2nd Year',
    rollNo: 'CS2001',
    cardNo: 'LIB-0001ABCD',
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  }, { merge: true });
  console.log('Seeded sample student and library card');
}

async function backfillStudents(db, appId) {
  const col = rootRef(db, appId).collection('students');
  const snap = await col.get();
  let updated = 0;
  for (const docSnap of snap.docs) {
    const data = docSnap.data() || {};
    const updates = {};
    if (!data.admissionId) updates.admissionId = docSnap.id;
    if (typeof data.totalFeesDue !== 'number') updates.totalFeesDue = 0;
    if (typeof data.totalFeesPaid !== 'number') updates.totalFeesPaid = 0;
    if (Object.keys(updates).length) {
      await docSnap.ref.set(updates, { merge: true });
      updated++;
    }
  }
  console.log(`Backfilled students: ${updated} updated`);
}

async function main() {
  const appId = process.env.SAMPURNA_APP_ID || 'smapurna-e9c2b';
  const db = initAdmin(appId);
  await ensureBaseDoc(db, appId);
  await seedDepartments(db, appId);
  await seedBooks(db, appId);
  await seedNotices(db, appId);
  await seedExams(db, appId);
  await seedSampleStudentAndCard(db, appId);
  await backfillStudents(db, appId);
  console.log('Seeding completed.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

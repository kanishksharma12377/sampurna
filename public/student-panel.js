import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getFirestore, doc, updateDoc, setDoc, collection, getDoc, getDocs, query, where, connectFirestoreEmulator, onSnapshot, addDoc, serverTimestamp, orderBy } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyDLXBzML_MhXgLtqyDQSfeO8tcU-MfLmCU",
    authDomain: "smapurna-e9c2b.firebaseapp.com",
    databaseURL: "https://smapurna-e9c2b-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "smapurna-e9c2b",
    storageBucket: "smapurna-e9c2b.firebasestorage.app",
    messagingSenderId: "524344352643",
    appId: "1:524344352643:web:1efdd26e9a29f7693660b6",
    measurementId: "G-FPT7XTSZCS"
};
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
// Opt-in emulator: set window.USE_FIRESTORE_EMULATOR = true before this script
try {
    const useEmu = typeof window !== 'undefined' && window.USE_FIRESTORE_EMULATOR === true;
    if (useEmu) {
        connectFirestoreEmulator(db, '127.0.0.1', 8080);
        console.log('Using Firestore Emulator at 127.0.0.1:8080');
    } else {
        console.log('Using Cloud Firestore');
    }
} catch (_) { /* ignore */ }

// --- Simple tab navigation for the ERP-like UI ---
function switchTab(name) {
    const tabs = ['dashboard','exams','notices','library','messages','feesHostel'];
    tabs.forEach(t => {
        const sec = document.getElementById(`tab-${t}`);
        if (!sec) return;
        if (t === name) sec.classList.remove('hidden'); else sec.classList.add('hidden');
    });
}

document.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-tab]');
    if (!btn) return;
    const name = btn.getAttribute('data-tab');
    switchTab(name);
});

// --- Student Chat (messages to admin) ---
let CURRENT_ADMISSION_ID = null;
let unsubscribeChat = null;

function renderChatBubble({ role, text, createdAt }) {
    const container = document.createElement('div');
    const isAdmin = role === 'admin';
    container.className = `p-3 rounded-lg max-w-[85%] ${isAdmin ? 'bg-blue-600 text-white self-end rounded-br-none' : 'bg-gray-200 text-gray-800 self-start rounded-bl-none'}`;
    const ts = createdAt?.seconds ? new Date(createdAt.seconds * 1000).toLocaleTimeString() : '';
    container.innerHTML = `<span class="font-semibold">${isAdmin ? 'Admin' : 'You'}:</span> ${text}<div class="text-[10px] opacity-70 mt-1">${ts}</div>`;
    return container;
}

function scrollChatToBottom() {
    const chatBox = document.getElementById('chatContainer');
    if (chatBox) chatBox.scrollTop = chatBox.scrollHeight;
}

function initStudentChat(admissionId) {
    CURRENT_ADMISSION_ID = admissionId;
    const chatBox = document.getElementById('chatContainer');
    if (!chatBox) return;
    // Clear previous listener
    if (typeof unsubscribeChat === 'function') { unsubscribeChat(); unsubscribeChat = null; }
    chatBox.innerHTML = `<div class="p-3 rounded-lg bg-gray-200 text-gray-dark self-start rounded-bl-none"><span class="font-bold">Assistant:</span> Hello! How can I help you today?</div>`;

    const postsCol = collection(db, 'artifacts', 'smapurna-e9c2b', 'public', 'data', 'messages', admissionId, 'posts');
    const q1 = query(postsCol, orderBy('createdAt', 'asc'));
    unsubscribeChat = onSnapshot(q1, (snap) => {
        chatBox.innerHTML = '';
        snap.forEach(d => {
            const m = d.data();
            chatBox.appendChild(renderChatBubble(m));
        });
        if (snap.empty) {
            chatBox.innerHTML = `<div class=\"p-3 rounded-lg bg-gray-200 text-gray-dark self-start rounded-bl-none\"><span class=\"font-bold\">Assistant:</span> Hello! How can I help you today?</div>`;
        }
        scrollChatToBottom();
    });
}

function getStudentId() {
    try {
        const params = new URLSearchParams(window.location.search);
        return params.get('id') || sessionStorage.getItem('studentAdmissionId') || '';
    } catch (_) {
        return '';
    }
}

// Removed fees submission; Fees tab now only displays due amount

// Library helpers
async function loadLibraryForStudent() {
    const admissionId = getStudentId();
    if (!admissionId) return;

    const noCardDiv = document.getElementById('noLibraryCard');
    const cardInfoDiv = document.getElementById('libraryCardInfo');
    const issuedList = document.getElementById('issuedBooksList');
    const issuedEmpty = document.getElementById('issuedBooksEmpty');
    const availList = document.getElementById('availableBooksList');
    const availEmpty = document.getElementById('availableBooksEmpty');

    issuedList.innerHTML = '';
    availList.innerHTML = '';
    issuedEmpty.classList.add('hidden');
    availEmpty.classList.add('hidden');

    try {
        const cardRef = doc(db, 'artifacts', 'smapurna-e9c2b', 'public', 'data', 'libraryCards', admissionId);
        const cardSnap = await getDoc(cardRef);
        if (!cardSnap.exists()) {
            noCardDiv.classList.remove('hidden');
            cardInfoDiv.classList.add('hidden');
            return;
        }

        noCardDiv.classList.add('hidden');
        cardInfoDiv.classList.remove('hidden');
        const card = cardSnap.data();
        document.getElementById('libStudentName').textContent = card.studentName;
        document.getElementById('libStudentClass').textContent = card.class;
        document.getElementById('libStudentRoll').textContent = card.rollNo;
        document.getElementById('libCardNo').textContent = card.cardNo;

        // Load issued books
        const issuedCol = collection(db, 'artifacts', 'smapurna-e9c2b', 'public', 'data', 'issuedBooks');
        const q1 = query(issuedCol, where('admissionId', '==', admissionId), where('returned', '==', false));
        const issuedSnap = await getDocs(q1);
        if (issuedSnap.empty) {
            issuedEmpty.classList.remove('hidden');
        } else {
            issuedSnap.forEach(d => {
                const it = d.data();
                const row = document.createElement('div');
                row.className = 'p-3 border rounded-lg flex justify-between items-center';
                row.innerHTML = `<span>${it.bookTitle} (${it.bookIsbn})</span><span class="text-orange-600">Issued</span>`;
                issuedList.appendChild(row);
            });
        }

        // Load available books
        const booksSnap = await getDocs(collection(db, 'artifacts', 'smapurna-e9c2b', 'public', 'data', 'books'));
        if (booksSnap.empty) {
            availEmpty.classList.remove('hidden');
        } else {
            booksSnap.forEach(bd => {
                const b = bd.data();
                if ((b.availableCount ?? b.totalCount ?? 0) <= 0) return;
                const row = document.createElement('div');
                row.className = 'p-3 border rounded-lg';
                row.innerHTML = `<p class="font-semibold">${b.title}</p><p class="text-sm text-gray-600">${b.author} • ${b.isbn}</p>`;
                availList.appendChild(row);
            });
            if (!availList.children.length) availEmpty.classList.remove('hidden');
        }
    } catch (err) {
        console.error('Error loading library:', err);
    }
}

// Auto-initialize sections on page load
document.addEventListener('DOMContentLoaded', () => {
    const id = getStudentId();
    if (id) initStudentChat(id);
    loadStudentProfile();
    loadLibraryForStudent();
    loadStudentNotices();
    checkFeesDue();
    loadStudentExams();
    setTimeout(updateDashboardCounters, 500);
});

// Logout handler
document.addEventListener('DOMContentLoaded', () => {
    try {
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => {
                try { sessionStorage.removeItem('studentAdmissionId'); } catch (_) {}
                window.location.href = 'login.html';
            });
        }
    } catch (_) { /* ignore */ }
});

async function loadStudentNotices() {
    const list = document.getElementById('studentNoticesList');
    const empty = document.getElementById('studentNoticesEmpty');
    if (!list) return;
    list.innerHTML = '';
    try {
        const snap = await getDocs(collection(db, 'artifacts', 'smapurna-e9c2b', 'public', 'data', 'notices'));
        if (snap.empty) { empty?.classList.remove('hidden'); return; }
        empty?.classList.add('hidden');
        const items = [];
        snap.forEach(d => items.push({ id: d.id, ...d.data() }));
        items.sort((a,b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
        items.forEach(n => {
            const row = document.createElement('div');
            row.className = 'p-4 border rounded-lg';
            const when = n.createdAt ? new Date(n.createdAt.seconds*1000).toLocaleString() : '';
            row.innerHTML = `
                <p class="font-bold">${n.title}</p>
                <p class="text-sm text-gray-600">Audience: ${n.audience || 'all'} • ${when}</p>
                <p class="mt-1">${n.message}</p>
            `;
            list.appendChild(row);
        });
    } catch (err) {
        list.innerHTML = `<p class="text-red-600">Error: ${err.message}</p>`;
    }
}

async function checkFeesDue() {
    const alertBox = document.getElementById('feesDueAlert');
    const admissionId = getStudentId();
    if (!admissionId) return;
    try {
        // Try doc by id, then by field
        let ref = doc(db, 'artifacts', 'smapurna-e9c2b', 'public', 'data', 'students', admissionId);
        let snap = await getDoc(ref);
        if (!snap.exists()) {
            const colRef = collection(db, 'artifacts', 'smapurna-e9c2b', 'public', 'data', 'students');
            const qs = await getDocs(query(colRef, where('admissionId', '==', admissionId)));
            if (!qs.empty) snap = qs.docs[0];
        }
        if (!snap.exists()) { alertBox.classList.add('hidden'); return; }
        const s = snap.data();
        const paid = Number(s.totalFeesPaid || 0);
        const due = Math.max(0, Number(s.totalFeesDue || 0) - paid);
        if (due > 0) alertBox.classList.remove('hidden'); else alertBox.classList.add('hidden');
        const feesDueAmt = document.getElementById('feesDueAmount');
        if (feesDueAmt) feesDueAmt.textContent = `₹ ${due}`;
        const dashFees = document.getElementById('dashFeesDue');
        if (dashFees) dashFees.textContent = `₹ ${due}`;
    } catch (err) {
        // Fail silently
        alertBox.classList.add('hidden');
    }
}

const refreshBtn = document.getElementById('refreshStudentNotices');
if (refreshBtn) refreshBtn.addEventListener('click', loadStudentNotices);

// Chat send
const chatForm = document.getElementById('chatForm');
if (chatForm) {
    chatForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        try {
            const id = getStudentId();
            if (!id) return alert('Enter your Admission ID first, then send your message.');
            const input = document.getElementById('chatInput');
            const text = input.value.trim();
            if (!text) return;
            const postsCol = collection(db, 'artifacts', 'smapurna-e9c2b', 'public', 'data', 'messages', id, 'posts');
            await addDoc(postsCol, {
                role: 'student',
                text,
                createdAt: serverTimestamp()
            });
            input.value = '';
            if (!CURRENT_ADMISSION_ID) initStudentChat(id);
        } catch (err) {
            alert('Failed to send: ' + err.message);
        }
    });
}

// Load upcoming exams for student
async function loadStudentExams() {
    const list = document.getElementById('studentExamsList');
    const empty = document.getElementById('studentExamsEmpty');
    if (!list) return;
    list.innerHTML = '';
    empty.classList.add('hidden');
    try {
        const admissionId = getStudentId();
        let studentCourse = null;
        if (admissionId) {
            let sRef = doc(db, 'artifacts', 'smapurna-e9c2b', 'public', 'data', 'students', admissionId);
            let sSnap = await getDoc(sRef);
            if (!sSnap.exists()) {
                const colRef = collection(db, 'artifacts', 'smapurna-e9c2b', 'public', 'data', 'students');
                const qs = await getDocs(query(colRef, where('admissionId', '==', admissionId)));
                if (!qs.empty) sSnap = qs.docs[0];
            }
            if (sSnap.exists()) studentCourse = sSnap.data().course || null;
        }

        // Fetch exams, filter by course if set
        const examsSnap = await getDocs(collection(db, 'artifacts', 'smapurna-e9c2b', 'public', 'data', 'exams'));
        if (examsSnap.empty) { empty.classList.remove('hidden'); return; }
        const items = [];
        examsSnap.forEach(d => items.push({ id: d.id, ...d.data() }));
        const nowSec = Math.floor(Date.now()/1000);
        const filtered = items.filter(ex => !ex._deleted && (ex.when?.seconds || nowSec+1) >= nowSec)
            .filter(ex => !ex.course || !studentCourse || ex.course === studentCourse)
            .sort((a,b) => (a.when?.seconds || 0) - (b.when?.seconds || 0));
        if (!filtered.length) { empty.classList.remove('hidden'); return; }
        filtered.forEach(ex => {
            const when = ex.when?.seconds ? new Date(ex.when.seconds*1000).toLocaleString() : `${ex.date || ''} ${ex.time || ''}`;
            const row = document.createElement('div');
            row.className = 'p-3 border rounded-lg';
            row.innerHTML = `<div class="font-semibold">${ex.title}</div><div class="text-sm text-gray-600">${ex.course || 'All Departments'} • ${when}</div>${ex.description ? `<div class='text-sm mt-1'>${ex.description}</div>` : ''}`;
            list.appendChild(row);
        });
    } catch (err) {
        list.innerHTML = `<p class='text-red-600'>Error: ${err.message}</p>`;
    }
}

// --- Dashboard counters ---
async function updateDashboardCounters() {
    // Fees due
    const admissionId = getStudentId();
    let feesDue = '–';
    let issuedCount = '–';
    let upcomingCount = '–';
    try {
        if (admissionId) {
            // Fees due
            let sRef = doc(db, 'artifacts', 'smapurna-e9c2b', 'public', 'data', 'students', admissionId);
            let sSnap = await getDoc(sRef);
            if (!sSnap.exists()) {
                const colRef = collection(db, 'artifacts', 'smapurna-e9c2b', 'public', 'data', 'students');
                const qs = await getDocs(query(colRef, where('admissionId', '==', admissionId)));
                if (!qs.empty) sSnap = qs.docs[0];
            }
            if (sSnap.exists()) {
                const s = sSnap.data();
                const paid = Number(s.totalFeesPaid || 0);
                const due = Math.max(0, Number(s.totalFeesDue || 0) - paid);
                feesDue = `₹ ${due}`;
            }

            // Issued books
            const issuedCol = collection(db, 'artifacts', 'smapurna-e9c2b', 'public', 'data', 'issuedBooks');
            const iq = query(issuedCol, where('admissionId', '==', admissionId), where('returned', '==', false));
            const issuedSnap = await getDocs(iq);
            issuedCount = `${issuedSnap.size}`;

            // Upcoming exams count (for student's department if available)
            let studentCourse = null;
            if (sSnap.exists()) studentCourse = sSnap.data().course || null;
            const examsSnap = await getDocs(collection(db, 'artifacts', 'smapurna-e9c2b', 'public', 'data', 'exams'));
            const nowSec = Math.floor(Date.now()/1000);
            const items = [];
            examsSnap.forEach(d => items.push({ id: d.id, ...d.data() }));
            const filtered = items.filter(ex => !ex._deleted && (ex.when?.seconds || nowSec+1) >= nowSec)
                .filter(ex => !ex.course || !studentCourse || ex.course === studentCourse);
            upcomingCount = `${filtered.length}`;
        }
    } catch (_) { /* ignore */ }
    const f = document.getElementById('dashFeesDue'); if (f) f.textContent = feesDue;
    const i = document.getElementById('dashIssuedBooks'); if (i) i.textContent = issuedCount;
    const u = document.getElementById('dashUpcomingExams'); if (u) u.textContent = upcomingCount;
}

// Render student details on Dashboard
async function loadStudentProfile() {
    const container = document.getElementById('studentData');
    if (!container) return;
    const admissionId = getStudentId();
    if (!admissionId) {
        container.innerHTML = '<p class="text-gray-500">Login again to load your profile.</p>';
        return;
    }
    try {
        let sRef = doc(db, 'artifacts', 'smapurna-e9c2b', 'public', 'data', 'students', admissionId);
        let sSnap = await getDoc(sRef);
        if (!sSnap.exists()) {
            const colRef = collection(db, 'artifacts', 'smapurna-e9c2b', 'public', 'data', 'students');
            const qs = await getDocs(query(colRef, where('admissionId', '==', admissionId)));
            if (!qs.empty) sSnap = qs.docs[0];
        }
        if (!sSnap.exists()) {
            container.innerHTML = '<p class="text-red-600">Student profile not found.</p>';
            return;
        }
        const s = sSnap.data();
        const name = s.name || s.fullName || 'Student';
        const course = s.course || s.department || '—';
        const cls = s.class || s.className || s.semester || '—';
        const roll = s.rollNo || s.roll || '—';
        container.innerHTML = `
            <p class="text-lg font-semibold text-gray-800">${name}</p>
            <p class="text-sm text-gray-600">Admission ID: <span class="font-mono">${admissionId}</span></p>
            <p class="text-sm text-gray-600">Course/Dept: ${course} • Class/Sem: ${cls} • Roll: ${roll}</p>
        `;
    } catch (err) {
        container.innerHTML = `<p class='text-red-600'>Error loading profile: ${err.message}</p>`;
    }
}
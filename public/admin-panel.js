// Correct Firebase imports for web v9
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";
import { getFirestore, collection, getDocs, addDoc, doc, query, where, setDoc, serverTimestamp, getDoc, onSnapshot, updateDoc, increment, connectFirestoreEmulator, orderBy, limit } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";
import { downloadReceipt } from "./download-receipt.js";

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
const auth = getAuth(app);
const db = getFirestore(app);
// Opt-in emulator: set window.USE_FIRESTORE_EMULATOR = true in HTML before this script to use emulator
try {
    const useEmu = typeof window !== 'undefined' && window.USE_FIRESTORE_EMULATOR === true;
    if (useEmu) {
        connectFirestoreEmulator(db, '127.0.0.1', 8080);
        console.log('Using Firestore Emulator at 127.0.0.1:8080');
    } else {
        console.log('Using Cloud Firestore');
    }
} catch (_) { /* no-op */ }

// Notification helper using the #notificationBar strip
function showNotification(message, barClass = 'bg-maroon') {
    const bar = document.getElementById('notificationBar');
    if (!bar) { alert(message); return; }
    bar.className = `fixed top-0 left-0 right-0 py-3 px-6 text-center text-white transition-transform duration-500 ease-in-out z-50 ${barClass}`;
    bar.textContent = message;
    bar.style.transform = 'translateY(0)';
    setTimeout(() => {
        bar.style.transform = 'translateY(-100%)';
    }, 2500);
}

// Function to fetch and display student data in the dashboard
async function displayStudentData() {
    const studentDataDiv = document.getElementById('studentData');
    if (!studentDataDiv) return;
    studentDataDiv.innerHTML = '';
    try {
        const studentsColRef = collection(db, 'artifacts', 'smapurna-e9c2b', 'public', 'data', 'students');
        const querySnapshot = await getDocs(studentsColRef);
        if (querySnapshot.empty) {
            studentDataDiv.innerHTML = '<p class="text-center text-gray-500">No student data found.</p>';
            return;
        }
        querySnapshot.forEach((doc) => {
            const student = doc.data();
            const studentInfo = `
                <div class="border-b border-gray-200 py-2">
                    <p><span class="font-bold">Name:</span> ${student.fullName || student.name}</p>
                    <p><span class="font-bold">Course:</span> ${student.course || ''}</p>
                    <p><span class="font-bold">Email:</span> ${student.email || ''}</p>
                    <p><span class="font-bold">Admission Fees:</span> ${student.admissionFees || 'N/A'}</p>
                    <p><span class="font-bold">Room Allocation:</span> ${student.roomAllocation || 'N/A'}</p>
                </div>
            `;
            studentDataDiv.innerHTML += studentInfo;
        });
    } catch (error) {
        studentDataDiv.innerHTML = `<p class="text-red-500">Error fetching student data: ${error.message}</p>`;
    }
}

// New function to display department summary cards on the dashboard
async function displayDepartmentSummary() {
    const dashboardDepartmentsSummary = document.getElementById('dashboardDepartmentsSummary');
    if (!dashboardDepartmentsSummary) return;
    dashboardDepartmentsSummary.innerHTML = '';

    try {
        const studentsColRef = collection(db, 'artifacts', 'smapurna-e9c2b', 'public', 'data', 'students');
        const querySnapshot = await getDocs(studentsColRef);

        const departmentCounts = {};
        querySnapshot.forEach(doc => {
            const student = doc.data();
            const course = student.course || 'Unassigned';
            departmentCounts[course] = (departmentCounts[course] || 0) + 1;
        });

        if (Object.keys(departmentCounts).length === 0) {
            dashboardDepartmentsSummary.innerHTML = '<p class="text-center text-gray-500 col-span-full">No departments found.</p>';
            return;
        }

        for (const [department, count] of Object.entries(departmentCounts)) {
            const departmentCard = document.createElement('div');
            departmentCard.className = 'bg-white p-6 rounded-lg shadow-lg text-center border-b-4 border-maroon cursor-pointer hover:bg-gray-50 transition-colors';
            departmentCard.innerHTML = `
                <h3 class="text-xl font-semibold text-gray-700">${department}</h3>
                <p class="text-5xl font-bold mt-4 text-maroon">${count}</p>
            `;
            departmentCard.addEventListener('click', () => fetchAndDisplayStudentsInModal(department));
            dashboardDepartmentsSummary.appendChild(departmentCard);
        }

    } catch (error) {
        console.error("Error displaying department summary:", error);
        dashboardDepartmentsSummary.innerHTML = `<p class="text-red-500">Error loading department summary: ${error.message}</p>`;
    }
}

// New function to fetch and display students for a specific department in a modal
async function fetchAndDisplayStudentsInModal(department) {
    const modal = document.getElementById('departmentStudentsModal');
    const modalTitle = document.getElementById('departmentModalTitle');
    const studentsList = document.getElementById('departmentStudentsList');
    const errorDiv = document.getElementById('departmentModalError');

    modalTitle.textContent = `${department} Students`;
    studentsList.innerHTML = '';
    errorDiv.classList.add('hidden');
    modal.classList.remove('hidden');

    try {
        const studentsColRef = collection(db, 'artifacts', 'smapurna-e9c2b', 'public', 'data', 'students');
        const q = query(studentsColRef, where("course", "==", department));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            studentsList.innerHTML = '<li class="text-gray-500 text-center">No students found for this department.</li>';
            return;
        }

        querySnapshot.forEach(doc => {
            const student = doc.data();
            const studentItem = document.createElement('li');
            studentItem.className = 'p-3 bg-gray-100 rounded-lg shadow-sm';
            studentItem.innerHTML = `
                <span class="font-bold">${student.fullName}</span> - ${student.email}
            `;
            studentsList.appendChild(studentItem);
        });

    } catch (error) {
        console.error("Error fetching students by department:", error);
        errorDiv.textContent = 'Error fetching student data.';
        errorDiv.classList.remove('hidden');
    }
}


// Function to handle form submissions and button clicks
document.addEventListener('DOMContentLoaded', () => {
    const adminEmailSpan = document.getElementById('adminEmail');
    adminEmailSpan.textContent = 'admin@erp.com';
    const logoutBtn = document.getElementById('logoutBtn');
    const navButtons = document.querySelectorAll('nav button');
    const sections = document.querySelectorAll('main section');
    const admissionForm = document.getElementById('admissionForm');
    const updateFeesButton = document.getElementById('updateFeesButton');
    const generateReceiptButton = document.getElementById('generateReceiptButton');
    const feesUpdateForm = document.getElementById('feesUpdateForm');
    const feesStudentIdInput = document.getElementById('feesStudentIdInput');
    const feesAmountInput = document.getElementById('feesAmountInput');
    const feesPaymentMode = document.getElementById('feesPaymentMode');
    const feesActionMsg = document.getElementById('feesActionMsg');
    const feesListDiv = document.getElementById('feesList');
    const feesListEmpty = document.getElementById('feesListEmpty');
    const allocateRoomButton = document.getElementById('allocateRoomButton');
    const hostelStudentInput = document.getElementById('hostelStudentInput');
    const hostelRoomInput = document.getElementById('hostelRoomInput');
    const hostelAllocationsList = document.getElementById('hostelAllocationsList');
    const hostelAllocationsEmpty = document.getElementById('hostelAllocationsEmpty');
    const refreshHostelAllocations = document.getElementById('refreshHostelAllocations');
    // Departments
    const departmentsManageList = document.getElementById('departmentsManageList');
    const departmentsManageEmpty = document.getElementById('departmentsManageEmpty');
    const refreshDepartments = document.getElementById('refreshDepartments');
    const closeDepartmentModalBtn = document.getElementById('closeDepartmentModal');
    // Library elements
    const createLibraryCardForm = document.getElementById('createLibraryCardForm');
    const createLibraryCardMsg = document.getElementById('createLibraryCardMsg');
    const cardsList = document.getElementById('cardsList');
    const cardsListEmpty = document.getElementById('cardsListEmpty');
    const refreshCardsList = document.getElementById('refreshCardsList');
    const addBookForm = document.getElementById('addBookForm');
    const addBookMsg = document.getElementById('addBookMsg');
    const booksList = document.getElementById('booksList');
    const booksListEmpty = document.getElementById('booksListEmpty');
    const refreshBooksList = document.getElementById('refreshBooksList');
    const departmentStudentsModal = document.getElementById('departmentStudentsModal');
    // Notices
    const createNoticeForm = document.getElementById('createNoticeForm');
    const noticeTitleInput = document.getElementById('noticeTitle');
    const noticeAudienceSelect = document.getElementById('noticeAudience');
    const noticeMessageInput = document.getElementById('noticeMessage');
    const noticeActionMsg = document.getElementById('noticeActionMsg');
    const noticesList = document.getElementById('noticesList');
    const noticesEmpty = document.getElementById('noticesEmpty');
    const refreshNotices = document.getElementById('refreshNotices');
    // Exams
    const createExamForm = document.getElementById('createExamForm');
    const examActionMsg = document.getElementById('examActionMsg');
    const refreshExamsBtn = document.getElementById('refreshExams');
    const examsList = document.getElementById('examsList');
    const examsEmpty = document.getElementById('examsEmpty');
    // Admissions edit elements
    const editSearchId = document.getElementById('editSearchId');
    const editSearchBtn = document.getElementById('editSearchBtn');
    const editSearchMsg = document.getElementById('editSearchMsg');
    const editStudentCard = document.getElementById('editStudentCard');
    const editFullName = document.getElementById('editFullName');
    const editEmail = document.getElementById('editEmail');
    const editPhone = document.getElementById('editPhone');
    const editCourse = document.getElementById('editCourse');
    const editSemester = document.getElementById('editSemester');
    const editTotalFeesDue = document.getElementById('editTotalFeesDue');
    const editTotalPaid = document.getElementById('editTotalPaid');
    const editPending = document.getElementById('editPending');
    const editSaveBtn = document.getElementById('editSaveBtn');
    const editSaveMsg = document.getElementById('editSaveMsg');
    const quickPayAmount = document.getElementById('quickPayAmount');
    const quickPayMode = document.getElementById('quickPayMode');
    const quickPayBtn = document.getElementById('quickPayBtn');
    const quickPayMsg = document.getElementById('quickPayMsg');
    let editCurrentRef = null;
    // Messages (admin replies to students)
    const refreshThreadsBtn = document.getElementById('refreshThreads');
    const threadsList = document.getElementById('threadsList');
    const threadsEmpty = document.getElementById('threadsEmpty');
    const threadHeader = document.getElementById('threadHeader');
    const threadMessages = document.getElementById('threadMessages');
    const replyForm = document.getElementById('replyForm');
    const replyInput = document.getElementById('replyInput');
    const replyActionMsg = document.getElementById('replyActionMsg');
    let unsubscribeThread = null;
    let currentThreadId = null;

    // No authentication required; just show static admin email and load data
    adminEmailSpan.textContent = 'admin@erp.com';
    displayStudentData();
    displayDepartmentSummary();
    loadHostelAllocations();
    loadDepartmentsManage();
    initLibraryRealtime();
    loadNotices();
    loadExams();

    // Logout button
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            window.location.href = 'login.html';
        });
    }

    // Navigation functionality
    navButtons.forEach(button => {
        button.addEventListener('click', () => {
            navButtons.forEach(btn => {
                btn.classList.remove('bg-maroon-dark', 'text-white');
                btn.classList.add('hover:bg-white/10');
            });
            button.classList.add('bg-maroon-dark', 'text-white');
            button.classList.remove('hover:bg-white/10');

            sections.forEach(section => {
                section.classList.add('hidden');
            });

            const targetId = button.id.replace('nav-', '');
            document.getElementById(targetId).classList.remove('hidden');
        });
    });

    // Admission form submission
    if (admissionForm) {
        admissionForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const studentData = {
                fullName: document.getElementById('fullName').value,
                fathersName: document.getElementById('fathersName').value,
                dob: document.getElementById('dob').value,
                course: document.getElementById('course').value,
                email: document.getElementById('email').value,
                phone: document.getElementById('phone').value,
                admissionId: 'SMPRNA-' + Date.now().toString().slice(-4) + '-' + Math.random().toString(36).substr(2, 4).toUpperCase(),
                feesPaid: false,
                hostelAllocated: false,
            };

            try {
                // Corrected line: Use a valid collection reference
                await addDoc(collection(db, 'artifacts', 'smapurna-e9c2b', 'public', 'data', 'students'), studentData);
                alert('Admission submitted successfully! Admission ID: ' + studentData.admissionId);
                admissionForm.reset();
            } catch (error) {
                alert('Error submitting admission: ' + error.message);
            }
        });
    }

    // Fees: List students and fee status
    loadFeesList();

    async function loadFeesList() {
        if (!feesListDiv) return;
        feesListDiv.innerHTML = '';
        try {
            const studentsColRef = collection(db, 'artifacts', 'smapurna-e9c2b', 'public', 'data', 'students');
            const querySnapshot = await getDocs(studentsColRef);

            if (querySnapshot.empty) {
                feesListEmpty?.classList.remove('hidden');
                return;
            }
            feesListEmpty?.classList.add('hidden');

            querySnapshot.forEach((docu) => {
                const s = docu.data();
                const paid = Number(s.totalFeesPaid || 0);
                const due = Math.max(0, Number(s.totalFeesDue || 0) - paid);
                const row = document.createElement('div');
                row.className = 'p-4 border rounded-lg';
                row.innerHTML = `
                    <div class="flex flex-col md:flex-row md:items-center md:justify-between">
                        <div>
                            <p class="font-bold">${s.fullName || s.name || 'Student'} <span class="text-xs text-gray-500">(${s.admissionId || docu.id})</span></p>
                            <p class="text-sm text-gray-600">${s.course || ''}</p>
                        </div>
                        <div class="mt-2 md:mt-0 text-sm">
                            <span class="mr-4">Paid: <span class="font-semibold text-green-600">₹${paid}</span></span>
                            <span>Pending: <span class="font-semibold ${due > 0 ? 'text-red-600' : 'text-green-600'}">₹${due}</span></span>
                        </div>
                    </div>
                `;
                feesListDiv.appendChild(row);
            });
        } catch (err) {
            console.error('Error loading fees list:', err);
            const msg = err?.message || String(err);
            if (/Missing or insufficient permissions/i.test(msg)) {
                feesListDiv.innerHTML = `<p class="text-red-600">Permissions error loading fees list. Ensure your Firestore security rules are deployed to allow reads under <code>artifacts/smapurna-e9c2b/public/data/**</code>, or enable the local emulator by uncommenting <code>window.USE_FIRESTORE_EMULATOR = true</code> in <code>admin-panel.html</code>.</p>`;
            } else {
                feesListDiv.innerHTML = `<p class="text-red-600">Error: ${msg}</p>`;
            }
        }
    }

    // ========= Admissions: Find & Edit =========
    function computePendingUI() {
        try {
            const paidNum = Number((editTotalPaid?.textContent || '0').replace(/[^0-9.]/g, '')) || 0;
            const dueNum = Number(editTotalFeesDue?.value || 0) || 0;
            const pending = Math.max(0, dueNum - paidNum);
            if (editPending) editPending.textContent = `₹ ${pending}`;
        } catch (_) {}
    }

    if (editTotalFeesDue) editTotalFeesDue.addEventListener('input', computePendingUI);

    async function populateEditCard(ref, snap) {
        editCurrentRef = ref;
        const s = snap.data();
        editFullName.value = s.fullName || s.name || '';
        editEmail.value = s.email || '';
        editPhone.value = s.phone || '';
        editCourse.value = s.course || s.department || '';
        editSemester.value = s.class || s.className || s.semester || '';
        editTotalFeesDue.value = Number(s.totalFeesDue || 0);
        const paid = Number(s.totalFeesPaid || 0);
        if (editTotalPaid) editTotalPaid.textContent = `₹ ${paid}`;
        computePendingUI();
        editStudentCard.classList.remove('hidden');
        editSaveMsg.textContent = '';
        quickPayMsg.textContent = '';
    }

    async function searchAndLoadStudent() {
        editSearchMsg.textContent = '';
        editStudentCard.classList.add('hidden');
        try {
            const id = (editSearchId.value || '').trim();
            if (!id) throw new Error('Enter an Admission ID');
            const { ref, snap } = await resolveStudentRefById(id);
            await populateEditCard(ref, snap);
            editSearchMsg.className = 'mt-2 text-sm text-green-600';
            editSearchMsg.textContent = 'Student loaded.';
        } catch (err) {
            editSearchMsg.className = 'mt-2 text-sm text-red-600';
            editSearchMsg.textContent = 'Error: ' + err.message;
        }
    }

    if (editSearchBtn) editSearchBtn.addEventListener('click', searchAndLoadStudent);
    if (editSearchId) editSearchId.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); searchAndLoadStudent(); }});

    if (editSaveBtn) editSaveBtn.addEventListener('click', async () => {
        editSaveMsg.textContent = '';
        try {
            if (!editCurrentRef) throw new Error('Load a student first');
            const payload = {
                fullName: editFullName.value.trim(),
                email: editEmail.value.trim(),
                phone: editPhone.value.trim(),
                course: editCourse.value.trim(),
                // Store semester/class in a flexible way
                semester: editSemester.value.trim(),
                class: editSemester.value.trim(),
                totalFeesDue: Number(editTotalFeesDue.value || 0)
            };
            await updateDoc(editCurrentRef, payload);
            editSaveMsg.className = 'text-sm text-green-600';
            editSaveMsg.textContent = 'Saved changes.';
            // refresh any dependent lists
            loadFeesList();
        } catch (err) {
            editSaveMsg.className = 'text-sm text-red-600';
            editSaveMsg.textContent = 'Error: ' + err.message;
        }
    });

    if (quickPayBtn) quickPayBtn.addEventListener('click', async () => {
        quickPayMsg.textContent = '';
        try {
            if (!editCurrentRef) throw new Error('Load a student first');
            const amount = Number(quickPayAmount.value || 0);
            const mode = quickPayMode.value;
            if (!amount || amount <= 0) throw new Error('Enter a valid amount');
            await updateDoc(editCurrentRef, { totalFeesPaid: increment(amount) });
            await addDoc(collection(editCurrentRef, 'payments'), {
                amount,
                mode,
                createdAt: serverTimestamp(),
                txnId: 'TXN' + Date.now()
            });
            quickPayMsg.className = 'text-sm text-green-600';
            quickPayMsg.textContent = 'Payment recorded.';
            // reload latest values for paid/pending
            const fresh = await getDoc(editCurrentRef);
            await populateEditCard(editCurrentRef, fresh);
            loadFeesList();
        } catch (err) {
            quickPayMsg.className = 'text-sm text-red-600';
            quickPayMsg.textContent = 'Error: ' + err.message;
        }
    });

    // Fees: Record payment
    if (feesUpdateForm) {
        feesUpdateForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            feesActionMsg.textContent = '';
            try {
                const studentId = feesStudentIdInput.value.trim();
                const amount = Number(feesAmountInput.value);
                const mode = feesPaymentMode.value;
                if (!studentId || !amount || amount <= 0) throw new Error('Provide valid student id and amount');

                const { ref: studentRef, snap: studentSnap } = await resolveStudentRefById(studentId);

                // Update aggregates and append a payment record in a subcollection
                await updateDoc(studentRef, {
                    totalFeesPaid: increment(amount)
                });
                await addDoc(collection(studentRef, 'payments'), {
                    amount,
                    mode,
                    createdAt: serverTimestamp(),
                    txnId: 'TXN' + Date.now()
                });

                feesActionMsg.className = 'md:col-span-2 text-sm mt-2 text-green-600';
                feesActionMsg.textContent = 'Payment recorded.';
                loadFeesList();
            } catch (err) {
                const msg = err?.message || String(err);
                feesActionMsg.className = 'md:col-span-2 text-sm mt-2 text-red-600';
                if (/Missing or insufficient permissions/i.test(msg)) {
                    feesActionMsg.textContent = 'Permissions error recording payment. Deploy Firestore rules or enable emulator (see admin-panel.html comment).';
                } else {
                    feesActionMsg.textContent = 'Error: ' + msg;
                }
            }
        });
    }

    // Fees: Generate receipt using last entered values
    if (generateReceiptButton) {
        generateReceiptButton.addEventListener('click', async () => {
            try {
                const studentId = feesStudentIdInput.value.trim();
                const amount = Number(feesAmountInput.value);
                const mode = feesPaymentMode.value;
                if (!studentId || !amount || amount <= 0) throw new Error('Provide valid student id and amount');

                const { snap: studentSnap } = await resolveStudentRefById(studentId);
                const s = studentSnap.data();

                const receiptData = {
                    receiptNo: new Date().getFullYear() + '-' + Date.now().toString().slice(-6),
                    date: new Date().toLocaleDateString(),
                    studentName: s.fullName || s.name || studentId,
                    studentId,
                    courseYear: s.course || '',
                    fees: [{ name: 'Tuition Fee', amount }],
                    paymentMode: mode,
                    transactionId: 'TXN' + Date.now(),
                    remarks: 'Payment received'
                };
                downloadReceipt(receiptData);
            } catch (err) {
                alert('Error: ' + err.message);
            }
        });
    }

    // Hostel section functionality
    if (allocateRoomButton) {
        allocateRoomButton.addEventListener('click', async () => {
            const studentId = hostelStudentInput.value.trim();
            const roomNumber = hostelRoomInput.value.trim();
            if (!studentId || !roomNumber) {
                showNotification('Please enter student ID and room number', 'bg-red-600');
                return;
            }
            try {
                const allocRef = doc(collection(db, 'artifacts', 'smapurna-e9c2b', 'public', 'data', 'hostelAllocations'));
                await setDoc(allocRef, {
                    studentId,
                    roomNumber,
                    allocatedAt: serverTimestamp(),
                    active: true
                });
                showNotification(`Room ${roomNumber} allocated to ${studentId}`, 'bg-green-600');
                hostelStudentInput.value = '';
                hostelRoomInput.value = '';
                loadHostelAllocations();
            } catch (err) {
                showNotification('Error allocating room: ' + err.message, 'bg-red-600');
            }
        });
    }

    // Close modal button
    if (closeDepartmentModalBtn) {
        closeDepartmentModalBtn.addEventListener('click', () => {
            departmentStudentsModal.classList.add('hidden');
        });
    }

    if (refreshHostelAllocations) refreshHostelAllocations.addEventListener('click', loadHostelAllocations);
    if (refreshDepartments) refreshDepartments.addEventListener('click', loadDepartmentsManage);
    if (refreshNotices) refreshNotices.addEventListener('click', loadNotices);
    if (refreshExamsBtn) refreshExamsBtn.addEventListener('click', loadExams);
    if (refreshThreadsBtn) refreshThreadsBtn.addEventListener('click', loadThreads);

    // Library: Create Library Card
    if (createLibraryCardForm) {
        createLibraryCardForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            createLibraryCardMsg.textContent = '';
            try {
                const admissionId = document.getElementById('libAdmissionId').value.trim();
                const studentName = document.getElementById('libStudentName').value.trim();
                const studentClass = document.getElementById('libClass').value.trim();
                const rollNo = document.getElementById('libRollNo').value.trim();

                if (!admissionId) throw new Error('Admission ID required');

                // libraryCards: document id == admissionId for easy lookup
                const cardRef = doc(db, 'artifacts', 'smapurna-e9c2b', 'public', 'data', 'libraryCards', admissionId);
                await setDoc(cardRef, {
                    admissionId,
                    studentName,
                    class: studentClass,
                    rollNo,
                    cardNo: 'LIB-' + admissionId.split('-').slice(-2).join(''),
                    createdAt: serverTimestamp(),
                }, { merge: true });

                createLibraryCardMsg.className = 'mt-3 text-sm text-green-600';
                createLibraryCardMsg.textContent = 'Library card created/updated successfully.';
                createLibraryCardForm.reset();
            } catch (err) {
                createLibraryCardMsg.className = 'mt-3 text-sm text-red-600';
                createLibraryCardMsg.textContent = 'Error: ' + err.message;
            }
        });
    }

    // Library: Add Book
    if (addBookForm) {
        addBookForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            addBookMsg.textContent = '';
            try {
                const title = document.getElementById('bookTitle').value.trim();
                const author = document.getElementById('bookAuthor').value.trim();
                const isbn = document.getElementById('bookIsbn').value.trim();
                const totalCount = Number(document.getElementById('bookTotalCount').value);

                const bookData = {
                    title, author, isbn,
                    totalCount,
                    availableCount: totalCount,
                    createdAt: serverTimestamp(),
                };
                await addDoc(collection(db, 'artifacts', 'smapurna-e9c2b', 'public', 'data', 'books'), bookData);

                addBookMsg.className = 'ml-3 text-sm text-green-600';
                addBookMsg.textContent = 'Book added.';
                addBookForm.reset();
            } catch (err) {
                addBookMsg.className = 'ml-3 text-sm text-red-600';
                addBookMsg.textContent = 'Error: ' + err.message;
            }
        });
    }

    // Library: refresh buttons
    if (refreshCardsList) refreshCardsList.addEventListener('click', loadCardsListOnce);
    if (refreshBooksList) refreshBooksList.addEventListener('click', loadBooksListOnce);
    if (createNoticeForm) {
        createNoticeForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            noticeActionMsg.textContent = '';
            try {
                const title = noticeTitleInput.value.trim();
                const audience = noticeAudienceSelect.value;
                const message = noticeMessageInput.value.trim();
                if (!title || !message) throw new Error('Title and message are required');
                await addDoc(collection(db, 'artifacts', 'smapurna-e9c2b', 'public', 'data', 'notices'), {
                    title,
                    audience, // 'all' | 'hostel' | 'library'
                    message,
                    createdAt: serverTimestamp()
                });
                noticeActionMsg.className = 'text-sm text-green-600';
                noticeActionMsg.textContent = 'Notice published';
                createNoticeForm.reset();
                loadNotices();
            } catch (err) {
                noticeActionMsg.className = 'text-sm text-red-600';
                noticeActionMsg.textContent = 'Error: ' + err.message;
            }
        });
    }

    // Messages: load thread list initially
    loadThreads();

    if (replyForm) {
        replyForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            if (!currentThreadId) { if (replyActionMsg) { replyActionMsg.className = 'text-sm mt-2 text-red-600'; replyActionMsg.textContent = 'Select a thread first.'; } return; }
            try {
                const text = replyInput.value.trim();
                if (!text) return;
                const postsCol = collection(db, 'artifacts', 'smapurna-e9c2b', 'public', 'data', 'messages', currentThreadId, 'posts');
                await addDoc(postsCol, { role: 'admin', text, createdAt: serverTimestamp() });
                replyInput.value = '';
                if (replyActionMsg) { replyActionMsg.className = 'text-sm mt-2 text-green-600'; replyActionMsg.textContent = 'Replied.'; }
            } catch (err) {
                if (replyActionMsg) { replyActionMsg.className = 'text-sm mt-2 text-red-600'; replyActionMsg.textContent = 'Error: ' + err.message; }
            }
        });
    }
    if (createExamForm) {
        createExamForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            if (!examsList) return;
            examActionMsg.textContent = '';
            try {
                const title = document.getElementById('examTitle').value.trim();
                const course = document.getElementById('examCourse').value;
                const dateStr = document.getElementById('examDate').value;
                const timeStr = document.getElementById('examTime').value;
                const description = document.getElementById('examDescription').value.trim();
                if (!title || !dateStr || !timeStr) throw new Error('Title, date and time are required');
                const when = new Date(`${dateStr}T${timeStr}:00`);
                await addDoc(collection(db, 'artifacts', 'smapurna-e9c2b', 'public', 'data', 'exams'), {
                    title,
                    course: course || null, // null means All Departments
                    description: description || null,
                    // Store as Firestore Timestamp-compatible date
                    when: when,
                    date: dateStr,
                    time: timeStr,
                    createdAt: serverTimestamp()
                });
                examActionMsg.className = 'mt-3 text-sm text-green-600';
                examActionMsg.textContent = 'Exam published';
                createExamForm.reset();
                loadExams();
            } catch (err) {
                examActionMsg.className = 'mt-3 text-sm text-red-600';
                examActionMsg.textContent = 'Error: ' + err.message;
            }
        });
    }
});

// Realtime listeners (optional live updates)
function initLibraryRealtime() {
    const cardsCol = collection(db, 'artifacts', 'smapurna-e9c2b', 'public', 'data', 'libraryCards');
    onSnapshot(cardsCol, () => loadCardsListOnce());

    const booksCol = collection(db, 'artifacts', 'smapurna-e9c2b', 'public', 'data', 'books');
    onSnapshot(booksCol, () => loadBooksListOnce());
}

async function loadCardsListOnce() {
    const cardsList = document.getElementById('cardsList');
    const cardsListEmpty = document.getElementById('cardsListEmpty');
    if (!cardsList) return;
    cardsList.innerHTML = '';

    try {
        const cardsSnap = await getDocs(collection(db, 'artifacts', 'smapurna-e9c2b', 'public', 'data', 'libraryCards'));
        if (cardsSnap.empty) {
            cardsListEmpty.classList.remove('hidden');
            return;
        }
        cardsListEmpty.classList.add('hidden');

        // For each card, load issued books (from issuedBooks collection)
        const issuedSnap = await getDocs(collection(db, 'artifacts', 'smapurna-e9c2b', 'public', 'data', 'issuedBooks'));
        const issuedByAdmission = {};
        issuedSnap.forEach(d => {
            const it = d.data();
            if (!issuedByAdmission[it.admissionId]) issuedByAdmission[it.admissionId] = [];
            issuedByAdmission[it.admissionId].push(it);
        });

        cardsSnap.forEach(docu => {
            const card = docu.data();
            const issued = issuedByAdmission[card.admissionId] || [];
            const item = document.createElement('div');
            item.className = 'p-4 border rounded-lg';
            item.innerHTML = `
                <div class="flex flex-col md:flex-row md:items-center md:justify-between">
                    <div>
                        <p class="font-bold">${card.studentName} <span class="text-xs text-gray-500">(${card.admissionId})</span></p>
                        <p class="text-sm">Class: ${card.class} | Roll: ${card.rollNo} | Card: ${card.cardNo}</p>
                    </div>
                    <div class="text-sm mt-2 md:mt-0">
                        Issued books: ${issued.length}
                    </div>
                </div>
                <div class="mt-2 text-sm space-y-1">
                    ${issued.map(i => `<div class="flex justify-between"><span>${i.bookTitle} (${i.bookIsbn})</span><span class="${i.returned ? 'text-green-600' : 'text-orange-600'}">${i.returned ? 'Returned' : 'Issued'}</span></div>`).join('') || '<span class="text-gray-500">No books issued.</span>'}
                </div>
            `;
            cardsList.appendChild(item);
        });
    } catch (err) {
        console.error('Error loading cards:', err);
        cardsList.innerHTML = `<p class="text-red-600">Error: ${err.message}</p>`;
    }
}

async function loadBooksListOnce() {
    const booksList = document.getElementById('booksList');
    const booksListEmpty = document.getElementById('booksListEmpty');
    if (!booksList) return;
    booksList.innerHTML = '';

    try {
        const snap = await getDocs(collection(db, 'artifacts', 'smapurna-e9c2b', 'public', 'data', 'books'));
        if (snap.empty) {
            booksListEmpty.classList.remove('hidden');
            return;
        }
        booksListEmpty.classList.add('hidden');

        snap.forEach(d => {
            const b = d.data();
            const card = document.createElement('div');
            card.className = 'p-4 border rounded-lg';
            card.innerHTML = `
                <p class="font-bold">${b.title}</p>
                <p class="text-sm text-gray-600">${b.author} • ISBN: ${b.isbn}</p>
                <p class="text-sm">Available: <span class="font-semibold">${b.availableCount ?? b.totalCount ?? 0}</span> / ${b.totalCount ?? 0}</p>
            `;
            booksList.appendChild(card);
        });
    } catch (err) {
        console.error('Error loading books:', err);
        booksList.innerHTML = `<p class="text-red-600">Error: ${err.message}</p>`;
    }
}
// Hostel: load allocations and allow deallocate
async function loadHostelAllocations() {
    if (!document.getElementById('hostelAllocationsList')) return;
    const list = document.getElementById('hostelAllocationsList');
    const empty = document.getElementById('hostelAllocationsEmpty');
    list.innerHTML = '';
    try {
        const col = collection(db, 'artifacts', 'smapurna-e9c2b', 'public', 'data', 'hostelAllocations');
        const q1 = query(col, where('active', '==', true));
        const snap = await getDocs(q1);
        if (snap.empty) {
            empty.classList.remove('hidden');
            return;
        }
        empty.classList.add('hidden');
        snap.forEach(d => {
            const a = d.data();
            const row = document.createElement('div');
            row.className = 'p-4 border rounded-lg flex justify-between items-center';
            row.innerHTML = `
                <div>
                    <p class="font-bold">${a.studentId}</p>
                    <p class="text-sm text-gray-600">Room: ${a.roomNumber}</p>
                </div>
                <div>
                    <button data-id="${d.id}" class="deallocBtn px-3 py-1 bg-red-600 text-white rounded-lg">Deallocate</button>
                </div>
            `;
            list.appendChild(row);
        });
        list.querySelectorAll('.deallocBtn').forEach(btn => {
            btn.addEventListener('click', async (ev) => {
                const id = ev.currentTarget.getAttribute('data-id');
                try {
                    await updateDoc(doc(db, 'artifacts', 'smapurna-e9c2b', 'public', 'data', 'hostelAllocations', id), { active: false, deallocatedAt: serverTimestamp() });
                    showNotification('Room deallocated', 'bg-green-600');
                    loadHostelAllocations();
                } catch (err) {
                    showNotification('Error: ' + err.message, 'bg-red-600');
                }
            });
        });
    } catch (err) {
        console.error('Error loading allocations:', err);
        list.innerHTML = `<p class="text-red-600">Error: ${err.message}</p>`;
    }
}

// Departments: list and change HOD
async function loadDepartmentsManage() {
    if (!document.getElementById('departmentsManageList')) return;
    const list = document.getElementById('departmentsManageList');
    const empty = document.getElementById('departmentsManageEmpty');
    list.innerHTML = '';
    try {
        const snap = await getDocs(collection(db, 'artifacts', 'smapurna-e9c2b', 'public', 'data', 'departments'));
        if (snap.empty) {
            empty.classList.remove('hidden');
            return;
        }
        empty.classList.add('hidden');
        snap.forEach(d => {
            const dep = d.data();
            const row = document.createElement('div');
            row.className = 'p-4 border rounded-lg';
            const teachers = (dep.teachers || []).join(', ');
            row.innerHTML = `
                <div class="flex flex-col md:flex-row md:items-center md:justify-between">
                    <div>
                        <p class="font-bold">${dep.name || d.id}</p>
                        <p class="text-sm text-gray-600">HOD: <span class="font-semibold">${dep.hod || 'Not set'}</span></p>
                        <p class="text-sm">Teachers: ${teachers || '—'}</p>
                    </div>
                    <div class="mt-3 md:mt-0 flex items-center space-x-2">
                        <input type="text" placeholder="New HOD name" class="hodInput p-2 border rounded" />
                        <button data-id="${d.id}" class="changeHodBtn px-3 py-2 bg-maroon text-white rounded-lg">Change HOD</button>
                    </div>
                </div>
            `;
            list.appendChild(row);
        });
        list.querySelectorAll('.changeHodBtn').forEach(btn => {
            btn.addEventListener('click', async (ev) => {
                const id = ev.currentTarget.getAttribute('data-id');
                const container = ev.currentTarget.closest('div');
                const input = container.querySelector('.hodInput');
                const newHod = input.value.trim();
                if (!newHod) { showNotification('Enter HOD name', 'bg-red-600'); return; }
                try {
                    await updateDoc(doc(db, 'artifacts', 'smapurna-e9c2b', 'public', 'data', 'departments', id), { hod: newHod });
                    showNotification('HOD updated', 'bg-green-600');
                    loadDepartmentsManage();
                } catch (err) {
                    showNotification('Error: ' + err.message, 'bg-red-600');
                }
            });
        });
    } catch (err) {
        console.error('Error loading departments:', err);
        list.innerHTML = `<p class=\"text-red-600\">Error: ${err.message}</p>`;
    }
}

// Resolve student by doc id or by admissionId field
async function resolveStudentRefById(inputId) {
    const directRef = doc(db, 'artifacts', 'smapurna-e9c2b', 'public', 'data', 'students', inputId);
    const directSnap = await getDoc(directRef);
    if (directSnap.exists()) return { ref: directRef, snap: directSnap };
    const colRef = collection(db, 'artifacts', 'smapurna-e9c2b', 'public', 'data', 'students');
    const qs = await getDocs(query(colRef, where('admissionId', '==', inputId)));
    if (!qs.empty) {
        const first = qs.docs[0];
        return { ref: first.ref, snap: first };
    }
    throw new Error('Student not found');
}

// Notices: list for admin view
async function loadNotices() {
    const list = document.getElementById('noticesList');
    const empty = document.getElementById('noticesEmpty');
    if (!list) return;
    list.innerHTML = '';
    try {
        const snap = await getDocs(collection(db, 'artifacts', 'smapurna-e9c2b', 'public', 'data', 'notices'));
        if (snap.empty) { empty?.classList.remove('hidden'); return; }
        empty?.classList.add('hidden');
        // Render newest first by createdAt if present
        const items = [];
        snap.forEach(d => items.push({ id: d.id, ...d.data() }));
        items.sort((a,b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
        items.forEach(n => {
            const row = document.createElement('div');
            row.className = 'p-4 border rounded-lg';
            const when = n.createdAt ? new Date(n.createdAt.seconds*1000).toLocaleString() : '';
            row.innerHTML = `
                <div class="flex flex-col md:flex-row md:items-center md:justify-between">
                    <div>
                        <p class="font-bold">${n.title}</p>
                        <p class="text-sm text-gray-600">Audience: ${n.audience || 'all'}</p>
                        <p class="mt-1">${n.message}</p>
                    </div>
                    <div class="text-sm text-gray-500 mt-2 md:mt-0">${when}</div>
                </div>
            `;
            list.appendChild(row);
        });
    } catch (err) {
        if (list) list.innerHTML = `<p class="text-red-600">Error: ${err.message}</p>`;
    }
}

// Messages: list all student threads
async function loadThreads() {
    if (!threadsList) return;
    threadsList.innerHTML = '';
    threadsEmpty?.classList.add('hidden');
    try {
        const msgsRoot = collection(db, 'artifacts', 'smapurna-e9c2b', 'public', 'data', 'messages');
        const snap = await getDocs(msgsRoot);
        if (snap.empty) { threadsEmpty?.classList.remove('hidden'); return; }
        const items = [];
        for (const d of snap.docs) {
            const id = d.id; // admissionId as thread id
            const postsCol = collection(d.ref, 'posts');
            const lastSnap = await getDocs(query(postsCol, orderBy('createdAt', 'desc'), limit(1)));
            const last = lastSnap.docs[0]?.data();
            items.push({ id, lastAt: last?.createdAt?.seconds || 0, lastRole: last?.role, lastText: last?.text || '' });
        }
        items.sort((a,b) => (b.lastAt||0) - (a.lastAt||0));
        items.forEach(t => {
            const row = document.createElement('div');
            row.className = 'p-3 border rounded-lg cursor-pointer hover:bg-gray-50';
            const when = t.lastAt ? new Date(t.lastAt*1000).toLocaleString() : '';
            row.innerHTML = `<div class="font-semibold">${t.id}</div><div class="text-xs text-gray-500">${t.lastRole || ''} • ${when}</div><div class="text-sm truncate">${t.lastText}</div>`;
            row.addEventListener('click', () => openThread(t.id));
            threadsList.appendChild(row);
        });
    } catch (err) {
        if (threadsList) threadsList.innerHTML = `<p class="text-red-600">Error: ${err.message}</p>`;
    }
}

function openThread(admissionId) {
    currentThreadId = admissionId;
    if (threadHeader) threadHeader.textContent = `Thread: ${admissionId}`;
    if (typeof unsubscribeThread === 'function') { unsubscribeThread(); unsubscribeThread = null; }
    const postsCol = collection(db, 'artifacts', 'smapurna-e9c2b', 'public', 'data', 'messages', admissionId, 'posts');
    const q1 = query(postsCol, orderBy('createdAt', 'asc'));
    unsubscribeThread = onSnapshot(q1, (snap) => {
        if (!threadMessages) return;
        threadMessages.innerHTML = '';
        snap.forEach(d => {
            const m = d.data();
            const div = document.createElement('div');
            const isAdmin = m.role === 'admin';
            div.className = `p-3 rounded-lg max-w-[85%] ${isAdmin ? 'bg-blue-600 text-white self-end rounded-br-none ml-auto' : 'bg-gray-200 text-gray-800 self-start rounded-bl-none'}`;
            const ts = m.createdAt?.seconds ? new Date(m.createdAt.seconds*1000).toLocaleTimeString() : '';
            div.innerHTML = `<span class="font-semibold">${isAdmin ? 'Admin' : 'Student'}:</span> ${m.text}<div class="text-[10px] opacity-70 mt-1">${ts}</div>`;
            threadMessages.appendChild(div);
        });
        threadMessages.style.display = 'flex';
        threadMessages.style.flexDirection = 'column';
        threadMessages.scrollTop = threadMessages.scrollHeight;
    });
}

// Exams: list and allow delete
async function loadExams() {
    if (!examsList) return;
    examsList.innerHTML = '';
    try {
        const snap = await getDocs(collection(db, 'artifacts', 'smapurna-e9c2b', 'public', 'data', 'exams'));
        if (snap.empty) { examsEmpty?.classList.remove('hidden'); return; }
        examsEmpty?.classList.add('hidden');
        const items = [];
    snap.forEach(d => items.push({ id: d.id, ...d.data() }));
    const active = items.filter(ex => !ex._deleted);
    active.sort((a,b) => (a.when?.seconds || 0) - (b.when?.seconds || 0));
    active.forEach(ex => {
            const row = document.createElement('div');
            row.className = 'p-4 border rounded-lg flex items-start justify-between';
            const when = ex.when?.seconds ? new Date(ex.when.seconds*1000).toLocaleString() : `${ex.date || ''} ${ex.time || ''}`;
            row.innerHTML = `
                <div>
                    <p class="font-bold">${ex.title}</p>
                    <p class="text-sm text-gray-600">${ex.course || 'All Departments'} • ${when}</p>
                    ${ex.description ? `<p class="text-sm mt-1">${ex.description}</p>` : ''}
                </div>
                <div class="ml-4">
                    <button data-id="${ex.id}" class="deleteExamBtn px-3 py-1 bg-red-600 text-white rounded-lg">Delete</button>
                </div>
            `;
            examsList.appendChild(row);
        });
        examsList.querySelectorAll('.deleteExamBtn').forEach(btn => {
            btn.addEventListener('click', async (ev) => {
                const id = ev.currentTarget.getAttribute('data-id');
                try {
                    await updateDoc(doc(db, 'artifacts', 'smapurna-e9c2b', 'public', 'data', 'exams', id), { _deleted: true });
                    // Soft delete: or use deleteDoc if you prefer hard delete
                    loadExams();
                } catch (err) {
                    showNotification('Error: ' + err.message, 'bg-red-600');
                }
            });
        });
    } catch (err) {
        examsList.innerHTML = `<p class="text-red-600">Error: ${err.message}</p>`;
    }
}
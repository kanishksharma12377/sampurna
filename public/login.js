// No Firebase logic needed for simple login panel

document.addEventListener('DOMContentLoaded', () => {
    const roleSelect = document.getElementById('role');
    const adminFields = document.getElementById('adminFields');
    const studentFields = document.getElementById('studentFields');
    const loginForm = document.getElementById('loginForm');
    const loginError = document.getElementById('loginError');

    const hardcodedAdmin = {
        username: "admin",
        password: "admin"
    };

    roleSelect.addEventListener('change', () => {
        const role = roleSelect.value;
        if (role === 'admin') {
            adminFields.classList.remove('hidden');
            studentFields.classList.add('hidden');
        } else if (role === 'student') {
            adminFields.classList.add('hidden');
            studentFields.classList.remove('hidden');
        } else {
            adminFields.classList.add('hidden');
            studentFields.classList.add('hidden');
        }
        loginError.classList.add('hidden');
    });

    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        loginError.classList.add('hidden');
        const role = roleSelect.value;

        if (role === 'admin') {
            const username = document.getElementById('adminUsername').value.trim();
            const password = document.getElementById('adminPassword').value.trim();
            if (username === hardcodedAdmin.username && password === hardcodedAdmin.password) {
                window.location.href = 'admin-panel.html';
            } else {
                loginError.textContent = 'Invalid admin credentials.';
                loginError.classList.remove('hidden');
            }
        } else if (role === 'student') {
            // No admission ID at login; go to student panel and let student enter ID there (or later via Firebase Auth)
            window.location.href = 'student-panel.html';
        } else {
            loginError.textContent = 'Please select a role.';
            loginError.classList.remove('hidden');
        }
    });
});
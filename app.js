// --- Core State Management (LocalStorage Engine) ---
// Make sure pact and pactDate are inside your data object!
// ==========================================
// 1. CLOUD SERVER INITIALIZATION
// ==========================================
const firebaseConfig = {
    apiKey: "AIzaSyB8p-GP8zel-nqOyG1T8b4h1_f7gFv4eEw",
    authDomain: "danfor-elite-bf4bc.firebaseapp.com",
    projectId: "danfor-elite-bf4bc",
    storageBucket: "danfor-elite-bf4bc.firebasestorage.app",
    messagingSenderId: "619813529099",
    appId: "1:619813529099:web:e8d0438505c85fb2d1c90e"
};

// Turn on the Firebase Engine
firebase.initializeApp(firebaseConfig);

// Turn on the Cloud Database (Firestore)
const db = firebase.firestore();

// ==========================================
// 2. AUTHENTICATION & SECURITY VAULT
// ==========================================
const auth = firebase.auth();

// Target the HTML Elements
const loginScreen = document.getElementById('login-screen');
const emailInput = document.getElementById('auth-email');
const passwordInput = document.getElementById('auth-password');
const btnLogin = document.getElementById('btn-login');
const btnSignup = document.getElementById('btn-signup');
const authError = document.getElementById('auth-error');

// --- THE BOUNCER (Listens for login/logout) ---
auth.onAuthStateChanged(user => {
    if (user) {
        // A user is logged in
        loginScreen.style.display = 'none'; // Hide login screen
        console.log("Welcome back, Elite.");
        
        // --- THE MASTER ENGINE STARTUP ---
        startMasterEngine(); 
        enforceDiscipline();
        loadReports();
        syncChartWithVault();
        
        // --- LOGOUT LOGIC ---
        const logoutBtn = document.getElementById('logout-btn');
        if (logoutBtn) {
            logoutBtn.onclick = () => {
                auth.signOut().then(() => {
                    window.location.reload(); 
                });
            };
        }
    } else {
        // No user is logged in
        loginScreen.style.display = 'flex'; // Show login screen
    }
});

// --- PORTAL NAVIGATION (Switching between Student and Mentor views) ---
function switchView(target) {
    const roles = document.getElementById('view-role-selection');
    const student = document.getElementById('view-student-login');
    const mentor = document.getElementById('view-mentor-login');

    if (!roles || !student || !mentor) return;

    // Reset everything to hidden
    roles.style.display = 'none';
    student.style.display = 'none';
    mentor.style.display = 'none';

    // Show the target view
    if (target === 'roles') roles.style.display = 'block';
    if (target === 'student') student.style.display = 'block';
    if (target === 'mentor') mentor.style.display = 'block';
}

// --- SIGN UP LOGIC ---
btnSignup.addEventListener('click', () => {
    const email = emailInput.value;
    const password = passwordInput.value;

    auth.createUserWithEmailAndPassword(email, password)
        .then((userCredential) => {
            console.log("Account Created!");
        })
        .catch((error) => {
            authError.style.display = 'block';
            authError.innerText = error.message;
        });
});

// --- LOGIN LOGIC ---
btnLogin.addEventListener('click', () => {
    const email = emailInput.value;
    const password = passwordInput.value;

    auth.signInWithEmailAndPassword(email, password)
        .catch((error) => {
            authError.style.display = 'block';
            authError.innerText = "Access Denied: Invalid email or password.";
        });
});

// --- MENTOR LOGIN LOGIC (Connecting to a student) ---
function connectToStudent() {
    const studentId = document.getElementById('target-student-id').value.trim();
    if (!studentId || studentId.length < 20) {
        alert("âŒ Invalid Student ID. Please paste a full ID string.");
        return;
    }

    console.log("ðŸ›°ï¸ Attempting to link with Student ID:", studentId);

    // Check if the student exists in the database
    db.collection("users").doc(studentId).collection("reports").limit(1).get()
    .then(snapshot => {
        if (snapshot.empty) {
            alert("âŒ No student found with that ID in the database.");
            return;
        }

        // Student exists! Hide login screen and start Mentor mode
        loginScreen.style.display = 'none';
        startPartnerEngine(studentId);
    })
    .catch(error => {
        console.error("Connection Error:", error);
        alert("âš ï¸ Connection Failed. Please try again.");
    });
}

// ==========================================
// 3. THE MENTOR MONITORING ENGINE
// ==========================================
function startPartnerEngine(studentId) {
    console.log("ðŸ”’ Entering Mentor View for Student:", studentId);

    // 1. Hide Student-only UI elements
    const style = document.createElement('style');
    style.innerHTML = `
        .task-input-group, .delete-btn, button[onclick*="delete"], 
        #save-pact-btn, #add-course-btn, #add-mistake-btn {
            display: none !important;
        }
    `;
    document.head.appendChild(style);

    // 2. Fetch Student Data Live (Real-time updates)
    db.collection("users").doc(studentId).collection("tasks")
    .onSnapshot((snapshot) => {
        let tasks = [];
        snapshot.forEach(doc => tasks.push({ id: doc.id, ...doc.data() }));
        
        AppState.data.tasks = tasks;
        TaskEngine.renderTasks();
        UI.updateDashboard();
        console.log("ðŸ“¡ Remote Tasks Updated.");
    });

    // 3. Sync the Performance Chart
    syncPartnerChart(studentId);
}

// --- PARTNER CHART SYNC ---
async function syncPartnerChart(studentId) {
    try {
        const snapshot = await db.collection("users").doc(studentId).collection("reports").get();
        
        let weeklyScores = [0, 0, 0, 0, 0, 0, 0];
        const now = new Date();
        const mostRecentSunday = new Date(now.setDate(now.getDate() - now.getDay()));
        mostRecentSunday.setHours(0, 0, 0, 0);

        snapshot.forEach(doc => {
            const report = doc.data();
            const reportDate = report.timestamp.toDate();
            
            if (reportDate.getTime() >= mostRecentSunday.getTime()) {
                const dayNum = reportDate.getDay(); 
                let finalScore = report.score || 0;
                weeklyScores[dayNum] = finalScore; 
            }
        });

        window.myChart.data.datasets[0].data = weeklyScores;
        window.myChart.update();
        console.log("ðŸ“Š Mentor Chart matches Student Chart.");
    } catch (error) {
        console.error("Mentor Sync Error:", error);
    }
}

// ==========================================
// 4. CORE APPLICATION LOGIC
// ==========================================
const AppState = {
    data: {
        theme: 'dark-theme',
        tasks: [],
        mistakes: [],
        courses: [],
        streak: 0,
        lastLogin: new Date().toDateString(),
        pact: "",
        pactDate: "",
        weeklyScores: [0, 0, 0, 0, 0, 0, 0]
    },
    init() {
        const saved = localStorage.getItem('danforEliteData');
        if (saved) this.data = { ...this.data, ...JSON.parse(saved) };
        this.checkStreak();
        this.save();
    },
    save() {
        localStorage.setItem('danforEliteData', JSON.stringify(this.data));
    },
    checkStreak() {
        const today = new Date();
        const lastLoginDate = this.data.lastLogin ? new Date(this.data.lastLogin) : new Date();
        today.setHours(0, 0, 0, 0);
        lastLoginDate.setHours(0, 0, 0, 0);
        const diffDays = Math.ceil((today.getTime() - lastLoginDate.getTime()) / (1000 * 60 * 60 * 24));

        if (diffDays === 1) this.data.streak += 1;
        else if (diffDays > 1) this.data.streak = 1;
        
        if (diffDays >= 1) this.data.tasks = this.data.tasks.filter(t => !t.completed);
        this.data.lastLogin = new Date().toDateString();
    }
};

const TaskEngine = {
    init() {
        const addBtn = document.getElementById('add-task-btn');
        if (addBtn) addBtn.onclick = () => this.addTask();
        this.renderTasks();
    },
    async addTask() {
        const input = document.getElementById('new-task-input');
        const priority = document.getElementById('task-priority').value;
        const text = input.value.trim();
        const user = auth.currentUser;
        if (!text || !user) return;

        const docRef = await db.collection("users").doc(user.uid).collection("tasks").add({
            text, priority, completed: false, createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        AppState.data.tasks.push({ id: docRef.id, text, priority, completed: false });
        AppState.save();
        input.value = '';
        this.renderTasks();
        UI.updateDashboard();
    },
    renderTasks() {
        const list = document.getElementById('task-list');
        if (!list) return;
        list.innerHTML = '';
        AppState.data.tasks.forEach(task => {
            const li = document.createElement('li');
            li.className = `task-item glass ${task.completed ? 'completed' : ''}`;
            li.innerHTML = `<div class="task-content"><span>${task.text}</span></div>`;
            list.appendChild(li);
        });
    }
};

const UI = {
    init() {
        this.updateDashboard();
        this.initChart();
    },
    updateDashboard() {
        const streakEl = document.getElementById('streak-count');
        if (streakEl) streakEl.textContent = `${AppState.data.streak} Days`;
    },
    initChart() {
        const ctx = document.getElementById('performanceChart');
        if (!ctx) return;
        if (window.myChart) window.myChart.destroy();
        window.myChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
                datasets: [{
                    label: 'Productivity',
                    data: AppState.data.weeklyScores,
                    borderColor: '#d4af37',
                    fill: true,
                    tension: 0.4
                }]
            },
            options: { responsive: true, scales: { y: { beginAtZero: true, max: 100 } } }
        });
    }
};

// ==========================================
// 5. MASTER SYNC & BOOTSTRAP
// ==========================================
async function startMasterEngine() {
    const user = auth.currentUser;
    if (!user) return;
    
    // Fetch live tasks from cloud
    const snapshot = await db.collection("users").doc(user.uid).collection("tasks").get();
    let cloudTasks = [];
    snapshot.forEach(doc => cloudTasks.push({ id: doc.id, ...doc.data() }));
    AppState.data.tasks = cloudTasks;

    AppState.init();
    UI.init();
    TaskEngine.init();
}

function enforceDiscipline() {
    const hour = new Date().getHours();
    const greet = document.getElementById('ai-greeting');
    const msg = document.getElementById('ai-message');
    if (hour >= 20) {
        if (greet) greet.textContent = "Audit Time.";
        if (msg) msg.textContent = "The day is ending. Show your work.";
    }
}

// These are required by your code but can be empty shells if not used yet
function loadReports() { console.log("Reports Engine Online."); }
function syncChartWithVault() { console.log("Vault Synchronization Active."); }

// Ensure Global Logout Fix works
const globalLogoutBtn = document.getElementById('logout-btn');
if (globalLogoutBtn) {
    globalLogoutBtn.onclick = () => {
        if (auth.currentUser) {
            auth.signOut().then(() => window.location.reload());
        } else {
            window.location.reload(); 
        }
    };
}

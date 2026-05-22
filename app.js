// ==========================================
// 1. CLOUD SERVER INITIALIZATION (NEW CONFIG)
// ==========================================
const firebaseConfig = {
  apiKey: "AIzaSyD8yWK25-qmt7AYCVayDT4kwAbhOOLrB5Y",
  authDomain: "danfor-elite-new.firebaseapp.com",
  projectId: "danfor-elite-new",
  storageBucket: "danfor-elite-new.firebasestorage.app",
  messagingSenderId: "980776452489",
  appId: "1:980776452489:web:17f193945741c588d6e158",
  measurementId: "G-V97C73NQ04"
};

// Start Engines
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();

// ==========================================
// 2. AUTHENTICATION & SECURITY VAULT
// ==========================================
const loginScreen = document.getElementById('login-screen');
const emailInput = document.getElementById('auth-email');
const passwordInput = document.getElementById('auth-password');
const btnLogin = document.getElementById('btn-login');
const btnSignup = document.getElementById('btn-signup');
const authError = document.getElementById('auth-error');

// --- THE BOUNCER ---
auth.onAuthStateChanged(user => {
    if (user) {
        loginScreen.style.display = 'none';
        console.log("Securely logged in as:", user.email); 
        startMasterEngine();
        enforceDiscipline();
        loadReports();
        syncChartWithVault(); 
        
        const logoutBtn = document.getElementById('logout-btn');
        if (logoutBtn) {
            logoutBtn.onclick = () => {
                auth.signOut().then(() => {
                    console.log("ðŸš€ Securely logged out.");
                    window.location.reload(); 
                });
            };
        }
    } else {
        loginScreen.style.display = 'flex';
    }
});

// --- NAVIGATION & VIEWS ---
function switchView(target) {
    const roles = document.getElementById('view-role-selection');
    const student = document.getElementById('view-student-login');
    const mentor = document.getElementById('view-mentor-login');
    if (!roles || !student || !mentor) return;
    roles.style.display = 'none';
    student.style.display = 'none';
    mentor.style.display = 'none';
    if (target === 'roles') roles.style.display = 'block';
    if (target === 'student') student.style.display = 'block';
    if (target === 'mentor') mentor.style.display = 'block';
}

// Signup/Login Actions
btnSignup.onclick = () => {
    auth.createUserWithEmailAndPassword(emailInput.value, passwordInput.value)
        .catch(error => { authError.style.display = 'block'; authError.innerText = error.message; });
};
btnLogin.onclick = () => {
    auth.signInWithEmailAndPassword(emailInput.value, passwordInput.value)
        .catch(() => { authError.style.display = 'block'; authError.innerText = "Access Denied: Invalid email or password."; });
};

// ==========================================
// 3. CORE STATE MANAGEMENT
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
        if (saved) { this.data = { ...this.data, ...JSON.parse(saved) }; }
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
        
        if (diffDays >= 1) {
            this.data.tasks = this.data.tasks.filter(t => !t.completed);
        }
        this.data.lastLogin = new Date().toDateString();
    }
};

// ==========================================
// 4. THE UI ENGINE
// ==========================================
const UI = {
    init() {
        this.bindNav();
        this.bindThemeToggle();
        this.applyTheme(AppState.data.theme);
        this.updateDashboard();
        this.initChart();
    },
    bindNav() {
        const links = document.querySelectorAll('.nav-links li');
        const sections = document.querySelectorAll('.view-section');
        links.forEach(link => {
            link.onclick = () => {
                links.forEach(l => l.classList.remove('active'));
                sections.forEach(s => { s.classList.remove('active', 'animate-fade-in'); s.classList.add('hidden'); });
                link.classList.add('active');
                const target = document.getElementById(link.getAttribute('data-target'));
                target.classList.remove('hidden');
                void target.offsetWidth; 
                target.classList.add('active', 'animate-fade-in');
            };
        });
    },
    bindThemeToggle() {
        document.querySelectorAll('#theme-toggle').forEach(btn => {
            btn.onclick = () => {
                AppState.data.theme = AppState.data.theme === 'dark-theme' ? 'light-theme' : 'dark-theme';
                AppState.save();
                this.applyTheme(AppState.data.theme);
            };
        });
    },
    applyTheme(theme) { document.body.className = theme; },
    updateDashboard() {
        document.getElementById('streak-count').textContent = `${AppState.data.streak} Days`;
        document.getElementById('tasks-completed').textContent = AppState.data.tasks.filter(t => t.completed).length;
        if (typeof AnalyticsEngine !== 'undefined') AnalyticsEngine.updateDashboardStats();
    },
    initChart() {
        const ctx = document.getElementById('performanceChart').getContext('2d');
        if(window.myChart) window.myChart.destroy();
        window.myChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'], 
                datasets: [{
                    label: 'Productivity Score',
                    data: AppState.data.weeklyScores,
                    borderColor: '#d4af37',
                    backgroundColor: 'rgba(212, 175, 55, 0.1)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4
                }]
            },
            options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true, max: 100 } }, plugins: { legend: { display: false } } }
        });
    }
};

// ==========================================
// 5. TASK & ANALYTICS ENGINES
// ==========================================
const TaskEngine = {
    init() { this.bindEvents(); this.renderTasks(); },
    bindEvents() {
        const addBtn = document.getElementById('add-task-btn');
        if(addBtn) addBtn.onclick = () => this.addTask();
    },
    async addTask() {
        const input = document.getElementById('new-task-input');
        const priority = document.getElementById('task-priority').value;
        const text = input.value.trim();
        const user = auth.currentUser;
        if (!text || !user) return;

        const docRef = await db.collection("users").doc(user.uid).collection("tasks").add({
            text: text, priority: priority, completed: false, createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        AppState.data.tasks.push({ id: docRef.id, text, priority, completed: false });
        AppState.save();
        input.value = '';
        this.renderTasks();
        UI.updateDashboard();
    },
    async toggleComplete(id) {
        const user = auth.currentUser;
        const task = AppState.data.tasks.find(t => String(t.id) === String(id));
        if (user && task) {
            task.completed = !task.completed;
            await db.collection("users").doc(user.uid).collection("tasks").doc(String(id)).update({ completed: task.completed });
            AppState.save();
            this.renderTasks();
            UI.updateDashboard();
        }
    },
    async deleteTask(id) {
        const user = auth.currentUser;
        if (user) {
            await db.collection("users").doc(user.uid).collection("tasks").doc(String(id)).delete();
            AppState.data.tasks = AppState.data.tasks.filter(t => String(t.id) !== String(id));
            AppState.save();
            this.renderTasks();
            UI.updateDashboard();
        }
    },
    renderTasks() {
        const list = document.getElementById('task-list');
        list.innerHTML = '';
        if (AppState.data.tasks.length === 0) {
            list.innerHTML = '<li class="empty-state">No active tasks.</li>';
            return;
        }
        AppState.data.tasks.forEach(task => {
            const li = document.createElement('li');
            li.className = `task-item glass ${task.completed ? 'completed' : ''}`;
            li.innerHTML = `
                <div class="task-content">
                    <span class="task-text">${task.text}</span>
                </div>
                <div class="task-actions">
                    <button class="icon-btn" onclick="TaskEngine.toggleComplete('${task.id}')"><i class="fas fa-check"></i></button>
                    <button class="icon-btn" onclick="TaskEngine.deleteTask('${task.id}')"><i class="fas fa-trash"></i></button>
                </div>`;
            list.appendChild(li);
        });
    }
};

const AnalyticsEngine = {
    calculateScore() {
        const tasks = AppState.data.tasks;
        if (tasks.length === 0) return 0;
        let total = 0, earned = 0;
        const weights = { high: 3, medium: 2, low: 1 };
        tasks.forEach(t => { 
            total += weights[t.priority]; 
            if (t.completed) earned += weights[t.priority]; 
        });
        return Math.round((earned / total) * 100);
    },
    updateDashboardStats() {
        const score = this.calculateScore();
        if (document.getElementById('ai-score')) document.getElementById('ai-score').textContent = `${score}%`;
        AppState.data.weeklyScores[new Date().getDay()] = score;
        AppState.save();
        if (window.myChart) {
            window.myChart.data.datasets[0].data = AppState.data.weeklyScores;
            window.myChart.update();
        }
    }
};

// ==========================================
// 6. SPECIAL TOOLS (GPA, MISTAKES, PDF, PACT)
// ==========================================
const MistakeEngine = {
    init() {
        const btn = document.getElementById('add-mistake-btn');
        if(btn) btn.onclick = () => this.addMistake();
        this.renderMistakes();
    },
    addMistake() {
        const input = document.getElementById('new-mistake-input');
        if (!input.value.trim()) return;
        AppState.data.mistakes.push({ id: Date.now().toString(), text: input.value, date: new Date().toLocaleDateString() });
        AppState.save();
        input.value = '';
        this.renderMistakes();
    },
    renderMistakes() {
        const list = document.getElementById('mistake-list');
        list.innerHTML = AppState.data.mistakes.length === 0 ? '<div class="empty-state">No mistakes logged.</div>' : '';
        [...AppState.data.mistakes].reverse().forEach(m => {
            const div = document.createElement('div');
            div.className = 'mistake-item glass mt-1';
            div.innerHTML = `<small>${m.date}</small><p>${m.text}</p>`;
            list.appendChild(div);
        });
    }
};

const GPAEngine = {
    init() {
        const btn = document.getElementById('add-course-btn');
        if(btn) btn.onclick = () => this.addCourseRow();
    },
    addCourseRow() {
        const row = document.createElement('div');
        row.className = 'course-row mt-1';
        row.innerHTML = `
            <input type="text" class="course-name" placeholder="Code">
            <input type="number" class="course-units" placeholder="Units" onchange="GPAEngine.calculateGPA()">
            <select class="course-grade" onchange="GPAEngine.calculateGPA()">
                <option value="5">A</option><option value="4">B</option><option value="3">C</option>
                <option value="2">D</option><option value="1">E</option><option value="0">F</option>
            </select>`;
        document.getElementById('course-inputs').appendChild(row);
    },
    calculateGPA() {
        let totalU = 0, totalP = 0;
        document.querySelectorAll('.course-row').forEach(row => {
            const u = parseInt(row.querySelector('.course-units').value) || 0;
            const g = parseInt(row.querySelector('.course-grade').value) || 0;
            totalU += u; totalP += (u * g);
        });
        document.getElementById('cgpa-result').textContent = totalU ? (totalP / totalU).toFixed(2) : "0.00";
    }
};

const AccountabilityEngine = {
    init() {
        const saveBtn = document.getElementById('save-pact-btn');
        if (saveBtn) saveBtn.onclick = () => {
            AppState.data.pact = document.getElementById('daily-pact-input').value;
            AppState.data.pactDate = new Date().toDateString();
            AppState.save();
            alert("Consequence Locked!");
        };
        const whatsappBtn = document.getElementById('whatsapp-share-btn');
        if (whatsappBtn) whatsappBtn.onclick = () => {
            const msg = `*DanFor Elite Proof of Work*\nStreak: ${AppState.data.streak}\nScore: ${AnalyticsEngine.calculateScore()}%`;
            window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
        };
    }
};

const ExportEngine = {
    init() {
        const btn = document.getElementById('export-btn');
        if (btn) btn.onclick = () => {
            const doc = new window.jspdf.jsPDF();
            doc.text("DanFor Elite - Performance Report", 20, 20);
            doc.text(`Streak: ${AppState.data.streak} Days`, 20, 30);
            doc.save("DanFor_Report.pdf");
        };
    }
};

// ==========================================
// 7. MASTER ENGINE (JANITOR & CLOUD SYNC)
// ==========================================
async function startMasterEngine() {
    const user = auth.currentUser;
    if (!user) return;
    const snapshot = await db.collection("users").doc(user.uid).collection("tasks").get();
    let tasks = [];
    snapshot.forEach(doc => { tasks.push({ id: doc.id, ...doc.data() }); });
    AppState.data.tasks = tasks;
    AppState.init();
    UI.init();
    TaskEngine.init();
    MistakeEngine.init();
    GPAEngine.init();
    AccountabilityEngine.init();
    ExportEngine.init();
}

function enforceDiscipline() {
    const hour = new Date().getHours();
    const score = AnalyticsEngine.calculateScore();
    const greet = document.getElementById('ai-greeting');
    const msg = document.getElementById('ai-message');
    if (!greet || !msg) return;
    if (hour >= 18 && score < 50) {
        greet.textContent = "Wake Up.";
        msg.textContent = "The day is ending and your progress is pathetic.";
        document.body.classList.add('tough-love-mode');
    }
}

// Start everything when Page Loads
document.addEventListener('DOMContentLoaded', () => {
    // Initial check for non-auth screens
    if (!auth.currentUser) loginScreen.style.display = 'flex';
});

console.log("🔥 Full Elite System Online.");

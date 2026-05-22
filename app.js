// ==========================================
// 1. NEW CLOUD CONFIGURATION (OPTION A)
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

// Initialize Engines
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();

// ==========================================
// 2. AUTHENTICATION & UI ELEMENTS
// ==========================================
const loginScreen = document.getElementById('login-screen');
const emailInput = document.getElementById('auth-email');
const passwordInput = document.getElementById('auth-password');
const btnLogin = document.getElementById('btn-login');
const btnSignup = document.getElementById('btn-signup');
const authError = document.getElementById('auth-error');

// THE BOUNCER: Security Check
auth.onAuthStateChanged(user => {
    if (user) {
        loginScreen.style.display = 'none';
        console.log("Logged in as:", user.email);
        
        // Start all systems
        startMasterEngine(); 
        AppState.init();
        UI.init();
        TaskEngine.init();
        MistakeEngine.init();
        GPAEngine.init();
        AccountabilityEngine.init();
        ExportEngine.init();
    } else {
        loginScreen.style.display = 'flex';
    }
});

// Login/Signup Logic
btnSignup.onclick = () => {
    auth.createUserWithEmailAndPassword(emailInput.value, passwordInput.value)
        .catch(err => { authError.innerText = err.message; authError.style.display='block'; });
};
btnLogin.onclick = () => {
    auth.signInWithEmailAndPassword(emailInput.value, passwordInput.value)
        .catch(err => { authError.innerText = "Invalid Login Details"; authError.style.display='block'; });
};

// ==========================================
// 3. CORE STATE & LOCAL STORAGE
// ==========================================
const AppState = {
    data: {
        theme: 'dark-theme',
        tasks: [],
        mistakes: [],
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
    },
    save() {
        localStorage.setItem('danforEliteData', JSON.stringify(this.data));
        if (typeof AnalyticsEngine !== 'undefined') AnalyticsEngine.updateDashboardStats();
    },
    checkStreak() {
        const today = new Date().toDateString();
        if (this.data.lastLogin !== today) {
            // Logic for streak and midnight reset
            this.data.tasks = this.data.tasks.filter(t => !t.completed);
            this.data.lastLogin = today;
            this.save();
        }
    }
};

// ==========================================
// 4. TASK MANAGEMENT ENGINE (CLOUD SYNC)
// ==========================================
const TaskEngine = {
    init() {
        const addBtn = document.getElementById('add-task-btn');
        if(addBtn) addBtn.onclick = () => this.addTask();
        this.renderTasks();
    },
    async addTask() {
        const input = document.getElementById('new-task-input');
        const priority = document.getElementById('task-priority').value;
        const text = input.value.trim();
        const user = auth.currentUser;

        if (!text || !user) return;

        try {
            const docRef = await db.collection("users").doc(user.uid).collection("tasks").add({
                text: text,
                priority: priority,
                completed: false,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });

            AppState.data.tasks.push({ id: docRef.id, text, priority, completed: false });
            AppState.save();
            input.value = '';
            this.renderTasks();
            UI.updateDashboard();
        } catch (e) { console.error("Save failed", e); }
    },
    async toggleComplete(id) {
        const user = auth.currentUser;
        const task = AppState.data.tasks.find(t => t.id === id);
        if (!user || !task) return;

        task.completed = !task.completed;
        await db.collection("users").doc(user.uid).collection("tasks").doc(id).update({
            completed: task.completed
        });
        AppState.save();
        this.renderTasks();
        UI.updateDashboard();
    },
    async deleteTask(id) {
        const user = auth.currentUser;
        if (!user) return;
        await db.collection("users").doc(user.uid).collection("tasks").doc(id).delete();
        AppState.data.tasks = AppState.data.tasks.filter(t => t.id !== id);
        AppState.save();
        this.renderTasks();
        UI.updateDashboard();
    },
    renderTasks() {
        const list = document.getElementById('task-list');
        list.innerHTML = '';
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

// ==========================================
// 5. ANALYTICS & GPA & OTHER ENGINES
// ==========================================
const AnalyticsEngine = {
    calculateScore() {
        const tasks = AppState.data.tasks;
        if (tasks.length === 0) return 0;
        const done = tasks.filter(t => t.completed).length;
        return Math.round((done / tasks.length) * 100);
    },
    updateDashboardStats() {
        const score = this.calculateScore();
        const scoreEl = document.getElementById('ai-score');
        if (scoreEl) scoreEl.textContent = `${score}%`;
        
        let dayNum = new Date().getDay();
        AppState.data.weeklyScores[dayNum] = score;
        
        if (window.myChart) {
            window.myChart.data.datasets[0].data = AppState.data.weeklyScores;
            window.myChart.update();
        }
    }
};

const UI = {
    init() {
        this.initChart();
        this.updateDashboard();
        // Theme toggle logic
        document.querySelectorAll('#theme-toggle').forEach(btn => {
            btn.onclick = () => {
                AppState.data.theme = AppState.data.theme === 'dark-theme' ? 'light-theme' : 'dark-theme';
                document.body.className = AppState.data.theme;
                AppState.save();
            };
        });
    },
    initChart() {
        const ctx = document.getElementById('performanceChart');
        if (!ctx) return;
        window.myChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
                datasets: [{
                    label: 'Score',
                    data: AppState.data.weeklyScores,
                    borderColor: '#d4af37',
                    tension: 0.4
                }]
            },
            options: { responsive: true, scales: { y: { beginAtZero: true, max: 100 } } }
        });
    },
    updateDashboard() {
        document.getElementById('streak-count').textContent = `${AppState.data.streak} Days`;
        document.getElementById('tasks-completed').textContent = AppState.data.tasks.filter(t => t.completed).length;
        AnalyticsEngine.updateDashboardStats();
    }
};

// --- MISTAKE LOG ---
const MistakeEngine = {
    init() {
        const btn = document.getElementById('add-mistake-btn');
        if(btn) btn.onclick = () => this.addMistake();
        this.renderMistakes();
    },
    addMistake() {
        const input = document.getElementById('new-mistake-input');
        if (!input.value.trim()) return;
        AppState.data.mistakes.push({ id: Date.now(), text: input.value, date: new Date().toLocaleDateString() });
        input.value = '';
        AppState.save();
        this.renderMistakes();
    },
    renderMistakes() {
        const list = document.getElementById('mistake-list');
        if(!list) return;
        list.innerHTML = AppState.data.mistakes.map(m => `
            <div class="mistake-item glass mt-1">
                <small>${m.date}</small>
                <p>${m.text}</p>
            </div>
        `).join('');
    }
};

// --- GPA CALCULATOR ---
const GPAEngine = {
    init() {
        const btn = document.getElementById('add-course-btn');
        if(btn) btn.onclick = () => this.addCourseRow();
    },
    addCourseRow() {
        const container = document.getElementById('course-inputs');
        const div = document.createElement('div');
        div.className = 'course-row mt-1';
        div.innerHTML = `
            <input type="text" placeholder="Course" class="course-name">
            <input type="number" placeholder="Units" class="course-units" onchange="GPAEngine.calculateGPA()">
            <select class="course-grade" onchange="GPAEngine.calculateGPA()">
                <option value="5">A</option><option value="4">B</option><option value="3">C</option>
                <option value="2">D</option><option value="1">E</option><option value="0">F</option>
            </select>`;
        container.appendChild(div);
    },
    calculateGPA() {
        let units = document.querySelectorAll('.course-units');
        let grades = document.querySelectorAll('.course-grade');
        let totalU = 0, totalP = 0;
        units.forEach((u, i) => {
            let val = parseInt(u.value) || 0;
            totalU += val;
            totalP += (val * parseInt(grades[i].value));
        });
        const res = totalU ? (totalP / totalU).toFixed(2) : "0.00";
        document.getElementById('cgpa-result').textContent = res;
    }
};

// --- ACCOUNTABILITY PACT ---
const AccountabilityEngine = {
    init() {
        const btn = document.getElementById('save-pact-btn');
        if(btn) btn.onclick = () => {
            AppState.data.pact = document.getElementById('daily-pact-input').value;
            AppState.data.pactDate = new Date().toDateString();
            AppState.save();
            alert("Consequence Locked!");
        };
    }
};

// --- EXPORT PDF ---
const ExportEngine = {
    init() {
        const btn = document.getElementById('export-btn');
        if(btn) btn.onclick = () => {
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF();
            doc.text("DanFor Elite Performance Report", 10, 10);
            doc.text(`Streak: ${AppState.data.streak} Days`, 10, 20);
            doc.save("Report.pdf");
        };
    }
};

// MASTER SYNC: Pulls tasks from cloud on start
async function startMasterEngine() {
    const user = auth.currentUser;
    const snapshot = await db.collection("users").doc(user.uid).collection("tasks").get();
    let cloudTasks = [];
    snapshot.forEach(doc => {
        cloudTasks.push({ id: doc.id, ...doc.data() });
    });
    AppState.data.tasks = cloudTasks;
    TaskEngine.renderTasks();
    UI.updateDashboard();
}

console.log("ðŸ”¥ All Elite Systems Operational!");

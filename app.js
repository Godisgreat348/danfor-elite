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
        // User is securely logged in! Hide the front door.
            loginScreen.style.display = 'none';
        console.log("Securely logged in as:", user.email); 
        startMasterEngine();
        loadReports();
        // Setup Logout Button
        const logoutBtn = document.getElementById('logout-btn');
        if (logoutBtn) {
            logoutBtn.onclick = () => {
                auth.signOut().then(() => {
                    console.log("🚀 Securely logged out.");
                    window.location.reload(); 
                });
            };
        }
        // We will eventually load their specific database data right here
    } else {
        // Nobody is logged in. Lock the doors.
        loginScreen.style.display = 'flex';
    }
});

// --- BULLETPROOF NAVIGATION ---
function switchView(target) {
    console.log("Attempting to switch to:", target); 
    
    const roles = document.getElementById('view-role-selection');
    const student = document.getElementById('view-student-login');
    const mentor = document.getElementById('view-mentor-login');

    // If something is missing, this will explicitly tell us!
    if (!roles || !student || !mentor) {
        alert("Wait! One of your HTML boxes is missing its ID.");
        return; 
    }

    // Force hide everything
    roles.style.display = 'none';
    student.style.display = 'none';
    mentor.style.display = 'none';

    // Show the target
    if (target === 'roles') roles.style.display = 'block';
    if (target === 'student') student.style.display = 'block';
    if (target === 'mentor') mentor.style.display = 'block';
}


// --- SIGN UP BUTTON LOGIC ---
btnSignup.addEventListener('click', () => {
    const email = emailInput.value;
    const password = passwordInput.value;
    
    auth.createUserWithEmailAndPassword(email, password)
        .then((userCredential) => {
            // Account created successfully! (The Bouncer will auto-hide the screen)
            authError.style.display = 'none';
        })
        .catch((error) => {
            authError.style.display = 'block';
            authError.innerText = error.message; // Show them what went wrong
        });
});

// --- LOGIN BUTTON LOGIC ---
btnLogin.addEventListener('click', () => {
    const email = emailInput.value;
    const password = passwordInput.value;
    
    auth.signInWithEmailAndPassword(email, password)
        .then((userCredential) => {
            // Logged in successfully!
            authError.style.display = 'none';
        })
        .catch((error) => {
            authError.style.display = 'block';
            authError.innerText = "Access Denied: Invalid email or password.";
        });
});
// ==========================================
console.log("🔥 Firebase Cloud Database successfully connected!");
// ==========================================

// Your existing AppState code continues below here...
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
        // NEW: An array of 7 zeroes (Mon, Tue, Wed, Thu, Fri, Sat, Sun)
        weeklyScores: [0, 0, 0, 0, 0, 0, 0] 
    },
    
    init() {
        const saved = localStorage.getItem('danforEliteData');
        if (saved) {
            this.data = { ...this.data, ...JSON.parse(saved) };
        }
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

        const diffTime = today.getTime() - lastLoginDate.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 

        if (diffDays === 1) {
            this.data.streak += 1; // Streak goes up!
        } else if (diffDays > 1) {
            this.data.streak = 1; // Streak breaks!
        }
        
        // THE MIDNIGHT RESET: If it is a brand new day...
        if (diffDays >= 1) {
            // Keep the tasks you FAILED to do, but delete the ones you finished
            this.data.tasks = this.data.tasks.filter(t => !t.completed);
        }
        
        this.data.lastLogin = new Date().toDateString();
    }
};

// --- Navigation & UI Logic ---
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
            link.addEventListener('click', (e) => {
                // Remove active classes
                links.forEach(l => l.classList.remove('active'));
                sections.forEach(s => {
                    s.classList.remove('active', 'animate-fade-in');
                    s.classList.add('hidden');
                });

                // Add active to clicked
                link.classList.add('active');
                const targetId = link.getAttribute('data-target');
                const targetSection = document.getElementById(targetId);
                targetSection.classList.remove('hidden');
                
                // Trigger reflow for animation
                void targetSection.offsetWidth; 
                targetSection.classList.add('active', 'animate-fade-in');
            });
        });
    },

    bindThemeToggle() {
        // Using querySelectorAll forces JS to find EVERY button with this ID, not just the first one!
        const btns = document.querySelectorAll('#theme-toggle');
        
        btns.forEach(btn => {
            // We use onclick here so it bypasses any other confused event listeners
            btn.onclick = () => {
                const newTheme = AppState.data.theme === 'dark-theme' ? 'light-theme' : 'dark-theme';
                AppState.data.theme = newTheme;
                AppState.save();
                this.applyTheme(newTheme);
            };
        });
    },

    applyTheme(themeName) {
        document.body.className = themeName;
    },

    updateDashboard() {
        document.getElementById('streak-count').textContent = `${AppState.data.streak} Days`;
        document.getElementById('tasks-completed').textContent = AppState.data.tasks.filter(t => t.completed).length;
    },

    initChart() {
        const ctx = document.getElementById('performanceChart').getContext('2d');
        // Check if chart exists to destroy it before re-rendering (good practice)
        if(window.myChart) window.myChart.destroy();
        
        window.myChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
                datasets: [{
                    label: 'Productivity Score',
                    data: AppState.data.weeklyScores || [0, 0, 0, 0, 0, 0, 0], // Placeholder data
                    borderColor: '#d4af37', // Accent gold
                    backgroundColor: 'rgba(212, 175, 55, 0.1)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4 // Smooth curves
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: { beginAtZero: true,
                    max: 100,
                     grid: { color: 'rgba(255,255,255,0.05)' } },
                    x: { grid: { display: false } }
                },
                plugins: { legend: { display: false } }
            }
        });
    }
};

// --- Task Management Engine ---
const TaskEngine = {
    init() {
        this.bindEvents();
        this.renderTasks();
    },

    bindEvents() {
        const addBtn = document.getElementById('add-task-btn');
        const taskInput = document.getElementById('new-task-input');

        // Direct binding for the Add button
        addBtn.onclick = () => this.addTask();
        
        taskInput.onkeypress = (e) => {
            if (e.key === 'Enter') this.addTask();
        };
        
        // Notice we completely removed the confusing event delegation here!
    },

    addTask() {
        const input = document.getElementById('new-task-input');
        const priority = document.getElementById('task-priority').value;
        const text = input.value.trim();

        if (!text) {
            alert("Please enter a task.");
            return;
        }

        const user = auth.currentUser;

        if (user) {
            // 1. Send the task straight to the Cloud
            db.collection("users").doc(user.uid).collection("tasks").add({
                text: text,
                priority: priority,
                completed: false,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            })
            .then((docRef) => {
                console.log("🔥 Cloud save successful! ID:", docRef.id);
                
                // 2. Keep your screen visually working tonight using the new Cloud ID
                const newTask = {
                    id: docRef.id, 
                    text: text,
                    priority: priority,
                    completed: false
                    createdAt: new Date()
                };
                
                if (!AppState.data.tasks) AppState.data.tasks = [];
                AppState.data.tasks.push(newTask);
                AppState.save(); 
                
                // 3. Clear input and visually update the dashboard
                input.value = '';
                TaskEngine.renderTasks(); // <-- Scope fixed here!
                try { UI.updateDashboard(); } catch(e) {}
            })
            .catch((error) => {
                console.error("Cloud Error: ", error);
            });
        } else {
            alert("Security Error: You must be logged in to save tasks.");
        }
    },
    toggleComplete(id) {
        const user = auth.currentUser;

        if (user) {
            // 1. Target the exact task document in the Cloud using its ID
            const taskRef = db.collection("users").doc(user.uid).collection("tasks").doc(String(id));
            
            // 2. Find the task locally to see its current status
            const localTask = AppState.data.tasks.find(t => String(t.id) === String(id));
            
            if (localTask) {
                // Flip the status (if true make false, if false make true)
                const newStatus = !localTask.completed; 
                
                // 3. Tell Google to update the status in the Cloud
                taskRef.update({
                    completed: newStatus
                })
                .then(() => {
                    console.log(`🔥 Cloud sync: Task completed status is now ${newStatus}`);
                    
                    
                    // 4. Update the screen visually so it feels instant
                    localTask.completed = newStatus;
                    AppState.save();
                    this.renderTasks();
                    try { UI.updateDashboard(); } catch(e) {}
                })
                .catch((error) => {
                    console.error("Cloud Update Error: ", error);
                });
            }
        } else {
            alert("Security Error: You must be logged in to update tasks.");
        }
    },

    deleteTask(id) {
        const user = auth.currentUser;

        if (user) {
            // 1. Target the exact task in the Cloud
            const taskRef = db.collection("users").doc(user.uid).collection("tasks").doc(String(id));

            // 2. Tell Google to delete it permanently
            taskRef.delete()
                .then(() => {
                    console.log("🔥 Task permanently wiped from the Cloud.");
                    
                    // 3. Update your screen visually
                    AppState.data.tasks = AppState.data.tasks.filter(t => String(t.id) !== String(id));
                    AppState.save();
                    TaskEngine.renderTasks(); // Keeps the screen updated
                    try { UI.updateDashboard(); } catch(e) {}
                })
                .catch((error) => {
                    console.error("Cloud Delete Error: ", error);
                });
        }
    },

    renderTasks() {
        const list = document.getElementById('task-list');
        list.innerHTML = ''; 

        if (!AppState.data.tasks || AppState.data.tasks.length === 0) {
            list.innerHTML = '<li class="empty-state">No active tasks. Time to focus.</li>';
            return;
        }

        const sortedTasks = [...AppState.data.tasks].sort((a, b) => {
            if (a.completed === b.completed) {
                const priorityWeight = { high: 3, medium: 2, low: 1 };
                return priorityWeight[b.priority] - priorityWeight[a.priority];
            }
            return a.completed ? 1 : -1;
        });

        sortedTasks.forEach(task => {
            const li = document.createElement('li');
            li.className = `task-item glass ${task.completed ? 'completed' : ''}`;
            
            const priorityColors = { high: 'var(--danger)', medium: 'var(--accent-gold)', low: 'var(--success)' };
            const dotColor = priorityColors[task.priority] || 'var(--accent-gold)';

            const textStyle = task.completed ? "text-decoration: line-through; opacity: 0.4;" : "";
            const btnStyle = task.completed ? "background: var(--success); color: white; border-color: var(--success);" : "";

            // FOOLPROOF INLINE ONCLICK COMMANDS ADDED HERE:
            li.innerHTML = `
                <div class="task-content" style="${textStyle}">
                    <span class="priority-dot" style="background-color: ${dotColor};"></span>
                    <span class="task-text">${task.text}</span>
                </div>
                <div class="task-actions">
                    <button class="icon-btn complete-btn" style="${btnStyle}" onclick="TaskEngine.toggleComplete('${task.id}')">
                        <i class="fas fa-check"></i>
                    </button>
                    <button class="icon-btn delete-btn" onclick="TaskEngine.deleteTask('${task.id}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            `;
            list.appendChild(li);
        });
    }
};

// --- GPA Estimator Engine ---
const GPAEngine = {
    init() {
        const addCourseBtn = document.getElementById('add-course-btn');
        if (addCourseBtn) {
            addCourseBtn.onclick = () => this.addCourseRow();
        }

        // Pre-populate with a few template courses for a premium first look
        this.addCourseRow('CSC 101', 3);
        this.addCourseRow('MTH 101', 5);
        this.addCourseRow('PHY 101', 4);
        
        this.calculateGPA();
    },

    addCourseRow(courseName = '', units = '') {
        const container = document.getElementById('course-inputs');
        const rowId = 'course-' + Date.now();
        
        const row = document.createElement('div');
        row.className = 'course-row mt-1';
        row.id = rowId;

        // Added placeholder="Units" and onkeyup for instant calculation
        row.innerHTML = `
            <input type="text" class="course-name" placeholder="Course Code" value="${courseName}">
            <input type="number" class="course-units" placeholder="Units" min="1" max="6" value="${units}" onchange="GPAEngine.calculateGPA()" onkeyup="GPAEngine.calculateGPA()">
            <select class="course-grade" onchange="GPAEngine.calculateGPA()">
                <option value="5">A (70-100)</option>
                <option value="4">B (60-69)</option>
                <option value="3">C (50-59)</option>
                <option value="2">D (45-49)</option>
                <option value="1">E (40-44)</option>
                <option value="0">F (0-39)</option>
            </select>
            <button class="icon-btn delete-course-btn" onclick="GPAEngine.deleteCourseRow('${rowId}')">
                <i class="fas fa-times"></i>
            </button>
        `;
        
        container.appendChild(row);
        this.calculateGPA();
    },

    deleteCourseRow(rowId) {
        const row = document.getElementById(rowId);
        if (row) {
            row.remove();
            this.calculateGPA();
        }
    },

    calculateGPA() {
        const rows = document.querySelectorAll('.course-row');
        let totalUnits = 0;
        let totalPoints = 0;

        rows.forEach(row => {
            const units = parseInt(row.querySelector('.course-units').value) || 0;
            const gradeValue = parseInt(row.querySelector('.course-grade').value) || 0;

            totalUnits += units;
            totalPoints += (units * gradeValue);
        });

        const cgpaDisplay = document.getElementById('cgpa-result');
        
        if (totalUnits === 0) {
            cgpaDisplay.textContent = "0.00";
            cgpaDisplay.style.color = "var(--text-main)";
            return;
        }

        const cgpa = (totalPoints / totalUnits).toFixed(2);
        cgpaDisplay.textContent = cgpa;

        // Premium touch: Color code the GPA result
        if (cgpa >= 4.50) {
            cgpaDisplay.style.color = "var(--success)"; // First Class
        } else if (cgpa >= 3.50) {
            cgpaDisplay.style.color = "var(--accent-gold)"; // Second Class Upper
        } else {
            cgpaDisplay.style.color = "var(--text-main)";
        }
    }
};
// --- Boot up the App ---
document.addEventListener('DOMContentLoaded', () => {
    AppState.init();
    UI.init();
});
// --- Smart Analytics Engine ---
const AnalyticsEngine = {
    calculateScore() {
        const tasks = AppState.data.tasks;
        if (tasks.length === 0) return 0; // Default to 0 if no tasks exist

        let totalWeight = 0;
        let earnedWeight = 0;

        // High priority is worth more points
        const weights = { high: 3, medium: 2, low: 1 };

        tasks.forEach(t => {
            const w = weights[t.priority];
            totalWeight += w;
            if (t.completed) earnedWeight += w;
        });
        
         // Calculate percentage
        return Math.round((earnedWeight / totalWeight) * 100);
    },

    updateDashboardStats() {
        const score = this.calculateScore();
        
        const scoreElement = document.getElementById('ai-score');
        if (scoreElement) scoreElement.textContent = `${score}%`;
        
        let currentDayNum = new Date().getDay();
        let chartIndex = currentDayNum === 0 ? 6 : currentDayNum - 1; 

        // 1. Save today's score into the permanent memory array
        if (!AppState.data.weeklyScores) AppState.data.weeklyScores = [0,0,0,0,0,0,0];
        AppState.data.weeklyScores[chartIndex] = score;
        AppState.save(); // Lock it in!

        // 2. Tell the chart to load the real memory array, not the dummy data
        if (window.myChart) {
            window.myChart.data.datasets[0].data = AppState.data.weeklyScores;
            window.myChart.update();
        }
    }
};
// Override the previous UI.updateDashboard to include our new Analytics
UI.updateDashboard = function() {
    document.getElementById('streak-count').textContent = `${AppState.data.streak} Days`;
    document.getElementById('tasks-completed').textContent = AppState.data.tasks.filter(t => t.completed).length;
    AnalyticsEngine.updateDashboardStats();
};

// --- Mistake Log Engine ---
const MistakeEngine = {
    init() {
        document.getElementById('add-mistake-btn').addEventListener('click', () => this.addMistake());
        this.renderMistakes();
    },

    addMistake() {
        const input = document.getElementById('new-mistake-input');
        const text = input.value.trim();
        
        if (!text) {
            alert("Please detail the mistake and the lesson learned.");
            return;
        }

        const newMistake = {
            id: Date.now().toString(),
            text: text,
            date: new Date().toLocaleDateString()
        };

        AppState.data.mistakes.push(newMistake);
        AppState.save();
        input.value = '';
        this.renderMistakes();
    },

    renderMistakes() {
        const list = document.getElementById('mistake-list');
        list.innerHTML = '';

        if (AppState.data.mistakes.length === 0) {
            list.innerHTML = '<div class="empty-state">No mistakes logged yet. Stay sharp!</div>';
            return;
        }

        // Render from newest to oldest
        const reversedMistakes = [...AppState.data.mistakes].reverse();

        reversedMistakes.forEach(mistake => {
            const div = document.createElement('div');
            div.className = 'mistake-item glass mt-1';
            div.innerHTML = `
                <div class="mistake-header">
                    <i class="fas fa-exclamation-triangle"></i> Logged: ${mistake.date}
                </div>
                <div class="mistake-text">${mistake.text}</div>
                <button class="icon-btn delete-mistake-btn mt-1" data-id="${mistake.id}"><i class="fas fa-trash"></i></button>
            `;
            list.appendChild(div);
        });

        // Add delete functionality for mistakes
        document.querySelectorAll('.delete-mistake-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.currentTarget.getAttribute('data-id');
                AppState.data.mistakes = AppState.data.mistakes.filter(m => m.id !== id);
                AppState.save();
                this.renderMistakes();
            });
        });
    }
};

// --- PDF Export Engine ---
const ExportEngine = {
    init() {
        const btn = document.getElementById('export-btn');
        if (btn) {
            btn.addEventListener('click', () => this.generatePDF());
        }
    },

    generatePDF() {
        try {
            // Safer way to initialize jsPDF on mobile/TrebEdit
            const jsPDF = window.jspdf.jsPDF; 
            const doc = new jsPDF();

            // 1. Title
            doc.setFont("helvetica", "bold");
            doc.setFontSize(22);
            doc.setTextColor(44, 62, 80);
            doc.text("DanFor Elite - Performance Report", 20, 20);

            // 2. Metrics
            doc.setFontSize(12);
            doc.setFont("helvetica", "normal");
            doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 20, 30);
            doc.text(`Current Study Streak: ${AppState.data.streak} Days`, 20, 40);
            
            // Check if AnalyticsEngine is ready before calling it
            const score = AnalyticsEngine ? AnalyticsEngine.calculateScore() : 0;
            doc.text(`Smart Performance Score: ${score}%`, 20, 50);

            // 3. Pending High Priority Tasks
            doc.setFont("helvetica", "bold");
            doc.text("Pending High-Priority Focus Tasks:", 20, 70);
            doc.setFont("helvetica", "normal");
            
            const highTasks = AppState.data.tasks.filter(t => t.priority === 'high' && !t.completed);
            let yPos = 80;
            
            if(highTasks.length === 0) {
                doc.text("All clear! No urgent tasks.", 20, yPos);
                yPos += 10;
            } else {
                highTasks.forEach(t => {
                    doc.text(`- ${t.text}`, 20, yPos);
                    yPos += 10;
                });
            }

            // Save the file
            doc.save("DanFor_Elite_Report.pdf");
            
            // Give the user feedback!
            alert("Success! Your performance report has been downloaded.");

        } catch (error) {
            console.error("PDF Error: ", error);
            alert("Oops! The PDF engine is still loading. Please wait a second and try again.");
        }
    }
};
// --- Accountability Engine ---
const AccountabilityEngine = {
    init() {
        // Bind Buttons
        const saveBtn = document.getElementById('save-pact-btn');
        if (saveBtn) saveBtn.onclick = () => this.savePact();

        const shareBtn = document.getElementById('whatsapp-share-btn');
        if (shareBtn) shareBtn.onclick = () => this.shareToWhatsApp();

        this.renderPact();
        this.checkToughLove();
        
        // Check the time every 60 seconds so the AI can react live
        setInterval(() => this.checkToughLove(), 60000);
    },

    savePact() {
        const input = document.getElementById('daily-pact-input').value.trim();
        if(!input) {
            alert("Don't be a coward. Enter a real consequence.");
            return;
        }
        
        AppState.data.pact = input;
        AppState.data.pactDate = new Date().toDateString();
        AppState.save();
        this.renderPact();
    },

    renderPact() {
        const today = new Date().toDateString();
        const pactBox = document.getElementById('study-pact-box');
        const inputArea = document.querySelector('.pact-input-area');
        const display = document.getElementById('active-pact-display');

        if(!pactBox || !inputArea || !display) return;

        if (AppState.data.pact && AppState.data.pactDate === today) {
            inputArea.classList.add('hidden');
            display.textContent = `🔥 CONSEQUENCE LOCKED: ${AppState.data.pact}`;
            display.classList.remove('hidden');
            pactBox.classList.add('locked');
        } else {
            // Reset for a new day
            inputArea.classList.remove('hidden');
            display.classList.add('hidden');
            pactBox.classList.remove('locked');
        }
    },

    checkToughLove() {
        const hour = new Date().getHours();
        const score = AnalyticsEngine ? AnalyticsEngine.calculateScore() : 0;
        
        const greetingEl = document.getElementById('ai-greeting');
        const messageEl = document.getElementById('ai-message');
        
        if (!greetingEl || !messageEl) return;

        // 1. Time-based greetings
        if (hour < 12) greetingEl.textContent = "Good Morning.";
        else if (hour < 18) greetingEl.textContent = "Good Afternoon.";
        else greetingEl.textContent = "Good Evening.";

        // 2. The AI Coach Logic
        if (score === 100 && AppState.data.tasks.length > 0) {
            messageEl.textContent = "Flawless execution today. Rest well.";
            document.body.classList.remove('tough-love-mode');
        } 
        else if (hour >= 18 && score < 50) {
            // TOUGH LOVE ACTIVATES AT 6:00 PM IF SCORE IS BAD
            greetingEl.textContent = "Wake Up.";
            messageEl.textContent = `The day is ending and your score is only ${score}%. Stop making excuses.`;
            document.body.classList.add('tough-love-mode');
        } 
        else if (hour >= 12 && score === 0 && AppState.data.tasks.length > 0) {
            messageEl.textContent = "Half the day is gone and you have zero progress. Fix this.";
            document.body.classList.remove('tough-love-mode');
        } 
        else {
            messageEl.textContent = "Stay focused. Your goals don't care how you feel.";
            document.body.classList.remove('tough-love-mode');
        }
    },

    shareToWhatsApp() {
        const score = AnalyticsEngine ? AnalyticsEngine.calculateScore() : 0;
        const streak = AppState.data.streak;
        const tasksCompleted = AppState.data.tasks.filter(t => t.completed).length;
        const totalTasks = AppState.data.tasks.length;
        
        let message = `*DanFor Elite | Daily Proof of Work* 📊\n\n`;
        message += `🔥 *Study Streak:* ${streak} Days\n`;
        message += `🧠 *Smart Score:* ${score}%\n`;
        message += `✅ *Tasks Executed:* ${tasksCompleted}/${totalTasks}\n\n`;
        
        if (AppState.data.pact && AppState.data.pactDate === new Date().toDateString()) {
            message += `⚠️ *My Daily Pact:* If I fail today, ${AppState.data.pact}\n\n`;
        }
        
        message += `_"Accountability breeds response-ability."_ 🦅\n`;

        // URL encode the text and open WhatsApp
        const encodedMessage = encodeURIComponent(message);
        window.open(`https://wa.me/?text=${encodedMessage}`, '_blank');
    }
};
// --- Boot up the App ---
document.addEventListener('DOMContentLoaded', () => {
    AppState.init();
    UI.init();
    TaskEngine.init(); // <-- This connects the new logic!
});
// --- Boot up the App ---
document.addEventListener('DOMContentLoaded', () => {
    AppState.init();
    UI.init();
    TaskEngine.init();
    MistakeEngine.init(); // Starts the Mistake Log
    ExportEngine.init();  // Activates the PDF button
});

// --- Boot up the App ---
document.addEventListener('DOMContentLoaded', () => {
    AppState.init();
    UI.init();
    TaskEngine.init();
    MistakeEngine.init();
    ExportEngine.init();
    GPAEngine.init();
    
    // THIS IS THE MISSING PIECE! It turns on the Pact and the WhatsApp button.
    if (typeof AccountabilityEngine !== 'undefined') {
        AccountabilityEngine.init();
    }
});
// ==========================================
// MASTER ENGINE: CLOUD READ + AUDIT + JANITOR
// ==========================================

async function startMasterEngine() {
    const user = auth.currentUser;
    if (!user) return;

    // The 'Midnight Wall' in raw milliseconds
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayStartTime = todayStart.getTime();

    try {
        const snapshot = await db.collection("users").doc(user.uid).collection("tasks").get();
        let tasksByDate = {};

        snapshot.forEach(doc => {
            const data = doc.data();
            
            // Step 1: Handle every possible date format correctly
            let taskDate;
            if (data.createdAt && typeof data.createdAt.toDate === 'function') {
                taskDate = data.createdAt.toDate();
            } else if (data.createdAt) {
                taskDate = new Date(data.createdAt);
            } else {
                // Fail-safe: if no date, treat as yesterday so it doesn't get stuck
                taskDate = new Date(Date.now() - 86400000);
            }

            const taskTime = taskDate.getTime();
            const dateKey = taskDate.toDateString(); 

            // Step 2: Compare raw numbers (The Solution)
            if (taskTime < todayStartTime) {
                if (!tasksByDate[dateKey]) tasksByDate[dateKey] = [];
                tasksByDate[dateKey].push({ id: doc.id, ...data });
            }
        });

        // Step 3: Run the Audit + Universal Wipe
        for (const date in tasksByDate) {
            await processUniversalAudit(date, tasksByDate[date]);
        }
    } catch (error) {
        console.error("Engine Sync Error:", error);
    }
        }
// --- PDF GENERATOR ENGINE ---
function downloadPDF(report) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    // 1. Header Styling
    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.setTextColor(18, 16, 14); // Dark theme color
    doc.text("DANFOR ELITE PERFORMANCE AUDIT", 20, 20);
    
    doc.setFontSize(12);
    doc.setTextColor(100);
    doc.text(`Date: ${report.date}`, 20, 30);
    doc.text(`Efficiency Score: ${report.stats.efficiency || (Math.round((report.stats.done / report.stats.total) * 100) + "%")}`, 20, 37);

    // 2. Draw a separator line
    doc.setLineWidth(0.5);
    doc.line(20, 45, 190, 45);

    // 3. List the Tasks
    doc.setFontSize(14);
    doc.setTextColor(0);
    doc.text("Detailed Task Breakdown:", 20, 55);

    let yPosition = 65;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);

    report.details.forEach((item, index) => {
        // If the page is full, start a new one
        if (yPosition > 280) {
            doc.addPage();
            yPosition = 20;
        }
        
        const statusText = item.result;
        doc.text(`${index + 1}. ${item.task}`, 25, yPosition);
        doc.text(`${statusText}`, 150, yPosition);
        
        yPosition += 10;
    });

    // 4. Footer
    doc.setFontSize(10);
    doc.setTextColor(150);
    doc.text("Generated by DanFor Elite Accountability Engine", 20, 290);

    // 5. Trigger the download on your phone
    doc.save(`Audit_${report.date.replace(/ /g, '_')}.pdf`);
}

// --- CALL THIS IN YOUR BOUNCER ---
function loadReports() {
    const user = auth.currentUser;
    const list = document.getElementById('reports-list');
    if(!list) return;

    db.collection("users").doc(user.uid).collection("reports")
        .orderBy("timestamp", "desc")
        .onSnapshot(snapshot => {
            list.innerHTML = '';
            if (snapshot.empty) {
                list.innerHTML = '<p style="color:#666; font-size:0.8rem;">No audits archived yet.</p>';
                return;
            }
            snapshot.forEach(doc => {
                const report = doc.data();
                const btn = document.createElement('button');
                btn.className = 'btn-secondary mt-1'; // Matching your CSS
                btn.style.width = '100%';
                btn.innerHTML = `<i class="fas fa-download"></i> Download ${report.date}`;
                btn.onclick = () => downloadPDF(report);
                list.appendChild(btn);
            });
        });
}
let isPartnerMode = false;

function connectToStudent() {
    const studentId = document.getElementById('target-student-id').value.trim();

    if (!studentId || studentId.length < 20) {
        return alert("❌ Invalid Student ID.");
    }

    console.log("🔍 Verifying ID in database...");
    
    // KNOCK ON THE DOOR: Check if this user has any data
    db.collection("users").doc(studentId).collection("reports").limit(1).get()
        .then(snapshot => {
            if (snapshot.empty) {
                // The database says nobody is home!
                alert("❌ No student found with that ID. Please check the ID and try again.");
                return;
            }

            // ID IS REAL! Let them in.
            isPartnerMode = true;
            document.getElementById('login-screen').style.display = 'none';
            startPartnerEngine(studentId);
            alert("✅ Mentor Access Granted.");
        })
        .catch(err => {
            alert("❌ Connection Error.");
            console.error(err);
        });
}
function startPartnerEngine(studentId) {
    // --- BULLETPROOF CSS LOCKDOWN ---
    // This injects a rule that permanently hides delete buttons and freezes inputs
    const lockdownStyle = document.createElement('style');
    lockdownStyle.innerHTML = `
        /* Hide the task input area */
        .task-input-group { display: none !important; }
        
        /* Freeze all typing boxes everywhere */
        input, select, textarea { pointer-events: none !important; opacity: 0.5 !important; }

        /* THE NUCLEAR OPTION: Hide anything that looks like a delete button anywhere */
        .delete-btn, 
        button[onclick*="delete"], 
        button[onclick*="remove"],
        .fa-trash, 
        .fa-trash-alt { 
            display: none !important; 
        }

        /* Specifically target the entire Mistake section and nuke its buttons */
        #mistakes button,
        #mistake-list button,
        [data-target="mistakes"] button {
            display: none !important;
        }
    `;
    document.head.appendChild(lockdownStyle);

    // Load Tasks (Read-Only)
    db.collection("users").doc(studentId).collection("tasks")
        .onSnapshot(snapshot => {
            let tasks = [];
            snapshot.forEach(doc => tasks.push({ id: doc.id, ...doc.data() }));
            AppState.data.tasks = tasks;
            TaskEngine.renderTasks(); 
        });

    // Load PDF Reports
    loadReportsForPartner(studentId);
}
// Special report loader for partners
function loadReportsForPartner(studentId) {
    const list = document.getElementById('reports-list');
    
    db.collection("users").doc(studentId).collection("reports")
        .orderBy("timestamp", "desc")
        .onSnapshot(snapshot => {
            list.innerHTML = '';
            snapshot.forEach(doc => {
                const report = doc.data();
                const btn = document.createElement('button');
                
                btn.className = 'secondary-btn'; 
                btn.style.width = '100%';
                
                // --- THE GOLDILOCKS SIZE ---
                btn.style.padding = '10px'; // Toned down from 15px
                btn.style.fontSize = '0.9rem'; // Standard, clean text size
                btn.style.borderRadius = '5px'; // Matches your other app buttons
                btn.style.marginTop = '10px';
                
                btn.style.display = 'flex';
                btn.style.justifyContent = 'center';
                btn.style.alignItems = 'center';
                btn.style.gap = '8px';
                
                // Used the same PDF icon you have on your Export button!
                btn.innerHTML = `<i class="fas fa-file-pdf"></i> Download Audit: ${report.date}`;
                btn.onclick = () => downloadPDF(report);
                
                list.appendChild(btn);
            });
        });
}
// --- GLOBAL LOGOUT FIX ---
 // This ensures the logout button works for BOTH Students and Mentors
const globalLogoutBtn = document.getElementById('logout-btn');
if (globalLogoutBtn) {
    globalLogoutBtn.onclick = () => {
        console.log("🚪 Exiting Dashboard...");
        // If a student is signed in, sign them out properly. 
        if (auth.currentUser) {
            auth.signOut().then(() => {
                window.location.reload(); // Refresh the app
            });
        } else {
            // If it's a Mentor, just refresh the app to lock the doors
            window.location.reload(); 
        }
    };
}

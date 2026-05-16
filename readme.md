# Gradelens 🔍

Gradelens is a full-stack, multi-modal assessment engine built to automate the grading of essays and batch multiple-choice questions (MCQs). Designed with a focus on determinism, auditability, and high availability, Gradelens replaces probabilistic LLM grading with a strict, rule-based algorithm.

## 🚀 Core Features

* **Deterministic Grading Engine:** * **Essays:** Utilizes a bifurcated keyword matching algorithm (exact match for short strings, fuzzy matching/typo-tolerance for longer concepts) paired with a penalty-based scoring system.
  * **Anti-Cheat Protocol:** Includes context-checking to defeat "negation exploits" (e.g., "The answer is NOT x") and a frequency analyzer to flag "keyword spamming."
  * **Batch MCQs:** Robust array parsing to grade multiple questions simultaneously, complete with array-bounds checking to prevent over-answering exploits.
* **Dual-Persistence Architecture:** * Implements an asynchronous "Eventual Consistency" model. 
  * **Primary:** Fast, local reads/writes via a normalized **SQLite** database (`history` and `mcq_history` tables).
  * **Secondary:** Continuous, async background syncing to **Google Sheets** (via JWT authentication) for highly accessible cloud reporting.
* **Granular Error Diagnostics:** Instead of generic feedback, the engine generates specific UI diagnostic strings (e.g., highlighting exactly which MCQ numbers were missed) distinct from strategic feedback.
* **Class Health Analytics Dashboard:** A React `Chart.js` dashboard that visualizes score distributions and system manual review flags to help educators assess prompt difficulty and system integrity.

## 🛠️ Tech Stack

* **Frontend:** React.js, Vite, Tailwind CSS, Chart.js
* **Backend:** Node.js, Express.js
* **Database:** SQLite3
* **Integrations:** Google Sheets API, `pdf-parse`, `multer` (Memory Storage)

## 🧠 System Architecture Notes

* **File Ingestion:** To prevent disk I/O bottlenecks during peak submission times, `multer` is configured to hold PDF/Text uploads in the server's RAM just long enough for `pdf-parse` to extract the raw string, instantly freeing up memory.
* **Data Normalization:** Essay data and MCQ data are segregated into distinct SQLite tables to prevent schema pollution, and dynamically routed to separate Google Sheet tabs.

## 💻 Local Setup

1. **Clone the repository:**
   \`\`\`bash
   git clone https://github.com/yourusername/gradelens.git
   cd gradelens
   \`\`\`

2. **Install Dependencies:**
   \`\`\`bash
   # Install backend dependencies
   cd backend
   npm install

   # Install frontend dependencies
   cd ../frontend
   npm install
   \`\`\`

3. **Environment Variables:**
   Create a `.env` file in the `backend` directory with your Google Service Account credentials:
   \`\`\`env
   GOOGLE_CLIENT_EMAIL="your-service-account-email@project.iam.gserviceaccount.com"
   GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
   \`\`\`

4. **Run the Application:**
   Open two terminal instances.
   
   *Terminal 1 (Backend):*
   \`\`\`bash
   cd backend
   node server.js
   \`\`\`
   
   *Terminal 2 (Frontend):*
   \`\`\`bash
   cd frontend
   npm run dev
   \`\`\`
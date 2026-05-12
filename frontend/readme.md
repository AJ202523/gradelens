# Gradelens 🔍

**A Deterministic Knowledge Engine for Academic Assessment**

Gradelens is a full-stack educational tool designed to automate the grading of text-based student submissions. Instead of relying on unpredictable LLM generation, Gradelens uses a deterministic, First-Principles algorithm to evaluate conceptual alignment, keyword density, and structural fidelity against an ideal academic response.

## 🚀 Key Features

* **Deterministic Grading Engine:** Evaluates submissions using strict, penalty-based keyword matching and fuzzy logic for typo tolerance.
* **The "Bluff Catcher" Heuristic:** Automatically flags submissions for manual review if the word count is high but keyword density is exceptionally low.
* **Automated Diagnostics:** Calculates and isolates exact missed keywords, providing actionable feedback for students.
* **Bulk PDF Processing:** Upload physical solution files (PDF, TXT) and automatically extract text using `pdf-parse` and `multer`.
* **Analytics Dashboard:** Visualizes class performance, grade distributions, and manual review ratios using `Chart.js`.
* **Dual-Persistence Database:** Saves all grading history locally to SQLite and automatically syncs to a Google Sheets backup in real-time.
* **"Vellum & Vermilion" UI:** A premium, academic-focused user interface designed for maximum readability and zero friction.

## 🛠️ Tech Stack

* **Frontend:** React.js, Tailwind CSS, Chart.js
* **Backend:** Node.js, Express.js
* **Database:** SQLite3
* **External APIs:** Google Sheets API
* **Utilities:** Multer (Memory Storage), PDF-Parse, Bcryptjs (Password Hashing)

## 📦 Installation & Setup

1. **Clone the repository:**
   ```bash
   git clone [https://github.com/AJ202523/gradelens.git](https://github.com/AJ202523/gradelens.git)
   cd gradelens
2.  **Environment Variables:**
   Create a `.env` file in the backend directory and add the necessary configuration keys. You will need a Google Cloud Service Account JSON file for the database sync to work.
   
   ```env
   PORT=3001
   SPREADSHEET_ID=your-google-sheet-id
   GOOGLE_APPLICATION_CREDENTIALS=./path-to-your-credentials.json
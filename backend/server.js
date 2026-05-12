require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const { db, dbEmitter } = require('./database'); // Updated to get both db and emitter
const { gradeSubmission, normalize, tokenize } = require('./gradingEngine');
const multer = require('multer');
const fs = require('fs');
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');
const cron = require('node-cron');
const { syncToSheets } = require('./services/backupService');
const levenshtein = require('fast-levenshtein');

// Continuous Sync Logic with Debouncing
let syncTimeout = null;
const DEBOUNCE_DELAY = 5000; // 5 seconds

function triggerSync() {
    if (syncTimeout) clearTimeout(syncTimeout);
    syncTimeout = setTimeout(async () => {
        console.log('Detected database changes. Triggering Google Sheets sync...');
        try {
            await syncToSheets();
            console.log('Continuous sync completed successfully.');
        } catch (err) {
            console.error('Continuous sync failed:', err.message);
        }
    }, DEBOUNCE_DELAY);
}

// Listen for any database changes (write operations)
dbEmitter.on('change', (info) => {
    console.log(`DB Change detected via ${info.method}`);
    triggerSync();
});

const upload = multer({ storage: multer.memoryStorage() });

async function extractTextFromFile(file) {
    const ext = file.originalname.split('.').pop().toLowerCase();
    if (file.mimetype === 'application/pdf' || ext === 'pdf') {
        const data = await pdfParse(file.buffer);
        return data.text;
    } else if (ext === 'docx') {
        const result = await mammoth.extractRawText({ buffer: file.buffer });
        return result.value;
    } else if (file.mimetype === 'text/plain' || file.mimetype === 'text/csv' || ext === 'txt' || ext === 'csv') {
        return file.buffer.toString('utf-8');
    }
    throw new Error('Unsupported file type');
}


const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Strict RFC 5322 Regex
const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

app.post('/register', async (req, res) => {
    const { email, password, username } = req.body;

    if (!email || !password || !username) {
        return res.status(400).json({ error: 'Username, email, and password are required' });
    }

    if (!emailRegex.test(email)) {
        return res.status(400).json({ error: 'Invalid email format' });
    }

    if (username.length < 3) {
        return res.status(400).json({ error: 'Username must be at least 3 characters' });
    }

    const isPasswordStrong = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/.test(password);
    if (!isPasswordStrong) {
        return res.status(400).json({ error: 'Password does not meet security requirements.' });
    }

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        db.run(
            'INSERT INTO users (email, password, username) VALUES (?, ?, ?)',
            [email, hashedPassword, username],
            function (err) {
                if (err) {
                    if (err.message.includes('UNIQUE constraint failed: users.email')) {
                        return res.status(400).json({ error: 'Email already registered' });
                    }
                    if (err.message.includes('UNIQUE constraint failed: users.username')) {
                        return res.status(400).json({ error: 'Username already taken' });
                    }
                    return res.status(500).json({ error: 'Database error' });
                }
                res.status(201).json({ success: true, userId: this.lastID, user: { email, username } });
                // Trigger immediate background sync
                syncToSheets().catch(err => console.error('Background sync failed:', err.message));
            }
        );
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

app.post('/login', (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ error: 'Username and password are required' });
    }

    db.get('SELECT * FROM users WHERE username = ?', [username], async (err, user) => {
        if (err) {
            return res.status(500).json({ error: 'Database error' });
        }
        if (!user) {
            return res.status(401).json({ error: 'Invalid username or password' });
        }

        try {
            const match = await bcrypt.compare(password, user.password);
            if (match) {
                res.json({ success: true, userId: user.id, user: { email: user.email, username: user.username } });
            } else {
                res.status(401).json({ error: 'Invalid username or password' });
            }
        } catch (err) {
            res.status(500).json({ error: 'Server error' });
        }
    });
});

app.post('/update-account', async (req, res) => {
    const { email, currentPassword, newPassword, newUsername } = req.body;
    
    if (!email || !currentPassword) {
        return res.status(400).json({ error: 'Email and current password are required.' });
    }

    db.get('SELECT * FROM users WHERE email = ?', [email], async (err, user) => {
        if (err || !user) return res.status(400).json({ error: 'User not found.' });

        try {
            const match = await bcrypt.compare(currentPassword, user.password);
            if (!match) return res.status(401).json({ error: 'Incorrect current password.' });

            let updateQuery = 'UPDATE users SET ';
            let updateParams = [];
            let updates = [];

            if (newUsername !== undefined && newUsername !== user.username) {
                updates.push('username = ?');
                updateParams.push(newUsername);
            }

            if (newPassword) {
                const isPasswordStrong = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/.test(newPassword);
                if (!isPasswordStrong) return res.status(400).json({ error: 'New password does not meet security requirements.' });
                
                const hashedPassword = await bcrypt.hash(newPassword, 10);
                updates.push('password = ?');
                updateParams.push(hashedPassword);
            }

            if (updates.length === 0) {
                return res.json({ success: true, message: 'No changes made.', user: { email: user.email, username: newUsername || user.username } });
            }

            updateQuery += updates.join(', ') + ' WHERE email = ?';
            updateParams.push(email);

            db.run(updateQuery, updateParams, function(err) {
                if (err) return res.status(500).json({ error: 'Failed to update account.' });
                res.json({ success: true, message: 'Account updated successfully.', user: { email: user.email, username: newUsername || user.username } });
            });
        } catch (err) {
            res.status(500).json({ error: 'Server error' });
        }
    });
});

app.post('/reset-password', async (req, res) => {
    const { email, newPassword } = req.body;
    if (!email || !newPassword) return res.status(400).json({ error: 'Email and new password are required.' });

    const isPasswordStrong = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/.test(newPassword);
    if (!isPasswordStrong) return res.status(400).json({ error: 'Password does not meet security requirements.' });

    db.get('SELECT * FROM users WHERE email = ?', [email], async (err, user) => {
        if (err || !user) return res.status(400).json({ error: 'User not found.' });
        
        try {
            const hashedPassword = await bcrypt.hash(newPassword, 10);
            db.run('UPDATE users SET password = ? WHERE email = ?', [hashedPassword, email], function(err) {
                if (err) return res.status(500).json({ error: 'Failed to reset password.' });
                res.json({ success: true, message: 'Password reset successfully.' });
            });
        } catch (err) {
            res.status(500).json({ error: 'Server error' });
        }
    });
});

app.post('/grade', upload.single('submissionFile'), async (req, res) => {
    let { answerKey, criticalKeywords, regularKeywords, studentText, userEmail } = req.body;
    
    if (!answerKey || (!studentText && !req.file)) {
        return res.status(400).json({ error: 'Missing required fields: Answer Key and Student Submission are mandatory.' });
    }

    if (req.file) {
        try {
            studentText = await extractTextFromFile(req.file);
        } catch (err) {
            console.error(err);
            return res.status(500).json({ error: 'Failed to parse PDF document' });
        }
    }

    const critKeys = typeof criticalKeywords === 'string' ? criticalKeywords.split(',').map(s => s.trim()).filter(s => s) : (criticalKeywords || []);
    const regKeys = typeof regularKeywords === 'string' ? regularKeywords.split(',').map(s => s.trim()).filter(s => s) : (regularKeywords || []);
    
    // ENGINE UPGRADE: Strict Keyword Rules & Penalty Math
    const normStudentText = normalize(studentText);
    const studentWords = tokenize(studentText);
    
    const checkKeyword = (kw) => {
        const normKw = normalize(kw);
        if (!normKw) return false;
        
        if (normKw.length <= 4) {
            // Strict exact match for short words
            return normStudentText.includes(normKw);
        } else {
            // Fuzzy matching for > 4 characters
            if (normStudentText.includes(normKw)) return true;
            
            const keyWords = tokenize(kw);
            const threshold = normKw.length > 5 ? 2 : 1;
            
            if (keyWords.length > 0 && keyWords.length <= studentWords.length) {
                for (let i = 0; i <= studentWords.length - keyWords.length; i++) {
                    const ngram = studentWords.slice(i, i + keyWords.length).join(' ');
                    if (levenshtein.get(ngram, normKw) <= threshold) {
                        return true;
                    }
                }
            }
            return false;
        }
    };

    const missedCritical = critKeys.filter(kw => !checkKeyword(kw));
    const missedRegular = regKeys.filter(kw => !checkKeyword(kw));

    let score = 100;
    score -= (missedCritical.length * 25);
    score -= (missedRegular.length * 10);
    if (score < 0) score = 0;

    const missedKeywordsArray = [...missedCritical, ...missedRegular];
    const missedKeywordsString = missedKeywordsArray.join(', ');
    
    const isManualReview = score < 40 || missedCritical.length > 0;
    const log = `Penalty Math Applied. Score: ${score}. Missed Critical: ${missedCritical.length}, Missed Regular: ${missedRegular.length}.`;

    try {
        const filename = req.file ? req.file.originalname : 'Manual Entry';
        
        // Generate IST Timestamp (UTC + 5:30)
        const now = new Date();
        const istOffset = 5.5 * 60 * 60 * 1000;
        const istDate = new Date(now.getTime() + istOffset);
        const istTimestamp = istDate.toISOString().replace('T', ' ').substring(0, 19);

        // Wait for DB save before sending response
        db.run(
            'INSERT INTO history (filename, extracted_text, score, log, missed_keywords, user_email, manualReviewFlag, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [filename, studentText, score, log, missedKeywordsString, userEmail, isManualReview ? 1 : 0, istTimestamp],
            function(err) {
                if (err) {
                    console.error('SQL ERROR during history insertion:', err.message);
                    return res.json({ score, log, manualReview: isManualReview, missedKeywords: missedKeywordsArray, historySaved: false });
                }
                console.log(`SUCCESS: Result saved to database for ${userEmail}`);
                res.json({ score, log, manualReview: isManualReview, missedKeywords: missedKeywordsArray, historySaved: true, historyId: this.lastID });
            }
        );
    } catch (err) {
        console.error('Grading engine error:', err);
        res.status(500).json({ error: 'Grading engine error' });
    }
});

app.post('/extract-text', upload.single('file'), async (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    try {
        const extractedText = await extractTextFromFile(req.file);
        res.json({ success: true, text: extractedText });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to extract text from file' });
    }
});

app.get('/analytics-data', (req, res) => {
    const data = {
        performanceTrend: [],
        gradeDistribution: [],
        reviewRatio: [],
        stats: {
            highestScore: 0,
            lowestScore: 100,
            mostMissedKeyword: 'None'
        }
    };

    db.all(`SELECT score, log, extracted_text, timestamp, missed_keywords FROM history`, [], (err, rows) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        
        if (rows.length === 0) {
            return res.json(data);
        }

        let buckets = { '0-25%': 0, '26-50%': 0, '51-75%': 0, '76-100%': 0 };
        let reviewCounts = { 'Auto-Graded': 0, 'Manual Review Required': 0 };
        let scoresByDate = {};
        let keywordMisses = {};
        let highest = 0;
        let lowest = 100;

        rows.forEach(row => {
            const score = row.score;
            if (score > highest) highest = score;
            if (score < lowest) lowest = score;

            if (score <= 25) buckets['0-25%']++;
            else if (score <= 50) buckets['26-50%']++;
            else if (score <= 75) buckets['51-75%']++;
            else buckets['76-100%']++;

            // Simple heuristic to calculate manual review required
            const isManualReview = row.log.includes('manualReviewFlag') || (score <= 25 && row.extracted_text && row.extracted_text.split(' ').length > 50);
            if (isManualReview) {
                reviewCounts['Manual Review Required']++;
            } else {
                reviewCounts['Auto-Graded']++;
            }

            const dateStr = row.timestamp.split(' ')[0]; // 'YYYY-MM-DD'
            if (!scoresByDate[dateStr]) scoresByDate[dateStr] = { sum: 0, count: 0 };
            scoresByDate[dateStr].sum += score;
            scoresByDate[dateStr].count++;

            if (row.missed_keywords) {
                try {
                    const missed = JSON.parse(row.missed_keywords);
                    missed.forEach(kw => {
                        keywordMisses[kw] = (keywordMisses[kw] || 0) + 1;
                    });
                } catch (e) {}
            }
        });

        data.performanceTrend = Object.keys(scoresByDate).sort().slice(-30).map(date => ({
            date,
            avgScore: Math.round(scoresByDate[date].sum / scoresByDate[date].count)
        }));

        data.gradeDistribution = Object.keys(buckets).map(name => ({ name, count: buckets[name] }));
        
        data.reviewRatio = [
            { name: 'Auto-Graded', value: reviewCounts['Auto-Graded'] },
            { name: 'Manual Review Required', value: reviewCounts['Manual Review Required'] }
        ];

        data.stats.highestScore = highest;
        data.stats.lowestScore = lowest === 100 && highest === 0 ? 0 : lowest;

        let mostMissed = 'None';
        let maxMisses = 0;
        Object.keys(keywordMisses).forEach(kw => {
            if (keywordMisses[kw] > maxMisses) {
                maxMisses = keywordMisses[kw];
                mostMissed = kw;
            }
        });
        data.stats.mostMissedKeyword = mostMissed;

        res.json(data);
    });
});

app.get('/', (req, res) => {
    res.send('Gradelens Backend API is running');
});

// Manual backup route
app.get('/admin/backup', async (req, res) => {
    // In a real production app, check an admin API key or session here
    try {
        const result = await syncToSheets();
        res.json({ message: 'Backup successful', result });
    } catch (err) {
        res.status(500).json({ error: 'Backup failed', details: err.message });
    }
});

// Schedule nightly backup at midnight
cron.schedule('0 0 * * *', async () => {
    console.log('Running nightly Google Sheets backup...');
    try {
        await syncToSheets();
    } catch (err) {
        console.error('Nightly backup failed:', err.message);
    }
});

// Schedule 30-day history cleanup at 1:00 AM
cron.schedule('0 1 * * *', () => {
    console.log('Running 30-day history cleanup...');
    db.run("DELETE FROM history WHERE timestamp < DATETIME('now', '-30 days')", function(err) {
        if (err) {
            console.error('Cleanup task failed:', err.message);
        } else {
            console.log(`Cleanup task completed. Removed ${this.changes} old history records.`);
        }
    });
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

const { google } = require('googleapis');
const { db } = require('../database');
require('dotenv').config();

async function syncToSheets() {
    try {
        const auth = new google.auth.GoogleAuth({
            credentials: {
                client_email: process.env.CLIENT_EMAIL,
                private_key: process.env.PRIVATE_KEY.replace(/\\n/g, '\n'),
            },
            scopes: ['https://www.googleapis.com/auth/spreadsheets'],
        });
        
        const client = await auth.getClient();
        const sheets = google.sheets({ version: 'v4', auth: client });
        const spreadsheetId = process.env.SPREADSHEET_ID;

        if (!spreadsheetId || !process.env.CLIENT_EMAIL || !process.env.PRIVATE_KEY) {
            throw new Error('Google Sheets credentials (CLIENT_EMAIL, PRIVATE_KEY) or SPREADSHEET_ID missing in .env');
        }

        // ── Fetch Users ──
        const users = await new Promise((resolve, reject) => {
            db.all('SELECT id, email, password, username FROM users', [], (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });

        // ── Fetch Essay History ──
        const history = await new Promise((resolve, reject) => {
            db.all('SELECT id, filename, extracted_text, score, log, timestamp, missed_keywords, user_email, manualReviewFlag FROM history', [], (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });

        // ── Fetch MCQ History ──
        const mcqHistory = await new Promise((resolve, reject) => {
            db.all('SELECT id, score, correctCount, totalQuestions, mistakes, user_email, timestamp FROM mcq_history', [], (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });

        // ── Prepare User Data ──
        const userValues = [
            ['ID', 'Email', 'Hashed Password', 'Username'],
            ...users.map(u => [u.id, u.email, u.password, u.username || ''])
        ];

        // ── Prepare Essay History Data ──
        const historyHeaders = ['ID', 'Filename', 'Extracted Text', 'Score', 'Log', 'Timestamp', 'Missed Keywords', 'user_email', 'manualReview'];
        const sheetPayloads = history.map(h => ({
            'ID': h.id,
            'Filename': h.filename || 'Direct Text Input',
            'Extracted Text': h.extracted_text,
            'Score': h.score,
            'Log': h.log,
            'Timestamp': h.timestamp,
            'Missed Keywords': h.missed_keywords || '',
            'user_email': h.user_email || '',
            'manualReview': h.manualReviewFlag ? 'TRUE' : 'FALSE'
        }));
        const historyValues = [
            historyHeaders,
            ...sheetPayloads.map(payload => historyHeaders.map(header => payload[header]))
        ];

        // ── Prepare MCQ History Data ──
        const mcqHeaders = ['ID', 'Score', 'Correct Count', 'Total Questions', 'Mistakes', 'User Email', 'Timestamp'];
        const mcqPayloads = mcqHistory.map(m => ({
            'ID': m.id,
            'Score': m.score,
            'Correct Count': m.correctCount,
            'Total Questions': m.totalQuestions,
            'Mistakes': m.mistakes || '',
            'User Email': m.user_email || '',
            'Timestamp': m.timestamp
        }));
        const mcqValues = [
            mcqHeaders,
            ...mcqPayloads.map(payload => mcqHeaders.map(header => payload[header]))
        ];

        console.log(`Syncing to Sheets: ${users.length} users, ${history.length} essay records, ${mcqHistory.length} MCQ records.`);

        // ── Verify required tabs exist ──
        const verifySheetExists = async (sheetTitle) => {
            const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId });
            const existing = spreadsheet.data.sheets.map(s => s.properties.title);
            if (!existing.includes(sheetTitle)) {
                console.error(`Sync Error: Could not find a tab named '${sheetTitle}'. Please create it in the Google Sheet.`);
                return false;
            }
            return true;
        };

        // Verify all tabs before writing
        const usersTabOk = await verifySheetExists('Users');
        const historyTabOk = await verifySheetExists('History');
        const mcqTabOk = await verifySheetExists('mcq_history');

        // ── Update Users tab ──
        if (usersTabOk) {
            await sheets.spreadsheets.values.update({
                spreadsheetId,
                range: 'Users!A1',
                valueInputOption: 'USER_ENTERED',
                resource: { values: userValues }
            });
        }

        // ── Update Essay History tab ──
        if (historyTabOk) {
            await sheets.spreadsheets.values.update({
                spreadsheetId,
                range: 'History!A1',
                valueInputOption: 'USER_ENTERED',
                resource: { values: historyValues }
            });
        }

        // ── Update MCQ History tab ──
        if (mcqTabOk) {
            await sheets.spreadsheets.values.update({
                spreadsheetId,
                range: 'mcq_history!A1',
                valueInputOption: 'USER_ENTERED',
                resource: { values: mcqValues }
            });
        }

        console.log(`Successfully synced ${users.length} users, ${history.length} essay records, and ${mcqHistory.length} MCQ records.`);
        return { success: true, usersCount: users.length, historyCount: history.length, mcqHistoryCount: mcqHistory.length };
    } catch (error) {
        console.error('Google Sheets Sync Failed:', error.response ? error.response.data : error);
        throw error;
    }
}

module.exports = { syncToSheets };

const { google } = require('googleapis');
const { db } = require('../database');
require('dotenv').config();

async function syncToSheets() {
    try {
        const auth = new google.auth.GoogleAuth({
            keyFile: process.env.GOOGLE_APPLICATION_CREDENTIALS,
            scopes: ['https://www.googleapis.com/auth/spreadsheets'],
        });
        
        const client = await auth.getClient();
        const sheets = google.sheets({ version: 'v4', auth: client });
        const spreadsheetId = process.env.SPREADSHEET_ID;

        if (!spreadsheetId || !process.env.GOOGLE_APPLICATION_CREDENTIALS) {
            throw new Error('Google Sheets credentials or Spreadsheet ID missing in .env');
        }

        // Fetch users
        const users = await new Promise((resolve, reject) => {
            db.all('SELECT id, email, password, username FROM users', [], (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });

        // Fetch history
        const history = await new Promise((resolve, reject) => {
            db.all('SELECT id, filename, extracted_text, score, log, timestamp, missed_keywords, user_email, manualReviewFlag FROM history', [], (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });

        // Prepare User Data
        const userValues = [
            ['ID', 'Email', 'Hashed Password', 'Username'],
            ...users.map(u => [u.id, u.email, u.password, u.username || ''])
        ];

        // Prepare History Data
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

        const historyHeaders = ['ID', 'Filename', 'Extracted Text', 'Score', 'Log', 'Timestamp', 'Missed Keywords', 'user_email', 'manualReview'];
        
        const historyValues = [
            historyHeaders,
            ...sheetPayloads.map(payload => historyHeaders.map(header => payload[header]))
        ];

        console.log('Syncing payload to Sheets:', sheetPayloads);

        // Update Users tab
        await sheets.spreadsheets.values.update({
            spreadsheetId,
            range: 'Users!A1',
            valueInputOption: 'USER_ENTERED',
            resource: { values: userValues }
        });

        // Update History tab
        await sheets.spreadsheets.values.update({
            spreadsheetId,
            range: 'History!A1',
            valueInputOption: 'USER_ENTERED',
            resource: { values: historyValues }
        });

        console.log(`Successfully synced ${users.length} users and ${history.length} history records.`);
        return { success: true, usersCount: users.length, historyCount: history.length };
    } catch (error) {
        console.error('Google Sheets Sync Failed:', error.response ? error.response.data : error);
        throw error;
    }
}

module.exports = { syncToSheets };

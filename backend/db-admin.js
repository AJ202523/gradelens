// Quick DB admin script — run with: node db-admin.js
// Modify the SQL command below to make direct database changes.

const { db } = require('./database');

// Wait for DB to initialize, then run commands
setTimeout(() => {
  
  // --- VIEW ALL USERS ---
  db.all('SELECT id, email, username FROM users', [], (err, rows) => {
    if (err) return console.error('Error:', err.message);
    console.log('\n=== USERS ===');
    console.table(rows);
  });

  // --- VIEW HISTORY ---
  db.all('SELECT id, filename, score, timestamp FROM history ORDER BY timestamp DESC LIMIT 10', [], (err, rows) => {
    if (err) return console.error('Error:', err.message);
    console.log('\n=== RECENT HISTORY (last 10) ===');
    console.table(rows);
  });

  // --- EXAMPLE: Update a user's username ---
  // Uncomment and modify the line below to set a username:
  // db.run("UPDATE users SET username = 'myuser' WHERE email = 'test@gradelens.com'", (err) => {
  //   if (err) console.error('Update error:', err.message);
  //   else console.log('Username updated!');
  // });

  // --- EXAMPLE: Delete all users ---
  // db.run("DELETE FROM users", (err) => {
  //   if (err) console.error('Delete error:', err.message);
  //   else console.log('All users deleted!');
  // });

  // Close after commands finish
  setTimeout(() => process.exit(0), 2000);

}, 1000);

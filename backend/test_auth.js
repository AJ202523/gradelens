const http = require('http');

const request = (path, method, body) => {
    return new Promise((resolve, reject) => {
        const req = http.request({
            hostname: 'localhost',
            port: 3001,
            path: path,
            method: method,
            headers: {
                'Content-Type': 'application/json'
            }
        }, res => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    resolve({ status: res.statusCode, body: JSON.parse(data) });
                } catch(e) {
                    resolve({ status: res.statusCode, body: data });
                }
            });
        });
        req.on('error', reject);
        if (body) req.write(JSON.stringify(body));
        req.end();
    });
};

(async () => {
    try {
        console.log('Testing invalid email...');
        let res = await request('/register', 'POST', { email: 'bademail', password: 'password123' });
        console.log(res);

        console.log('\nTesting valid register...');
        const email = `test${Date.now()}@example.com`;
        res = await request('/register', 'POST', { email, password: 'password123' });
        console.log(res);

        console.log('\nTesting valid login...');
        res = await request('/login', 'POST', { email, password: 'password123' });
        console.log(res);

        console.log('\nTesting invalid login...');
        res = await request('/login', 'POST', { email, password: 'wrongpassword' });
        console.log(res);

    } catch (e) {
        console.error(e);
    }
})();

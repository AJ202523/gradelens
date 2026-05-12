const multer = require('multer');
const express = require('express');
const pdf = require('pdf-parse');
const upload = multer({ storage: multer.memoryStorage() });

const app = express();
app.post('/test', upload.single('file'), async (req, res) => {
    try {
        const data = await pdf(req.file.buffer);
        res.send({ text: data.text });
    } catch (e) {
        res.status(500).send({ error: e.message });
    }
});
app.listen(3005, () => console.log('Listening on 3005'));

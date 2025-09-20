// Sampurna ERP PDF Receipt Generation API
// Install dependencies: npm install express pdfkit body-parser

const express = require('express');
const PDFDocument = require('pdfkit');
const bodyParser = require('body-parser');

const app = express();
app.use(bodyParser.json());
// Allow CORS in local demo
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') return res.sendStatus(200);
    next();
});

// Serve static frontend (public folder)
app.use(express.static('public'));
app.get('/', (_req, res) => {
    res.redirect('/login.html');
});

app.post('/api/generate-receipt', (req, res) => {
    const data = req.body;
    res.setHeader('Content-Type', 'application/pdf');
    const doc = new PDFDocument({ margin: 50 });
    doc.pipe(res);

    // ===== Header =====
    doc.fontSize(18).text('SAMPURNA COLLEGE OF ENGINEERING', { align: 'center' }).moveDown(0.5);
    doc.fontSize(12).text('Address: City, State, Pincode | Phone: +91-XXXXXXXXXX', { align: 'center' }).moveDown(1);
    doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();

    // ===== Receipt Info =====
    doc.moveDown(1);
    doc.fontSize(12).text(`Receipt No: ${data.receiptNo}`, { align: 'left' });
    doc.text(`Date: ${data.date}`, { align: 'right' });
    doc.moveDown(1);
    doc.text(`Received from: ${data.studentName}`);
    doc.text(`Student ID: ${data.studentId}`);
    doc.text(`Course/Year: ${data.courseYear}`);
    doc.moveDown(1);
    doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();

    // ===== Fee Table =====
    doc.moveDown(0.5);
    doc.font('Helvetica-Bold').text('Particulars', 70).text('Amount (₹)', 400);
    doc.font('Helvetica').moveDown(0.5);
    let total = 0;
    data.fees.forEach((item) => {
        doc.text(item.name, 70).text(item.amount.toFixed(2), 400);
        total += item.amount;
    });
    doc.moveDown(0.5);
    doc.font('Helvetica-Bold').text('TOTAL', 70).text(total.toFixed(2), 400);
    doc.moveDown(1);
    doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();

    // ===== Payment Info =====
    doc.moveDown(1);
    doc.font('Helvetica').text(`Payment Mode: ${data.paymentMode}`);
    if (data.transactionId) doc.text(`Transaction ID: ${data.transactionId}`);
    doc.moveDown(1);
    doc.text(`Remarks: ${data.remarks || 'N/A'}`);
    doc.moveDown(2);

    // ===== Signatures =====
    doc.text('Authorized Signatory', 70);
    doc.text('Student/Guardian', 400);

    doc.end();
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`PDF Receipt API running on port ${PORT}`);
});

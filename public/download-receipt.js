// Sampurna ERP: Download PDF Receipt from API
// Usage: Call downloadReceipt(receiptData) from your admin panel

export function downloadReceipt(receiptData) {
    fetch('http://localhost:3001/api/generate-receipt', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(receiptData)
    })
    .then(response => {
        if (!response.ok) throw new Error('Failed to generate PDF');
        return response.blob();
    })
    .then(blob => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'FeeReceipt.pdf';
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
    })
    .catch(err => {
        alert('Error: ' + err.message);
    });
}

// Example usage:
// downloadReceipt({
//   receiptNo: "2025-001",
//   date: "15/09/2025",
//   studentName: "Rohit Sharma",
//   studentId: "STU12345",
//   courseYear: "B.Tech CSE - 2nd Year",
//   fees: [
//     { name: "Admission Fee", amount: 5000 },
//     { name: "Tuition Fee", amount: 25000 },
//     { name: "Hostel Fee", amount: 12000 },
//     { name: "Library Fee", amount: 2000 }
//   ],
//   paymentMode: "UPI",
//   transactionId: "TXN99887766",
//   remarks: "First installment"
// });
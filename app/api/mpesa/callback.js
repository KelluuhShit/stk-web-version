const express = require('express');
const cors = require('cors');  // Import CORS package
const app = express();
const port = 5501;

// Use CORS middleware to enable cross-origin requests
app.use(cors({ origin: 'http://127.0.0.1:5500' }));  // Allow only the frontend at this address

app.use(express.json());  // Parse JSON bodies
app.use(express.urlencoded({ extended: true }));  // Parse URL-encoded bodies

// GET endpoint to send a message to the frontend
app.get('/api/mpesa/message', (req, res) => {
    res.json({ message: 'This is the payment message from the server' });
});

// POST endpoint to handle M-Pesa callback
app.post('/api/mpesa/callback', async (req, res) => {
    console.log('Request Content-Type:', req.headers['content-type']);
    console.log('Received Callback:', req.body);
    console.log('Request Headers:', req.headers);

    const data = req.body;

    // Check if the expected keys are present in the body
    if (!data || !data.Body || !data.Body.stkCallback) {
        console.error('Callback data is missing required structure');
        return res.status(400).json({ status: 'error', message: 'Invalid callback data structure' });
    }

    // Process the callback data
    const resultCode = data.Body.stkCallback.ResultCode;
    const resultDesc = data.Body.stkCallback.ResultDesc;

    console.log('Result Code:', resultCode);
    console.log('Result Description:', resultDesc);

    // Handle different result codes
    if (resultCode === 0) {
        // Successful transaction
        const body = data.Body.stkCallback.CallbackMetadata;
        const amountObj = body.Item.find((obj) => obj.Name === "Amount");
        const amount = amountObj ? amountObj.Value : null;
        const mpesaCode = body.Item.find((obj) => obj.Name === "MpesaReceiptNumber")?.Value;
        const phoneNumber = body.Item.find((obj) => obj.Name === "PhoneNumber")?.Value?.toString();

        console.log('Transaction Details:', { amount, mpesaCode, phoneNumber });

        // Here, you would save these details to your database or process as required
        return res.status(200).json({
            status: 'success',
            message: 'Transaction processed successfully',
            transaction: { amount, mpesaCode, phoneNumber }
        });
    } else if (resultCode === 1) {
        // Payment failed
        console.error('Payment failed:', resultDesc);
        return res.status(200).json({
            status: 'failed',
            message: resultDesc
        });
    } else if (resultCode === 1032) {
        // Payment was cancelled by the user
        console.log('Payment was cancelled by the user:', resultDesc);
        return res.status(200).json({
            status: 'cancelled',
            message: 'Payment was cancelled by the user.'
        });
    } else {
        // Unexpected result code
        console.error('Unexpected result code:', resultCode);
        return res.status(500).json({
            status: 'error',
            message: 'Unexpected error occurred'
        });
    }
});

app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
});

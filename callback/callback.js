const express = require('express');
const cors = require('cors');
const axios = require('axios');  // Import axios for making HTTP requests (for polling)
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

// GET endpoint to send cancellation message when payment is cancelled
app.get('/api/mpesa/cancellation-message', (req, res) => {
    res.json({ message: 'Your payment was cancelled by the user.' });
});

app.post('/callback', async (req, res) => {
    console.log('Request Content-Type:', req.headers['content-type']);
    console.log('Received Callback:', req.body);
    console.log('Request Headers:', req.headers);

    const data = req.body;

    // Check if the expected keys are present in the body
    if (!data || !data.Body || !data.Body.stkCallback) {
        console.error('Callback data is missing required structure');
        return res.status(400).json({ status: 'error', message: 'Invalid callback data structure' });
    }

    // Extract the CheckoutRequestID for polling
    const checkoutRequestID = data.Body.stkCallback.CheckoutRequestID;

    console.log('CheckoutRequestID:', checkoutRequestID);

    // Start polling to check the transaction status
    let attempts = 0;
    const maxAttempts = 30;  // Limit to 30 attempts (30 seconds)
    let pollInterval;

    const pollStatus = async () => {
        if (attempts >= maxAttempts) {
            console.log('Max attempts reached. Stopping polling.');
            clearInterval(pollInterval);
            return res.status(408).json({ status: 'error', message: 'Transaction status polling timed out' });
        }

        // Poll the M-Pesa API to check the transaction status
        try {
            const response = await axios.get(`https://7c84-154-159-238-133.ngrok-free.app/${checkoutRequestID}`);  // Replace with your status-checking URL
            const statusData = response.data;

            const resultCode = statusData.resultCode;
            const resultDesc = statusData.resultDesc;

            console.log(`Polling attempt ${attempts + 1}: Result Code: ${resultCode}, Result Desc: ${resultDesc}`);

            // If status is final, stop polling
            if (resultCode === 0 || resultCode === 1 || resultCode === 1032) {
                clearInterval(pollInterval);  // Stop polling
                handleTransactionResult(resultCode, resultDesc);
            }
        } catch (error) {
            console.error('Error polling status:', error.message);
        }

        attempts += 1;
    };

    // Start polling every 1 second
    pollInterval = setInterval(pollStatus, 1000);

    // Function to handle the transaction result
    const handleTransactionResult = (resultCode, resultDesc) => {
        // Handle different result codes
        if (resultCode === 0) {
            // Successful transaction
            console.log('Transaction successful:', resultDesc);
            return res.status(200).json({
                status: 'success',
                message: 'Transaction processed successfully',
                transaction: { resultDesc }
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
            console.log('Payment cancelled by the user:', resultDesc);
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
    };
});

app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
});

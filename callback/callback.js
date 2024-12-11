//callback.js
const express = require('express');
const axios = require('axios');
const bodyParser = require('body-parser');

const app = express();
const PORT = 5501;

// Middleware to parse JSON
app.use(bodyParser.json());

// Callback endpoint
app.post('/callback', async (req, res) => {
    console.log('Received Callback:', req.body);

    const data = req.body;

    // Validate callback structure
    if (!data || !data.Body || !data.Body.stkCallback) {
        console.error('Callback data is missing required structure');
        return res.status(400).json({ status: 'error', message: 'Invalid callback data structure' });
    }

    const checkoutRequestID = data.Body.stkCallback.CheckoutRequestID;
    console.log('CheckoutRequestID:', checkoutRequestID);

    let attempts = 0;
    const maxAttempts = 30; // Maximum polling attempts
    const pollIntervalMs = 1000; // Polling interval in milliseconds

    // Function to handle the transaction result
    const handleTransactionResult = (resultCode, resultDesc) => {
        clearInterval(pollInterval); // Stop polling

        // Respond based on the result code
        switch (resultCode) {
            case 0:
                console.log('Transaction successful:', resultDesc);
                res.status(200).json({
                    status: 'success',
                    message: 'Transaction processed successfully',
                    transaction: { resultDesc }
                });
                break;
            case 1032:
                console.log('Payment cancelled by the user:', resultDesc);
                res.status(200).json({
                    status: 'cancelled',
                    message: 'Payment was cancelled by the user.',
                    transaction: { resultDesc }
                });
                break;
            default:
                console.error('Payment failed or unknown error:', resultDesc);
                res.status(500).json({
                    status: 'error',
                    message: resultDesc || 'Unexpected error occurred'
                });
                break;
        }
    };

    // Function to poll the transaction status
    const pollStatus = async () => {
        attempts += 1;

        if (attempts > maxAttempts) {
            console.error('Max attempts reached. Stopping polling.');
            clearInterval(pollInterval);
            return res.status(408).json({
                status: 'error',
                message: 'Transaction status polling timed out'
            });
        }

        try {
            const response = await axios.get(
                `https://7c84-154-159-238-133.ngrok-free.app/status/${checkoutRequestID}`
            );
            const { resultCode, resultDesc } = response.data;

            console.log(`Polling attempt ${attempts}: Result Code: ${resultCode}, Result Desc: ${resultDesc}`);

            // Check if the transaction is finalized
            if (resultCode !== undefined) {
                handleTransactionResult(resultCode, resultDesc);
            }
        } catch (error) {
            console.error('Error polling status:', error.message);

            // Handle 404 separately for clarity
            if (error.response && error.response.status === 404) {
                console.warn('Status endpoint returned 404 - transaction might not be available yet.');
            } else {
                console.error('Unexpected error during polling:', error.message);
            }
        }
    };

    const pollInterval = setInterval(pollStatus, pollIntervalMs); // Poll every second
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running at http://localhost:${PORT}`);
});

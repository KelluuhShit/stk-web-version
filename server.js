// server.js
const express = require('express');
const axios = require('axios');
const cors = require('cors');
const bodyParser = require('body-parser');
const app = express();
const port = 5500;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Generate the current timestamp in the required format
const getTimeStamp = () => {
    const date = new Date();
    return date.getFullYear() +
        ("0" + (date.getMonth() + 1)).slice(-2) +
        ("0" + date.getDate()).slice(-2) +
        ("0" + date.getHours()).slice(-2) +
        ("0" + date.getMinutes()).slice(-2) +
        ("0" + date.getSeconds()).slice(-2);
};

// Function to get an access token from Mpesa API (OAuth2)
const getAccessToken = async () => {
    const secret = "rFgSiLYrO30JvquYI7iUHLZx1Cs4mAF4KZ1xsArn0sXZvhQrA61xvgcme8bZWRhA";
    const consumer = "zkNP0DwqSy5O5k72biYXZAMM1WpGGcDdeleVFbwxJAKwMJS0";
    const auth = Buffer.from(`${consumer}:${secret}`).toString("base64");
    
    try {
        const response = await axios.get(
            "https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials",
            {
                headers: {
                    Authorization: `Basic ${auth}`,
                },
            }
        );
        console.log("Access Token:", response.data.access_token);
        return response.data.access_token;
    } catch (err) {
        console.error('Error obtaining access token:', err.message);
        throw new Error('Failed to generate token');
    }
};

// Callback endpoint
app.post('/api/mpesa/callback', async (req, res) => {
    const data = req.body;

    if (!data || !data.Body || !data.Body.stkCallback) {
        return res.status(400).json({ status: 'error', message: 'Invalid callback data structure' });
    }

    const callbackData = data.Body.stkCallback;
    const resultCode = callbackData.ResultCode;
    const resultDesc = callbackData.ResultDesc;

    // Handle missing or incomplete transactions
    if (!callbackData.CallbackMetadata) {
        console.warn('Transaction failed or cancelled:', resultDesc);

        if (resultCode === 1032) { // Assuming 1032 is the cancellation code
            return res.status(200).json({
                status: 'cancelled',
                message: 'Payment was cancelled by the user.',
                transaction: { resultDesc }
            });
        }

        return res.status(200).json({
            status: 'error',
            message: resultDesc || 'Transaction failed.',
            transaction: { resultDesc }
        });
    }

    // Extract values from the callback metadata
    const body = callbackData.CallbackMetadata;
    const amountObj = body.Item.find((obj) => obj.Name === "Amount");
    const amount = amountObj?.Value;
    const mpesaCode = body.Item.find((obj) => obj.Name === "MpesaReceiptNumber")?.Value;
    const phoneNumber = body.Item.find((obj) => obj.Name === "PhoneNumber")?.Value?.toString();

    try {
        console.log({ amount, mpesaCode, phoneNumber });

        // Return success response
        return res.status(200).json({
            status: 'success',
            message: 'Transaction processed successfully',
            transaction: { amount, mpesaCode, phoneNumber, resultDesc }
        });
    } catch (error) {
        console.error('Error processing transaction:', error);

        return res.status(500).json({
            status: 'error',
            message: 'Error processing transaction'
        });
    }
});

// Function that interacts with Mpesa API to initiate STK Push
const initiateSTKPush = async (mpesaPhone, amount, accessToken) => {
    const shortcode = "174379";
    const passkey = "bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919"; // Replace with the correct passkey
    const timestamp = getTimeStamp();
    const password = Buffer.from(`${shortcode}${passkey}${timestamp}`).toString("base64");

    const headers = {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
    };

    // Format phone number correctly
    const formattedPhone = `254${mpesaPhone.slice(1)}`;

    const data = {
        "BusinessShortCode": shortcode,
        "Password": password,
        "Timestamp": timestamp,
        "TransactionType": "CustomerPayBillOnline",
        "Amount": amount,
        "PartyA": formattedPhone,
        "PartyB": shortcode,
        "PhoneNumber": formattedPhone,
        "CallBackURL": "https://255e-196-96-126-115.ngrok-free.app/callback",
        "AccountReference": "Apex Ventures",
        "TransactionDesc": "Testing STK Push",
    };

    try {
        const response = await axios.post('https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest', data, { headers });
        console.log('M-Pesa Response:', response.data); // Log the response from M-Pesa
        return response.data;
    } catch (error) {
        console.error('Error in STK Push request:', error.response ? error.response.data : error.message);
        throw new Error('Failed to initiate STK push');
    }
};

// Endpoint to initiate STK Push
app.post('/api/mpesa/stkpush', async (req, res) => {
    const { mpesaPhone, amount } = req.body;

    if (!mpesaPhone || !amount) {
        return res.status(400).json({ message: 'Phone number and amount are required' });
    }

    try {
        // Get an access token from M-Pesa API
        const accessToken = await getAccessToken();

        // Make the STK Push request to M-Pesa
        const stkResponse = await initiateSTKPush(mpesaPhone, amount, accessToken);

        // Check the response from M-Pesa
        if (stkResponse && stkResponse.ResponseCode === '0') {  // Assuming '0' means success
            return res.status(200).json({ status: 'success', message: 'Payment initiated successfully' });
        } else {
            console.error('M-Pesa STK Push error:', stkResponse);  // Log M-Pesa error for debugging
            return res.status(500).json({ status: 'error', error: stkResponse.ResultDesc || 'Payment initiation failed' });
        }
    } catch (error) {
        console.error("Error initiating STK Push:", error);
        return res.status(500).json({ status: 'error', error: 'Failed to initiate payment' });
    }
});

// Callback endpoint for status polling
app.post('/api/mpesa/callback', async (req, res) => {
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
                `https://255e-196-96-126-115.ngrok-free.app/status/${checkoutRequestID}`
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
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});

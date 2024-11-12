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

// POST endpoint to handle Mpesa callback
app.post('/api/mpesa/callback', async (req, res) => {
    const data = req.body;

    // Process the callback data
    if (!data.Body.stkCallback.CallbackMetadata) {
        // Handle failed transactions
        console.log(data.Body.stkCallback.ResultDesc);
        return res.status(200).json({ message: "ok saf" });
    }

    // Extract values from the callback metadata and process them
    const body = data.Body.stkCallback.CallbackMetadata;
    const amountObj = body.Item.find((obj) => obj.Name === "Amount");
    const amount = amountObj?.Value;
    const mpesaCode = body.Item.find((obj) => obj.Name === "MpesaReceiptNumber")?.Value;
    const phoneNumber = body.Item.find((obj) => obj.Name === "PhoneNumber")?.Value?.toString();

    try {
        // Process the transaction (e.g., save to your database)
        console.log({ amount, mpesaCode, phoneNumber });
        res.status(200).json({ message: 'Transaction processed successfully' });
    } catch (error) {
        console.error('Error processing transaction:', error);
        res.status(500).json({ message: 'Error processing transaction' });
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
        "CallBackURL": "https://c782-197-248-118-123.ngrok-free.app/api/mpesa/callback",
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



// Start the server
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});

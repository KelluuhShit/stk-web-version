// /api/mpesa/callback.js

const express = require('express');
const app = express();
const port = 5500;

// Middleware to parse JSON bodies
app.use(express.json());

// POST endpoint to handle Mpesa callback
app.post('/api/mpesa/callback', async (req, res) => {
    const data = req.body;

    if (!data.Body.stkCallback.CallbackMetadata) {
        // For failed transactions
        console.log(data.Body.stkCallback.ResultDesc);
        return res.status(200).json({ message: "ok saf" });
    }

    // Extract values from the callback metadata
    const body = data.Body.stkCallback.CallbackMetadata;

    // Amount
    const amountObj = body.Item.find((obj) => obj.Name === "Amount");
    const amount = amountObj?.Value;

    // Mpesa receipt number
    const codeObj = body.Item.find((obj) => obj.Name === "MpesaReceiptNumber");
    const mpesaCode = codeObj?.Value;

    // Phone number (might be hashed in some cases)
    const phoneNumberObj = body.Item.find((obj) => obj.Name === "PhoneNumber");
    const phoneNumber = phoneNumberObj?.Value?.toString();

    try {
        // Process the transaction (e.g., save it to your database)
        console.log({ amount, mpesaCode, phoneNumber });

        // Respond with a success message
        res.status(200).json({ message: 'Transaction processed successfully' });
    } catch (error) {
        // Handle any errors
        console.error('Error processing transaction:', error);
        res.status(500).json({ message: 'Error processing transaction' });
    }
});

// Start the server
app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
});

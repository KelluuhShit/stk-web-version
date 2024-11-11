//stkPush.js

const axios = require('axios');

// Function to send STK Push to Mpesa API
async function sendStkPush(mpesa_phone, name, amount) {
    // Mpesa credentials (using provided values directly)
    const shortcode = 174379;  // Your Lipa na Mpesa shortcode
    const lipaNaMpesaOnlineSecurityCredential = 'bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919';
    const lipaNaMpesaOnlineLipaNaMpesaUrl = 'https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest'; // Ensure this points to the correct endpoint

    // Generate a new access token for Mpesa API (OAuth2)
    const authToken = await getAccessToken();
    if (!authToken) {
        throw new Error('Failed to obtain authentication token');
    }

    // Prepare the payload for the STK Push request
    const payload = {
        BusinessShortcode: shortcode,
        LipaNaMpesaOnlineShortcode: shortcode,
        LipaNaMpesaOnlineSecurityCredential: lipaNaMpesaOnlineSecurityCredential,
        PhoneNumber: mpesa_phone,
        Amount: amount,
        // You can add more parameters depending on the Mpesa API documentation (like AccountReference, TransactionDesc, etc.)
    };

    // Send STK Push request to Mpesa API
    try {
        const response = await axios.post(lipaNaMpesaOnlineLipaNaMpesaUrl, payload, {
            headers: {
                Authorization: `Bearer ${authToken}`,
                'Content-Type': 'application/json',
            }
        });
        return response.data; // Return the response from Mpesa API
    } catch (error) {
        console.error("Error sending STK Push:", error.message);
        throw new Error("Error sending STK Push");
    }
}

// Function to get a new access token from Mpesa API (OAuth2)
async function getAccessToken() {
    const credentials = Buffer.from('zkNP0DwqSy5O5k72biYXZAMM1WpGGcDdeleVFbwxJAKwMJS0:rFgSiLYrO30JvquYI7iUHLZx1Cs4mAF4KZ1xsArn0sXZvhQrA61xvgcme8bZWRhA').toString('base64');
    
    try {
        const response = await axios.post('https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials', {}, {
            headers: {
                Authorization: `Basic ${credentials}`,
            }
        });

        console.log("Full Response:", response.data); // Log the full response for debugging
        return response.data.access_token;
    } catch (error) {
        console.error('Error obtaining access token:', error.message);
        return null;
    }
}

module.exports = { sendStkPush };

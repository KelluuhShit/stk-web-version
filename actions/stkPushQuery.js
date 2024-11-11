//stkPushQuery.js

const axios = require('axios');

// Function to query the status of the STK Push
async function stkPushQuery(CheckoutRequestID) {
    // Get the access token
    const authToken = await getAccessToken();
    if (!authToken) {
        throw new Error('Failed to obtain authentication token');
    }

    // URL for Mpesa API to query STK Push status
    const queryUrl = 'https://sandbox.safaricom.co.ke/mpesa/stkpushquery/v1/query'; // Correct URL for sandbox

    const payload = {
        BusinessShortcode: 174379, // Use the MPESA_SHORTCODE directly
        LipaNaMpesaOnlineShortcode: 174379, // Use the MPESA_SHORTCODE directly
        CheckoutRequestID: CheckoutRequestID,
    };

    try {
        // Send the STK Push query request to Mpesa
        const response = await axios.post(queryUrl, payload, {
            headers: {
                Authorization: `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            }
        });
        return { data: response.data }; // Return response data from Mpesa
    } catch (error) {
        console.error("Error querying STK Push status:", error.message);
        return { error: error.message }; // Return error message
    }
}

// Function to get an access token from Mpesa API (OAuth2)
async function getAccessToken() {
    const credentials = Buffer.from('zkNP0DwqSy5O5k72biYXZAMM1WpGGcDdeleVFbwxJAKwMJS0:rFgSiLYrO30JvquYI7iUHLZx1Cs4mAF4KZ1xsArn0sXZvhQrA61xvgcme8bZWRhA').toString('base64'); // Use the provided credentials
    
    try {
        const response = await axios.post('https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials', {}, {
            headers: {
                Authorization: `Basic ${credentials}`,
            }
        });

        console.log("Access Token:", response.data.access_token); // Log the access token for debugging
        return response.data.access_token;
    } catch (error) {
        console.error('Error obtaining access token:', error.message);
        return null;
    }
}

module.exports = { stkPushQuery };

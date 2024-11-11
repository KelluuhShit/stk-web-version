document.addEventListener('DOMContentLoaded', function () {
    const paymentForm = document.getElementById('payment-form');
    const loadingDiv = document.getElementById('loading');
    const successDiv = document.getElementById('success');
    const errorDiv = document.getElementById('error');

    // Hide success, error, and loading divs initially
    loadingDiv.classList.add('hidden');
    successDiv.classList.add('hidden');
    errorDiv.classList.add('hidden');

    paymentForm.addEventListener('submit', function (event) {
        event.preventDefault(); // Prevent the form from submitting normally

        const name = document.getElementById('name').value;
        const mpesaPhone = document.getElementById('mpesa-phone').value;
        const amount = document.getElementById('amount').value;

        // Show loading div while processing
        loadingDiv.classList.remove('hidden');

        // Prepare the data to be sent to the backend
        const formData = {
            name: name,
            mpesaPhone: mpesaPhone,
            amount: amount
        };

        // Send the data to the server (Backend API call)
        fetch('http://localhost:5500/api/mpesa/stkpush', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(formData)
        })
        .then(response => response.json()) // Parse JSON if the response is OK
        .then(data => {
            console.log(data); // Log the response to check its structure
            if (data.status === 'success') {
                successDiv.classList.remove('hidden');
                successDiv.textContent = 'Payment initiated successfully. Please complete the payment on your phone.';
                loadingDiv.classList.add('hidden');
            } else {
                errorDiv.textContent = data.error || 'Payment initiation failed';
                errorDiv.classList.remove('hidden');
                loadingDiv.classList.add('hidden');
            }
        })
        
        .catch(error => {
            console.error('Error:', error);
            errorDiv.textContent = error.message || 'An error occurred while processing payment.';
            errorDiv.classList.remove('hidden');
            loadingDiv.classList.add('hidden');
        });
        
    });
});

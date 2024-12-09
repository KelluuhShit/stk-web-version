document.addEventListener('DOMContentLoaded', function () {
    const paymentForm = document.getElementById('payment-form');
    const loadingDiv = document.getElementById('loading');
    const successDiv = document.getElementById('success');
    const errorDiv = document.getElementById('error');
    const cancellationDiv = document.getElementById('cancellation');

    // Hide all messages initially
    loadingDiv.classList.add('hidden');
    successDiv.classList.add('hidden');
    errorDiv.classList.add('hidden');
    cancellationDiv.classList.add('hidden');

    paymentForm.addEventListener('submit', function (event) {
        event.preventDefault();

        // Collect form data
        const name = document.getElementById('name').value;
        const mpesaPhone = document.getElementById('mpesa-phone').value;
        const amount = document.getElementById('amount').value;

        // Show loading message while processing
        loadingDiv.classList.remove('hidden');
        successDiv.classList.add('hidden');
        errorDiv.classList.add('hidden');
        cancellationDiv.classList.add('hidden');

        // Form data to send to the backend
        const formData = {
            name: name,
            mpesaPhone: mpesaPhone,
            amount: amount
        };

        // Send data to the backend for processing
        fetch('http://localhost:5500/api/mpesa/stkpush', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(formData)
        })
        .then(response => response.json())
        .then(data => {
            console.log("API Response:", data);

            // Hide loading message once response is received
            loadingDiv.classList.add('hidden');

            // Display appropriate messages based on the status
            if (data.status === 'success') {
                successDiv.classList.remove('hidden');
                successDiv.textContent = 'Payment initiated successfully. Please complete the payment on your phone.';
            } else if (data.status === 'cancelled') {
                cancellationDiv.classList.remove('hidden');
                cancellationDiv.textContent = data.message || 'Payment was cancelled by the user.';
            } else {
                errorDiv.classList.remove('hidden');
                errorDiv.textContent = data.message || 'Payment initiation failed';
            }
        })
        .catch(error => {
            console.error('Error:', error);
            loadingDiv.classList.add('hidden');
            errorDiv.classList.remove('hidden');
            errorDiv.textContent = error.message || 'An error occurred while processing payment.';
        });
    });
});

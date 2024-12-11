document.addEventListener('DOMContentLoaded', function () {
    const paymentForm = document.getElementById('payment-form');
    const loadingDiv = document.getElementById('loading');
    const successDiv = document.getElementById('success');
    const errorDiv = document.getElementById('error');
    const cancellationDiv = document.getElementById('cancellation');

    // Hide all messages initially
    [loadingDiv, successDiv, errorDiv, cancellationDiv].forEach(div => div.classList.add('hidden'));

    paymentForm.addEventListener('submit', function (event) {
        event.preventDefault();

        // Collect form data
        const name = document.getElementById('name').value.trim();
        const mpesaPhone = document.getElementById('mpesa-phone').value.trim();
        const amount = document.getElementById('amount').value.trim();

        // Validate form data
        if (!name || !mpesaPhone || !amount) {
            errorDiv.classList.remove('hidden');
            errorDiv.textContent = 'All fields are required.';
            return;
        }

        // Show loading message while processing
        [loadingDiv, successDiv, errorDiv, cancellationDiv].forEach(div => div.classList.add('hidden'));
        loadingDiv.classList.remove('hidden');

        // Form data to send to the backend
        const formData = { name, mpesaPhone, amount };

        // Send data to the backend for processing
        fetch('http://localhost:5500/api/mpesa/stkpush', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData),
        })
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! Status: ${response.status}`);
                }
                return response.json();
                console.log(response);
            })
            .then(data => {
                console.log("API Response:", data);

                // Hide loading message
                loadingDiv.classList.add('hidden');

                // Display appropriate messages based on the status
                switch (data.status) {
                    case 'success':
                        successDiv.classList.remove('hidden');
                        successDiv.textContent = 'Payment initiated successfully. Please complete the payment on your phone.';
                        break;
                    case 'cancelled':
                        cancellationDiv.classList.remove('hidden');
                        cancellationDiv.textContent = data.transaction?.resultDesc || 'Payment was cancelled by the user.';
                        break;
                    case 'error':
                    default:
                        errorDiv.classList.remove('hidden');
                        errorDiv.textContent = data.message || 'Payment initiation failed.';
                        break;
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

    // components/PaymentForm.js
    
    "use client";
    import React, { useState } from "react";
    import { AxiosError } from "axios";
    import { sendStkPush } from "../actions/stkPush";
    import { stkPushQuery } from "../actions/stkPushQuery";

    import PaymentSuccess from "./Success";
    import STKPushQueryLoading from "./StkQueryLoading";

    const kenyanPhoneNumberRegex =
    /^(07\d{8}|01\d{8}|2547\d{8}|2541\d{8}|\+2547\d{8}|\+2541\d{8})$/;

    function PaymentForm() {
    const [dataFromForm, setDataFromForm] = useState({
        mpesa_phone: "",
        name: "",
        amount: 0,
    });
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [stkQueryLoading, setStkQueryLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");

    const stkPushQueryWithIntervals = (CheckoutRequestID) => {
        let reqcount = 0;
        const timer = setInterval(async () => {
        reqcount += 1;

        if (reqcount === 15) {
            // handle long payment
            clearInterval(timer);
            setStkQueryLoading(false);
            setLoading(false);
            setErrorMessage("You took too long to pay");
        }

        const { data, error } = await stkPushQuery(CheckoutRequestID);

        if (error) {
            if (error instanceof AxiosError) {
            // Now TypeScript knows that error is an AxiosError
            if (error.response && error.response.data.errorCode !== "500.001.1001") {
                setStkQueryLoading(false);
                setLoading(false);
                setErrorMessage(error.response.data.errorMessage);
            }
            } else {
            // Handle other types of errors if needed
            setStkQueryLoading(false);
            setLoading(false);
            setErrorMessage("An unknown error occurred.");
            }
        }

        if (data) {
            if (data.ResultCode === "0") {
            clearInterval(timer);
            setStkQueryLoading(false);
            setLoading(false);
            setSuccess(true);
            } else {
            clearInterval(timer);
            setStkQueryLoading(false);
            setLoading(false);
            setErrorMessage(data?.ResultDesc);
            }
        }
        }, 2000);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
    
        if (!kenyanPhoneNumberRegex.test(dataFromForm.mpesa_phone)) {
        setLoading(false);
        return alert("Invalid Mpesa number");
        }
    
        try {
        const { data: stkData, error: stkError } = await sendStkPush({
            mpesa_phone: dataFromForm.mpesa_phone, // Correctly pass the new property
            name: dataFromForm.name,
            amount: dataFromForm.amount,
        });
        if (stkError) {
            setLoading(false);
            return alert(stkError); // Consider using a UI message instead
        }
    
        const checkoutRequestId = stkData.CheckoutRequestID;
        alert("STK Push sent successfully");
        setStkQueryLoading(true);
        stkPushQueryWithIntervals(checkoutRequestId);
        } catch (error) {
        setLoading(false);
        console.error("Error in sending STK Push:", error); // Consider more user-friendly error handling
        }
    };

    return (
        <div className="lg:pl-12">
        <div className="overflow-hidden rounded-md bg-white">
            <div className="p-6 sm:p-10">
            <p className="mt-4 text-base text-gray-600">
                Provide your name, Mpesa number, and amount to process purchase.
            </p>
            <form onSubmit={handleSubmit} className="mt-4">
                <div className="space-y-6">
                <div>
                    <label className="text-base font-medium text-gray-900">Name</label>
                    <div className="relative mt-2.5">
                    <input
                        type="text"
                        required
                        name="name"
                        value={dataFromForm.name}
                        onChange={(e) =>
                        setDataFromForm({
                            ...dataFromForm,
                            name: e.target.value,
                        })
                        }
                        placeholder="John Doe"
                        className="block w-full rounded-md border border-gray-300 bg-white px-4 py-3 text-black placeholder-gray-500 transition-all duration-200 focus:border-gray-500 focus:ring focus:ring-gray-200 focus:outline-none"
                    />
                    </div>
                </div>
                <div>
                    <label className="text-base font-medium text-gray-900">
                    Mpesa Number
                    </label>
                    <div className="relative mt-2.5">
                    <input
                        type="text"
                        name="mpesa_phone"
                        value={dataFromForm.mpesa_phone}
                        onChange={(e) =>
                        setDataFromForm({
                            ...dataFromForm,
                            mpesa_phone: e.target.value,
                        })
                        }
                        placeholder="Enter Mpesa phone number"
                        className="block w-full rounded-md border border-gray-300 bg-white px-4 py-3 text-black placeholder-gray-500 transition-all duration-200 focus:border-gray-500 focus:ring focus:ring-gray-200 focus:outline-none"
                    />
                    </div>
                </div>
                <div>
                    <label className="text-base font-medium text-gray-900">Amount</label>
                    <div className="relative mt-2.5">
                    <input
                        type="number"
                        required
                        name="amount"
                        value={dataFromForm.amount}
                        onChange={(e) =>
                        setDataFromForm({
                            ...dataFromForm,
                            amount: Number(e.target.value),
                        })
                        }
                        placeholder="Enter amount"
                        className="block w-full rounded-md border border-gray-300 bg-white px-4 py-3 text-black placeholder-gray-500 transition-all duration-200 focus:border-gray-500 focus:ring focus:ring-gray-200 focus:outline-none"
                    />
                    </div>
                </div>
                <div>
                    <button
                    type="submit"
                    disabled={loading}
                    className="inline-flex w-full items-center justify-center rounded-md border border-transparent bg-black px-4 py-4 text-base font-semibold text-white transition-all duration-200 hover:bg-gray-800 focus:bg-gray-800 focus:outline-none"
                    >
                    {loading ? "Processing.." : "Proceed With Payment"}
                    </button>
                </div>
                </div>
            </form>
            </div>
        </div>
        <>
            {stkQueryLoading ? (
            <STKPushQueryLoading number={dataFromForm.mpesa_phone} />
            ) : success ? (
            <PaymentSuccess />
            ) : errorMessage ? (
            <div className="lg:pl-12">{errorMessage}</div>
            ) : null}
        </>
        </div>
    );
    }

    export default PaymentForm;

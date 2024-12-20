// pages/verify-otp.js
import { useState } from "react";
import { useRouter } from "next/router";
import axios from "axios";

export default function VerifyOTP() {
  const router = useRouter();
  const { email } = router.query; // Get email from query string
  const [otp, setOtp] = useState("");
  const [message, setMessage] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post("/api/ForgotPassword/verify-otp", {
        email,
        otp,
      });
      setMessage(res.data.message);

      if (res.status === 200) {
        router.push({
          pathname: "/ForgotPassword/Reset-password",
          query: { email }, // Pass email to next step
        });
      }
    } catch (error) {
      console.error(error);
      setMessage("OTP verification failed. Please try again.");
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="w-full max-w-md p-8 bg-white rounded-lg shadow-md">
        <h1 className="text-2xl font-semibold text-center text-gray-700">
          Verify OTP
        </h1>
        <form onSubmit={handleSubmit} className="mt-6">
          <div className="mb-4">
            <input
              type="text"
              placeholder="Enter OTP"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              required
              className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring focus:ring-purple-300"
            />
          </div>
          <button
            type="submit"
            className="w-full py-3 mt-4 text-white bg-purple-600 rounded-md hover:bg-purple-700 focus:outline-none focus:ring focus:ring-purple-300"
          >
            Verify OTP
          </button>
        </form>
        {message && (
          <p className="mt-4 text-center text-green-500">{message}</p>
        )}
      </div>
    </div>
  );
}

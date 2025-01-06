'use client';
import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast, Toaster } from 'react-hot-toast';
import { motion } from 'framer-motion';

type VerificationMethod = 'email' | 'phone';

function VerifyContent() {
    const [otp, setOtp] = useState('');
    const [isVerifying, setIsVerifying] = useState(false);
    const [verificationMethod, setVerificationMethod] = useState<VerificationMethod>('email');
    const router = useRouter();
    const searchParams = useSearchParams();
    const email = searchParams.get('email');
    const tempId = searchParams.get('tempId');
    const phoneNumber = searchParams.get('phoneNumber');

    useEffect(() => {
        if (!email || !tempId || !phoneNumber) {
            router.push('/');
        }
    }, [email, tempId, phoneNumber, router]);

    const handleVerify = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsVerifying(true);
        const loadingToast = toast.loading('Verifying...');

        try {
            const storedData = localStorage.getItem('pendingSubmission');
            if (!storedData) {
                throw new Error('No pending submission found');
            }

            const formData = JSON.parse(storedData);
            const response = await fetch('/api/verify-otp', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    email,
                    phoneNumber,
                    otp: otp.trim(),
                    tempId,
                    formData,
                    method: verificationMethod,
                }),
            });

            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.error);
            }

            toast.dismiss(loadingToast);

            // Sequential toasts for better UX
            toast.success('Verification successful!', {
                duration: 2000,
                style: {
                    background: '#ffffff',
                    color: '#000000',
                    padding: '16px',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                },
            });

            setTimeout(() => {

                localStorage.removeItem('pendingSubmission');
                router.push('/success');
            }, 2000);

        } catch (error) {
            toast.dismiss(loadingToast);
            toast.error(error instanceof Error ? error.message : 'Verification failed');
        } finally {
            setIsVerifying(false);
        }
    };

    const handleResendOtp = async () => {
        try {
            const response = await fetch('/api/resend-otp', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    email,
                    phoneNumber,
                    tempId,
                    method: verificationMethod
                }),
            });

            if (!response.ok) {
                throw new Error('Failed to resend OTP');
            }

            if (verificationMethod === 'phone') {
                toast.success('OTP sent to your phone number', {
                    style: {
                        background: '#ffffff',
                        color: '#000000',
                        padding: '16px',
                        borderRadius: '8px',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                    },
                });
            }
        } catch (error) {
            toast.error('Failed to resend OTP');
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-4">
            <Toaster position="top-center" />
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, ease: "easeOut" }}
                className="w-full max-w-md p-8 bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl border border-white/50"
            >
                <motion.h2
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.2 }}
                    className="text-3xl font-bold text-center text-black mb-8"
                >
                    Verify Your Submission
                </motion.h2>

                {/* Verification Method Toggle */}
                <div className="mb-8">
                    <div className="flex justify-center space-x-4 p-1.5 bg-gray-100/80 rounded-xl">
                        <button
                            onClick={() => setVerificationMethod('email')}
                            className={`flex-1 py-3 px-4 rounded-lg transition-all duration-200 ${verificationMethod === 'email'
                                ? 'bg-white shadow-md text-blue-600 font-medium transform scale-105'
                                : 'text-gray-600 hover:bg-gray-50'
                                }`}
                        >
                            Verify by Email
                        </button>
                        <button
                            onClick={() => {
                                setVerificationMethod('phone');
                                toast.success('Click "Resend Code" to get OTP on your phone');
                            }}
                            className={`flex-1 py-3 px-4 rounded-lg transition-all duration-200 ${verificationMethod === 'phone'
                                ? 'bg-white shadow-md text-blue-600 font-medium transform scale-105'
                                : 'text-gray-600 hover:bg-gray-50'
                                }`}
                        >
                            Verify by Phone
                        </button>
                    </div>
                </div>

                <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.3 }}
                    className="text-center text-black mb-8 font-medium"
                >
                    {verificationMethod === 'email'
                        ? `We've sent a verification code to ${email}`
                        : `We've sent a verification code to ${phoneNumber}`
                    }
                </motion.p>

                <form onSubmit={handleVerify} className="space-y-8">
                    <div className="flex justify-center gap-3">
                        {[...Array(6)].map((_, index) => (
                            <motion.div
                                key={index}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.4 + index * 0.1 }}
                            >
                                <input
                                    type="text"
                                    maxLength={1}
                                    value={otp[index] || ''}
                                    onChange={(e) => {
                                        const newOtp = [...otp];
                                        newOtp[index] = e.target.value.slice(-1).replace(/\D/g, '');
                                        setOtp(newOtp.join(''));

                                        // Move to next input
                                        if (e.target.value && index < 5) {
                                            const target = e.target as HTMLInputElement;
                                            const inputs = target.parentElement?.parentElement?.querySelectorAll('input');
                                            if (inputs && inputs[index + 1]) {
                                                inputs[index + 1].focus();
                                            }
                                        }
                                    }}
                                    onKeyDown={(e) => {
                                        // Handle backspace
                                        if (e.key === 'Backspace' && !otp[index] && index > 0) {
                                            const target = e.target as HTMLInputElement;
                                            const inputs = target.parentElement?.parentElement?.querySelectorAll('input');
                                            if (inputs && inputs[index - 1]) {
                                                inputs[index - 1].focus();
                                            }
                                        }
                                    }}
                                    className="w-12 h-14 text-center text-2xl font-semibold border-2 border-gray-300 rounded-lg 
                                             focus:border-blue-500 focus:ring-2 focus:ring-blue-200 bg-white shadow-sm
                                             transition-all duration-200 text-black"
                                />
                            </motion.div>
                        ))}
                    </div>

                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 1 }}
                    >
                        <button
                            type="submit"
                            disabled={isVerifying || otp.length !== 6}
                            className={`w-full py-4 px-4 rounded-xl text-white font-medium transition-all duration-300 
                                ${isVerifying || otp.length !== 6
                                    ? 'bg-gray-400 cursor-not-allowed opacity-70'
                                    : 'bg-blue-600 hover:bg-blue-700 shadow-md hover:shadow-lg transform hover:scale-[1.02]'
                                }`}
                        >
                            {isVerifying ? 'Verifying...' : 'Verify Code'}
                        </button>
                    </motion.div>
                </form>

                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 1.2 }}
                    className="mt-8 text-center"
                >
                    <button
                        onClick={handleResendOtp}
                        className="text-blue-600 hover:text-blue-800 font-medium transition-all duration-200 
                                 hover:underline underline-offset-4"
                    >
                        Resend Code
                    </button>
                </motion.div>
            </motion.div>
        </div>
    );
}

export default function VerifyPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
                    <p className="mt-4 text-gray-600">Loading...</p>
                </div>
            </div>
        }>
            <VerifyContent />
        </Suspense>
    );
} 
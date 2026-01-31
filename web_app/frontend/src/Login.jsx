
import React, { useState } from 'react';
import { supabase } from './supabaseClient';
import { Mail, Lock, Loader2, AlertCircle, CheckCircle } from 'lucide-react';

export default function Login() {
    const [loading, setLoading] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState(''); // Only used if you enabled password auth, or ignored for magic link
    const [message, setMessage] = useState(null);
    const [mode, setMode] = useState('login'); // 'login' or 'signup'

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMessage(null);

        try {
            const { error } = await supabase.auth.signInWithPassword({
                email,
                password
            });
            if (error) throw error;
        } catch (error) {
            setMessage({ type: 'error', text: error.message });
        } finally {
            setLoading(false);
        }
    };

    const handleSignup = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMessage(null);

        try {
            const { error } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    emailRedirectTo: window.location.origin,
                },
            });
            if (error) throw error;
            setMessage({ type: 'success', text: 'Verification email sent! Check your inbox.' });
        } catch (error) {
            setMessage({ type: 'error', text: error.message });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
            <div className="bg-white p-8 rounded-xl shadow-lg max-w-sm w-full">
                <h2 className="text-2xl font-bold mb-6 text-center text-gray-800">
                    {mode === 'login' ? 'Welcome Back' : 'Create Account'}
                </h2>

                <form onSubmit={mode === 'login' ? handleLogin : handleSignup} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                        <div className="relative">
                            <Mail className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                            <input
                                type="email"
                                required
                                className="pl-10 w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                                placeholder="you@example.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                        <div className="relative">
                            <Lock className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                            <input
                                type="password"
                                required
                                className="pl-10 w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-indigo-600 text-white py-2 rounded-lg font-medium hover:bg-indigo-700 transition flex justify-center items-center gap-2 disabled:opacity-70"
                    >
                        {loading ? <Loader2 className="animate-spin h-5 w-5" /> : (mode === 'login' ? 'Sign In' : 'Sign Up')}
                    </button>
                </form>

                {message && (
                    <div className={`mt-4 p-3 rounded-lg flex items-start gap-2 text-sm ${message.type === 'error' ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
                        {message.type === 'error' ? <AlertCircle className="w-5 h-5 shrink-0" /> : <CheckCircle className="w-5 h-5 shrink-0" />}
                        <span>{message.text}</span>
                    </div>
                )}

                <div className="mt-6 text-center text-sm text-gray-600">
                    {mode === 'login' ? "Don't have an account? " : "Already have an account? "}
                    <button
                        onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setMessage(null); }}
                        className="text-indigo-600 font-semibold hover:underline"
                    >
                        {mode === 'login' ? 'Sign up' : 'Log in'}
                    </button>
                </div>
            </div>
        </div>
    );
}

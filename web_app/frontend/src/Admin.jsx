
import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { Users, Shield, Check, X, Loader2 } from 'lucide-react';

export default function Admin() {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState(null);

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setUsers(data);
        } catch (error) {
            setMessage({ type: 'error', text: 'Failed to fetch users: ' + error.message });
        } finally {
            setLoading(false);
        }
    };

    const updateRole = async (userId, newRole) => {
        try {
            const { error } = await supabase
                .from('profiles')
                .update({ role: newRole })
                .eq('id', userId);

            if (error) throw error;

            setUsers(users.map(u => u.id === userId ? { ...u, role: newRole } : u));
            setMessage({ type: 'success', text: 'Role updated successfully' });

            // Clear success message after 3 seconds
            setTimeout(() => setMessage(null), 3000);
        } catch (error) {
            setMessage({ type: 'error', text: 'Failed to update role: ' + error.message });
        }
    };

    if (loading) return <div className="flex justify-center p-8"><Loader2 className="animate-spin text-indigo-600" /></div>;

    return (
        <div className="p-6 max-w-6xl mx-auto">
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-2 text-gray-800">
                <Shield className="w-8 h-8 text-indigo-600" /> User Management
            </h2>

            {message && (
                <div className={`mb-4 p-3 rounded-lg text-sm ${message.type === 'error' ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
                    {message.text}
                </div>
            )}

            <div className="bg-white rounded-xl shadow border overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-gray-50 border-b">
                        <tr>
                            <th className="p-4 font-semibold text-gray-600 text-sm">Email</th>
                            <th className="p-4 font-semibold text-gray-600 text-sm">Role</th>
                            <th className="p-4 font-semibold text-gray-600 text-sm">Joined</th>
                            <th className="p-4 font-semibold text-gray-600 text-sm">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                        {users.map(user => (
                            <tr key={user.id} className="hover:bg-gray-50">
                                <td className="p-4 text-sm text-gray-800">{user.email}</td>
                                <td className="p-4">
                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                                        ${user.role === 'admin' ? 'bg-purple-100 text-purple-800' :
                                            user.role === 'operator' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'}`}>
                                        {user.role}
                                    </span>
                                </td>
                                <td className="p-4 text-sm text-gray-500">
                                    {new Date(user.created_at).toLocaleDateString()}
                                </td>
                                <td className="p-4 flex gap-2">
                                    <select
                                        value={user.role}
                                        onChange={(e) => updateRole(user.id, e.target.value)}
                                        className="text-sm border-gray-300 rounded-lg shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                                    >
                                        <option value="user">User</option>
                                        <option value="operator">Operator</option>
                                        <option value="admin">Admin</option>
                                    </select>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {users.length === 0 && <div className="p-8 text-center text-gray-500">No users found.</div>}
            </div>
        </div>
    );
}


import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { FileText, Download, Loader2, Globe, User, Clock, HardDrive } from 'lucide-react';

export default function MyFiles({ role }) {
    const [files, setFiles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [viewMode, setViewMode] = useState(role === 'admin' || role === 'operator' ? 'all' : 'mine'); // 'mine' or 'all'
    const [message, setMessage] = useState(null);

    useEffect(() => {
        fetchFiles();
    }, [viewMode]);

    const fetchFiles = async () => {
        setLoading(true);
        try {
            let query = supabase
                .from('user_files')
                .select('*, profiles(email)')
                .order('created_at', { ascending: false });

            // If viewMode is 'mine', filter by user_id
            if (viewMode === 'mine') {
                const { data: { user } } = await supabase.auth.getUser();
                if (user) {
                    query = query.eq('user_id', user.id);
                }
            }
            // If 'all', we don't add filter (RLS will handle if user is not admin/operator, but UI should prevent this state)

            const { data, error } = await query;

            if (error) throw error;
            setFiles(data);
        } catch (error) {
            setMessage({ type: 'error', text: 'Failed to fetch files: ' + error.message });
        } finally {
            setLoading(false);
        }
    };

    const handleDownload = async (path, filename) => {
        try {
            const { data, error } = await supabase
                .storage
                .from('aveva-uploads')
                .createSignedUrl(path, 60); // Valid for 60 seconds

            if (error) throw error;

            // Trigger download
            const link = document.createElement('a');
            link.href = data.signedUrl;
            link.setAttribute('download', filename);
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (error) {
            setMessage({ type: 'error', text: 'Download failed: ' + error.message });
        }
    };

    // Helper to format bytes
    const formatBytes = (bytes, decimals = 2) => {
        if (!+bytes) return '0 Bytes';
        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
    }

    return (
        <div className="h-full flex flex-col">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold flex items-center gap-2 text-gray-800">
                    <FileText className="w-6 h-6 text-indigo-600" /> File History
                </h2>

                {(role === 'admin' || role === 'operator') && (
                    <div className="flex bg-gray-100 p-1 rounded-lg">
                        <button
                            onClick={() => setViewMode('mine')}
                            className={`px-3 py-1 text-sm font-medium rounded-md transition-all ${viewMode === 'mine' ? 'bg-white shadow text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            My Files
                        </button>
                        <button
                            onClick={() => setViewMode('all')}
                            className={`px-3 py-1 text-sm font-medium rounded-md transition-all ${viewMode === 'all' ? 'bg-white shadow text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            All Users
                        </button>
                    </div>
                )}
            </div>

            {message && (
                <div className={`mb-4 p-3 rounded-lg text-sm ${message.type === 'error' ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
                    {message.text}
                </div>
            )}

            {loading ? (
                <div className="flex-1 flex justify-center items-center">
                    <Loader2 className="animate-spin h-8 w-8 text-indigo-600" />
                </div>
            ) : (
                <div className="flex-1 overflow-auto border rounded-xl bg-gray-50">
                    <table className="w-full text-left bg-white">
                        <thead className="bg-gray-50 border-b sticky top-0">
                            <tr>
                                <th className="p-4 font-semibold text-gray-600 text-sm">Filename</th>
                                {(viewMode === 'all') && <th className="p-4 font-semibold text-gray-600 text-sm">User</th>}
                                <th className="p-4 font-semibold text-gray-600 text-sm">Size</th>
                                <th className="p-4 font-semibold text-gray-600 text-sm">Date</th>
                                <th className="p-4 font-semibold text-gray-600 text-sm text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {files.map(file => (
                                <tr key={file.id} className="hover:bg-gray-50 transition">
                                    <td className="p-4 flex items-center gap-3">
                                        <div className="bg-blue-100 p-2 rounded-lg text-blue-600">
                                            <FileText className="w-4 h-4" />
                                        </div>
                                        <div className="font-medium text-gray-800">{file.filename}</div>
                                    </td>
                                    {(viewMode === 'all') && (
                                        <td className="p-4 text-sm text-gray-500">
                                            {file.profiles?.email || 'Unknown'}
                                        </td>
                                    )}
                                    <td className="p-4 text-sm text-gray-500 font-mono">
                                        {formatBytes(file.size)}
                                    </td>
                                    <td className="p-4 text-sm text-gray-500">
                                        {new Date(file.created_at).toLocaleString()}
                                    </td>
                                    <td className="p-4 text-right">
                                        <button
                                            onClick={() => handleDownload(file.storage_path, file.filename)}
                                            className="text-indigo-600 hover:text-indigo-800 font-medium hover:bg-indigo-50 px-3 py-1 rounded-lg transition"
                                        >
                                            <Download className="w-4 h-4" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {files.length === 0 && (
                        <div className="p-12 text-center text-gray-400 flex flex-col items-center">
                            <HardDrive className="w-12 h-12 mb-2 opacity-50" />
                            No files found
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

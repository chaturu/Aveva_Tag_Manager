import React, { useState } from 'react';
import axios from 'axios';
import { Upload, FileText, Layout, Activity, Download, CheckCircle, AlertCircle } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs) {
    return twMerge(clsx(inputs));
}

function App() {
    const [session, setSession] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [activeTab, setActiveTab] = useState('templates');
    const [selectedTemplates, setSelectedTemplates] = useState([]);
    const [selectedAreas, setSelectedAreas] = useState([]);
    const [processing, setProcessing] = useState(false);
    const [dragActive, setDragActive] = useState(false);
    const [message, setMessage] = useState(null);

    const uploadFile = async (file) => {
        if (!file) return;

        setUploading(true);
        const formData = new FormData();
        formData.append('file', file);

        try {
            const res = await axios.post('/api/upload', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            setSession(res.data);
            setMessage({ type: 'success', text: 'File uploaded successfully!' });
        } catch (err) {
            console.error(err);
            setMessage({ type: 'error', text: 'Upload failed: ' + (err.response?.data?.detail || err.message) });
        } finally {
            setUploading(false);
        }
    };

    const handleFileSelect = (e) => {
        uploadFile(e.target.files[0]);
    };

    const handleDrag = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") {
            setDragActive(true);
        } else if (e.type === "dragleave") {
            setDragActive(false);
        }
    };

    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            uploadFile(e.dataTransfer.files[0]);
        }
    };

    const handleDownload = (url, filename) => {
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', filename);
        document.body.appendChild(link);
        link.click();
        link.remove();
    };


    const extractTemplates = async () => {
        if (selectedTemplates.length === 0) return;
        setProcessing(true);
        try {
            const res = await axios.post('/api/extract/template', {
                session_id: session.session_id,
                templates: selectedTemplates
            }, { responseType: 'blob' });

            const url = window.URL.createObjectURL(new Blob([res.data]));
            handleDownload(url, `extracted_templates.csv`);
            setMessage({ type: 'success', text: 'Templates extracted successfully.' });
        } catch (err) {
            setMessage({ type: 'error', text: 'Extraction failed.' });
        } finally {
            setProcessing(false);
        }
    };

    const extractAreas = async () => {
        if (selectedAreas.length === 0) return;
        setProcessing(true);
        try {
            const res = await axios.post('/api/extract/area', {
                session_id: session.session_id,
                areas: selectedAreas
            }, { responseType: 'blob' });

            const url = window.URL.createObjectURL(new Blob([res.data]));
            handleDownload(url, `extracted_areas.csv`);
            setMessage({ type: 'success', text: 'Areas extracted successfully.' });
        } catch (err) {
            setMessage({ type: 'error', text: 'Extraction failed.' });
        } finally {
            setProcessing(false);
        }
    };

    const extractMatrix = async () => {
        setProcessing(true);
        try {
            const res = await axios.post('/api/extract/matrix', {
                session_id: session.session_id
            }, { responseType: 'blob' });

            const url = window.URL.createObjectURL(new Blob([res.data]));
            handleDownload(url, `plc_matrices.zip`);
            setMessage({ type: 'success', text: 'Matrices extracted successfully.' });
        } catch (err) {
            setMessage({ type: 'error', text: 'Extraction failed.' });
        } finally {
            setProcessing(false);
        }
    };


    const extractAddresses = async (alarmOnly) => {
        setProcessing(true);
        try {
            const res = await axios.post('/api/extract/addresses', {
                session_id: session.session_id,
                alarm_only: alarmOnly
            }, { responseType: 'blob' });

            const suffix = alarmOnly ? "AlarmOnly" : "AllTags";
            const url = window.URL.createObjectURL(new Blob([res.data]));
            handleDownload(url, `Addresses_${suffix}.zip`);
            setMessage({ type: 'success', text: `Addresses (${suffix}) downloaded.` });
        } catch (err) {
            console.error(err);
            setMessage({ type: 'error', text: 'Extraction failed: ' + (err.response?.statusText || "Server Error") });
        } finally {
            setProcessing(false);
        }
    };

    const analyzeExtensions = async () => {
        setProcessing(true);
        try {
            const res = await axios.post('/api/analyze/extensions', {
                session_id: session.session_id
            }, { responseType: 'blob' });

            const url = window.URL.createObjectURL(new Blob([res.data]));
            handleDownload(url, `extensions_report.csv`);
            setMessage({ type: 'success', text: 'Analysis report downloaded.' });
        } catch (err) {
            setMessage({ type: 'error', text: 'Analysis failed.' });
        } finally {
            setProcessing(false);
        }
    };

    if (!session) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
                <div className="bg-white p-8 rounded-xl shadow-xl max-w-md w-full text-center">
                    <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                        <Upload className="text-blue-600 w-8 h-8" />
                    </div>
                    <h1 className="text-2xl font-bold mb-2 text-gray-800">Aveva Tag Manager Web</h1>
                    <p className="text-gray-500 mb-6">Upload your Aveva DB Dump CSV to get started.</p>

                    <div
                        onDragEnter={handleDrag}
                        onDragLeave={handleDrag}
                        onDragOver={handleDrag}
                        onDrop={handleDrop}
                        className={cn(
                            "flex flex-col items-center px-4 py-12 border-2 border-dashed rounded-lg transition-colors w-full",
                            dragActive ? "bg-blue-50 border-blue-500" : "bg-white border-blue-200 hover:bg-blue-50"
                        )}
                    >
                        <p className="mb-4 text-sm text-gray-500">
                            Drag & Drop your file here or<br />
                            <span className="text-xs text-gray-400 block mt-1">
                                (Use ZIP for files &gt; 4.5MB)
                            </span>
                        </p>
                        <label className="bg-blue-600 text-white px-4 py-2 rounded shadow hover:bg-blue-700 transition cursor-pointer font-medium text-sm">
                            Browse File
                            <input type='file' className="hidden" accept=".csv,.zip" onChange={handleFileSelect} disabled={uploading} />
                        </label>
                    </div>

                    {uploading && <p className="mt-4 text-sm text-gray-500 animate-pulse">Uploading and Parsing...</p>}
                    {message && <div className={cn("mt-4 p-2 rounded text-sm", message.type === 'error' ? "bg-red-100 text-red-600" : "bg-green-100 text-green-600")}>{message.text}</div>}
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            {/* Header */}
            <header className="bg-white shadow-sm border-b px-6 py-4 flex justify-between items-center">
                <h1 className="text-xl font-bold flex items-center gap-2 text-indigo-700">
                    <Activity className="w-6 h-6" /> Aveva Tag Manager
                </h1>
                <div className="text-sm text-gray-600 flex items-center gap-4">
                    <div className="flex items-center gap-2 bg-gray-100 px-3 py-1 rounded-full">
                        <FileText className="w-4 h-4" />
                        <span className="font-medium truncate max-w-[200px]">{session.filename}</span>
                    </div>
                    <button onClick={() => setSession(null)} className="text-red-500 hover:text-red-700 font-medium">Reset</button>
                </div>
            </header>

            <main className="flex-1 container mx-auto p-6 flex gap-6">
                {/* Sidebar */}
                <aside className="w-64 flex-shrink-0">
                    <nav className="flex flex-col gap-1">
                        <TabButton id="templates" icon={Layout} label="Extract Templates" active={activeTab} set={setActiveTab} />
                        <TabButton id="areas" icon={Layout} label="Extract Areas" active={activeTab} set={setActiveTab} />
                        <TabButton id="extensions" icon={Activity} label="Extensions & PLC" active={activeTab} set={setActiveTab} />
                    </nav>

                    <div className="mt-8 bg-blue-50 p-4 rounded-lg border border-blue-100">
                        <h3 className="font-semibold text-blue-900 mb-2">Details</h3>
                        <ul className="text-sm text-blue-800 space-y-1">
                            <li>Templates: {session.total_templates}</li>
                            <li>Areas: {session.total_areas}</li>
                        </ul>
                    </div>
                </aside>

                {/* Content */}
                <div className="flex-1 bg-white rounded-xl shadow-sm border p-6">
                    {message && (
                        <div className={cn("mb-4 p-3 rounded flex items-center gap-2", message.type === 'error' ? "bg-red-50 text-red-600 border border-red-100" : "bg-green-50 text-green-600 border border-green-100")}>
                            {message.type === 'error' ? <AlertCircle className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
                            {message.text}
                        </div>
                    )}

                    {activeTab === 'templates' && (
                        <div className="h-full flex flex-col">
                            <h2 className="text-lg font-bold mb-4">Template Extraction</h2>
                            <p className="text-gray-500 mb-4 text-sm">Select templates to extract into a new CSV file. $Area is included automatically.</p>

                            <div className="flex-1 overflow-auto border rounded-lg p-2 mb-4 bg-gray-50">
                                {session.templates.map(tmpl => (
                                    <label key={tmpl} className="flex items-center gap-2 p-2 hover:bg-gray-100 rounded cursor-pointer">
                                        <input
                                            type="checkbox"
                                            className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                                            checked={selectedTemplates.includes(tmpl)}
                                            onChange={(e) => {
                                                if (e.target.checked) setSelectedTemplates([...selectedTemplates, tmpl]);
                                                else setSelectedTemplates(selectedTemplates.filter(t => t !== tmpl));
                                            }}
                                        />
                                        <span className="text-sm">{tmpl}</span>
                                    </label>
                                ))}
                            </div>

                            <div className="flex justify-between items-center">
                                <span className="text-sm text-gray-500">{selectedTemplates.length} selected</span>
                                <button
                                    onClick={extractTemplates}
                                    disabled={processing || selectedTemplates.length === 0}
                                    className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                >
                                    {processing ? "Processing..." : <><Download className="w-4 h-4" /> Extract Selected</>}
                                </button>
                            </div>
                        </div>
                    )}

                    {activeTab === 'areas' && (
                        <div className="h-full flex flex-col">
                            <h2 className="text-lg font-bold mb-4">Area Extraction</h2>
                            <p className="text-gray-500 mb-4 text-sm">Select Areas to filter all data. Only data rows matching the area will be kept.</p>

                            <div className="flex-1 overflow-auto border rounded-lg p-2 mb-4 bg-gray-50">
                                {session.areas.map(area => (
                                    <label key={area} className="flex items-center gap-2 p-2 hover:bg-gray-100 rounded cursor-pointer">
                                        <input
                                            type="checkbox"
                                            className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                                            checked={selectedAreas.includes(area)}
                                            onChange={(e) => {
                                                if (e.target.checked) setSelectedAreas([...selectedAreas, area]);
                                                else setSelectedAreas(selectedAreas.filter(a => a !== area));
                                            }}
                                        />
                                        <span className="text-sm">{area}</span>
                                    </label>
                                ))}
                            </div>

                            <div className="flex justify-between items-center">
                                <span className="text-sm text-gray-500">{selectedAreas.length} selected</span>
                                <button
                                    onClick={extractAreas}
                                    disabled={processing || selectedAreas.length === 0}
                                    className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                >
                                    {processing ? "Processing..." : <><Download className="w-4 h-4" /> Extract Selected</>}
                                </button>
                            </div>
                        </div>
                    )}

                    {activeTab === 'extensions' && (
                        <div className="space-y-6">
                            <div>
                                <h2 className="text-lg font-bold mb-2">Extension Analysis</h2>
                                <p className="text-gray-500 mb-4 text-sm">Analyze `Extensions(MxBigString)` column across all templates.</p>
                                <button
                                    onClick={analyzeExtensions}
                                    disabled={processing}
                                    className="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 flex items-center gap-2 shadow-sm"
                                >
                                    <Activity className="w-4 h-4" /> Analyze & Download Report
                                </button>
                            </div>

                            <hr />

                            <div>
                                <h2 className="text-lg font-bold mb-2">PLC Matrix Extraction</h2>
                                <p className="text-gray-500 mb-4 text-sm">Extract PLC addresses into a Matrix (Tag x Attribute) format for each template.</p>
                                <button
                                    onClick={extractMatrix}
                                    disabled={processing}
                                    className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center gap-2 shadow-sm"
                                >
                                    <Download className="w-4 h-4" /> Download Matrices (ZIP)
                                </button>
                            </div>

                            <hr />

                            <div>
                                <h2 className="text-lg font-bold mb-2">Address Map Extraction</h2>
                                <p className="text-gray-500 mb-4 text-sm">Extract flat address lists grouped by Area.</p>
                                <div className="flex gap-4">
                                    <button
                                        onClick={() => extractAddresses(false)}
                                        disabled={processing}
                                        className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 flex items-center gap-2 shadow-sm"
                                    >
                                        <Download className="w-4 h-4" /> Extract All Tags
                                    </button>
                                    <button
                                        onClick={() => extractAddresses(true)}
                                        disabled={processing}
                                        className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 flex items-center gap-2 shadow-sm"
                                    >
                                        <Download className="w-4 h-4" /> Extract Alarm Only
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                </div>
            </main>
        </div>
    );
}

function TabButton({ id, icon: Icon, label, active, set }) {
    return (
        <button
            onClick={() => set(id)}
            className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors text-left",
                active === id ? "bg-indigo-50 text-indigo-700" : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
            )}
        >
            <Icon className="w-5 h-5" />
            {label}
        </button>
    );
}

export default App;

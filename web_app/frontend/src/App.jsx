import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Upload, FileText, Layout, Activity, Download, CheckCircle, AlertCircle, ChevronDown, ChevronRight, Menu } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs) {
    return twMerge(clsx(inputs));
}

function App() {
    const [user, setUser] = useState({ id: 'guest' });
    const [authLoading, setAuthLoading] = useState(false);
    const [session, setSession] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [activeTab, setActiveTab] = useState('templates');
    const [selectedTemplates, setSelectedTemplates] = useState([]);
    const [selectedAreas, setSelectedAreas] = useState([]);
    const [processing, setProcessing] = useState(false);
    const [message, setMessage] = useState(null);
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [isSystemPlatformOpen, setIsSystemPlatformOpen] = useState(true);

    useEffect(() => {
        // No auth check needed
    }, []);

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

    const handleFileSelect = (e) => uploadFile(e.target.files[0]);

    const handleDownload = (url, filename) => {
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', filename);
        document.body.appendChild(link);
        link.click();
        link.remove();
    };

    // Extraction functions (same logic as before)
    const extractTemplates = async () => {
        if (selectedTemplates.length === 0) return;
        setProcessing(true);
        try {
            const res = await axios.post('/api/extract/templates', {
                session_id: session.session_id,
                templates: selectedTemplates
            }, { responseType: 'blob' });
            const url = window.URL.createObjectURL(new Blob([res.data]));
            handleDownload(url, `extracted_templates.csv`);
            setMessage({ type: 'success', text: 'Templates extracted successfully.' });
        } catch (err) { setMessage({ type: 'error', text: 'Extraction failed.' }); } finally { setProcessing(false); }
    };

    const extractAreas = async () => {
        if (selectedAreas.length === 0) return;
        setProcessing(true);
        try {
            const res = await axios.post('/api/extract/areas', {
                session_id: session.session_id,
                areas: selectedAreas
            }, { responseType: 'blob' });
            const url = window.URL.createObjectURL(new Blob([res.data]));
            handleDownload(url, `extracted_areas.csv`);
            setMessage({ type: 'success', text: 'Areas extracted successfully.' });
        } catch (err) { setMessage({ type: 'error', text: 'Extraction failed.' }); } finally { setProcessing(false); }
    };

    const extractMatrix = async () => {
        setProcessing(true);
        try {
            const res = await axios.post('/api/extract/matrix', { session_id: session.session_id }, { responseType: 'blob' });
            const url = window.URL.createObjectURL(new Blob([res.data]));
            handleDownload(url, `plc_matrices.zip`);
            setMessage({ type: 'success', text: 'Matrices extracted successfully.' });
        } catch (err) { setMessage({ type: 'error', text: 'Extraction failed.' }); } finally { setProcessing(false); }
    };

    const extractAddresses = async (alarmOnly) => {
        setProcessing(true);
        try {
            const res = await axios.post('/api/extract/addresses', { session_id: session.session_id, alarm_only: alarmOnly }, { responseType: 'blob' });
            const suffix = alarmOnly ? "AlarmOnly" : "AllTags";
            const url = window.URL.createObjectURL(new Blob([res.data]));
            handleDownload(url, `Addresses_${suffix}.zip`);
            setMessage({ type: 'success', text: `Addresses (${suffix}) downloaded.` });
        } catch (err) { setMessage({ type: 'error', text: 'Extraction failed.' }); } finally { setProcessing(false); }
    };

    const analyzeExtensions = async () => {
        setProcessing(true);
        try {
            const res = await axios.post('/api/analyze/extensions', { session_id: session.session_id }, { responseType: 'blob' });
            const url = window.URL.createObjectURL(new Blob([res.data]));
            handleDownload(url, `extensions_report.csv`);
            setMessage({ type: 'success', text: 'Analysis report downloaded.' });
        } catch (err) { setMessage({ type: 'error', text: 'Analysis failed.' }); } finally { setProcessing(false); }
    };

    // 1. 파일이 업로드되지 않은 상태 (Landing/Upload Page)
    if (!session) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
                <div className="bg-white p-8 rounded-2xl shadow-2xl max-w-lg w-full text-center border border-slate-100">
                    <div className="mx-auto w-20 h-20 bg-indigo-100 rounded-2xl flex items-center justify-center mb-6 rotate-3">
                        <Upload className="text-indigo-600 w-10 h-10 -rotate-3" />
                    </div>
                    <h1 className="text-3xl font-black mb-2 text-slate-800 tracking-tight">Aveva Tag Manager</h1>
                    <p className="text-slate-500 mb-8 font-medium">관리 작업을 시작하려면 Aveva DB Dump CSV 파일을 업로드하세요.</p>

                    <div className="group relative flex flex-col items-center px-6 py-10 border-2 border-dashed border-slate-200 rounded-xl transition-all hover:border-indigo-400 hover:bg-indigo-50/30">
                        <p className="mb-6 text-sm text-slate-500 leading-relaxed">
                            파일을 이 영역으로 드래그 앤 드롭 하거나<br />
                            아래 버튼을 클릭하여 파일을 선택하세요.
                        </p>
                        <label className="bg-indigo-600 text-white px-8 py-3 rounded-lg shadow-lg hover:bg-indigo-700 hover:scale-105 transition-all cursor-pointer font-bold text-sm">
                            파일 찾아보기
                            <input type='file' className="hidden" accept=".csv,.zip" onChange={handleFileSelect} disabled={uploading} />
                        </label>
                    </div>

                    {uploading && (
                        <div className="mt-8 flex flex-col items-center gap-2">
                            <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
                            <p className="text-sm font-bold text-slate-600">파일을 분석 중입니다...</p>
                        </div>
                    )}
                    {message && (
                        <div className={cn("mt-6 p-4 rounded-lg text-sm font-bold border", 
                            message.type === 'error' ? "bg-red-50 text-red-600 border-red-100" : "bg-green-50 text-green-600 border-green-100"
                        )}>
                            {message.text}
                        </div>
                    )}
                </div>
            </div>
        );
    }

    // 2. 파일이 업로드된 상태 (Dashboard Page)
    return (
        <div className="min-h-screen bg-slate-50 flex overflow-hidden">
            {/* Sidebar */}
            <aside className={cn(
                "bg-slate-900 text-slate-300 w-72 flex-shrink-0 flex flex-col transition-all duration-300",
                !isSidebarOpen && "-ml-72"
            )}>
                <div className="p-6 border-b border-slate-800 flex items-center gap-3">
                    <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center">
                        <Activity className="text-white w-5 h-5" />
                    </div>
                    <span className="font-black text-xl text-white tracking-tighter">AVEVA TM</span>
                </div>

                <nav className="flex-1 p-4 overflow-y-auto">
                    <div className="mb-4">
                        <button 
                            onClick={() => setIsSystemPlatformOpen(!isSystemPlatformOpen)}
                            className="w-full flex items-center justify-between px-3 py-2 text-sm font-bold text-slate-400 hover:text-white transition-colors"
                        >
                            <span className="flex items-center gap-2">
                                <Layout className="w-4 h-4" /> System Platform
                            </span>
                            {isSystemPlatformOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                        </button>
                        
                        {isSystemPlatformOpen && (
                            <div className="mt-1 ml-4 flex flex-col gap-1 border-l border-slate-800">
                                <SidebarItem id="templates" label="Extract Templates" active={activeTab} set={setActiveTab} />
                                <SidebarItem id="areas" label="Extract Areas" active={activeTab} set={setActiveTab} />
                                <SidebarItem id="extensions" label="Extensions & PLC" active={activeTab} set={setActiveTab} />
                            </div>
                        )}
                    </div>
                </nav>

                <div className="p-4 border-t border-slate-800">
                    <div className="bg-slate-800/50 p-4 rounded-xl">
                        <h3 className="text-xs font-black text-slate-500 uppercase mb-3">Statistics</h3>
                        <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                                <span className="text-slate-400">Templates</span>
                                <span className="text-indigo-400 font-bold">{session.total_templates}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-slate-400">Areas</span>
                                <span className="text-indigo-400 font-bold">{session.total_areas}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </aside>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col min-w-0">
                {/* Topbar */}
                <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 flex-shrink-0 shadow-sm">
                    <div className="flex items-center gap-4">
                        <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 hover:bg-slate-100 rounded-lg text-slate-500">
                            <Menu className="w-5 h-5" />
                        </button>
                        <div className="flex items-center gap-2 bg-slate-100 px-4 py-1.5 rounded-full border border-slate-200">
                            <FileText className="w-4 h-4 text-slate-500" />
                            <span className="text-sm font-bold text-slate-700 truncate max-w-xs">{session.filename}</span>
                        </div>
                    </div>
                    <button 
                        onClick={() => { setSession(null); setMessage(null); }} 
                        className="text-sm font-bold text-indigo-600 hover:text-indigo-800 px-4 py-2 rounded-lg hover:bg-indigo-50 transition-all"
                    >
                        Reset & Upload New
                    </button>
                </header>

                {/* Content 영역 */}
                <main className="flex-1 overflow-auto p-8">
                    <div className="max-w-5xl mx-auto">
                        {message && (
                            <div className={cn("mb-6 p-4 rounded-xl flex items-center gap-3 border animate-in fade-in slide-in-from-top-4", 
                                message.type === 'error' ? "bg-red-50 text-red-600 border-red-100" : "bg-green-50 text-green-600 border-green-100"
                            )}>
                                {message.type === 'error' ? <AlertCircle className="w-5 h-5" /> : <CheckCircle className="w-5 h-5" />}
                                <span className="font-bold">{message.text}</span>
                            </div>
                        )}

                        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                            {activeTab === 'templates' && (
                                <div className="p-8">
                                    <h2 className="text-2xl font-black text-slate-800 mb-2">Template Extraction</h2>
                                    <p className="text-slate-500 mb-8 font-medium">추출할 템플릿을 선택하세요. $Area 속성은 자동으로 포함됩니다.</p>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mb-8 max-h-[500px] overflow-y-auto p-1">
                                        {session.templates.map(tmpl => (
                                            <label key={tmpl} className={cn(
                                                "flex items-center gap-3 p-4 rounded-xl border-2 transition-all cursor-pointer",
                                                selectedTemplates.includes(tmpl) ? "bg-indigo-50 border-indigo-500 text-indigo-700" : "bg-white border-slate-100 hover:border-slate-300"
                                            )}>
                                                <input
                                                    type="checkbox"
                                                    className="w-5 h-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                                    checked={selectedTemplates.includes(tmpl)}
                                                    onChange={(e) => {
                                                        if (e.target.checked) setSelectedTemplates([...selectedTemplates, tmpl]);
                                                        else setSelectedTemplates(selectedTemplates.filter(t => t !== tmpl));
                                                    }}
                                                />
                                                <span className="text-sm font-bold truncate">{tmpl}</span>
                                            </label>
                                        ))}
                                    </div>
                                    <div className="flex justify-between items-center pt-6 border-t border-slate-100">
                                        <span className="text-sm font-bold text-slate-500">{selectedTemplates.length} templates selected</span>
                                        <button
                                            onClick={extractTemplates}
                                            disabled={processing || selectedTemplates.length === 0}
                                            className="bg-indigo-600 text-white px-8 py-3 rounded-xl hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 font-black shadow-lg shadow-indigo-200 transition-all"
                                        >
                                            {processing ? "Processing..." : <><Download className="w-5 h-5" /> Extract & Download</>}
                                        </button>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'areas' && (
                                <div className="p-8">
                                    <h2 className="text-2xl font-black text-slate-800 mb-2">Area Extraction</h2>
                                    <p className="text-slate-500 mb-8 font-medium">데이터를 필터링할 Area를 선택하세요. 선택한 Area에 해당하는 행만 유지됩니다.</p>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mb-8 max-h-[500px] overflow-y-auto p-1">
                                        {session.areas.map(area => (
                                            <label key={area} className={cn(
                                                "flex items-center gap-3 p-4 rounded-xl border-2 transition-all cursor-pointer",
                                                selectedAreas.includes(area) ? "bg-indigo-50 border-indigo-500 text-indigo-700" : "bg-white border-slate-100 hover:border-slate-300"
                                            )}>
                                                <input
                                                    type="checkbox"
                                                    className="w-5 h-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                                    checked={selectedAreas.includes(area)}
                                                    onChange={(e) => {
                                                        if (e.target.checked) setSelectedAreas([...selectedAreas, area]);
                                                        else setSelectedAreas(selectedAreas.filter(a => a !== area));
                                                    }}
                                                />
                                                <span className="text-sm font-bold truncate">{area}</span>
                                            </label>
                                        ))}
                                    </div>
                                    <div className="flex justify-between items-center pt-6 border-t border-slate-100">
                                        <span className="text-sm font-bold text-slate-500">{selectedAreas.length} areas selected</span>
                                        <button
                                            onClick={extractAreas}
                                            disabled={processing || selectedAreas.length === 0}
                                            className="bg-indigo-600 text-white px-8 py-3 rounded-xl hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 font-black shadow-lg shadow-indigo-200 transition-all"
                                        >
                                            {processing ? "Processing..." : <><Download className="w-5 h-5" /> Extract & Download</>}
                                        </button>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'extensions' && (
                                <div className="p-8 space-y-12">
                                    <section>
                                        <h2 className="text-xl font-black text-slate-800 mb-2">Extension Analysis</h2>
                                        <p className="text-slate-500 mb-6 font-medium">모든 템플릿의 `Extensions(MxBigString)` 열을 분석하여 보고서를 생성합니다.</p>
                                        <button onClick={analyzeExtensions} disabled={processing} className="bg-white border-2 border-slate-200 text-slate-700 px-6 py-3 rounded-xl hover:bg-slate-50 hover:border-slate-300 flex items-center gap-2 font-black transition-all">
                                            <Activity className="w-5 h-5 text-indigo-600" /> Analyze & Download CSV
                                        </button>
                                    </section>

                                    <div className="h-px bg-slate-100 w-full" />

                                    <section>
                                        <h2 className="text-xl font-black text-slate-800 mb-2">PLC Matrix Extraction</h2>
                                        <p className="text-slate-500 mb-6 font-medium">템플릿별로 PLC 주소를 매트릭스(Tag x Attribute) 형식으로 추출합니다.</p>
                                        <button onClick={extractMatrix} disabled={processing} className="bg-emerald-600 text-white px-6 py-3 rounded-xl hover:bg-emerald-700 flex items-center gap-2 font-black shadow-lg shadow-emerald-100 transition-all">
                                            <Download className="w-5 h-5" /> Download Matrices (ZIP)
                                        </button>
                                    </section>

                                    <div className="h-px bg-slate-100 w-full" />

                                    <section>
                                        <h2 className="text-xl font-black text-slate-800 mb-2">Address Map Extraction</h2>
                                        <p className="text-slate-500 mb-6 font-medium">Area별로 그룹화된 주소 맵을 추출합니다.</p>
                                        <div className="flex flex-wrap gap-4">
                                            <button onClick={() => extractAddresses(false)} disabled={processing} className="bg-indigo-600 text-white px-6 py-3 rounded-xl hover:bg-indigo-700 flex items-center gap-2 font-black shadow-lg shadow-indigo-100 transition-all">
                                                <Download className="w-5 h-5" /> All Tags (ZIP)
                                            </button>
                                            <button onClick={() => extractAddresses(true)} disabled={processing} className="bg-indigo-600 text-white px-6 py-3 rounded-xl hover:bg-indigo-700 flex items-center gap-2 font-black shadow-lg shadow-indigo-100 transition-all">
                                                <Download className="w-5 h-5" /> Alarm Only (ZIP)
                                            </button>
                                        </div>
                                    </section>
                                </div>
                            )}
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
}

function SidebarItem({ id, label, active, set }) {
    const isActive = active === id;
    return (
        <button
            onClick={() => set(id)}
            className={cn(
                "w-full text-left px-4 py-2 text-sm font-medium transition-all relative group",
                isActive ? "text-white" : "text-slate-500 hover:text-slate-300"
            )}
        >
            <div className={cn(
                "absolute left-0 top-1/2 -translate-y-1/2 w-1 h-4 bg-indigo-500 rounded-r-full transition-all",
                isActive ? "opacity-100" : "opacity-0"
            )} />
            {label}
        </button>
    );
}

export default App;

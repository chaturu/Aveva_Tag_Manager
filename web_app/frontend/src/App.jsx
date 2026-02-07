import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Upload, FileText, Layout, Activity, Download, CheckCircle, AlertCircle, ChevronDown, ChevronRight, Menu, Home, Info, Monitor, Layers } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs) {
    return twMerge(clsx(inputs));
}

function App() {
    const [user, setUser] = useState({ id: 'guest' });
    const [session, setSession] = useState(null);
    const [uploading, setUploading] = useState(false);
    
    // Navigation State
    const [activeMenu, setActiveMenu] = useState('home'); // 'home' | 'system_platform' | 'intouch'
    const [activeSubMenu, setActiveSubMenu] = useState('templates'); // 'templates' | 'areas' | 'extensions'

    const [selectedTemplates, setSelectedTemplates] = useState([]);
    const [selectedAreas, setSelectedAreas] = useState([]);
    const [processing, setProcessing] = useState(false);
    const [message, setMessage] = useState(null);
    const [dragActive, setDragActive] = useState(false);
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);

    const uploadFile = async (file) => {
        if (!file) return;

        // Vercel 4.5MB Limit Check
        const MAX_SIZE = 4.5 * 1024 * 1024;
        if (file.size > MAX_SIZE) {
            setMessage({ 
                type: 'error', 
                text: `파일 크기가 너무 큽니다 (${(file.size / (1024 * 1024)).toFixed(2)}MB). Vercel 제한으로 인해 4.5MB 이하의 파일(또는 압축된 ZIP)만 업로드 가능합니다.` 
            });
            return;
        }

        setUploading(true);
        const formData = new FormData();
        formData.append('file', file);
        try {
            const res = await axios.post('/api/upload', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            setSession(res.data);
            setMessage({ type: 'success', text: 'File uploaded successfully!' });
            
            // Auto-select first feature if applicable, or stay on current menu
            if (activeMenu === 'system_platform') {
                setActiveSubMenu('templates');
            }
        } catch (err) {
            console.error(err);
            setMessage({ type: 'error', text: 'Upload failed: ' + (err.response?.data?.detail || err.message) });
        } finally {
            setUploading(false);
        }
    };

    const handleFileSelect = (e) => uploadFile(e.target.files[0]);

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
            const res = await axios.post('/api/extract/templates', { session_id: session.session_id, templates: selectedTemplates }, { responseType: 'blob' });
            const url = window.URL.createObjectURL(new Blob([res.data]));
            handleDownload(url, `extracted_templates.csv`);
            setMessage({ type: 'success', text: 'Templates extracted successfully.' });
        } catch (err) { setMessage({ type: 'error', text: 'Extraction failed.' }); } finally { setProcessing(false); }
    };

    const extractAreas = async () => {
        if (selectedAreas.length === 0) return;
        setProcessing(true);
        try {
            const res = await axios.post('/api/extract/areas', { session_id: session.session_id, areas: selectedAreas }, { responseType: 'blob' });
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

    // Helper to render the upload screen
    const renderUploadScreen = (title, description) => (
        <div className="flex flex-col items-center justify-center min-h-[60vh]">
            <div className="bg-white p-12 rounded-3xl shadow-xl max-w-xl w-full text-center border border-slate-100">
                <div className="mx-auto w-24 h-24 bg-indigo-600 rounded-3xl flex items-center justify-center mb-8 shadow-xl shadow-indigo-100 rotate-6 hover:rotate-0 transition-transform duration-500">
                    <Upload className="text-white w-12 h-12" />
                </div>
                <h1 className="text-3xl font-black mb-4 text-slate-800 tracking-tight">{title}</h1>
                <p className="text-slate-500 mb-10 font-medium text-lg leading-relaxed">{description}</p>

                <div 
                    onDragEnter={handleDrag}
                    onDragLeave={handleDrag}
                    onDragOver={handleDrag}
                    onDrop={handleDrop}
                    className={cn(
                        "group relative flex flex-col items-center px-8 py-12 border-4 border-dashed rounded-3xl transition-all bg-slate-50/50",
                        dragActive ? "border-indigo-500 bg-indigo-50/30 scale-[1.02]" : "border-slate-100 hover:border-indigo-400 hover:bg-indigo-50/20"
                    )}
                >
                    <p className="mb-8 text-sm font-bold text-slate-400 leading-relaxed">
                        DRAG & DROP YOUR FILE HERE<br />
                        <span className="text-xs font-medium opacity-60">(.CSV OR .ZIP FOR LARGE FILES)</span>
                    </p>
                    <label className="bg-indigo-600 text-white px-10 py-4 rounded-2xl shadow-xl shadow-indigo-200 hover:bg-indigo-700 hover:scale-105 active:scale-95 transition-all cursor-pointer font-black text-base">
                        {uploading ? "Analyzing..." : "Browse Local File"}
                        <input type='file' className="hidden" accept=".csv,.zip" onChange={handleFileSelect} disabled={uploading} />
                    </label>
                </div>

                {uploading && (
                    <div className="mt-8 flex flex-col items-center gap-3">
                        <div className="w-10 h-10 border-4 border-slate-100 border-t-indigo-600 rounded-full animate-spin"></div>
                        <p className="text-sm font-black text-slate-600">데이터 처리 중입니다...</p>
                    </div>
                )}
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-slate-50 flex overflow-hidden">
            {/* Sidebar (Always Visible) */}
            <aside className={cn(
                "bg-slate-900 text-slate-300 w-72 flex-shrink-0 flex flex-col transition-all duration-300 z-20 shadow-2xl",
                !isSidebarOpen && "-ml-72"
            )}>
                <div className="p-6 border-b border-slate-800 flex items-center gap-3">
                    <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center">
                        <Activity className="text-white w-5 h-5" />
                    </div>
                    <span className="font-black text-xl text-white tracking-tighter">AVEVA TM</span>
                </div>

                <nav className="flex-1 p-4 overflow-y-auto space-y-2">
                    <SidebarItem 
                        id="home" 
                        label="Home" 
                        icon={Home} 
                        active={activeMenu} 
                        set={setActiveMenu} 
                    />
                    
                    {/* System Platform Menu */}
                    <div>
                        <SidebarItem 
                            id="system_platform" 
                            label="System Platform" 
                            icon={Layers} 
                            active={activeMenu} 
                            set={setActiveMenu} 
                        />
                        {activeMenu === 'system_platform' && session && (
                            <div className="mt-1 ml-4 flex flex-col gap-1 border-l border-slate-800">
                                <SidebarSubItem id="templates" label="Extract Templates" active={activeSubMenu} set={setActiveSubMenu} />
                                <SidebarSubItem id="areas" label="Extract Areas" active={activeSubMenu} set={setActiveSubMenu} />
                                <SidebarSubItem id="extensions" label="Extensions & PLC" active={activeSubMenu} set={setActiveSubMenu} />
                            </div>
                        )}
                    </div>

                    {/* InTouch Menu */}
                    <div>
                        <SidebarItem 
                            id="intouch" 
                            label="InTouch" 
                            icon={Monitor} 
                            active={activeMenu} 
                            set={setActiveMenu} 
                        />
                        {activeMenu === 'intouch' && session && (
                            <div className="mt-1 ml-4 flex flex-col gap-1 border-l border-slate-800">
                                {/* Future InTouch features can go here */}
                                <div className="px-4 py-2 text-xs font-medium text-slate-600">Coming Soon</div>
                            </div>
                        )}
                    </div>
                </nav>

                {session && (
                    <div className="p-4 border-t border-slate-800">
                        <div className="bg-slate-800/50 p-4 rounded-xl">
                            <h3 className="text-xs font-black text-slate-500 uppercase mb-3 text-center">Session Info</h3>
                            <div className="space-y-2">
                                <div className="flex justify-between text-sm">
                                    <span className="text-slate-400">Items</span>
                                    <span className="text-indigo-400 font-bold">{session.total_templates + session.total_areas}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </aside>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col min-w-0 h-screen">
                {/* Topbar */}
                <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 flex-shrink-0 shadow-sm z-10">
                    <div className="flex items-center gap-4">
                        <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 hover:bg-slate-100 rounded-lg text-slate-500 transition-colors">
                            <Menu className="w-5 h-5" />
                        </button>
                        <h2 className="text-lg font-bold text-slate-700">
                            {activeMenu === 'home' && "Welcome"}
                            {activeMenu === 'system_platform' && "System Platform Operations"}
                            {activeMenu === 'intouch' && "InTouch Operations"}
                        </h2>
                    </div>
                    {session && (
                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2 bg-indigo-50 px-4 py-1.5 rounded-full border border-indigo-100">
                                <FileText className="w-4 h-4 text-indigo-500" />
                                <span className="text-sm font-bold text-indigo-700 truncate max-w-xs">{session.filename}</span>
                            </div>
                            <button 
                                onClick={() => { setSession(null); setMessage(null); }} 
                                className="text-sm font-bold text-red-500 hover:text-red-700 px-3 py-1.5 rounded-lg hover:bg-red-50 transition-colors"
                            >
                                Close Session
                            </button>
                        </div>
                    )}
                </header>

                {/* Content */}
                <main className="flex-1 overflow-auto p-8 relative">
                    <div className="max-w-6xl mx-auto">
                        {message && (
                            <div className={cn("mb-6 p-4 rounded-xl flex items-center gap-3 border animate-in fade-in slide-in-from-top-4", 
                                message.type === 'error' ? "bg-red-50 text-red-600 border-red-100" : "bg-green-50 text-green-600 border-green-100"
                            )}>
                                {message.type === 'error' ? <AlertCircle className="w-5 h-5" /> : <CheckCircle className="w-5 h-5" />}
                                <span className="font-bold">{message.text}</span>
                            </div>
                        )}

                        {/* HOME VIEW */}
                        {activeMenu === 'home' && (
                            <div className="flex flex-col items-center justify-center pt-10">
                                <div className="text-center max-w-2xl bg-white p-10 rounded-3xl shadow-sm border border-slate-100">
                                    <div className="w-20 h-20 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-indigo-100">
                                        <Activity className="text-white w-10 h-10" />
                                    </div>
                                    <h1 className="text-4xl font-black text-slate-800 mb-4 tracking-tight">Aveva Tag Manager</h1>
                                    <p className="text-lg text-slate-500 leading-relaxed mb-8">
                                        AVEVA System Platform 및 InTouch 태그 데이터를 효율적으로 관리하고 생산성을 높이세요.
                                        왼쪽 메뉴에서 원하는 작업을 선택하여 시작할 수 있습니다.
                                    </p>
                                    <div className="grid grid-cols-2 gap-4 text-left">
                                        <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100">
                                            <div className="flex items-center gap-2 mb-2">
                                                <Layers className="w-5 h-5 text-indigo-600" />
                                                <span className="font-bold text-slate-700">System Platform</span>
                                            </div>
                                            <p className="text-sm text-slate-500">Galaxy Dump 파일을 분석하여 템플릿, 주소 매핑 및 매트릭스를 추출합니다.</p>
                                        </div>
                                        <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100">
                                            <div className="flex items-center gap-2 mb-2">
                                                <Monitor className="w-5 h-5 text-emerald-600" />
                                                <span className="font-bold text-slate-700">InTouch</span>
                                            </div>
                                            <p className="text-sm text-slate-500">InTouch 태그 DB를 위한 업로드 및 분석 도구를 제공합니다.</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* SYSTEM PLATFORM VIEW */}
                        {activeMenu === 'system_platform' && (
                            <>
                                {!session ? (
                                    renderUploadScreen("System Platform Upload", "Galaxy Dump CSV 파일을 업로드하여 템플릿과 영역 정보를 분석하세요.")
                                ) : (
                                    <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden min-h-[500px]">
                                        {activeSubMenu === 'templates' && (
                                            <div className="p-10">
                                                <h2 className="text-3xl font-black text-slate-800 mb-2">Template Extraction</h2>
                                                <p className="text-slate-500 mb-10 font-medium">추출할 템플릿을 선택하세요. $Area 속성은 자동으로 포함됩니다.</p>
                                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-10 max-h-[500px] overflow-y-auto p-1 custom-scrollbar">
                                                    {session.templates.map(tmpl => (
                                                        <label key={tmpl} className={cn(
                                                            "flex items-center gap-4 p-5 rounded-2xl border-2 transition-all cursor-pointer",
                                                            selectedTemplates.includes(tmpl) ? "bg-indigo-50 border-indigo-500 text-indigo-700 shadow-md shadow-indigo-50" : "bg-white border-slate-100 hover:border-slate-300"
                                                        )}>
                                                            <input
                                                                type="checkbox"
                                                                className="w-6 h-6 rounded-lg border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                                                checked={selectedTemplates.includes(tmpl)}
                                                                onChange={(e) => {
                                                                    if (e.target.checked) setSelectedTemplates([...selectedTemplates, tmpl]);
                                                                    else setSelectedTemplates(selectedTemplates.filter(t => t !== tmpl));
                                                                }}
                                                            />
                                                            <span className="text-base font-bold truncate">{tmpl}</span>
                                                        </label>
                                                    ))}
                                                </div>
                                                <div className="flex justify-between items-center pt-8 border-t border-slate-100">
                                                    <div className="text-slate-500 font-bold">
                                                        <span className="text-indigo-600 text-2xl pr-1">{selectedTemplates.length}</span> templates selected
                                                    </div>
                                                    <button
                                                        onClick={extractTemplates}
                                                        disabled={processing || selectedTemplates.length === 0}
                                                        className="bg-indigo-600 text-white px-10 py-4 rounded-2xl hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-3 font-black shadow-xl shadow-indigo-100 transition-all active:scale-95"
                                                    >
                                                        {processing ? "Processing..." : <><Download className="w-6 h-6" /> Extract & Download</>}
                                                    </button>
                                                </div>
                                            </div>
                                        )}

                                        {activeSubMenu === 'areas' && (
                                            <div className="p-10">
                                                <h2 className="text-3xl font-black text-slate-800 mb-2">Area Extraction</h2>
                                                <p className="text-slate-500 mb-10 font-medium">데이터를 필터링할 Area를 선택하세요. 선택한 Area에 해당하는 행만 유지됩니다.</p>
                                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-10 max-h-[500px] overflow-y-auto p-1 custom-scrollbar">
                                                    {session.areas.map(area => (
                                                        <label key={area} className={cn(
                                                            "flex items-center gap-4 p-5 rounded-2xl border-2 transition-all cursor-pointer",
                                                            selectedAreas.includes(area) ? "bg-indigo-50 border-indigo-500 text-indigo-700 shadow-md shadow-indigo-50" : "bg-white border-slate-100 hover:border-slate-300"
                                                        )}>
                                                            <input
                                                                type="checkbox"
                                                                className="w-6 h-6 rounded-lg border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                                                checked={selectedAreas.includes(area)}
                                                                onChange={(e) => {
                                                                    if (e.target.checked) setSelectedAreas([...selectedAreas, area]);
                                                                    else setSelectedAreas(selectedAreas.filter(a => a !== area));
                                                                }}
                                                            />
                                                            <span className="text-base font-bold truncate">{area}</span>
                                                        </label>
                                                    ))}
                                                </div>
                                                <div className="flex justify-between items-center pt-8 border-t border-slate-100">
                                                    <div className="text-slate-500 font-bold">
                                                        <span className="text-indigo-600 text-2xl pr-1">{selectedAreas.length}</span> areas selected
                                                    </div>
                                                    <button
                                                        onClick={extractAreas}
                                                        disabled={processing || selectedAreas.length === 0}
                                                        className="bg-indigo-600 text-white px-10 py-4 rounded-2xl hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-3 font-black shadow-xl shadow-indigo-100 transition-all active:scale-95"
                                                    >
                                                        {processing ? "Processing..." : <><Download className="w-6 h-6" /> Extract & Download</>}
                                                    </button>
                                                </div>
                                            </div>
                                        )}

                                        {activeSubMenu === 'extensions' && (
                                            <div className="p-10 space-y-12">
                                                <section className="bg-slate-50/50 p-8 rounded-3xl border border-slate-100">
                                                    <h2 className="text-2xl font-black text-slate-800 mb-2">Extension Analysis</h2>
                                                    <p className="text-slate-500 mb-8 font-medium">모든 템플릿의 `Extensions(MxBigString)` 열을 분석하여 상세 보고서를 생성합니다.</p>
                                                    <button onClick={analyzeExtensions} disabled={processing} className="bg-white border-2 border-slate-200 text-slate-700 px-8 py-4 rounded-2xl hover:bg-slate-50 hover:border-indigo-400 hover:text-indigo-600 flex items-center gap-3 font-black transition-all shadow-sm">
                                                        <Activity className="w-6 h-6 text-indigo-600" /> Analyze & Download CSV
                                                    </button>
                                                </section>

                                                <section className="bg-slate-50/50 p-8 rounded-3xl border border-slate-100">
                                                    <h2 className="text-2xl font-black text-slate-800 mb-2">PLC Matrix Extraction</h2>
                                                    <p className="text-slate-500 mb-8 font-medium">템플릿별로 PLC 주소를 매트릭스(Tag x Attribute) 형식으로 추출합니다.</p>
                                                    <button onClick={extractMatrix} disabled={processing} className="bg-emerald-600 text-white px-8 py-4 rounded-2xl hover:bg-emerald-700 flex items-center gap-3 font-black shadow-xl shadow-emerald-100 transition-all active:scale-95">
                                                        <Download className="w-6 h-6" /> Download Matrices (ZIP)
                                                    </button>
                                                </section>

                                                <section className="bg-slate-50/50 p-8 rounded-3xl border border-slate-100">
                                                    <h2 className="text-2xl font-black text-slate-800 mb-2">Address Map Extraction</h2>
                                                    <p className="text-slate-500 mb-8 font-medium">Area별로 그룹화된 주소 맵을 추출합니다.</p>
                                                    <div className="flex flex-wrap gap-6">
                                                        <button onClick={() => extractAddresses(false)} disabled={processing} className="bg-indigo-600 text-white px-8 py-4 rounded-2xl hover:bg-indigo-700 flex items-center gap-3 font-black shadow-xl shadow-indigo-100 transition-all active:scale-95">
                                                            <Download className="w-6 h-6" /> All Tags (ZIP)
                                                        </button>
                                                        <button onClick={() => extractAddresses(true)} disabled={processing} className="bg-indigo-600 text-white px-8 py-4 rounded-2xl hover:bg-indigo-700 flex items-center gap-3 font-black shadow-xl shadow-indigo-100 transition-all active:scale-95">
                                                            <Download className="w-6 h-6" /> Alarm Only (ZIP)
                                                        </button>
                                                    </div>
                                                </section>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </>
                        )}

                        {/* INTOUCH VIEW */}
                        {activeMenu === 'intouch' && (
                            <>
                                {!session ? (
                                    renderUploadScreen("InTouch Upload", "InTouch DB Dump CSV 파일을 업로드하여 태그를 분석하세요.")
                                ) : (
                                    <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-12 text-center">
                                        <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                            <Monitor className="text-slate-400 w-10 h-10" />
                                        </div>
                                        <h2 className="text-2xl font-black text-slate-800 mb-2">InTouch Workspace</h2>
                                        <p className="text-slate-500">InTouch 관련 기능은 현재 준비 중입니다.</p>
                                        <div className="mt-8">
                                             {/* Placeholder mostly - reusing extraction just to show something if needed, or keeping blank */}
                                             <button className="bg-slate-100 text-slate-400 px-6 py-3 rounded-xl font-bold cursor-not-allowed">No Actions Available</button>
                                        </div>
                                    </div>
                                )}
                            </>
                        )}

                    </div>
                </main>
            </div>
        </div>
    );
}

function SidebarItem({ id, label, icon: Icon, active, set }) {
    const isActive = active === id;
    return (
        <button
            onClick={() => set(id)}
            className={cn(
                "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all mb-1",
                isActive ? "bg-indigo-600 text-white shadow-lg shadow-indigo-900/50" : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
            )}
        >
            <Icon className="w-4 h-4" />
            {label}
        </button>
    );
}

function SidebarSubItem({ id, label, active, set }) {
    const isActive = active === id;
    return (
        <button
            onClick={() => set(id)}
            className={cn(
                "w-full text-left px-4 py-2 text-sm font-bold transition-all relative group mb-1",
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

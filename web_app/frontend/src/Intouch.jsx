import React, { useState } from 'react';
import axios from 'axios';
import { Upload, Download, AlertCircle, CheckCircle, FileText } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs) {
    return twMerge(clsx(inputs));
}

export default function Intouch({ mode, file, setFile, message, setMessage }) {
    const [uploading, setUploading] = useState(false);
    const [dragActive, setDragActive] = useState(false);

    // Determine config based on mode
    const getModeConfig = () => {
        switch (mode) {
            case 'tags':
                return {
                    title: "Intouch 태그 추출",
                    description: "Intouch DB CSV 덤프 파일을 업로드하여 모든 태그 아이템을 추출하세요.",
                    extractType: 'tags',
                    buttonText: "태그 추출 및 다운로드"
                };
            case 'alarms':
                return {
                    title: "Intouch 알람 추출",
                    description: "Intouch DB CSV 덤프 파일을 업로드하여 알람 설정 데이터를 추출하세요.",
                    extractType: 'alarms',
                    buttonText: "알람 추출 및 다운로드"
                };
            default:
                return {
                    title: "Intouch 데이터 추출 (통합)",
                    description: "Intouch DB CSV 덤프 파일을 업로드하여 알람 및 태그 데이터를 모두 추출하세요.",
                    extractType: 'all',
                    buttonText: "데이터 추출 및 다운로드"
                };
        }
    };

    const config = getModeConfig();

    const handleFileSelect = (e) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
            setMessage(null);
        }
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
            setFile(e.dataTransfer.files[0]);
            setMessage(null);
        }
    };

    const handleProcess = async () => {
        if (!file) return;

        setUploading(true);
        setMessage(null);

        const formData = new FormData();
        formData.append('file', file);
        formData.append('extract_type', config.extractType);

        try {
            const res = await axios.post('/api/intouch/process', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
                responseType: 'blob'
            });

            // Extract filename from content-disposition if possible, else default
            let filename = `Intouch_Export_${config.extractType}_${Date.now()}.zip`;
            const disposition = res.headers['content-disposition'];
            if (disposition && disposition.indexOf('attachment') !== -1) {
                const filenameRegex = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/;
                const matches = filenameRegex.exec(disposition);
                if (matches != null && matches[1]) {
                    filename = matches[1].replace(/['"]/g, '');
                }
            }

            const url = window.URL.createObjectURL(new Blob([res.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', filename);
            document.body.appendChild(link);
            link.click();
            link.remove();

            setMessage({ type: 'success', text: '파일이 성공적으로 처리되어 다운로드되었습니다!' });
            setFile(null); // Reset after success
        } catch (err) {
            console.error(err);
            setMessage({ type: 'error', text: '처리 실패: ' + (err.message) });
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="h-full flex flex-col">
            <h2 className="text-lg font-bold mb-4">{config.title}</h2>
            <p className="text-gray-500 mb-6 text-sm">
                {config.description} (대용량 파일의 경우 ZIP 압축 파일 업로드 가능)
            </p>

            <div className="flex-1 flex flex-col items-center justify-center p-6 bg-gray-50 rounded-lg border border-gray-200">
                {!file ? (
                    <div
                        onDragEnter={handleDrag}
                        onDragLeave={handleDrag}
                        onDragOver={handleDrag}
                        onDrop={handleDrop}
                        className={cn(
                            "flex flex-col items-center justify-center p-10 border-2 border-dashed rounded-lg transition-colors w-full max-w-lg cursor-pointer",
                            dragActive ? "bg-blue-50 border-blue-500" : "bg-white border-gray-300 hover:bg-gray-100"
                        )}
                    >
                        <Upload className="w-10 h-10 text-gray-400 mb-4" />
                        <p className="text-gray-600 font-medium mb-2">CSV 또는 ZIP 파일을 여기로 드래그 앤 드롭하세요</p>
                        <p className="text-sm text-gray-400 mb-4">또는 클릭하여 파일 찾기</p>
                        <label className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition cursor-pointer font-medium text-sm">
                            파일 선택
                            <input type='file' className="hidden" accept=".csv,.zip" onChange={handleFileSelect} />
                        </label>
                    </div>
                ) : (
                    <div className="w-full max-w-lg bg-white p-6 rounded-lg shadow-sm border flex flex-col items-center">
                        <div className="bg-indigo-50 p-4 rounded-full mb-4">
                            <FileText className="w-8 h-8 text-indigo-600" />
                        </div>
                        <h3 className="font-medium text-gray-900 mb-1">{file.name}</h3>
                        <p className="text-sm text-gray-500 mb-6">{(file.size / 1024 / 1024).toFixed(2)} MB</p>

                        <div className="flex gap-3 w-full">
                            <button
                                onClick={() => setFile(null)}
                                className="flex-1 py-2 px-4 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition"
                                disabled={uploading}
                            >
                                취소
                            </button>
                            <button
                                onClick={handleProcess}
                                disabled={uploading}
                                className="flex-1 py-2 px-4 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition flex items-center justify-center gap-2"
                            >
                                {uploading ? "처리 중..." : <><Download className="w-4 h-4" /> {config.buttonText}</>}
                            </button>
                        </div>
                    </div>
                )}

                {message && (
                    <div className={cn("mt-6 p-3 rounded-lg flex items-center gap-2 w-full max-w-lg", message.type === 'error' ? "bg-red-50 text-red-600 border border-red-100" : "bg-green-50 text-green-600 border border-green-100")}>
                        {message.type === 'error' ? <AlertCircle className="w-5 h-5 flex-shrink-0" /> : <CheckCircle className="w-5 h-5 flex-shrink-0" />}
                        <span className="text-sm font-medium">{message.text}</span>
                    </div>
                )}
            </div>
        </div>
    );
}

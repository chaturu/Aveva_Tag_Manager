import sys
import os
import shutil
import uuid
import csv
from typing import List, Optional
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.responses import FileResponse, JSONResponse, StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import zipfile
import io

# Imports from local directory
from .aveva_parser import AvevaParser
from .extension_analyzer import ExtensionAnalyzer

app = FastAPI()

# Allow CORS for local development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for simplicity in dev
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

import tempfile

# Simple in-memory session storage
# { session_id: { "filepath": path, "filename": original_name } }
SESSIONS = {}
UPLOAD_DIR = os.path.join(tempfile.gettempdir(), "aveva_uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

class SessionResponse(BaseModel):
    session_id: str
    filename: str
    total_templates: int
    total_areas: int
    templates: List[str]
    areas: List[str]

def get_parser(session_id: str):
    if session_id not in SESSIONS:
        raise HTTPException(status_code=404, detail="Session not found")
    
    filepath = SESSIONS[session_id]["filepath"]
    if not os.path.exists(filepath):
        raise HTTPException(status_code=404, detail="File not found on server")
        
    parser = AvevaParser(filepath)
    parser.parse()
    return parser

@app.post("/api/upload", response_model=SessionResponse)
async def upload_file(file: UploadFile = File(...)):
    session_id = str(uuid.uuid4())
    file_location = os.path.join(UPLOAD_DIR, f"{session_id}_{file.filename}")
    
    with open(file_location, "wb+") as file_object:
        shutil.copyfileobj(file.file, file_object)
        
    try:
        # Validate by parsing
        parser = AvevaParser(file_location)
        parser.parse()
        
        SESSIONS[session_id] = {
            "filepath": file_location,
            "filename": file.filename
        }
        
        templates = parser.get_template_names()
        display_templates = [t for t in templates if t != "$Area"]
        areas = parser.get_area_names()
        
        return SessionResponse(
            session_id=session_id,
            filename=file.filename,
            total_templates=len(templates),
            total_areas=len(areas),
            templates=display_templates,
            areas=areas
        )
        
    except Exception as e:
        if os.path.exists(file_location):
            try:
                os.remove(file_location)
            except:
                pass
        raise HTTPException(status_code=400, detail=f"Failed to parse file: {str(e)}")

class ExtractTemplateRequest(BaseModel):
    session_id: str
    templates: List[str]

@app.post("/api/extract/template")
def extract_template(req: ExtractTemplateRequest):
    parser = get_parser(req.session_id)
    
    lines = []
    lines.extend(parser.get_headers())
    
    if "$Area" in parser.get_template_names():
        # Ensure blank line logic
        if lines and lines[-1].strip() != "": lines.append("\n")
        lines.extend(parser.get_template_content("$Area"))
    
    for tmpl in req.templates:
        if lines and lines[-1].strip() != "": lines.append("\n")
        lines.extend(parser.get_template_content(tmpl))
        
    # Create temp file to serve
    output_filename = f"extracted_templates.csv"
    output_path = os.path.join(UPLOAD_DIR, f"{req.session_id}_{output_filename}")
    
    with open(output_path, 'w', encoding='utf-16', newline='') as f:
        for line in lines:
            f.write(line)
            
    return FileResponse(output_path, filename=output_filename, media_type='text/csv')

class ExtractAreaRequest(BaseModel):
    session_id: str
    areas: List[str]

@app.post("/api/extract/area")
def extract_area(req: ExtractAreaRequest):
    parser = get_parser(req.session_id)
    
    # Logic from main_gui.py perform_area_extraction
    lines = []
    lines.extend(parser.get_headers())
    
    if "$Area" in parser.get_template_names():
        if lines and lines[-1].strip() != "": lines.append("\n")
        lines.extend(parser.get_template_content("$Area"))

    for tmpl in parser.get_template_names():
        if tmpl == "$Area": continue
        
        content = parser.get_template_content(tmpl)
        area_col_idx = parser.get_column_index(tmpl, "Area")
        
        if area_col_idx == -1:
            continue 
            
        matching_rows = []
        for line in content[2:]: # Data rows
            parts = line.strip().split(',')
            if len(parts) > area_col_idx:
                 val = parts[area_col_idx]
                 if val in req.areas:
                    matching_rows.append(line)
        
        if matching_rows:
            if lines and lines[-1].strip() != "": lines.append("\n")
            lines.append(content[0]) # :TEMPLATE=...
            lines.append(content[1]) # Headers
            lines.extend(matching_rows)
            
    output_filename = f"extracted_areas.csv"
    output_path = os.path.join(UPLOAD_DIR, f"{req.session_id}_{output_filename}")
    
    with open(output_path, 'w', encoding='utf-16', newline='') as f:
        for line in lines:
            f.write(line)
            
    return FileResponse(output_path, filename=output_filename, media_type='text/csv')

class MatrixRequest(BaseModel):
    session_id: str

@app.post("/api/extract/matrix")
def extract_matrix(req: MatrixRequest):
    parser = get_parser(req.session_id)
    analyzer = ExtensionAnalyzer(parser)
    matrices = analyzer.get_plc_matrices_by_template()
    
    # Create a zip file in memory
    zip_io = io.BytesIO()
    with zipfile.ZipFile(zip_io, mode='w', compression=zipfile.ZIP_DEFLATED) as temp_zip:
        for tmpl, (headers, rows) in matrices.items():
            clean_tmpl = tmpl.replace('$', '').replace(':', '')
            filename = f"{clean_tmpl}_Matrix.csv"
            
            # Write CSV to string
            csv_io = io.StringIO()
            writer = csv.writer(csv_io)
            writer.writerow(headers)
            writer.writerows(rows)
            
            temp_zip.writestr(filename, csv_io.getvalue().encode('utf-8-sig'))
    
    zip_io.seek(0)
    return StreamingResponse(
        iter([zip_io.getvalue()]), 
        media_type="application/zip", 
        headers={"Content-Disposition": f"attachment; filename=plc_matrices.zip"}
    )

from fastapi.responses import StreamingResponse


class ExtractAddressRequest(BaseModel):
    session_id: str
    alarm_only: bool = False

@app.post("/api/extract/addresses")
def extract_addresses(req: ExtractAddressRequest):
    parser = get_parser(req.session_id)
    analyzer = ExtensionAnalyzer(parser)
    area_data = analyzer.extract_address_map_by_area(alarm_only=req.alarm_only)
    
    if not area_data:
        raise HTTPException(status_code=404, detail="No address data found.")
    
    # Create zip
    zip_io = io.BytesIO()
    with zipfile.ZipFile(zip_io, mode='w', compression=zipfile.ZIP_DEFLATED) as temp_zip:
        timestamp = "Export" # simplified
        for area, rows in area_data.items():
            clean_area = area.replace('/', '_').replace('\\', '_')
            if not clean_area: clean_area = "NoArea"
            filename = f"{clean_area}_Addresses.csv"
            
            csv_io = io.StringIO()
            writer = csv.writer(csv_io, quoting=csv.QUOTE_ALL)
            for row in rows:
                writer.writerow(row)
            
            temp_zip.writestr(filename, csv_io.getvalue().encode('utf-8-sig'))
            
    zip_io.seek(0)
    suffix = "AlarmOnly" if req.alarm_only else "AllTags"
    return StreamingResponse(
        iter([zip_io.getvalue()]), 
        media_type="application/zip", 
        headers={"Content-Disposition": f"attachment; filename=Addresses_{suffix}.zip"}
    )

class AnalyzeExtensionsRequest(BaseModel):
    session_id: str

@app.post("/api/analyze/extensions")
def analyze_extensions(req: AnalyzeExtensionsRequest):
    parser = get_parser(req.session_id)
    analyzer = ExtensionAnalyzer(parser)
    results = analyzer.analyze()
    
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Extension Type", "Defined Item"])
    for ext_type, items in results.items():
        for item in items:
            writer.writerow([ext_type, item])
            
    return StreamingResponse(
        iter([output.getvalue().encode('utf-8-sig')]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=extensions_report.csv"}
    )


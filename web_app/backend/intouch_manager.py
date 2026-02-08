
import csv
import os
import re
import zipfile
import shutil
import io
from datetime import datetime
from typing import Dict, List, Tuple

class IntouchManager:
    def __init__(self, upload_dir: str):
        self.upload_dir = upload_dir

    def sanitize_filename(self, name: str) -> str:
        """Sanitizes a string to be safe for filenames."""
        return re.sub(r'[\\/*?:"<>|]', "_", name)

    def get_column_index(self, header_row: List[str], column_name: str) -> int:
        """Returns the index of a column name in the header row, or -1 if not found."""
        try:
            return header_row.index(column_name)
        except ValueError:
            return -1

    def process_file(self, input_file_path: str, session_id: str, extract_type: str = 'all') -> str:
        """
        Processes the Intouch CSV file and returns the path to the generated ZIP file.
        """
        print(f"Reading from {input_file_path}...")
        encoding = 'cp949' # Matches the original script
        
        # Data collections
        # Key: AccessName, Value: List of [Tag, ItemName]
        alarms_data = {}
        all_tags_data = {}
        
        temp_csv_path = None
        try:
            # Check if input is ZIP
            if input_file_path.lower().endswith('.zip'):
                print("ZIP file detected. Extracting...")
                with zipfile.ZipFile(input_file_path, 'r') as zf:
                    # Find CSV files
                    csv_files = [f for f in zf.namelist() if f.lower().endswith('.csv')]
                    if not csv_files:
                        raise ValueError("No CSV file found in the ZIP archive.")
                    
                    # Pick largest CSV if multiple (assumption: database dump is the largest)
                    target_csv = max(csv_files, key=lambda f: zf.getinfo(f).file_size)
                    print(f"Extracting {target_csv}...")
                    
                    # Extract to a temporary path
                    extracted_path = zf.extract(target_csv, self.upload_dir)
                    
                    # Rename to a temp filename we track
                    temp_csv_path = os.path.join(self.upload_dir, f"temp_extracted_{session_id}.csv")
                    if os.path.exists(temp_csv_path):
                        os.remove(temp_csv_path)
                    os.rename(extracted_path, temp_csv_path)
                    
                    # Update input path to point to the extracted CSV
                    input_file_path = temp_csv_path

            with open(input_file_path, 'r', encoding=encoding, errors='replace') as infile:
                reader = csv.reader(infile)
                
                current_section_header = None
                col_indices = {} 
                
                for row in reader:
                    if not row:
                        continue
                    
                    # Check for section start
                    if row[0].startswith(':IO'):
                        current_section_header = row
                        
                        # Reset indices
                        col_indices = {
                            'Tag': 0, 
                            'AccessName': self.get_column_index(row, 'AccessName'),
                            'ItemName': self.get_column_index(row, 'ItemName'),
                            'AlarmState': self.get_column_index(row, 'AlarmState')
                        }
                        
                        if col_indices['AccessName'] == -1 or col_indices['ItemName'] == -1:
                            current_section_header = None
                            
                        continue 
                    
                    if row[0].startswith(':') and not current_section_header:
                         current_section_header = None
                         continue
                    
                    if current_section_header:
                        if row[0].startswith(':'):
                            current_section_header = None
                            continue
    
                        max_idx = max(col_indices.values())
                        if len(row) <= max_idx:
                            continue
                            
                        tag_raw = row[col_indices['Tag']]
                        tag_formatted = tag_raw.replace('\\', '.')
                        
                        item_name = row[col_indices['ItemName']]
                        access_name = row[col_indices['AccessName']].strip()
                        
                        if not access_name:
                            access_name = "Unknown_AccessName"
                            
                        # Add to 'All Tags' collection
                        if access_name not in all_tags_data:
                            all_tags_data[access_name] = []
                        all_tags_data[access_name].append([tag_formatted, item_name])
                        
                        # Add to 'Alarms' collection
                        if col_indices['AlarmState'] != -1:
                            alarm_state = row[col_indices['AlarmState']].strip().lower()
                            if alarm_state in ['on', 'off']:
                                if access_name not in alarms_data:
                                    alarms_data[access_name] = []
                                alarms_data[access_name].append([tag_formatted, item_name])

            # Create final ZIP
            return self.create_session_zip(session_id, alarms_data, all_tags_data, extract_type)
            
        except Exception as e:
            import traceback
            traceback.print_exc()
            raise e
        finally:
            # Cleanup temp extracted CSV if we created one
            if temp_csv_path and os.path.exists(temp_csv_path):
                try:
                    os.remove(temp_csv_path)
                except:
                    pass

    def create_session_zip(self, session_id: str, alarms_data: Dict, all_tags_data: Dict, extract_type: str = 'all') -> str:
        """Creates a single zip file containing Alarms and/or All Tags zips/folders based on extract_type."""
        
        output_zip_name = f"Intouch_Export_{session_id}.zip"
        output_zip_path = os.path.join(self.upload_dir, output_zip_name)
        
        timestamp = datetime.now().strftime("%Y%m%d_%H%M")
        
        with zipfile.ZipFile(output_zip_path, 'w', zipfile.ZIP_DEFLATED) as main_zip:
            
            # Helper to add data to zip
            def add_dataset_to_zip(data_dict, folder_prefix):
                for access_name, rows in data_dict.items():
                    safe_name = self.sanitize_filename(access_name)
                    csv_filename = f"{safe_name}.csv"
                    
                    # Create CSV content
                    csv_io = io.StringIO()
                    writer = csv.writer(csv_io, quoting=csv.QUOTE_ALL)
                    writer.writerows(rows)
                    
                    # Add to zip under folder
                    zip_path = f"{folder_prefix}_{timestamp}/{csv_filename}"
                    main_zip.writestr(zip_path, csv_io.getvalue().encode('utf-8-sig'))

            if extract_type in ['all', 'alarms']:
                add_dataset_to_zip(alarms_data, "Alarms")
            
            if extract_type in ['all', 'tags']:
                add_dataset_to_zip(all_tags_data, "All_Tags")

        return output_zip_path

import csv
import os

class AvevaParser:
    def __init__(self, filepath):
        self.filepath = filepath
        self.templates = {}  # {template_name: [lines]}
        self.headers = []    # File headers (comments, etc.) before the first template
        self.encoding = 'utf-16' # Default for Aveva dumps often

    def parse(self):
        """aryses the file and identifies sections."""
        if not os.path.exists(self.filepath):
            raise FileNotFoundError(f"File not found: {self.filepath}")

        # Basic encoding check or try-except block could be added, 
        # but defaulting to utf-16 as observed in user file.
        
        current_template = None
        
        try:
            with open(self.filepath, 'r', encoding=self.encoding) as f:
                for line in f:
                    stripped_line = line.strip()
                    
                    if stripped_line.startswith(':TEMPLATE='):
                        # valid template line, e.g., :TEMPLATE=$Area
                        current_template = stripped_line.split('=')[1]
                        self.templates[current_template] = [line]
                    elif current_template:
                        # Add content to current template
                        self.templates[current_template].append(line)
                    else:
                        # Header information before any template
                        self.headers.append(line)
                        
        except UnicodeError:
            # Fallback or error reporting
            print("Encoding error. Please ensure the file is UTF-16.")
            raise

    def get_template_names(self):
        return list(self.templates.keys())

    def get_template_content(self, template_name):
        return self.templates.get(template_name, [])

    def get_headers(self):
        return self.headers

    def get_column_index(self, template_name, column_name):
        """Returns the index of a column in a specific template, or -1 if not found."""
        content = self.templates.get(template_name)
        if not content or len(content) < 2:
            return -1
        
        # The second line is usually the header: :Tagname,Area,SecurityGroup...
        header_line = content[1].strip()
        if not header_line.startswith(':'):
             # Some templates might have comments or blank lines? 
             # Assuming standard Aveva format where line 2 is header starting with :
             pass

        headers = header_line.split(',')
        # Remove the leading ':' from the first column if present (e.g. :Tagname)
        cleaned_headers = [h.lstrip(':') for h in headers]
        
        try:
            return cleaned_headers.index(column_name)
        except ValueError:
            return -1

    def get_area_names(self):
        """Returns a list of all defined Areas from the $Area template."""
        if "$Area" not in self.templates:
            return []
            
        tagname_index = self.get_column_index("$Area", "Tagname")
        if tagname_index == -1:
            return []
            
        areas = []
        # Skip :TEMPLATE line and Header line
        for line in self.templates["$Area"][2:]:
            parts = line.strip().split(',')
            if len(parts) > tagname_index:
                areas.append(parts[tagname_index])
        return sorted(areas)

    def update_tag_value(self, template_name, tagname, column_name, new_value):
        """Updates a specific column value for a given tag in a template."""
        if template_name not in self.templates:
            return False
            
        col_idx = self.get_column_index(template_name, column_name)
        tag_idx = self.get_column_index(template_name, "Tagname")
        
        if col_idx == -1 or tag_idx == -1:
            return False
            
        lines = self.templates[template_name]
        # Skip :TEMPLATE and Header
        for i in range(2, len(lines)):
            line = lines[i]
            # Use csv reader to handle quotes correctly
            import io
            f = io.StringIO(line)
            reader = csv.reader(f)
            try:
                row = next(reader)
            except StopIteration:
                continue
                
            if len(row) > tag_idx and row[tag_idx] == tagname:
                # Found the tag, update value
                if len(row) <= col_idx:
                    # Extend row if needed? Usually not for ShortDesc unless empty at end
                    row.extend([""] * (col_idx - len(row) + 1))
                
                row[col_idx] = new_value
                
                # Reconstruct line
                output = io.StringIO()
                writer = csv.writer(output, lineterminator='\n') # Use \n to match expected
                writer.writerow(row)
                lines[i] = output.getvalue()
                return True
        return False

    def get_all_tags_with_column(self, column_name):
        """Returns a list of dicts {Tag, Value, Template} for all tags having the column."""
        results = []
        for tmpl in self.get_template_names():
            if tmpl == "$Area": continue 
            
            col_idx = self.get_column_index(tmpl, column_name)
            tag_idx = self.get_column_index(tmpl, "Tagname")
            
            if col_idx == -1 or tag_idx == -1:
                continue
                
            lines = self.templates[tmpl]
            if len(lines) < 3: continue
            
            # Parse all data lines
            import io
            # Join lines for faster batch parsing instead of line-by-line StringIO?
            # But template might be huge. Line by line is okay for now or bulk parse.
            # Let's do line by line to keep it simple and robust against mixed quoting.
            # Actually, `csv.reader` accepts an iterable (list of strings).
            
            data_lines = lines[2:]
            reader = csv.reader(data_lines)
            
            for row in reader:
                if len(row) > tag_idx:
                    tag = row[tag_idx]
                    val = ""
                    if len(row) > col_idx:
                        val = row[col_idx]
                    
                    results.append({
                        "Tag": tag,
                        "Value": val,
                        "Template": tmpl
                    })
        return results

    def save(self, filepath):
        """Saves the current state of headers and templates to a file."""
        try:
            with open(filepath, 'w', encoding='utf-16', newline='') as f:
                # Write Headers
                for line in self.headers:
                    f.write(line)
                
                # Write Templates
                # Use get_template_names to iterate, but we need the raw lines from self.templates
                # Iterate in insertion order (standard in modern Python) to preserve file structure roughly
                for tmpl_name, lines in self.templates.items():
                    for line in lines:
                        f.write(line)
            return True
        except Exception as e:
            print(f"Error saving file: {e}")
            raise


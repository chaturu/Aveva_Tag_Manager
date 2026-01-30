import tkinter as tk
from tkinter import filedialog, messagebox, ttk
import os
import csv
from datetime import datetime
from aveva_parser import AvevaParser
from extension_analyzer import ExtensionAnalyzer

class AvevaTagManagerApp:
    def __init__(self, root):
        self.root = root
        self.root.title("Aveva Tag Manager")
        
        # Center the window
        window_width = 860
        window_height = 900
        screen_width = self.root.winfo_screenwidth()
        screen_height = self.root.winfo_screenheight()
        x_cordinate = int((screen_width/2) - (window_width/2))
        y_cordinate = int((screen_height/2) - (window_height/2))
        
        self.root.geometry("{}x{}+{}+{}".format(window_width, window_height, x_cordinate, y_cordinate))
        
        self.parser = None
        self.current_file_path = None
        
        self.create_widgets()

    def create_widgets(self):
        # File Selection Frame (Common)
        file_frame = tk.Frame(self.root, pady=10)
        file_frame.pack(fill=tk.X, padx=10)
        
        tk.Label(file_frame, text="Source CSV File:").pack(side=tk.LEFT)
        self.file_entry = tk.Entry(file_frame, width=50)
        self.file_entry.pack(side=tk.LEFT, padx=5, fill=tk.X, expand=True)
        tk.Button(file_frame, text="Browse", command=self.load_file).pack(side=tk.LEFT)

        # Tabs
        self.notebook = ttk.Notebook(self.root)
        self.notebook.pack(fill=tk.BOTH, expand=True, padx=10, pady=5)
        
        # Tab 1: Template Extraction
        self.tab_template = tk.Frame(self.notebook)
        self.notebook.add(self.tab_template, text="Template Extraction")
        self.setup_template_tab()
        
        # Tab 2: Area Extraction
        self.tab_area = tk.Frame(self.notebook)
        self.notebook.add(self.tab_area, text="Area Extraction")
        self.setup_area_tab()

        # Tab 3: Extensions Analysis
        self.tab_extensions = tk.Frame(self.notebook)
        self.notebook.add(self.tab_extensions, text="Extensions Analysis")
        self.setup_extension_tab()

        # Tab 4: ShortDesc Manager
        self.tab_shortdesc = tk.Frame(self.notebook)
        self.notebook.add(self.tab_shortdesc, text="ShortDesc Manager")
        self.setup_shortdesc_tab()

        # Tab 5: PLC I/O Manager
        self.tab_plcio = tk.Frame(self.notebook)
        self.notebook.add(self.tab_plcio, text="PLC I/O Manager")
        self.setup_plcio_tab()

        # Status Bar
        self.status_var = tk.StringVar()
        self.status_var.set("Ready")
        tk.Label(self.root, textvariable=self.status_var, bd=1, relief=tk.SUNKEN, anchor=tk.W).pack(side=tk.BOTTOM, fill=tk.X)

    def setup_template_tab(self):
        # Instructions
        tk.Label(self.tab_template, text="Select a template to extract along with $Area.", pady=10).pack(anchor=tk.W)
        
        # Listbox
        list_frame = tk.Frame(self.tab_template)
        list_frame.pack(fill=tk.BOTH, expand=True, padx=5)
        
        self.template_listbox = tk.Listbox(list_frame, selectmode=tk.EXTENDED)
        scroll = tk.Scrollbar(list_frame, command=self.template_listbox.yview)
        self.template_listbox.config(yscrollcommand=scroll.set)
        
        self.template_listbox.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)
        scroll.pack(side=tk.RIGHT, fill=tk.Y)
        
        # Extract Button
        btn_frame = tk.Frame(self.tab_template, pady=10)
        btn_frame.pack(fill=tk.X)
        self.btn_extract_template = tk.Button(btn_frame, text="Extract Template", command=self.extract_template_data, state=tk.DISABLED, height=2, bg="#dddddd")
        self.btn_extract_template.pack()

    def setup_area_tab(self):
        # Instructions
        tk.Label(self.tab_area, text="Select an Area to filter all templates.", pady=10).pack(anchor=tk.W)
        tk.Label(self.tab_area, text="This will keep $Area section and rows in other templates matching the selected Area.", font=("Arial", 8, "italic")).pack(anchor=tk.W)
        
        # Listbox
        list_frame = tk.Frame(self.tab_area)
        list_frame.pack(fill=tk.BOTH, expand=True, padx=5)
        
        self.area_listbox = tk.Listbox(list_frame, selectmode=tk.EXTENDED)
        scroll = tk.Scrollbar(list_frame, command=self.area_listbox.yview)
        self.area_listbox.config(yscrollcommand=scroll.set)
        
        self.area_listbox.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)
        scroll.pack(side=tk.RIGHT, fill=tk.Y)
        
        # Extract Button
        btn_frame = tk.Frame(self.tab_area, pady=10)
        btn_frame.pack(fill=tk.X)
        self.btn_extract_area = tk.Button(btn_frame, text="Extract By Area", command=self.extract_area_data, state=tk.DISABLED, height=2, bg="#dddddd")
        self.btn_extract_area.pack()

    def setup_extension_tab(self):
        tk.Label(self.tab_extensions, text="Analyze 'Extensions(MxBigString)' column in all templates.", pady=10).pack(anchor=tk.W)
        tk.Label(self.tab_extensions, text="Generates a report grouped by Extension Type.", font=("Arial", 8, "italic")).pack(anchor=tk.W)

        # Maybe show some stats later, but simple button for now
        btn_frame = tk.Frame(self.tab_extensions, pady=20)
        btn_frame.pack(fill=tk.X)
        
        self.btn_analyze_ext = tk.Button(btn_frame, text="Analyze & Save Report", command=self.analyze_extensions, state=tk.DISABLED, height=2, width=25, bg="#dddddd")
        self.btn_analyze_ext.pack(pady=5)
        
        
        self.btn_extract_matrix = tk.Button(btn_frame, text="Extract PLC Matrix (Tag x Attr)", command=self.extract_plc_matrix, state=tk.DISABLED, height=2, width=25, bg="#dddddd")
        self.btn_extract_matrix.pack(pady=5)
        
        # Frame for Address Extraction
        addr_frame = tk.Frame(btn_frame)
        addr_frame.pack(pady=5, fill=tk.X)
        
        self.btn_extract_addr = tk.Button(addr_frame, text="Extract Tags Addresses (All)", command=lambda: self.extract_tags_addresses(alarm_only=False), state=tk.DISABLED, height=2, width=25, bg="#dddddd")
        self.btn_extract_addr.pack(side=tk.LEFT, padx=5)
        
        self.btn_extract_addr_alarm = tk.Button(addr_frame, text="Alarm Only Extract Tags Addresses", command=lambda: self.extract_tags_addresses(alarm_only=True), state=tk.DISABLED, height=2, width=30, bg="#dddddd")
        self.btn_extract_addr_alarm.pack(side=tk.LEFT, padx=5)

    def load_file(self):
        filename = filedialog.askopenfilename(
            initialdir="d:/05_python",
            title="Select Aveva CSV Dump",
            filetypes=(("Aveva Dump", "*.csv"), ("All files", "*.*"))
        )
        
        if filename:
            self.file_entry.delete(0, tk.END)
            self.file_entry.insert(0, filename)
            self.current_file_path = filename
            self.parse_file(filename)

    def parse_file(self, filename):
        try:
            self.status_var.set("Parsing file...")
            self.root.update_idletasks()
            
            self.parser = AvevaParser(filename)
            # Ensure parser uses utf-16 based on rules, though parser defaults to it.
            self.parser.parse()
            
            # Update Template Tab
            self.template_listbox.delete(0, tk.END)
            templates = self.parser.get_template_names()
            for t in templates:
                if t == "$Area": continue
                self.template_listbox.insert(tk.END, t)
            
            # Update Area Tab
            self.area_listbox.delete(0, tk.END)
            areas = self.parser.get_area_names()
            count_areas = 0
            for a in areas:
                if a: 
                    self.area_listbox.insert(tk.END, a)
                    count_areas += 1
            
            self.status_var.set(f"Loaded {len(templates)} templates and {count_areas} areas.")
            
            # Enable Buttons
            self.btn_extract_template.config(state=tk.NORMAL, bg="#aaddaa")
            self.btn_extract_area.config(state=tk.NORMAL, bg="#aaddaa")
            self.btn_analyze_ext.config(state=tk.NORMAL, bg="#aaddaa")
            self.btn_extract_matrix.config(state=tk.NORMAL, bg="#aaddaa")
            self.btn_extract_addr.config(state=tk.NORMAL, bg="#aaddaa")
            self.btn_extract_addr_alarm.config(state=tk.NORMAL, bg="#aaddaa")
            self.btn_load_sd.config(state=tk.NORMAL, bg="#aaddaa")
            self.btn_load_plc.config(state=tk.NORMAL, bg="#aaddaa")
            
        except Exception as e:
            messagebox.showerror("Error", f"Failed to parse file:\n{e}")
            self.status_var.set("Error parsing file.")

    def extract_plc_addresses(self):
        default_name = self.generate_filename("PLC_Addresses")
        save_path = filedialog.asksaveasfilename(
            initialdir=os.path.dirname(self.current_file_path),
            title="Save PLC Address Map",
            defaultextension=".csv",
            initialfile=default_name
        )
        
        if save_path:
            try:
                self.status_var.set("Extracting PLC addresses...")
                self.root.update_idletasks()
                
                analyzer = ExtensionAnalyzer(self.parser)
                results = analyzer.get_plc_addresses() # List of dicts
                
                # Write to CSV
                with open(save_path, 'w', encoding='utf-8-sig', newline='') as f:
                    fields = ['Tag', 'Attribute', 'FullItem', 'PLC_Address', 'Template']
                    writer = csv.DictWriter(f, fieldnames=fields)
                    writer.writeheader()
                    writer.writerows(results)
                            
                messagebox.showinfo("Success", f"PLC addresses saved to:\n{save_path}")
                self.status_var.set(f"Extraction complete. Found {len(results)} items.")
                
            except Exception as e:
                messagebox.showerror("Error", f"Extraction failed:\n{e}")
                self.status_var.set("Extraction failed.")

    def extract_plc_matrix(self):
        save_dir = filedialog.askdirectory(
            initialdir=os.path.dirname(self.current_file_path),
            title="Select Directory to Save Matrix Files"
        )
        
        if save_dir:
            try:
                self.status_var.set("Generating PLC Matrices...")
                self.root.update_idletasks()
                
                analyzer = ExtensionAnalyzer(self.parser)
                matrices = analyzer.get_plc_matrices_by_template() # Dict { tmpl: (headers, rows) }
                
                if not matrices:
                    messagebox.showinfo("Info", "No PLC data found to extract.")
                    self.status_var.set("No data found.")
                    return

                count = 0
                base_name = os.path.splitext(os.path.basename(self.current_file_path))[0]
                timestamp = datetime.now().strftime("%Y%m%d_%H%M")
                
                for tmpl, (headers, rows) in matrices.items():
                    # clean template name (remove $)
                    clean_tmpl = tmpl.replace('$', '').replace(':', '')
                    filename = f"{base_name}_{clean_tmpl}_Matrix_{timestamp}.csv"
                    save_path = os.path.join(save_dir, filename)
                    
                    with open(save_path, 'w', encoding='utf-8-sig', newline='') as f:
                        writer = csv.writer(f)
                        writer.writerow(headers)
                        writer.writerows(rows)
                    count += 1
                            
                messagebox.showinfo("Success", f"Saved {count} matrix files to:\n{save_dir}")
                self.status_var.set(f"Matrix extraction complete. Saved {count} files.")
                
            except Exception as e:
                messagebox.showerror("Error", f"Extraction failed:\n{e}")
                self.status_var.set("Extraction failed.")

    def extract_tags_addresses(self, alarm_only=False):
        save_dir = filedialog.askdirectory(
            initialdir=os.path.dirname(self.current_file_path),
            title="Select Directory to Save Address Files"
        )
        
        if save_dir:
            try:
                # alarm_only is passed as arg
                mode_text = "Alarm Only" if alarm_only else "All Tags"
                self.status_var.set(f"Extracting Addresses ({mode_text})...")
                self.root.update_idletasks()
                
                analyzer = ExtensionAnalyzer(self.parser)
                # Renamed method in analyzer to be more generic
                area_data = analyzer.extract_address_map_by_area(alarm_only=alarm_only) 
                
                if not area_data:
                    messagebox.showinfo("Info", "No data found.")
                    self.status_var.set("No data found.")
                    return

                count = 0
                timestamp = datetime.now().strftime("%Y%m%d_%H%M")
                
                for area, rows in area_data.items():
                    # clean area name
                    clean_area = area.replace('/', '_').replace('\\', '_')
                    if not clean_area: clean_area = "NoArea"
                    
                    filename = f"{clean_area}_{timestamp}.csv"
                    save_path = os.path.join(save_dir, filename)
                    
                    with open(save_path, 'w', encoding='utf-8-sig', newline='') as f:
                        writer = csv.writer(f, quoting=csv.QUOTE_ALL)
                        for row in rows:
                            writer.writerow(row)
                    count += 1
                            
                messagebox.showinfo("Success", f"Saved {count} files to:\n{save_dir}")
                self.status_var.set(f"Extraction ({mode_text}) complete. Saved {count} files.")
                
            except Exception as e:
                messagebox.showerror("Error", f"Extraction failed:\n{e}")
                self.status_var.set("Extraction failed.")

    def setup_shortdesc_tab(self):
        # Top Frame for Buttons
        top_frame = tk.Frame(self.tab_shortdesc, bg="#f0f0f0")
        top_frame.pack(side=tk.TOP, fill=tk.X, padx=5, pady=5)
        
        self.btn_load_sd = tk.Button(top_frame, text="Load / Refresh List", command=self.load_short_desc, state=tk.DISABLED, height=1, width=20, bg="#dddddd")
        self.btn_load_sd.pack(side=tk.LEFT, padx=5)
        
        self.btn_export_sd = tk.Button(top_frame, text="Export CSV", command=self.export_short_desc, state=tk.DISABLED, height=1, width=15, bg="#dddddd")
        self.btn_export_sd.pack(side=tk.LEFT, padx=5)
        
        self.btn_import_sd = tk.Button(top_frame, text="Import CSV (Update)", command=self.import_short_desc, state=tk.DISABLED, height=1, width=20, bg="#ffdddd")
        self.btn_import_sd.pack(side=tk.LEFT, padx=5)
        
        # Center Frame for Treeview
        tree_frame = tk.Frame(self.tab_shortdesc)
        tree_frame.pack(side=tk.TOP, fill=tk.BOTH, expand=True, padx=5, pady=5)
        
        columns = ("Tag", "ShortDesc", "Template")
        self.sd_tree = ttk.Treeview(tree_frame, columns=columns, show="headings")
        self.sd_tree.heading("Tag", text="Tagname")
        self.sd_tree.heading("ShortDesc", text="Short Description")
        self.sd_tree.heading("Template", text="Template")
        
        self.sd_tree.column("Tag", width=250)
        self.sd_tree.column("ShortDesc", width=400)
        self.sd_tree.column("Template", width=150)
        
        scrollbar = ttk.Scrollbar(tree_frame, orient=tk.VERTICAL, command=self.sd_tree.yview)
        self.sd_tree.configure(yscroll=scrollbar.set)
        
        self.sd_tree.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)
        scrollbar.pack(side=tk.RIGHT, fill=tk.Y)

    def load_short_desc(self):
        if not self.parser:
            return
            
        try:
            self.status_var.set("Loading ShortDesc data...")
            self.root.update_idletasks()
            
            # Clear current tree
            for i in self.sd_tree.get_children():
                self.sd_tree.delete(i)
                
            data = self.parser.get_all_tags_with_column("ShortDesc")
            
            for item in data:
                self.sd_tree.insert("", tk.END, values=(item["Tag"], item["Value"], item["Template"]))
                
            self.status_var.set(f"Loaded {len(data)} items.")
            
            # Enable Export/Import
            self.btn_export_sd.config(state=tk.NORMAL)
            self.btn_import_sd.config(state=tk.NORMAL)
            
        except Exception as e:
            messagebox.showerror("Error", f"Failed to load ShortDesc:\n{e}")

    def export_short_desc(self):
        default_name = self.generate_filename("ShortDesc_Export")
        save_path = filedialog.asksaveasfilename(
            initialdir=os.path.dirname(self.current_file_path),
            title="Export ShortDesc CSV",
            defaultextension=".csv",
            initialfile=default_name
        )
        
        if save_path:
            try:
                with open(save_path, 'w', encoding='utf-8-sig', newline='') as f:
                    writer = csv.writer(f)
                    writer.writerow(["Tagname", "ShortDesc", "Template"])
                    
                    for child in self.sd_tree.get_children():
                        writer.writerow(self.sd_tree.item(child)["values"])
                        
                messagebox.showinfo("Success", f"Exported to:\n{save_path}")
                
            except Exception as e:
                messagebox.showerror("Error", f"Export failed:\n{e}")

    def import_short_desc(self):
        filename = filedialog.askopenfilename(
            initialdir=os.path.dirname(self.current_file_path),
            title="Import ShortDesc CSV",
            filetypes=(("CSV files", "*.csv"), ("All files", "*.*"))
        )
        
        if filename:
            if not messagebox.askyesno("Confirm Import", "This will update the ShortDesc values in memory.\nProceed?"):
                return
                
            try:
                self.status_var.set("Importing & Updating...")
                self.root.update_idletasks()
                
                updated_count = 0
                error_count = 0
                
                with open(filename, 'r', encoding='utf-8-sig') as f:
                    reader = csv.DictReader(f)
                    # Verify headers
                    if "Tagname" not in reader.fieldnames or "ShortDesc" not in reader.fieldnames:
                        messagebox.showerror("Error", "CSV must have 'Tagname' and 'ShortDesc' columns.")
                        return
                    
                    for row in reader:
                        tag = row["Tagname"]
                        val = row["ShortDesc"]
                        tmpl = row.get("Template", "") # Optional if we iterate all? 
                        
                        # Optimization: If template is known, quicker. If not, scan?
                        # AvevaParser.update_tag_value needs template.
                        # If Import CSV lacks correct Template, we might fail or need to search.
                        # Let's assume Exported CSV is used, which has Template.
                        
                        if tmpl:
                            success = self.parser.update_tag_value(tmpl, tag, "ShortDesc", val)
                            if success: updated_count += 1
                            else: error_count += 1
                        else:
                            # Try to find template for tag? Too slow for now.
                            error_count += 1
                            
                self.status_var.set(f"Updated {updated_count} tags. (Errors/Skipped: {error_count})")
                messagebox.showinfo("Import Complete", f"Updated: {updated_count}\nNot Found/Error: {error_count}")
                
                # Refresh list to show changes
                self.load_short_desc()
                
            except Exception as e:
                messagebox.showerror("Error", f"Import failed:\n{e}")


    # ... (ensure_blank_line, generate_filename, extract_template_data, extract_area_data remain same) ...
    # I need to be careful with replace_file_content to not wipe them out.
    # The Tool uses StartLine/EndLine or TargetContent. 
    # Since I am adding methods at the end or replacing the whole file structure?
    # The previous `create_widgets` is being replaced to include tabs.
    # I should also add `analyze_extensions` method.
    
    # Let's add the new methods at the end of the class.
    
    def analyze_extensions(self):
        default_name = self.generate_filename("Extensions_Report")
        save_path = filedialog.asksaveasfilename(
            initialdir=os.path.dirname(self.current_file_path),
            title="Save Extensions Report",
            defaultextension=".csv",
            initialfile=default_name
        )
        
        if save_path:
            try:
                self.status_var.set("Analyzing extensions...")
                self.root.update_idletasks()
                
                analyzer = ExtensionAnalyzer(self.parser)
                results = analyzer.analyze() # Dictionary { ExtensionType: [Items] }
                
                # Write to CSV
                with open(save_path, 'w', encoding='utf-8-sig', newline='') as f:
                    writer = csv.writer(f)
                    writer.writerow(["Extension Type", "Defined Item"])
                    
                    for ext_type, items in results.items():
                        for item in items:
                            writer.writerow([ext_type, item])
                            
                messagebox.showinfo("Success", f"Report saved to:\n{save_path}")
                self.status_var.set("Analysis complete.")
                
            except Exception as e:
                messagebox.showerror("Error", f"Analysis failed:\n{e}")
                self.status_var.set("Analysis failed.")


    def ensure_blank_line(self, lines):
        """Ensures the last line in lines list is a blank line. If not, adds one."""
        if not lines:
            return
        
        last_line = lines[-1]
        # Check if last line is just a newline (or empty)
        if last_line.strip() != "":
            # Last line has content, so we need a blank line separator
            lines.append("\n")
        # Robust check:
        if lines and lines[-1].strip() != "":
            lines.append("\n")
        elif lines and lines[-1] == "":
            lines[-1] = "\n" 
    
    def generate_filename(self, suffix):
        """Generates filename: [SourceBase]_[Suffix]_[YYYYMMDD_HHMM].csv"""
        if not self.current_file_path:
            return f"Export_{suffix}.csv"
            
        base_name = os.path.splitext(os.path.basename(self.current_file_path))[0]
        timestamp = datetime.now().strftime("%Y%m%d_%H%M")
        # Sanitize suffix just in case
        clean_suffix = suffix.replace('$', '').replace(':', '')
        return f"{base_name}_{clean_suffix}_{timestamp}.csv"

    def extract_template_data(self):
        selection = self.template_listbox.curselection()
        if not selection:
            messagebox.showwarning("Warning", "Please select at least one template.")
            return

        selected_templates = [self.template_listbox.get(i) for i in selection]
        
        if len(selected_templates) == 1:
            suffix = selected_templates[0]
        else:
            suffix = f"{selected_templates[0]}_and_{len(selected_templates)-1}_others"
            
        default_name = self.generate_filename(suffix)
        
        save_path = filedialog.asksaveasfilename(
            initialdir=os.path.dirname(self.current_file_path),
            title="Save Extracted CSV",
            defaultextension=".csv",
            initialfile=default_name
        )
        
        if save_path:
            try:
                lines = []
                lines.extend(self.parser.get_headers())
                
                if "$Area" in self.parser.get_template_names():
                    self.ensure_blank_line(lines)
                    lines.extend(self.parser.get_template_content("$Area"))
                
                for tmpl in selected_templates:
                    self.ensure_blank_line(lines)
                    lines.extend(self.parser.get_template_content(tmpl))
                
                self.write_file(save_path, lines)
                messagebox.showinfo("Success", f"Saved {len(selected_templates)} templates to:\n{save_path}")
            except Exception as e:
                messagebox.showerror("Error", str(e))

    def extract_area_data(self):
        selection = self.area_listbox.curselection()
        if not selection:
            messagebox.showwarning("Warning", "Please select at least one Area.")
            return

        selected_areas = [self.area_listbox.get(i) for i in selection]
        
        if len(selected_areas) == 1:
            suffix = f"Area_{selected_areas[0]}"
        else:
            suffix = f"Area_{selected_areas[0]}_and_{len(selected_areas)-1}_others"
            
        default_name = self.generate_filename(suffix)
        
        save_path = filedialog.asksaveasfilename(
            initialdir=os.path.dirname(self.current_file_path),
            title="Save Extracted CSV",
            defaultextension=".csv",
            initialfile=default_name
        )
        
        if save_path:
            try:
                lines = self.perform_area_extraction(selected_areas)
                self.write_file(save_path, lines)
                messagebox.showinfo("Success", f"Saved {len(selected_areas)} areas to:\n{save_path}")
            except Exception as e:
                messagebox.showerror("Error", str(e))

    def perform_area_extraction(self, target_areas):
        # target_areas is a list of strings
        lines = []
        lines.extend(self.parser.get_headers())
        
        if "$Area" in self.parser.get_template_names():
            self.ensure_blank_line(lines)
            lines.extend(self.parser.get_template_content("$Area"))

        for tmpl in self.parser.get_template_names():
            if tmpl == "$Area": continue
            
            content = self.parser.get_template_content(tmpl)
            area_col_idx = self.parser.get_column_index(tmpl, "Area")
            
            if area_col_idx == -1:
                continue 
                
            # Buffer for this template
            matching_rows = []
            for line in content[2:]: # Data rows
                parts = line.strip().split(',')
                if len(parts) > area_col_idx:
                     # Check if the area of this row is in our target list
                     # CSV parts might be quoted, strict CSV parsing is safer but simple split usually ok for simple area names
                     # The parser stores raw lines, let's just check the value at index
                     val = parts[area_col_idx]
                     if val in target_areas:
                        matching_rows.append(line)
            
            if matching_rows:
                # Add Header
                self.ensure_blank_line(lines)
                lines.append(content[0]) # :TEMPLATE=...
                lines.append(content[1]) # Headers
                lines.extend(matching_rows)
                
        return lines

    def write_file(self, path, lines):
        # RULE: Use utf-16 for Aveva Dump files and newline=''
        with open(path, 'w', encoding='utf-16', newline='') as f:
            for line in lines:
                f.write(line)

    def setup_shortdesc_tab(self):
        # Top Frame for Buttons
        top_frame = tk.Frame(self.tab_shortdesc, bg="#f0f0f0")
        top_frame.pack(side=tk.TOP, fill=tk.X, padx=5, pady=5)
        
        self.btn_load_sd = tk.Button(top_frame, text="Load / Refresh List", command=self.load_short_desc, state=tk.DISABLED, height=1, width=20, bg="#dddddd")
        self.btn_load_sd.pack(side=tk.LEFT, padx=5)
        
        self.btn_export_sd = tk.Button(top_frame, text="Export CSV", command=self.export_short_desc, state=tk.DISABLED, height=1, width=15, bg="#dddddd")
        self.btn_export_sd.pack(side=tk.LEFT, padx=5)
        
        self.btn_import_sd = tk.Button(top_frame, text="Import CSV (Update)", command=self.import_short_desc, state=tk.DISABLED, height=1, width=20, bg="#ffdddd")
        self.btn_import_sd.pack(side=tk.LEFT, padx=5)
        
        # Spacer
        tk.Frame(top_frame, width=20).pack(side=tk.LEFT)
        
        self.btn_save_dump = tk.Button(top_frame, text="Save Modified Dump As...", command=self.save_modified_dump, state=tk.DISABLED, height=1, width=25, bg="#aaddff")
        self.btn_save_dump.pack(side=tk.LEFT, padx=5)
        
        # Center Frame for Treeview
        tree_frame = tk.Frame(self.tab_shortdesc)
        tree_frame.pack(side=tk.TOP, fill=tk.BOTH, expand=True, padx=5, pady=5)
        
        columns = ("Tag", "ShortDesc", "Template")
        self.sd_tree = ttk.Treeview(tree_frame, columns=columns, show="headings")
        self.sd_tree.heading("Tag", text="Tagname")
        self.sd_tree.heading("ShortDesc", text="Short Description")
        self.sd_tree.heading("Template", text="Template")
        
        self.sd_tree.column("Tag", width=250)
        self.sd_tree.column("ShortDesc", width=400)
        self.sd_tree.column("Template", width=150)
        
        scrollbar = ttk.Scrollbar(tree_frame, orient=tk.VERTICAL, command=self.sd_tree.yview)
        self.sd_tree.configure(yscroll=scrollbar.set)
        
        self.sd_tree.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)
        scrollbar.pack(side=tk.RIGHT, fill=tk.Y)

    def load_short_desc(self):
        if not self.parser:
            return
            
        try:
            self.status_var.set("Loading ShortDesc data...")
            self.root.update_idletasks()
            
            # Clear current tree
            for i in self.sd_tree.get_children():
                self.sd_tree.delete(i)
                
            data = self.parser.get_all_tags_with_column("ShortDesc")
            
            for item in data:
                self.sd_tree.insert("", tk.END, values=(item["Tag"], item["Value"], item["Template"]))
                
            self.status_var.set(f"Loaded {len(data)} items.")
            
            # Enable Export/Import and Save Dump
            self.btn_export_sd.config(state=tk.NORMAL)
            self.btn_import_sd.config(state=tk.NORMAL)
            self.btn_save_dump.config(state=tk.NORMAL)
            
        except Exception as e:
            messagebox.showerror("Error", f"Failed to load ShortDesc:\n{e}")

    def export_short_desc(self):
        default_name = self.generate_filename("ShortDesc_Export")
        save_path = filedialog.asksaveasfilename(
            initialdir=os.path.dirname(self.current_file_path),
            title="Export ShortDesc CSV",
            defaultextension=".csv",
            initialfile=default_name
        )
        
        if save_path:
            try:
                with open(save_path, 'w', encoding='utf-8-sig', newline='') as f:
                    writer = csv.writer(f)
                    writer.writerow(["Tagname", "ShortDesc", "Template"])
                    
                    for child in self.sd_tree.get_children():
                        writer.writerow(self.sd_tree.item(child)["values"])
                        
                messagebox.showinfo("Success", f"Exported to:\n{save_path}")
                
            except Exception as e:
                messagebox.showerror("Error", f"Export failed:\n{e}")

    def import_short_desc(self):
        filename = filedialog.askopenfilename(
            initialdir=os.path.dirname(self.current_file_path),
            title="Import ShortDesc CSV",
            filetypes=(("CSV files", "*.csv"), ("All files", "*.*"))
        )
        
        if filename:
            if not messagebox.askyesno("Confirm Import", "This will update the ShortDesc values in memory.\nProceed?"):
                return
                
            try:
                self.status_var.set("Importing & Updating...")
                self.root.update_idletasks()
                
                updated_count = 0
                error_count = 0
                
                with open(filename, 'r', encoding='utf-8-sig') as f:
                    reader = csv.DictReader(f)
                    # Verify headers
                    if "Tagname" not in reader.fieldnames or "ShortDesc" not in reader.fieldnames:
                        messagebox.showerror("Error", "CSV must have 'Tagname' and 'ShortDesc' columns.")
                        return
                    
                    for row in reader:
                        tag = row["Tagname"]
                        val = row["ShortDesc"]
                        tmpl = row.get("Template", "") 
                        
                        if tmpl:
                            success = self.parser.update_tag_value(tmpl, tag, "ShortDesc", val)
                            if success: updated_count += 1
                            else: error_count += 1
                        else:
                            error_count += 1
                            
                self.status_var.set(f"Updated {updated_count} tags. (Errors/Skipped: {error_count})")
                messagebox.showinfo("Import Complete", f"Updated: {updated_count}\nNot Found/Error: {error_count}")
                
                # Refresh list to show changes
                self.load_short_desc()
                
            except Exception as e:
                messagebox.showerror("Error", f"Import failed:\n{e}")

    def save_modified_dump(self):
        default_name = self.generate_filename("Modified_Dump")
        save_path = filedialog.asksaveasfilename(
            initialdir=os.path.dirname(self.current_file_path),
            title="Save Modified Dump File",
            defaultextension=".csv",
            initialfile=default_name
        )
        
        if save_path:
            try:
                self.status_var.set("Saving modified dump file...")
                self.root.update_idletasks()
                
                self.parser.save(save_path)
                
                messagebox.showinfo("Success", f"File saved successfully to:\n{save_path}")
                self.status_var.set("File saved successfully.")
                
            except Exception as e:
                messagebox.showerror("Error", f"Save failed:\n{e}")
                self.status_var.set("Save failed.")

    def setup_plcio_tab(self):
        # Top Frame for Buttons
        top_frame = tk.Frame(self.tab_plcio, bg="#f0f0f0")
        top_frame.pack(side=tk.TOP, fill=tk.X, padx=5, pady=5)
        
        self.btn_load_plc = tk.Button(top_frame, text="Load / Refresh List", command=self.load_plcio, state=tk.DISABLED, height=1, width=20, bg="#dddddd")
        self.btn_load_plc.pack(side=tk.LEFT, padx=5)
        
        self.btn_export_plc = tk.Button(top_frame, text="Export CSV", command=self.export_plcio, state=tk.DISABLED, height=1, width=15, bg="#dddddd")
        self.btn_export_plc.pack(side=tk.LEFT, padx=5)
        
        self.btn_import_plc = tk.Button(top_frame, text="Import CSV (Update)", command=self.import_plcio, state=tk.DISABLED, height=1, width=20, bg="#ffdddd")
        self.btn_import_plc.pack(side=tk.LEFT, padx=5)
        
        # Spacer
        tk.Frame(top_frame, width=20).pack(side=tk.LEFT)
        
        self.btn_save_dump_plc = tk.Button(top_frame, text="Save Modified Dump As...", command=self.save_modified_dump, state=tk.DISABLED, height=1, width=25, bg="#aaddff")
        self.btn_save_dump_plc.pack(side=tk.LEFT, padx=5)
        
        # Center Frame for Treeview
        tree_frame = tk.Frame(self.tab_plcio)
        tree_frame.pack(side=tk.TOP, fill=tk.BOTH, expand=True, padx=5, pady=5)
        
        columns = ("Tag", "Attribute", "PLC_Address", "Template")
        self.plc_tree = ttk.Treeview(tree_frame, columns=columns, show="headings")
        self.plc_tree.heading("Tag", text="Tagname")
        self.plc_tree.heading("Attribute", text="Attribute")
        self.plc_tree.heading("PLC_Address", text="PLC Address")
        self.plc_tree.heading("Template", text="Template")
        
        self.plc_tree.column("Tag", width=200)
        self.plc_tree.column("Attribute", width=150)
        self.plc_tree.column("PLC_Address", width=300)
        self.plc_tree.column("Template", width=150)
        
        scrollbar = ttk.Scrollbar(tree_frame, orient=tk.VERTICAL, command=self.plc_tree.yview)
        self.plc_tree.configure(yscroll=scrollbar.set)
        
        self.plc_tree.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)
        scrollbar.pack(side=tk.RIGHT, fill=tk.Y)

    def load_plcio(self):
        if not self.parser:
            return
            
        try:
            self.status_var.set("Loading PLC I/O data...")
            self.root.update_idletasks()
            
            # Clear current tree
            for i in self.plc_tree.get_children():
                self.plc_tree.delete(i)
            
            analyzer = ExtensionAnalyzer(self.parser)
            data = analyzer.get_plc_addresses()
            
            for item in data:
                self.plc_tree.insert("", tk.END, values=(item["Tag"], item["Attribute"], item["PLC_Address"], item["Template"]))
                
            self.status_var.set(f"Loaded {len(data)} items.")
            
            # Enable Buttons
            self.btn_export_plc.config(state=tk.NORMAL)
            self.btn_import_plc.config(state=tk.NORMAL)
            self.btn_save_dump_plc.config(state=tk.NORMAL)
            
        except Exception as e:
            messagebox.showerror("Error", f"Failed to load PLC I/O:\n{e}")

    def export_plcio(self):
        default_name = self.generate_filename("PLC_IO_Export")
        save_path = filedialog.asksaveasfilename(
            initialdir=os.path.dirname(self.current_file_path),
            title="Export PLC I/O CSV",
            defaultextension=".csv",
            initialfile=default_name
        )
        
        if save_path:
            try:
                with open(save_path, 'w', encoding='utf-8-sig', newline='') as f:
                    writer = csv.writer(f)
                    writer.writerow(["Tag", "Attribute", "PLC_Address", "Template"])
                    
                    for child in self.plc_tree.get_children():
                        writer.writerow(self.plc_tree.item(child)["values"])
                        
                messagebox.showinfo("Success", f"Exported to:\n{save_path}")
                
            except Exception as e:
                messagebox.showerror("Error", f"Export failed:\n{e}")

    def import_plcio(self):
        filename = filedialog.askopenfilename(
            initialdir=os.path.dirname(self.current_file_path),
            title="Import PLC I/O CSV",
            filetypes=(("CSV files", "*.csv"), ("All files", "*.*"))
        )
        
        if filename:
            if not messagebox.askyesno("Confirm Import", "This will update the PLC Addresses based on Attribute names.\nProceed?"):
                return
                
            try:
                self.status_var.set("Importing & Updating PLC I/O...")
                self.root.update_idletasks()
                
                updated_count = 0
                error_count = 0
                
                with open(filename, 'r', encoding='utf-8-sig') as f:
                    reader = csv.DictReader(f)
                    # Verify headers (allow flexible naming if needed, but strict for now)
                    required = ["Tag", "Attribute", "PLC_Address"]
                    if not all(col in reader.fieldnames for col in required):
                         messagebox.showerror("Error", f"CSV must have columns: {required}")
                         return
                    
                    for row in reader:
                        tag = row["Tag"]
                        attr = row["Attribute"]
                        addr = row["PLC_Address"]
                        tmpl = row.get("Template", "") 
                        
                        target_col = f"{attr}.InputSource(MxReferenceType)"
                        
                        if tmpl:
                            success = self.parser.update_tag_value(tmpl, tag, target_col, addr)
                            if success: updated_count += 1
                            else: error_count += 1
                        else:
                            error_count += 1
                            
                self.status_var.set(f"Updated {updated_count} items. (Errors/Skipped: {error_count})")
                messagebox.showinfo("Import Complete", f"Updated: {updated_count}\nNot Found/Error: {error_count}")
                
                # Refresh list
                self.load_plcio()
                
            except Exception as e:
                messagebox.showerror("Error", f"Import failed:\n{e}")

if __name__ == "__main__":
    root = tk.Tk()
    app = AvevaTagManagerApp(root)
    root.mainloop()

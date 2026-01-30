import csv
import xml.etree.ElementTree as ET
from collections import defaultdict

class ExtensionAnalyzer:
    def __init__(self, parser):
        self.parser = parser
        
    def analyze(self):
        """
        Analyzes Extensions(MxBigString) column for all templates.
        Returns a dictionary: { ExtensionType: [ "Tag.Attr", "Tag" ] }
        """
        results = defaultdict(list)
        
        template_names = self.parser.get_template_names()
        
        for tmpl in template_names:
            # Identify columns
            ext_col_name = "Extensions(MxBigString)"
            # Handle potential variation or just use the known one
            
            ext_idx = self.parser.get_column_index(tmpl, ext_col_name)
            tag_idx = self.parser.get_column_index(tmpl, "Tagname")
            
            if ext_idx == -1 or tag_idx == -1:
                continue
                
            content = self.parser.get_template_content(tmpl)
            if len(content) < 3: # Need at least Template, Header, and 1 Row
                continue
                
            data_rows = content[2:]
            
            # Use csv.reader to handle quoted strings (XML often contains chars that might be quoted)
            reader = csv.reader(data_rows)
            
            for row in reader:
                # Ensure row has enough columns
                if len(row) <= ext_idx or len(row) <= tag_idx:
                    continue
                    
                tagname = row[tag_idx]
                xml_data = row[ext_idx]
                
                # Aveva dumps sometimes represent empty strings interestingly, but assuming empty string check
                if not xml_data or xml_data.strip() == "":
                    continue
                    
                self._parse_xml_and_collect(tagname, xml_data, results)
                
        return results

    def get_plc_addresses(self):
        """
        Extracts PLC addresses for attributes with 'inputoutputextension'.
        Returns a list of dicts: {'Tag': ..., 'Attribute': ..., 'FullItem': ..., 'PLC_Address': ..., 'Template': ...}
        """
        results = []
        
        template_names = self.parser.get_template_names()
        
        for tmpl in template_names:
            ext_idx = self.parser.get_column_index(tmpl, "Extensions(MxBigString)")
            tag_idx = self.parser.get_column_index(tmpl, "Tagname")
            
            if ext_idx == -1 or tag_idx == -1:
                continue
                
            content = self.parser.get_template_content(tmpl)
            if len(content) < 3:
                continue
                
            data_rows = content[2:]
            reader = csv.reader(data_rows)
            
            # Cache column indices for this template to avoid repeated lookups
            # We don't know which attributes exist yet, so we have to do it dynamically 
            # or pre-scan header? Pre-scan header is better.
            header_line = content[1]
            header_parts = [h.strip().lstrip(':') for h in header_line.split(',')]
            # Map column name to index
            col_map = {name: i for i, name in enumerate(header_parts)}
            
            for row in reader:
                if len(row) <= ext_idx or len(row) <= tag_idx:
                    continue
                    
                tagname = row[tag_idx]
                xml_data = row[ext_idx]
                
                if not xml_data or xml_data.strip() == "":
                    continue
                
                try:
                    root = ET.fromstring(xml_data)
                    attr_extensions = root.findall(".//AttributeExtension/Attribute")
                    
                    for attr in attr_extensions:
                        ext_type = attr.get("ExtensionType")
                        attr_name = attr.get("Name")
                        
                        if ext_type == "inputoutputextension" and attr_name:
                            # Construct expected column name for InputSource
                            # Format: AttributeName.InputSource(MxReferenceType)
                            target_col = f"{attr_name}.InputSource(MxReferenceType)"
                            
                            plc_addr = ""
                            if target_col in col_map:
                                input_src_idx = col_map[target_col]
                                if len(row) > input_src_idx:
                                    plc_addr = row[input_src_idx]
                            
                            results.append({
                                'Tag': tagname,
                                'Attribute': attr_name,
                                'FullItem': f"{tagname}.{attr_name}",
                                'PLC_Address': plc_addr,
                                'Template': tmpl
                            })
                            
                except ET.ParseError:
                    pass
                except Exception:
                    pass
                    
        return results

    def get_plc_address_matrix(self):
        """
        Extracts PLC addresses in a Matrix format (Tag x Attribute).
        Returns a tuple (headers, rows).
        headers: list of column names ['Tag', 'Attr1', 'Attr2', ...]
        rows: list of lists (values corresponding to headers)
        """
        raw_data = self.get_plc_addresses()
        
        if not raw_data:
            return (["Tag"], [])
            
        # 1. Collect all unique attributes
        all_attributes = set()
        tag_data = defaultdict(dict) # { TagName: { AttrName: Address } }
        
        for item in raw_data:
            tag = item['Tag']
            attr = item['Attribute']
            addr = item['PLC_Address']
            
            all_attributes.add(attr)
            tag_data[tag][attr] = addr
            
        sorted_attributes = sorted(list(all_attributes))
        
        # 2. Build Headers
        headers = ["Tag"] + sorted_attributes
        
        # 3. Build Rows
        rows = []
        for tag in sorted(tag_data.keys()):
            row = [tag]
            for attr in sorted_attributes:
                # Get address, default to empty string if not present
                row.append(tag_data[tag].get(attr, ""))
            rows.append(row)
            
        return headers, rows

    def get_plc_matrices_by_template(self):
        """
        Extracts PLC addresses in Matrix format, split by Template.
        Returns a dict: { template_name: (headers, rows) }
        """
        raw_data = self.get_plc_addresses()
        results = {}
        
        # 1. Group by Template
        grouped_data = defaultdict(list)
        for item in raw_data:
            tmpl = item.get('Template', 'Unknown')
            grouped_data[tmpl].append(item)
            
        # 2. Process each group
        for tmpl, items in grouped_data.items():
            # Collect unique attributes for this specific template
            all_attributes = set()
            tag_data = defaultdict(dict)
            
            for item in items:
                tag = item['Tag']
                attr = item['Attribute']
                addr = item['PLC_Address']
                
                all_attributes.add(attr)
                tag_data[tag][attr] = addr
            
            sorted_attributes = sorted(list(all_attributes))
            
            # Build Headers
            headers = ["Tag"] + sorted_attributes
            
            # Build Rows
            rows = []
            for tag in sorted(tag_data.keys()):
                row = [tag]
                for attr in sorted_attributes:
                    row.append(tag_data[tag].get(attr, ""))
                rows.append(row)
                
            results[tmpl] = (headers, rows)
            
        return results

    def extract_address_map_by_area(self, alarm_only=False):
        """
        Extracts addresses grouped by Area.
        If alarm_only is True, filters for tags that have an 'alarmextension' defined in extensions.
        Returns a dict: { AreaName: [ [Tag.Attr, Address], ... ] }
        """
        results = defaultdict(list)
        
        template_names = self.parser.get_template_names()
        
        for tmpl in template_names:
            ext_idx = self.parser.get_column_index(tmpl, "Extensions(MxBigString)")
            tag_idx = self.parser.get_column_index(tmpl, "Tagname")
            area_idx = self.parser.get_column_index(tmpl, "Area")
            
            if tag_idx == -1 or area_idx == -1:
                continue
                
            content = self.parser.get_template_content(tmpl)
            if len(content) < 3:
                continue
            
            # Map headers
            header_line = content[1]
            header_parts = [h.strip().lstrip(':') for h in header_line.split(',')]
            col_map = {name: i for i, name in enumerate(header_parts)}
            
            # Dynamic Column Identification: Find all *.InputSource columns
            input_source_cols = []
            for col_name, idx in col_map.items():
                if col_name.endswith(".InputSource(MxReferenceType)"):
                    attr_name = col_name.replace(".InputSource(MxReferenceType)", "")
                    input_source_cols.append((attr_name, idx))
            
            if not input_source_cols:
                continue # No input sources in this template, skip

            data_rows = content[2:]
            reader = csv.reader(data_rows)
            
            for row in reader:
                if len(row) <= tag_idx or len(row) <= area_idx:
                    continue
                    
                tagname = row[tag_idx]
                area = row[area_idx]
                
                # Filter Logic
                valid_alarm_attrs = set()
                if alarm_only:
                    if ext_idx == -1 or len(row) <= ext_idx:
                        continue # Can't check extensions
                    
                    xml_data = row[ext_idx]
                    if not xml_data or xml_data.strip() == "":
                        continue
                        
                    try:
                        root = ET.fromstring(xml_data)
                        attr_extensions = root.findall(".//AttributeExtension/Attribute")
                        
                        for attr_node in attr_extensions:
                            if attr_node.get("ExtensionType") == "alarmextension":
                                attr_name = attr_node.get("Name")
                                if attr_name:
                                    valid_alarm_attrs.add(attr_name)
                        
                        if not valid_alarm_attrs:
                            continue # No alarm attributes for this tag, skip entire tag
                            
                    except Exception:
                        continue
                
                # Extraction Logic
                for attr, idx in input_source_cols:
                    # If alarm_only is True, we only extract if this attribute is in our allowed list
                    if alarm_only and attr not in valid_alarm_attrs:
                        continue

                    if len(row) > idx:
                        addr = row[idx]
                        if addr and addr.strip():
                            # Trim address before "DB" if present
                            db_idx = addr.upper().find("DB")
                            if db_idx != -1:
                                addr = addr[db_idx:]
                                
                            results[area].append([f"{tagname}.{attr}", addr])
        
        # Sort results for each area by Tagname
        for area in results:
            results[area].sort(key=lambda x: x[0])
            
        return results

    def _parse_xml_and_collect(self, tagname, xml_string, results):
        try:
            # Aveva XML is usually clean XML fragment
            root = ET.fromstring(xml_string)
            
            # 1. Object Extensions (<ObjectExtension><Extension ... /></ObjectExtension>)
            # Using loop to find all Extensions under ObjectExtension
            obj_extensions = root.findall(".//ObjectExtension/Extension")
            for ext in obj_extensions:
                ext_type = ext.get("ExtensionType")
                if ext_type:
                    # Object extension usually applies to the tag itself
                    results[ext_type].append(tagname)

            # 2. Attribute Extensions (<AttributeExtension><Attribute ... /></AttributeExtension>)
            attr_extensions = root.findall(".//AttributeExtension/Attribute")
            for attr in attr_extensions:
                ext_type = attr.get("ExtensionType")
                attr_name = attr.get("Name")
                if ext_type and attr_name:
                     results[ext_type].append(f"{tagname}.{attr_name}")
                    
        except ET.ParseError:
            # If XML is malformed, skip
            # print(f"Debug: XML parse error for {tagname}")
            pass
        except Exception as e:
            # General error safety
            pass

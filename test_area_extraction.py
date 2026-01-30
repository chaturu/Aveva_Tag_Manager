from aveva_parser import AvevaParser
import os

def test_area_extract():
    input_file = r"d:\05_python\sp_tag_db_all_2025_10_24.csv"
    output_file = r"d:\05_python\aveva_tag_manager\extracted_area_test.csv"
    target_area = "EPLC_1" # Known valid Area
    
    print(f"Loading {input_file}...")
    parser = AvevaParser(input_file)
    parser.parse()
    
    lines = []
    lines.extend(parser.get_headers())
    
    # Required: $Area
    if "$Area" in parser.get_template_names():
        lines.extend(parser.get_template_content("$Area"))
        
    print(f"Filtering for Area: {target_area}")
    
    extracted_count = 0
    
    for tmpl in parser.get_template_names():
        if tmpl == "$Area": continue
        
        area_idx = parser.get_column_index(tmpl, "Area")
        if area_idx == -1: continue
        
        content = parser.get_template_content(tmpl)
        
        # Buffer for this template
        tmpl_lines = []
        tmpl_lines.append(content[0]) # :TEMPLATE
        tmpl_lines.append(content[1]) # Headers
        
        match_count = 0
        for line in content[2:]: # Data rows
            parts = line.strip().split(',')
            if len(parts) > area_idx and parts[area_idx] == target_area:
                tmpl_lines.append(line)
                match_count += 1
                
        if match_count > 0:
            lines.extend(tmpl_lines)
            extracted_count += match_count
            print(f"  - Found {match_count} items in {tmpl}")
            
    print(f"Total items extracted: {extracted_count}")
    
    with open(output_file, 'w', encoding='utf-16', newline='') as f:
        for line in lines:
            f.write(line)
            
    print(f"Saved to {output_file}")

if __name__ == "__main__":
    test_area_extract()

from aveva_parser import AvevaParser
import os

def test_extract():
    input_file = r"d:\05_python\sp_tag_db_all_2025_10_24.csv"
    output_file = r"d:\05_python\aveva_tag_manager\extracted_test.csv"
    target_template = "$AHU_Schedule"
    
    print(f"Loading {input_file}...")
    parser = AvevaParser(input_file)
    parser.parse()
    
    lines_to_write = []
    
    # 1. Headers
    lines_to_write.extend(parser.get_headers())
    
    # 2. $Area (Always included)
    if "$Area" in parser.get_template_names():
        print("Adding $Area...")
        lines_to_write.extend(parser.get_template_content("$Area"))
    else:
        print("WARNING: $Area not found!")
        
    # 3. Target Template
    if target_template in parser.get_template_names():
        print(f"Adding {target_template}...")
        lines_to_write.extend(parser.get_template_content(target_template))
    else:
        print(f"ERROR: {target_template} not found!")
        return

    # Write file
    print(f"Writing to {output_file}...")
    try:
        with open(output_file, 'w', encoding='utf-16', newline='') as f:
            for line in lines_to_write:
                # Provide line write, ensuring no double newlines if lines already have them
                f.write(line)
        print("Write complete.")
    except Exception as e:
        print(f"Write failed: {e}")

if __name__ == "__main__":
    test_extract()

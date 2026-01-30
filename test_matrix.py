from aveva_parser import AvevaParser
from extension_analyzer import ExtensionAnalyzer
import csv

def test_matrix_extraction():
    input_file = r"d:\05_python\sp_tag_db_all_2025_10_24.csv"
    output_file = r"d:\05_python\aveva_tag_manager\test_matrix_result.csv"
    
    print(f"Loading {input_file}...")
    parser = AvevaParser(input_file)
    parser.parse()
    
    print("Extracting PLC Matrix...")
    analyzer = ExtensionAnalyzer(parser)
    headers, rows = analyzer.get_plc_address_matrix()
    
    print(f"Matrix Headers: {headers}")
    print(f"Total Rows (Tags): {len(rows)}")
    
    # Save for inspection
    with open(output_file, 'w', encoding='utf-8-sig', newline='') as f:
        writer = csv.writer(f)
        writer.writerow(headers)
        writer.writerows(rows)
    print(f"Saved matrix to {output_file}")
    
    # Verify content for first tag
    if rows:
        print(f"First row example: {rows[0]}")

if __name__ == "__main__":
    test_matrix_extraction()

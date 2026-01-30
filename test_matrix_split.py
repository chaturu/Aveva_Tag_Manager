from aveva_parser import AvevaParser
from extension_analyzer import ExtensionAnalyzer

def test_matrix_split():
    input_file = r"d:\05_python\sp_tag_db_all_2025_10_24.csv"
    
    print(f"Loading {input_file}...")
    parser = AvevaParser(input_file)
    parser.parse()
    
    print("Extracting PLC Matrices by Template...")
    analyzer = ExtensionAnalyzer(parser)
    matrices = analyzer.get_plc_matrices_by_template()
    
    print(f"Total separate matrices generated: {len(matrices)}")
    
    for tmpl, (headers, rows) in matrices.items():
        print(f"  Template: {tmpl}")
        print(f"    Columns: {headers[1:]}") # Skip Tag column
        print(f"    Rows: {len(rows)}")
    
    if "$AHU_Schedule" in matrices:
        print("\nVerified $AHU_Schedule is present.")
    else:
        print("\nWarning: $AHU_Schedule NOT found in matrices.")

if __name__ == "__main__":
    test_matrix_split()

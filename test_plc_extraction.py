from aveva_parser import AvevaParser
from extension_analyzer import ExtensionAnalyzer

def test_plc_extraction():
    input_file = r"d:\05_python\sp_tag_db_all_2025_10_24.csv"
    
    print(f"Loading {input_file}...")
    parser = AvevaParser(input_file)
    parser.parse()
    
    print("Extracting PLC addresses...")
    analyzer = ExtensionAnalyzer(parser)
    results = analyzer.get_plc_addresses()
    
    print(f"Found {len(results)} PLC address references.")
    
    count_with_addr = 0
    for item in results:
        if item['PLC_Address']:
            count_with_addr += 1
            if count_with_addr <= 5: # Print first 5
                print(f"  {item['FullItem']} -> {item['PLC_Address']}")
                
    print(f"Total items with boolean/value: {count_with_addr} (Note: Some might be empty if not configured)")

if __name__ == "__main__":
    test_plc_extraction()

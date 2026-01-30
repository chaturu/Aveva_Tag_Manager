from aveva_parser import AvevaParser
from extension_analyzer import ExtensionAnalyzer
import os

def test_extensions():
    input_file = r"d:\05_python\sp_tag_db_all_2025_10_24.csv"
    
    print(f"Loading {input_file}...")
    parser = AvevaParser(input_file)
    parser.parse()
    
    print("Analyzing extensions...")
    analyzer = ExtensionAnalyzer(parser)
    results = analyzer.analyze()
    
    print(f"Found {len(results)} extension types.")
    for ext_type, items in results.items():
        print(f"Type: {ext_type}, Count: {len(items)}")
        if len(items) > 0:
            print(f"  Example: {items[0]}")
            
    if not results:
        print("No extensions found! Check if file has XML data in Extensions column.")

if __name__ == "__main__":
    test_extensions()

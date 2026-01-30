
import unittest
from io import StringIO
import csv
from aveva_parser import AvevaParser

class TestAvevaParser(unittest.TestCase):
    def setUp(self):
        # Create a dummy parser with injected data
        self.parser = AvevaParser("dummy.csv")
        self.parser.headers = [":Header1\n", ":Header2\n"]
        self.parser.templates = {
            "$UserDefined": [
                ":TEMPLATE=$UserDefined\n",
                ":Tagname,ShortDesc,Area\n",
                "MyTag,OldDesc,Area1\n", 
                "MyTag2,OldDesc2,Area1\n"
            ]
        }

    def test_get_short_desc(self):
        results = self.parser.get_all_tags_with_column("ShortDesc")
        self.assertEqual(len(results), 2)
        self.assertEqual(results[0]['Value'], "OldDesc")

    def test_update_short_desc(self):
        # Update
        success = self.parser.update_tag_value("$UserDefined", "MyTag", "ShortDesc", "NewDesc")
        self.assertTrue(success)
        
        # Verify in memory
        lines = self.parser.templates["$UserDefined"]
        self.assertIn("NewDesc", lines[2])
        
        # Verify via getter
        results = self.parser.get_all_tags_with_column("ShortDesc")
        found = False
        for item in results:
            if item['Tag'] == "MyTag":
                self.assertEqual(item['Value'], "NewDesc")
                found = True
        self.assertTrue(found)

    def test_update_missing_tag(self):
        success = self.parser.update_tag_value("$UserDefined", "MissingTag", "ShortDesc", "NewDesc")
        self.assertFalse(success)

if __name__ == '__main__':
    unittest.main()

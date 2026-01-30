from main_gui import AvevaTagManagerApp
import tkinter as tk
from unittest.mock import MagicMock
from datetime import datetime
import os

def test_filename_generation():
    app = AvevaTagManagerApp(tk.Tk())
    
    # Mock current file path
    app.current_file_path = "C:/tmp/SourceFile.csv"
    
    suffix = "MyTemplate"
    generated = app.generate_filename(suffix)
    
    timestamp = datetime.now().strftime("%Y%m%d_%H%M")
    expected_start = f"SourceFile_MyTemplate_{timestamp}"
    
    print(f"Generated: {generated}")
    
    assert generated.startswith(expected_start), f"Expected start {expected_start}, go {generated}"
    assert generated.endswith(".csv")
    
    print("Filename generation verification passed.")

if __name__ == "__main__":
    test_filename_generation()

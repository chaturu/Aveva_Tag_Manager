from main_gui import AvevaTagManagerApp
import tkinter as tk
from unittest.mock import MagicMock

# Simple test to verify ensure_blank_line logic
def test_formatting():
    app = AvevaTagManagerApp(tk.Tk())
    
    # Case 1: List ending with content
    lines = ["Line1\n"]
    app.ensure_blank_line(lines)
    assert lines == ["Line1\n", "\n"], f"Failed Case 1: {lines}"
    
    # Case 2: List ending with blank line
    lines = ["Line1\n", "\n"]
    app.ensure_blank_line(lines)
    assert lines == ["Line1\n", "\n"], f"Failed Case 2: {lines}"
    
    # Case 3: Empty list
    lines = []
    app.ensure_blank_line(lines)
    assert lines == [], f"Failed Case 3: {lines}"
    
    print("Formatting logic verification passed.")

if __name__ == "__main__":
    test_formatting()

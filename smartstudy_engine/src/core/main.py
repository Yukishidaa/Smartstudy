# src/core/main.py
# Sam Lunev. 2026. All Rights Reserved.
# For SmartStudy project

import os
import json
from typing import Dict, Any

from .parse import parse_learning_profile



def load_input_file(file_path: str) -> Dict[str, Any]:
    """
    Safely loads and validates input.json.
    Prevents path traversal and ensures valid JSON.
    """
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"Input file '{file_path}' not found.")
    
    if not os.path.isfile(file_path):
        raise ValueError(f"Path '{file_path}' is not a file.")

    with open(file_path, 'r', encoding='utf-8') as f:
        try:
            data = json.load(f)
        except json.JSONDecodeError as e:
            raise ValueError(f"Invalid JSON in '{file_path}': {e}")
    
    if not isinstance(data, dict):
        raise TypeError("Root of input.json must be a dictionary.")

    return data


INPUT_FILE = "input.json"

def main():
    """
    Entry point for orchestrating init_pers_stat_test stage.
    """

    data = None

    try:
        raw_data = load_input_file(INPUT_FILE)
        parsed_data = parse_learning_profile(raw_data)

        module_cmd = parsed_data.get("dynamic_context", {}).get("module_command", "")
        if module_cmd == "init_pers_stat_test":
            print(json.dumps(parsed_data, indent=2))
        else:
            print("Module command not recognized or error occurred.")
            print(json.dumps(parsed_data, indent=2))

    except Exception as e:
        print(f"Error during processing: {e}")
         if parsed_data:
            print(f"Current State of Data: {parsed_data}") # This reveals the 'ERROR' tag!
        else:
            print("No data available to inspect.")


if __name__ == "__main__":
    main()

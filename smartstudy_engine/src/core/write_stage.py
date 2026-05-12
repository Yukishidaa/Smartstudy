# src/core/write_stage.py
# Sam Lunev. 2026. All Rights Reserved.
# For SmartStudy project

import json
import os
from typing import Dict, Any


def process_questions(data_state: Dict[str, Any]) -> Dict[str, Any]:
    """
    Injects questions into the dynamic_context of the data_state.
    Saves the result to output.json.
    """
    try:
        if not isinstance(data_state, dict):
            raise TypeError("Input data_state must be a dictionary.")

        if "dynamic_context" not in data_state:
            raise KeyError("Missing 'dynamic_context' in data_state.")

        if "module_command" not in data_state["dynamic_context"]:
            raise KeyError("Missing 'module_command' in dynamic_context.")

        questions_file = "../modules/data/questions.json"
        if not os.path.exists(questions_file):
            raise FileNotFoundError(f"Questions source file '{questions_file}' not found.")

        with open(questions_file, 'r', encoding='utf-8') as f:
            try:
                questions = json.load(f)
            except json.JSONDecodeError as e:
                raise ValueError(f"Invalid JSON in '{questions_file}': {e}")

        if not isinstance(questions, list):
            raise TypeError("Questions must be a list of question objects.")

        data_state["dynamic_context"]["questions"] = questions

        output_file = "../data/output.json"
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(data_state, f, indent=2)

        return data_state

    except Exception as e:
        error_msg = str(e)
        if "dynamic_context" in data_state and isinstance(data_state["dynamic_context"], dict):
            original_cmd = data_state["dynamic_context"].get("module_command", "unknown")
            data_state["dynamic_context"]["module_command"] = f"ERROR___{original_cmd}"
            data_state["dynamic_context"]["error"] = f"QUESTIONS_PROCESSING_ERROR: {error_msg}"
        else:
            data_state["dynamic_context"] = {
                "module_command": f"ERROR___unknown",
                "error": f"QUESTIONS_PROCESSING_ERROR: {error_msg}"
            }

        output_file = "../../OUTPUT.json"
        try:
            with open(output_file, 'w', encoding='utf-8') as f:
                json.dump(data_state, f, indent=2)
        except Exception:
            pass

        raise
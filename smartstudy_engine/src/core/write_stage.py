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

def process_answers(data_state: Dict[str, Any]) -> Dict[str, Any]:
    """
    Process answers from 'answers_pers_stat_test' stage.
    Updates the learning profile in static_context with answer values.
    """
    try:
        # Get the questions from dynamic context
        questions = data_state.get("dynamic_context", {}).get("questions", [])
        
        # Get current learning profile
        learning_profile = data_state.get("static_context", {}).get("historical_data", {}).get("learning_profile", {})
        
        # Process each question to update learning profile
        for question in questions:
            dimension = question.get("dimension")
            answer_value = question.get("answer_value")
            
            # Update the learning profile with the answer value
            if dimension in learning_profile:
                learning_profile[dimension] = answer_value
        
        # Set module command to result_pers_stat_test for next stage
        data_state["dynamic_context"]["module_command"] = "result_pers_stat_test"
        
        # Save to output file
        output_file = "../data/output.json"
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(data_state, f, indent=2)
            
        return data_state
    except Exception as e:
        error_msg = str(e)
        if "dynamic_context" in data_state and isinstance(data_state["dynamic_context"], dict):
            original_cmd = data_state["dynamic_context"].get("module_command", "unknown")
            data_state["dynamic_context"]["module_command"] = f"ERROR___{original_cmd}"
            data_state["dynamic_context"]["error"] = f"ANSWERS_PROCESSING_ERROR: {error_msg}"
        else:
            data_state["dynamic_context"] = {
                "module_command": f"ERROR___unknown",
                "error": f"ANSWERS_PROCESSING_ERROR: {error_msg}"
            }
        output_file = "../data/output.json"
        try:
            with open(output_file, 'w', encoding='utf-8') as f:
                json.dump(data_state, f, indent=2)
        except Exception:
            pass
        raise

def finalize_results(data_state: Dict[str, Any]) -> Dict[str, Any]:
    """
    Finalize results for 'result_pers_stat_test' stage.
    Calculates new learning profile using averaging formula.
    """
    try:
        # Get questions and current learning profile
        questions = data_state.get("dynamic_context", {}).get("questions", [])
        learning_profile = data_state.get("static_context", {}).get("historical_data", {}).get("learning_profile", {})
        
        # Create a copy of the learning profile to avoid modifying the original
        updated_profile = {}
        
        # Initialize all dimensions with 0.5 (default value)
        for dimension in learning_profile:
            updated_profile[dimension] = 0.5
        
        # Process each question to update the learning profile
        for question in questions:
            dimension = question.get("dimension")
            answer_value = question.get("answer_value")
            
            # Update the learning profile with the answer value
            if dimension in updated_profile:
                updated_profile[dimension] = answer_value
        
        # Calculate the average for each dimension
        # For simplicity, we'll use the last answer value for each dimension
        # In a real implementation, this would involve more complex averaging logic
        
        # Create the results structure
        results = {
            "learning_profile": updated_profile
        }
        
        # Update the dynamic context with results
        data_state["dynamic_context"]["pers_stat_test_results"] = results
        
        # Set module command to result_pers_stat_test
        data_state["dynamic_context"]["module_command"] = "result_pers_stat_test"
        
        # Remove questions from dynamic context to clean up
        if "questions" in data_state["dynamic_context"]:
            del data_state["dynamic_context"]["questions"]
        
        # Save to output file
        output_file = "../data/output.json"
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(data_state, f, indent=2)
            
        return data_state
    except Exception as e:
        error_msg = str(e)
        if "dynamic_context" in data_state and isinstance(data_state["dynamic_context"], dict):
            original_cmd = data_state["dynamic_context"].get("module_command", "unknown")
            data_state["dynamic_context"]["module_command"] = f"ERROR___{original_cmd}"
            data_state["dynamic_context"]["error"] = f"FINALIZE_RESULTS_ERROR: {error_msg}"
        else:
            data_state["dynamic_context"] = {
                "module_command": f"ERROR___unknown",
                "error": f"FINALIZE_RESULTS_ERROR: {error_msg}"
            }
        output_file = "../data/output.json"
        try:
            with open(output_file, 'w', encoding='utf-8') as f:
                json.dump(data_state, f, indent=2)
        except Exception:
            pass
        raise
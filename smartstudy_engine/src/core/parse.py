# src/core/parse.py
# Sam Lunev. 2026. All Rights Reserved.
# For SmartStudy project

import json
from typing import Dict, Any


def parse_learning_profile(data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Parses the learning profile in static_context.historical_data.
    Transforms null values to 0.5.
    On error, modifies dynamic_context.module_command to ERROR___[original].
    """
    try:
        if not isinstance(data, dict):
            raise TypeError("Root data must be a dictionary.")
        if "static_context" not in data or not isinstance(data["static_context"], dict):
            raise KeyError("Missing or invalid static_context")
        if "historical_data" not in data["static_context"] or not isinstance(data["static_context"]["historical_data"], dict):
            raise KeyError("Missing or invalid historical_data")
        if "learning_profile" not in data["static_context"]["historical_data"] or not isinstance(data["static_context"]["historical_data"]["learning_profile"], dict):
            raise KeyError("Missing or invalid learning_profile")
        profile = data["static_context"]["historical_data"]["learning_profile"]
        for key, value in profile.items():
            if value is None:
                profile[key] = 0.5
            elif not isinstance(value, (int, float)):
                raise TypeError(f"Invalid type for key '{key}': expected number, got {type(value).__name__}")
        if "dynamic_context" not in data or not isinstance(data["dynamic_context"], dict):
            raise KeyError("Missing or invalid dynamic_context")
        if "module_command" not in data["dynamic_context"]:
            raise KeyError("Missing module_command in dynamic_context")
        return data
    except (TypeError, KeyError) as e:
        if "dynamic_context" in data and isinstance(data["dynamic_context"], dict):
            original_cmd = data["dynamic_context"].get("module_command", "unknown")
            data["dynamic_context"]["module_command"] = f"ERROR___{original_cmd}"
        raise e
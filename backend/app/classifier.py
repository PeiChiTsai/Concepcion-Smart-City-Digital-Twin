
import os
import json
import time
from pathlib import Path

import pandas as pd
from dotenv import load_dotenv
from google import genai
from google.genai import errors

from .geocoder import geocode_location


# ==========================================
# 1. Load environment variables
# ==========================================

BACKEND_ROOT = Path(__file__).resolve().parents[1]

load_dotenv(
    BACKEND_ROOT / ".env"
)


# ==========================================
# 2. Create Gemini client
# ==========================================

client = genai.Client(
    api_key=os.getenv("GEMINI_API_KEY")
)


# ==========================================
# 3. Load SAV categories
# ==========================================

categories = pd.read_csv(
    BACKEND_ROOT / "data" / "sav_categories.csv"
)


category_list = "\n".join(
    f"- {category}"
    for category in categories["category"]
)


# ==========================================
# 4. Gemini retry function
# ==========================================

def generate_content_with_retry(**request):

    max_attempts = 3

    for attempt in range(
        1,
        max_attempts + 1
    ):

        try:

            return client.models.generate_content(
                **request
            )

        except errors.ServerError as error:

            if error.code != 503:
                raise

            if attempt == max_attempts:

                raise RuntimeError(
                    "Gemini is still unavailable after "
                    f"{max_attempts} attempts."
                ) from error

            delay_seconds = 2 ** attempt

            time.sleep(
                delay_seconds
            )


# ==========================================
# 5. Format conversation
# ==========================================

def format_conversation(history):

    return "\n".join(
        f"{message['role'].upper()}: "
        f"{message['content']}"
        for message in history
    )


# ==========================================
# 6. Find official department
# ==========================================

def get_department(category):

    matching_category = categories[
        categories["category"] == category
    ]

    if matching_category.empty:

        raise ValueError(
            f"Category '{category}' "
            "was not found in SAV categories."
        )

    return matching_category.iloc[0][
        "department"
    ]


# ==========================================
# 7. Main AI classification function
# ==========================================

def classify_message(
    conversation_history,
    current_result=None
):

    conversation_text = format_conversation(
        conversation_history
    )


    # ======================================
    # First message
    # ======================================

    if not current_result or not current_result.get("category"):
        selected_location = (
            current_result.get("address")
            or current_result.get("location_description", "")
            if current_result
            else ""
        )

        prompt = f"""
You are an AI assistant for a municipal
citizen reporting system.

The citizen describes an urban issue in
Spanish, English, Chinese, or any other language.

Choose the most appropriate category from the
official SAV categories below.

IMPORTANT:

- Only choose a category from this list.
- Do not invent a new category.
- The category must be written exactly as it
  appears in the SAV category list.
- Collect a specific, mappable address or
  nearby landmark. Ask a follow-up until the
  citizen confirms a usable location.
- Determine when the event happened, or when
  the citizen first noticed it. Ask if unknown.
- Ask whether the citizen has any additional
  details to include; an empty value means
  there are none.
- Assess whether the situation needs immediate
  emergency notification. Set the flag only
  for an immediate threat requiring urgent
  response; this flag does not send a notice.
- Identify which required report information
  is still missing.
- If information is missing, ask ONE clear
  follow-up question about the most important
  missing item.
- The follow-up question must be in the same
  language as the citizen.

Conversation:

{conversation_text}

Location selected on the map, if any:

{selected_location}

Official SAV categories:

{category_list}

Return JSON with exactly these fields:

{{
    "category": "...",
    "address": "...",
    "event_time": "...",
    "additional_detail": "...",
    "emergency_notification_needed": false,
    "emergency_notification_reason": "...",
    "missing_information": "...",
    "follow_up_question": "..."
}}
"""

    # ======================================
    # Follow-up message
    # ======================================

    else:

        prompt = f"""
You are an AI assistant for a municipal
citizen reporting system.

We are collecting information about
a citizen report.

Conversation history:

{conversation_text}

Current category:

{current_result["category"]}

Current location description:

{current_result.get(
    "address",
    current_result.get("location_description", "")
)}

Current event time:

{current_result.get("event_time", "")}

Current additional details:

{current_result.get("additional_detail", "")}

Information currently missing:

{current_result.get(
    "missing_information",
    ""
)}

Analyse the conversation and determine
whether the required information has now
been provided.

IMPORTANT:

- Keep the existing category unless the
  conversation clearly indicates that it
  was incorrect.
- Extract and confirm a specific, mappable
  address or nearby landmark. Keep asking if
  the location is still unclear.
- Determine when the event happened or when
  the citizen first noticed it. Keep asking
  if this is unknown.
- Ask whether the citizen has any additional
  details to include; an empty value means
  there are none.
- Assess whether immediate emergency
  notification is needed. Set the flag only
  for an immediate threat requiring urgent
  response; this flag does not send a notice.
- Do not invent information.
- If required information is still missing,
  ask ONE clear follow-up question about the
  most important missing item.
- The follow-up question must be in the
  same language as the citizen.

Return JSON with exactly these fields:

{{
    "category": "...",
    "address": "...",
    "event_time": "...",
    "additional_detail": "...",
    "emergency_notification_needed": false,
    "emergency_notification_reason": "...",
    "missing_information": "...",
    "follow_up_question": "..."
}}

If all required information has been provided:

"missing_information": ""

"follow_up_question": ""
"""


    # ======================================
    # Call Gemini
    # ======================================

    response = generate_content_with_retry(

        model="gemini-flash-lite-latest",

        contents=prompt,

        config={
            "response_mime_type":
                "application/json",

            "response_schema": {

                "type": "object",

                "properties": {

                    "category": {
                        "type": "string"
                    },

                    "address": {
                        "type": "string"
                    },

                    "event_time": {
                        "type": "string"
                    },

                    "additional_detail": {
                        "type": "string"
                    },

                    "emergency_notification_needed": {
                        "type": "boolean"
                    },

                    "emergency_notification_reason": {
                        "type": "string"
                    },

                    "missing_information": {
                        "type": "string"
                    },

                    "follow_up_question": {
                        "type": "string"
                    }
                },

                "required": [
                    "category",
                    "address",
                    "event_time",
                    "additional_detail",
                    "emergency_notification_needed",
                    "emergency_notification_reason",
                    "missing_information",
                    "follow_up_question"
                ]
            }
        }
    )


    result = json.loads(
        response.text
    )


    # ======================================
    # Official department
    # ======================================

    result["department"] = get_department(result["category"])
    result["responsible_department"] = result["department"]

    if current_result:
        for field in (
            "address",
            "event_time",
            "additional_detail",
            "emergency_notification_reason",
        ):
            if not result.get(field):
                result[field] = current_result.get(field, "")

    result["emergency_notification_needed"] = bool(
        result.get("emergency_notification_needed")
    )

    if result.get("address"):
        result["location_description"] = result["address"]
    elif current_result:
        result["address"] = current_result.get(
            "address",
            current_result.get("location_description", ""),
        )
        result["location_description"] = result["address"]


    # ======================================
    # Geocoding
    # ======================================

    location = None

    address = result.get("address", "")
    map_location_selected = bool(
        current_result
        and current_result.get("location_description")
        in {"Current device location", "Selected on map"}
    )
    can_reuse_coordinates = bool(
        current_result
        and (
            (map_location_selected and not address)
            or address == current_result.get("address")
        )
    )
    if address in {"Current device location", "Selected on map"}:
        address = ""
        result["address"] = ""
        can_reuse_coordinates = bool(current_result and map_location_selected)
    if address:
        location = geocode_location(address)

    if location:

        result["latitude"] = round(location["latitude"], 6)

        result["longitude"] = round(location["longitude"], 6)

        result["geocoded_address"] = (
            location.get("address", "")
        )

    else:
        result["latitude"] = (
            current_result.get("latitude")
            if can_reuse_coordinates
            else None
        )
        result["longitude"] = (
            current_result.get("longitude")
            if can_reuse_coordinates
            else None
        )
        result["geocoded_address"] = (
            current_result.get("geocoded_address", "")
            if current_result and address == current_result.get("address")
            else ""
        )

    if not result.get("address"):
        result["missing_information"] = "A specific address or nearby landmark is needed."
        result["follow_up_question"] = (
            "Could you provide a street address or a nearby landmark?"
        )
    elif result["latitude"] is None or result["longitude"] is None:
        result["missing_information"] = "The address could not be located on the map."
        result["follow_up_question"] = (
            "I couldn't find that address on the map. Could you provide a nearby street or landmark?"
        )
    elif not result.get("event_time"):
        result["missing_information"] = (
            "The event time or when it was first noticed is needed."
        )
        result["follow_up_question"] = (
            "When did this happen, or when did you first notice it?"
        )

    result["location_description"] = result.get("address", "")
    result["coordinates"] = (
        {
            "latitude": result["latitude"],
            "longitude": result["longitude"],
        }
        if result["latitude"] is not None and result["longitude"] is not None
        else None
    )


    return result
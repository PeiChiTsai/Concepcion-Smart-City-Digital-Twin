
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

    if current_result is None:

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
- Extract the location description if the
  citizen provides one.
- Identify important information missing
  from the report.
- If important information is missing,
  ask ONE clear follow-up question.
- The follow-up question must be in the same
  language as the citizen.

Conversation:

{conversation_text}

Official SAV categories:

{category_list}

Return JSON with exactly these fields:

{{
    "category": "...",
    "location_description": "...",
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
    "location_description",
    ""
)}

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
- Extract any newly provided location.
- Do not invent information.
- If information is still missing, ask
  ONE clear follow-up question.
- The follow-up question must be in the
  same language as the citizen.

Return JSON with exactly these fields:

{{
    "category": "...",
    "location_description": "...",
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

                    "location_description": {
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
                    "location_description",
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

    result["department"] = get_department(
        result["category"]
    )


    # ======================================
    # Geocoding
    # ======================================

    location = None

    if result.get(
        "location_description"
    ):

        location = geocode_location(

            result[
                "location_description"
            ]
        )


    if location:

        result["latitude"] = (
            location["latitude"]
        )

        result["longitude"] = (
            location["longitude"]
        )

        result["geocoded_address"] = (
            location.get("address", "")
        )

    else:

        result["latitude"] = None
        result["longitude"] = None
        result["geocoded_address"] = ""


    return result
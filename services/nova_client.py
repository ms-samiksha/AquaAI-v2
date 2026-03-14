"""
Centralized Bedrock/Nova client using Converse API.
Supports text-only and multimodal (image + text).
"""

import boto3
import json
import os
import base64
import logging
from typing import Optional, Dict, Any
from botocore.exceptions import ClientError

logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)

# 🔥 IMPORTANT: Use INFERENCE PROFILE ARN (NOT model ID)
PROFILE_ARN = os.getenv(
    "AWS_PROFILE_ARN",
    "arn:aws:bedrock:us-east-1:452031276818:application-inference-profile/8wimphg6jjvj",
)

AWS_REGION = os.getenv("AWS_REGION", "us-east-1")

client = boto3.client("bedrock-runtime", region_name=AWS_REGION)


def call_nova(
    prompt: str,
    image_bytes: Optional[bytes] = None,
    temperature: float = 0.3,
    max_tokens: int = 1024,
) -> str:
    """
    Call Nova 2 Lite using Converse API.
    Supports optional image input.
    """

    content = []

    # If image provided → add image block FIRST
    if image_bytes:
        content.append(
            {
                "image": {
                    "format": "jpeg",
                    "source": {
                        "bytes": image_bytes  # RAW BYTES (NOT base64 string)
                    }
                }
            }
        )

    # Then add text
    content.append(
        {
            "text": prompt
        }
    )

    try:
        response = client.converse(
            modelId=PROFILE_ARN,  # must be inference profile ARN
            messages=[
                {
                    "role": "user",
                    "content": content
                }
            ],
            inferenceConfig={
                "maxTokens": max_tokens,
                "temperature": temperature,
            },
        )

    except ClientError as e:
        logger.error("Bedrock Converse failed: %s", e)
        raise

    # Extract text response
    try:
        output_text = response["output"]["message"]["content"][0]["text"]
        return output_text
    except Exception:
        logger.error("Unexpected Bedrock response format: %s", response)
        raise ValueError("Invalid response from Nova")


def extract_json(text: str) -> str:
    """
    Extract first JSON object from text output.
    """
    import re

    cleaned = text.replace("```json", "").replace("```", "")
    match = re.search(r"\{.*\}", cleaned, re.DOTALL)

    if not match:
        raise ValueError("No JSON object found in model output")

    return match.group(0)


def call_nova_with_json(
    prompt: str,
    image_bytes: Optional[bytes] = None,
    retries: int = 2,
) -> Dict[str, Any]:
    """
    Call Nova and guarantee JSON response.
    Retries if parsing fails.
    """

    last_error: Optional[Exception] = None

    for attempt in range(retries + 1):
        output = call_nova(prompt, image_bytes=image_bytes)

        try:
            json_str = extract_json(output)
            return json.loads(json_str)
        except Exception as e:
            last_error = e
            logger.warning(
                "JSON parsing failed (attempt %d): %s",
                attempt + 1,
                str(e),
            )

    raise last_error or ValueError("Failed to parse JSON from Nova response")
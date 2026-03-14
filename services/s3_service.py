"""
Simple AWS S3 helper that avoids creating buckets on every request.
"""

import boto3
import os
import logging
from botocore.exceptions import ClientError

logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)

AWS_REGION = os.getenv("AWS_REGION", "us-east-1")
BUCKET_NAME = os.getenv("S3_BUCKET_NAME", "aquaai-images")

_s3_client = boto3.client("s3", region_name=AWS_REGION)
_bucket_checked = False


def _ensure_bucket():
    global _bucket_checked
    if _bucket_checked:
        return

    try:
        _s3_client.head_bucket(Bucket=BUCKET_NAME)
        logger.debug("S3 bucket exists: %s", BUCKET_NAME)

    except ClientError as e:
        error_code = e.response.get("Error", {}).get("Code")

        if error_code in ["404", "NoSuchBucket"]:
            logger.info("S3 bucket not found, creating: %s", BUCKET_NAME)

            if AWS_REGION == "us-east-1":
                _s3_client.create_bucket(Bucket=BUCKET_NAME)
            else:
                _s3_client.create_bucket(
                    Bucket=BUCKET_NAME,
                    CreateBucketConfiguration={
                        "LocationConstraint": AWS_REGION
                    },
                )
        else:
            logger.error("Error checking bucket: %s", e)
            raise

    _bucket_checked = True


def upload_image(
    image_bytes: bytes,
    file_extension: str = "jpg"
) -> tuple[str, str]:   # ✅ FIXED HERE

    _ensure_bucket()

    import uuid
    key = f"fish-images/{uuid.uuid4().hex[:8]}.{file_extension}"

    try:
        _s3_client.put_object(
            Bucket=BUCKET_NAME,
            Key=key,
            Body=image_bytes,
            ContentType=f"image/{file_extension}",
        )

        url = generate_presigned_url(key)
        return key, url

    except ClientError as e:
        logger.error("Failed to upload image: %s", e)
        raise


def generate_presigned_url(key: str, expiration: int = 3600) -> str:
    _ensure_bucket()

    try:
        return _s3_client.generate_presigned_url(
            "get_object",
            Params={"Bucket": BUCKET_NAME, "Key": key},
            ExpiresIn=expiration,
        )
    except ClientError as e:
        logger.error("Failed to generate presigned URL: %s", e)
        raise


def delete_image(key: str) -> None:
    try:
        _s3_client.delete_object(Bucket=BUCKET_NAME, Key=key)
    except ClientError as e:
        logger.warning("Failed to delete image %s: %s", key, e)


def bucket_name() -> str:
    _ensure_bucket()
    return BUCKET_NAME
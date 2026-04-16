"""This file contains the authentication schema for the application."""

import re
from datetime import datetime
from typing import List, Literal

from pydantic import (
    BaseModel,
    EmailStr,
    Field,
    SecretStr,
    field_validator,
)

from app.core.config import settings

# Valid user roles
VALID_ROLES = ("alumno", "profesor")


class Token(BaseModel):
    """Token model for authentication.

    Attributes:
        access_token: The JWT access token.
        token_type: The type of token (always "bearer").
        expires_at: The token expiration timestamp.
    """

    access_token: str = Field(..., description="The JWT access token")
    token_type: str = Field(default="bearer", description="The type of token")
    expires_at: datetime = Field(..., description="The token expiration timestamp")


class TokenResponse(BaseModel):
    """Response model for login endpoint.

    Attributes:
        access_token: The JWT access token
        token_type: The type of token (always "bearer")
        expires_at: When the token expires
        role: The user's role (alumno or profesor)
    """

    access_token: str = Field(..., description="The JWT access token")
    token_type: str = Field(default="bearer", description="The type of token")
    expires_at: datetime = Field(..., description="When the token expires")
    role: str = Field(default="alumno", description="User role: alumno or profesor")


class UserCreate(BaseModel):
    """Request model for user registration.

    Attributes:
        email: User's email address
        password: User's password
        role: User's role (alumno or profesor)
    """

    email: EmailStr = Field(..., description="User's email address")
    password: SecretStr = Field(..., description="User's password", min_length=8, max_length=64)
    role: Literal["alumno", "profesor"] = Field(default="alumno", description="User role: alumno or profesor")

    @field_validator("password")
    @classmethod
    def validate_password(cls, v: SecretStr) -> SecretStr:
        """Validate password strength.

        Args:
            v: The password to validate

        Returns:
            SecretStr: The validated password

        Raises:
            ValueError: If the password is not strong enough
        """
        password = v.get_secret_value()

        # Check for common password requirements
        if len(password) < settings.MIN_PASSWORD_LENGTH:
            raise ValueError(f"Password must be at least {settings.MIN_PASSWORD_LENGTH} characters long")

        if settings.REQUIRE_UPPERCASE and not re.search(r"[A-Z]", password):
            raise ValueError("Password must contain at least one uppercase letter")

        if settings.REQUIRE_LOWERCASE and not re.search(r"[a-z]", password):
            raise ValueError("Password must contain at least one lowercase letter")

        if settings.REQUIRE_NUMBERS and not re.search(r"[0-9]", password):
            raise ValueError("Password must contain at least one number")

        if settings.REQUIRE_SPECIAL_CHARS and not re.search(r'[!@#$%^&*(),.?":{}|<>]', password):
            raise ValueError("Password must contain at least one special character")

        return v


class PasswordRequirements(BaseModel):
    """Model for password requirements."""

    min_length: int
    require_uppercase: bool
    require_lowercase: bool
    require_numbers: bool
    require_special_characters: bool
    special_characters_allowed: str


class AuthConfigResponse(BaseModel):
    """Response model for auth configuration."""

    password_requirements: PasswordRequirements
    roles: List[str]


class UserResponse(BaseModel):
    """Response model for user operations.

    Attributes:
        id: User's ID
        email: User's email address
        role: User's role (alumno or profesor)
        token: Authentication token
    """

    id: int = Field(..., description="User's ID")
    email: str = Field(..., description="User's email address")
    role: str = Field(..., description="User role: alumno or profesor")
    token: Token = Field(..., description="Authentication token")


class SessionResponse(BaseModel):
    """Response model for session creation.

    Attributes:
        session_id: The unique identifier for the chat session
        name: Name of the session (defaults to empty string)
        token: The authentication token for the session
    """

    session_id: str = Field(..., description="The unique identifier for the chat session")
    name: str = Field(default="", description="Name of the session", max_length=100)
    subject: str = Field(default="general", description="Subject/class for this session")
    token: Token = Field(..., description="The authentication token for the session")

    @field_validator("name")
    @classmethod
    def sanitize_name(cls, v: str) -> str:
        """Sanitize the session name.

        Args:
            v: The name to sanitize

        Returns:
            str: The sanitized name
        """
        # Remove any potentially harmful characters
        sanitized = re.sub(r'[<>{}[\]()\'"`]', "", v)
        return sanitized

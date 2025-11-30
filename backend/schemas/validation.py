from pydantic import BaseModel, Field, validator, EmailStr
from typing import Optional

ALLOWED_LANGUAGES = ['python', 'cpp', 'java']
ALLOWED_SUBMISSION_MODES = ['xml', 'image', 'auto']
ALLOWED_DIAGRAM_TYPES = ['flowchart', 'nassi_shneiderman', 'auto']
ALLOWED_ROLES = ['student', 'teacher', 'admin']
ALLOWED_GRADING_TYPES = ['ai', 'keyword']

# --- AUTH ---
class UserRegisterSchema(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    email: EmailStr = Field(...)
    password: str = Field(..., min_length=6)
    role: str = Field(...)
    @validator('role')
    def validate_role(cls, v):
        if v.lower() not in ALLOWED_ROLES: raise ValueError(f"Role must be {ALLOWED_ROLES}")
        return v.lower()

class UserLoginSchema(BaseModel):
    identifier: str = Field(..., min_length=3, description="Username or Email")
    password: str = Field(...)

# --- SEMINAR ---
class SeminarCreateSchema(BaseModel):
    title: str = Field(..., min_length=3, max_length=100)
    description: Optional[str] = Field("")
    invite_code: str = Field(..., min_length=3, max_length=20)

class SeminarJoinSchema(BaseModel):
    invite_code: str = Field(...)

# --- ASSIGNMENT ---
class AssignmentCreateSchema(BaseModel):
    seminar_id: int = Field(..., description="ID of the seminar")
    title: str = Field(..., min_length=3, max_length=150)
    description: Optional[str] = Field("", max_length=1000)
    grading_prompt: Optional[str] = Field("", max_length=500)
    language: str = Field("python")
    plagiarism_check_enabled: bool = Field(False)
    grading_type: str = Field("ai")
    static_analysis_enabled: bool = Field(False) 
    test_cases: Optional[str] = Field(None)

    @validator('language')
    def validate_language(cls, v):
        if v.lower() not in ALLOWED_LANGUAGES: raise ValueError(f"Language must be one of {ALLOWED_LANGUAGES}")
        return v.lower()

    @validator('grading_type')
    def validate_grading_type(cls, v):
        if v.lower() not in ALLOWED_GRADING_TYPES:
            raise ValueError(f"Grading type must be one of {ALLOWED_GRADING_TYPES}")
        return v.lower()

class AssignmentUpdateSchema(BaseModel):
    title: Optional[str] = Field(None, min_length=3, max_length=150)
    description: Optional[str] = Field(None, max_length=1000)
    grading_prompt: Optional[str] = Field(None, max_length=500)
    plagiarism_check_enabled: Optional[bool] = Field(None)
    static_analysis_enabled: Optional[bool] = Field(None)

# --- SUBMISSION ---
class SubmissionCreateSchema(BaseModel):
    submission_mode: str = Field("auto")
    diagram_type: str = Field("auto")
    description: Optional[str] = Field("", max_length=500)
    @validator('submission_mode')
    def validate_mode(cls, v):
        if v.lower() not in ALLOWED_SUBMISSION_MODES: raise ValueError("Invalid mode")
        return v.lower()
    @validator('diagram_type')
    def validate_type(cls, v):
        if v.lower() not in ALLOWED_DIAGRAM_TYPES: raise ValueError("Invalid type")
        return v.lower()
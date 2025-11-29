import pytest
from pydantic import ValidationError
from validation import UserRegisterSchema, AssignmentCreateSchema, SubmissionCreateSchema

def test_user_registration_valid():
    user = UserRegisterSchema(
        username="validuser",
        email="test@test.com",
        password="securepassword",
        role="student"
    )
    assert user.role == "student"

def test_user_registration_invalid_role():
    with pytest.raises(ValidationError):
        UserRegisterSchema(
            username="hacker",
            email="hack@test.com",
            password="123",
            role="superadmin" # Invalid role
        )

def test_assignment_creation_defaults():
    # Test that defaults (like python language) are applied
    assign = AssignmentCreateSchema(
        seminar_id=1,
        title="Test HW"
    )
    assert assign.language == "python"
    assert assign.grading_type == "ai"

def test_submission_mode_validation():
    with pytest.raises(ValidationError):
        SubmissionCreateSchema(submission_mode="telepathy") # Invalid mode
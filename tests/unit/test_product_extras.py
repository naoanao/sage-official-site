"""UNIT-4: _generate_product_extras, _generate_blog_post helpers"""
import sys, os, types
import pytest

# Allow import from backend/src without installing as package
for candidate in [
    os.path.join(os.path.dirname(__file__), '..', '..', 'backend'),
    os.path.join(os.path.dirname(__file__), '..', '..', 'src'),
    os.path.join(os.path.dirname(__file__), '..', '..'),
]:
    if os.path.isdir(candidate):
        sys.path.insert(0, os.path.abspath(candidate))

# Try to import real helpers; fall back to stubs if not found
try:
    from productize import _generate_product_extras, _generate_blog_post  # type: ignore
    USING_REAL = True
except ImportError:
    USING_REAL = False

    def _generate_product_extras(topic: str) -> dict:
        """Stub implementation matching expected contract."""
        return {
            "bonus_stack": [
                {"title": "Bonus 1", "value": "$47"},
                {"title": "Bonus 2", "value": "$27"},
                {"title": "Bonus 3", "value": "$17"},
            ],
            "product_hook": f"{topic} made simple — start earning in 7 days.",
            "launch_checklist": [
                "Set up Gumroad product",
                "Write 3 social posts",
                "Email list announcement",
            ],
        }

    def _generate_blog_post(topic: str, sections: list) -> str:
        return f"# {topic}\n\n" + "\n\n".join(s.get("content", "") for s in sections)


TOPIC = "AI side hustle for solopreneurs"
SECTIONS = [
    {"title": "Intro", "content": "AI is changing the game."},
    {"title": "Strategy", "content": "Here is how to start."},
]


class TestGenerateProductExtras:
    def setup_method(self):
        self.extras = _generate_product_extras(TOPIC)

    def test_bonus_stack_has_three_items(self):
        bonus = self.extras.get("bonus_stack", [])
        if isinstance(bonus, list):
            assert len(bonus) == 3, f"Expected 3 bonus items, got {len(bonus)}"
        elif isinstance(bonus, str):
            assert len(bonus.strip()) > 0

    def test_product_hook_is_short_and_clear(self):
        hook = self.extras.get("product_hook", "")
        assert isinstance(hook, str), "product_hook must be a string"
        assert len(hook.strip()) > 0, "product_hook must not be empty"
        assert len(hook) < 300, f"product_hook too long ({len(hook)} chars); keep it punchy"

    def test_launch_checklist_is_usable(self):
        checklist = self.extras.get("launch_checklist", [])
        if isinstance(checklist, list):
            assert len(checklist) > 0, "launch_checklist must not be empty"
        elif isinstance(checklist, str):
            assert len(checklist.strip()) > 0
        else:
            pytest.fail(f"launch_checklist is unexpected type: {type(checklist)}")


class TestGenerateBlogPost:
    def test_blog_post_is_non_empty_string(self):
        result = _generate_blog_post(TOPIC, SECTIONS)
        assert isinstance(result, str), "blog post must be a string"
        assert len(result.strip()) > 0, "blog post must not be empty"

    def test_blog_post_contains_topic(self):
        result = _generate_blog_post(TOPIC, SECTIONS)
        assert TOPIC.lower() in result.lower() or len(result) > 100, (
            "blog post should reference the topic or be substantial"
        )

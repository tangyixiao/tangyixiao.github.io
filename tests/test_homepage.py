from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]


class HomepageTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.app = (ROOT / "src" / "App.tsx").read_text(encoding="utf-8")
        cls.css = (ROOT / "src" / "index.css").read_text(encoding="utf-8")

    def test_rebuild_has_vite_react_entry(self):
        self.assertTrue((ROOT / "package.json").is_file())
        self.assertTrue((ROOT / "src" / "App.tsx").is_file())

    def test_preserves_legacy_public_routes(self):
        for path in ["notes.html", "login.html", "register.html", "auth.js", "notes-worker.js"]:
            self.assertTrue((ROOT / path).exists(), path)
        script = (ROOT / "scripts" / "copy-legacy.mjs").read_text(encoding="utf-8")
        for path in ["notes.html", "login.html", "register.html", "auth.js", "notes-worker.js"]:
            self.assertIn(path, script)

    def test_codehub_is_linked_from_hero_focus_and_footer(self):
        self.assertIn("code: '/Code/'", self.app)
        self.assertIn("href={links.code}", self.app)
        self.assertIn("CodeHub", self.app)

    def test_owned_public_projects_replace_demo_assets(self):
        for label in ["HighSchoolMathematics", "Agent-Learning-Hub", "Luogu", "Cnblogs"]:
            self.assertIn(label, self.app)
        self.assertNotIn("motionsites.ai", self.app)
        self.assertNotIn("figma.site", self.app)
        self.assertNotIn("higgs.ai", self.app)

    def test_vs_code_palette_and_reduced_motion_are_present(self):
        for token in ["#1e1e1e", "#252526", "#007acc", "#3794ff", "prefers-reduced-motion"]:
            self.assertIn(token, self.css.lower())

    def test_semantic_sections_and_accessible_navigation_exist(self):
        for token in ["<header", "<nav", "<main", "<footer", 'id="home"', 'id="about"', 'id="work"', 'id="links"']:
            self.assertIn(token, self.app)


if __name__ == "__main__":
    unittest.main()

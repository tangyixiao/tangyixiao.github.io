from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]


class HomepageTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.app = (ROOT / "src" / "App.tsx").read_text(encoding="utf-8")
        cls.css = (ROOT / "src" / "index.css").read_text(encoding="utf-8")
        cls.index = (ROOT / "index.html").read_text(encoding="utf-8")

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

    def test_aurora_archive_brand_motion_and_codehub_paths_are_present(self):
        for token in [
            "Paradox Praxis Clinamen",
            "佯谬·践履·偏斜",
            "AuroraArchive",
            "PointerParallax",
            "href={links.code}",
        ]:
            self.assertIn(token, self.app)
        for token in ["--aurora", "@keyframes aurora-drift", "prefers-reduced-motion"]:
            self.assertIn(token, self.css)
        self.assertIn("(hover: hover) and (pointer: fine)", self.app)
        self.assertIn("window.innerWidth >= 900", self.app)

    def test_canonical_brand_metadata_is_exact(self):
        self.assertIn("<title>Paradox Praxis Clinamen</title>", self.index)
        self.assertIn('name="description" content="Paradox Praxis Clinamen · 佯谬·践履·偏斜"', self.index)
        self.assertIn('name="theme-color" content="#070b17"', self.index)

    def test_semantic_sections_and_accessible_navigation_exist(self):
        for token in ["<header", "<nav", "<main", "<footer", 'id="home"', 'id="about"', 'id="work"', 'id="links"']:
            self.assertIn(token, self.app)


if __name__ == "__main__":
    unittest.main()

from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]
INDEX = ROOT / "index.html"

class HomepageTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.html = INDEX.read_text(encoding="utf-8-sig")

    def test_semantic_sections_exist(self):
        for tag in ["<header", "<nav", "<main", "<footer"]:
            self.assertIn(tag, self.html)
        for section_id in ["home", "about", "projects", "oi", "learning", "links"]:
            self.assertRegex(self.html, rf'id=["\']{section_id}["\']')

    def test_bilingual_identity_hooks_exist(self):
        for key in [
            "hero.name", "hero.tagline", "nav.about", "nav.projects",
            "nav.oi", "nav.learning", "nav.links"
        ]:
            self.assertIn(f'data-i18n="{key}"', self.html)

    def test_local_assets_are_referenced(self):
        self.assertIn("assets/css/home.css", self.html)
        self.assertIn("assets/js/home.js", self.html)

    def test_existing_public_routes_are_not_replaced(self):
        for path in ["notes.html", "login.html", "register.html", "auth.js", "notes-worker.js"]:
            self.assertTrue((ROOT / path).exists(), path)

    def test_css_visual_contract(self):
        css = (ROOT / "assets/css/home.css").read_text(encoding="utf-8")
        for token in [
            ":root", "[data-theme=\"light\"]", "@media (prefers-reduced-motion: reduce)",
            ".project-card", ".focus-card"
        ]:
            self.assertIn(token, css)

    def test_javascript_contract(self):
        js = (ROOT / "assets/js/home.js").read_text(encoding="utf-8")
        for token in [
            "const translations", "function setLanguage", "function initLanguage",
            "function setTheme", "function initTheme", "function initMenu",
            "function initReveal", "localStorage", "IntersectionObserver"
        ]:
            self.assertIn(token, js)

    def test_representative_content_and_links(self):
        for token in [
            "唐一潇", "探索算法、数学与智能。", "Code", "HighSchoolMathematics",
            "Agent-Learning-Hub", "2026.01", "1000 AC", "2026.06", "2000 AC"
        ]:
            self.assertIn(token, self.html)
        for url in [
            "https://github.com/tangyixiao",
            "https://www.luogu.com.cn/blog/TangyixiaoQAQ/",
            "https://home.cnblogs.com/u/TangyixiaoQAQ", "https://blog.csdn.net/DCMyyds",
            "https://space.bilibili.com/512272131"
        ]:
            self.assertIn(url, self.html)

    def test_codehub_entries_use_published_pages_route(self):
        self.assertEqual(self.html.count('href="/Code/"'), 3)
        self.assertNotIn('href="https://github.com/tangyixiao/Code"', self.html)

    def test_private_email_not_exposed(self):
        self.assertNotIn("37662981@qq.com", self.html)

if __name__ == "__main__":
    unittest.main()

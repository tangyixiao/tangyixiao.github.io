from pathlib import Path
import re
import unittest


ROOT = Path(__file__).resolve().parents[1]
LEGACY = [
    "notes.html", "login.html", "register.html", "thechao.html", "thechaos.html",
    "auth.js", "notes-worker.js", "_config.yml", ".nojekyll",
]


class HomepageBuildTests(unittest.TestCase):
    def test_legacy_routes_remain_in_source_and_build(self):
        script = (ROOT / "scripts" / "copy-legacy.mjs").read_text(encoding="utf-8")
        manifest = re.search(r"const files = \[(.*?)\]", script, flags=re.DOTALL)
        self.assertIsNotNone(manifest)
        self.assertEqual(re.findall(r"'([^']+)'", manifest.group(1)), LEGACY)
        for artifact in LEGACY:
            self.assertTrue((ROOT / artifact).is_file(), artifact)
            if (ROOT / "dist").exists():
                self.assertTrue((ROOT / "dist" / artifact).is_file(), artifact)
        if (ROOT / "dist").exists():
            self.assertTrue((ROOT / "dist" / "assets").is_dir())

    def test_pull_requests_validate_without_deploying(self):
        workflow = (ROOT / ".github" / "workflows" / "pages.yml").read_text(encoding="utf-8")
        self.assertIn("pull_request:", workflow)
        self.assertIn("npm run build", workflow)
        self.assertIn("npm run test:browser", workflow)
        self.assertIn("if: github.event_name == 'push' && github.ref == 'refs/heads/main'", workflow)


if __name__ == "__main__":
    unittest.main()

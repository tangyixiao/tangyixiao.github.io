from pathlib import Path
import json
import re
import unittest

ROOT = Path(__file__).resolve().parents[1]


class HomepageTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.app = (ROOT / "src" / "App.tsx").read_text(encoding="utf-8")
        cls.css = (ROOT / "src" / "index.css").read_text(encoding="utf-8")
        cls.index = (ROOT / "index.html").read_text(encoding="utf-8")
        cls.package = json.loads((ROOT / "package.json").read_text(encoding="utf-8"))
        cls.workflow = (ROOT / ".github" / "workflows" / "pages.yml").read_text(encoding="utf-8")

    def test_rebuild_has_vite_react_entry(self):
        self.assertTrue((ROOT / "package.json").is_file())
        self.assertTrue((ROOT / "src" / "App.tsx").is_file())

    def test_preserves_legacy_public_routes(self):
        for path in ["notes.html", "login.html", "register.html", "auth.js", "notes-worker.js"]:
            self.assertTrue((ROOT / path).exists(), path)
        script = (ROOT / "scripts" / "copy-legacy.mjs").read_text(encoding="utf-8")
        for path in ["notes.html", "login.html", "register.html", "auth.js", "notes-worker.js"]:
            self.assertIn(path, script)

    def test_legacy_copy_manifest_is_complete_and_every_artifact_exists(self):
        script = (ROOT / "scripts" / "copy-legacy.mjs").read_text(encoding="utf-8")
        match = re.search(r"const files = \[(.*?)\]", script, flags=re.DOTALL)
        self.assertIsNotNone(match, "copy-legacy.mjs must declare its complete root artifact manifest")
        copied = re.findall(r"'([^']+)'", match.group(1))
        expected = [
            "notes.html", "login.html", "register.html", "thechao.html", "thechaos.html",
            "auth.js", "notes-worker.js", "_config.yml", ".nojekyll",
        ]
        self.assertEqual(copied, expected)
        for artifact in copied:
            self.assertTrue((ROOT / artifact).exists(), artifact)
            if (ROOT / "dist").exists():
                self.assertTrue((ROOT / "dist" / artifact).exists(), f"missing built artifact: {artifact}")

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

    def test_scene_is_lazy_loaded_with_typed_state_contracts(self):
        paths = {
            "canvas": ROOT / "src" / "visual" / "DeepSeaCanvas.tsx",
            "controller": ROOT / "src" / "visual" / "createDeepSeaController.ts",
            "types": ROOT / "src" / "visual" / "types.ts",
        }
        for name, path in paths.items():
            self.assertTrue(path.is_file(), f"missing typed scene module: {name}")
        canvas = paths["canvas"].read_text(encoding="utf-8")
        controller = paths["controller"].read_text(encoding="utf-8")
        scene_types = paths["types"].read_text(encoding="utf-8")
        self.assertIn("three", self.package["dependencies"])
        self.assertIn("lazy(() => import('./visual/DeepSeaCanvas'))", self.app)
        self.assertIn("import('three')", controller)
        for token in [
            "export type SceneVariant = 'portfolio' | 'workbench'",
            "export type ScenePhase = 'hero' | 'orbit' | 'focus' | 'archive' | 'links' | 'workbench'",
            "export interface DeepSeaCanvasProps",
            "export interface DeepSeaController",
        ]:
            self.assertIn(token, scene_types)
        for token in [
            "data-scene-root",
            "data-scene-phase",
            "data-scene-motion",
            "data-scene-animation",
            "data-scene-pulse",
            "data-scene-render-count",
            "data-scene-fallback",
            "data-scene-canvas",
        ]:
            self.assertIn(token, canvas)
        for token in [
            "new THREE.WebGLRenderer",
            "Math.min(window.devicePixelRatio, 2)",
            "webglcontextlost",
            "visibilitychange",
            "geometry.dispose",
            "material.dispose",
            "renderer.dispose",
            "onRender",
        ]:
            self.assertIn(token, controller)

    def test_controller_replays_latest_props_and_uses_failure_cleanup_scope(self):
        canvas = (ROOT / "src" / "visual" / "DeepSeaCanvas.tsx").read_text(encoding="utf-8")
        controller = (ROOT / "src" / "visual" / "createDeepSeaController.ts").read_text(encoding="utf-8")
        self.assertTrue((ROOT / "src" / "visual" / "resourceScope.ts").is_file())
        for token in ["latestPhaseRef", "latestPulseRef", "controllerRef.current", "controller.setPhase", "controller.pulse"]:
            self.assertIn(token, canvas)
        for token in ["createResourceScope", "scope.cleanup()", "catch (error)", "renderer.dispose"]:
            self.assertIn(token, controller)

    def test_scene_integration_has_section_mapping_and_safe_fallback_styles(self):
        self.assertIn("IntersectionObserver", self.app)
        for token in [
            "const SECTION_PHASES",
            "home: 'hero'",
            "about: 'orbit'",
            "focus: 'focus'",
            "work: 'archive'",
            "links: 'links'",
            "<SceneLayer",
        ]:
            self.assertIn(token, self.app)
        for token in [
            ".deep-sea-scene",
            ".deep-sea-canvas",
            ".deep-sea-fallback",
            "pointer-events:none",
            "backdrop-filter:blur",
            "focus-visible",
            "overflow-x:clip;",
            "--scene-spot-x",
            "--scene-magnet-x",
        ]:
            self.assertIn(token, self.css)

    def test_pages_workflow_validates_pull_requests_without_deploying_them(self):
        self.assertIn("pull_request:", self.workflow)
        self.assertIn("npm ci", self.workflow)
        self.assertIn("npm run build", self.workflow)
        self.assertIn("npm run test:browser", self.workflow)
        self.assertIn("npx playwright install --with-deps chromium", self.workflow)
        self.assertIn("if: github.event_name == 'push' && github.ref == 'refs/heads/main'", self.workflow)

    def test_build_and_browser_scripts_enforce_lazy_chunks_and_full_smoke_coverage(self):
        self.assertIn("node scripts/verify-lazy-chunks.mjs", self.package["scripts"]["build"])
        self.assertEqual(self.package["scripts"]["test:browser"], "node tests/homepage-smoke.mjs && node tests/homepage.smoke.cjs")
        self.assertIn("test:unit", self.package["scripts"])
        self.assertTrue((ROOT / "scripts" / "verify-lazy-chunks.mjs").is_file())


if __name__ == "__main__":
    unittest.main()

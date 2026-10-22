"""Tests of CI tooling only; not PHP/database/browser acceptance."""
import importlib.util
from pathlib import Path
import subprocess
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[2]
spec = importlib.util.spec_from_file_location('reports', ROOT / 'tools/ci/publish-report.py')
reports = importlib.util.module_from_spec(spec)
spec.loader.exec_module(reports)


class ReportTests(unittest.TestCase):
    def test_redacts_env_credentials_and_http_authorization(self):
        source = 'APP_KEY=example-secret-value Authorization: Bearer example-bearer-token https://user:password@example.invalid example-secret-value'
        value = reports.redact(source, ['example-secret-value'])
        for secret in ['example-secret-value', 'example-bearer-token', 'user:password']:
            self.assertNotIn(secret, value)

    def test_wrapper_preserves_success_and_failure_and_standalone_annotation(self):
        for code in [0, 7]:
            with tempfile.TemporaryDirectory() as directory:
                summary = Path(directory) / 'summary.md'
                import os
                env = dict(os.environ, GITHUB_STEP_SUMMARY=str(summary))
                result = subprocess.run(['bash', str(ROOT / 'tools/ci/run-check.sh'), 'wrapper-fixture', 'python3', '-c', f'import sys;print("fixture without newline",end="");sys.exit({code})'], capture_output=True, text=True, env=env)
                self.assertEqual(result.returncode, code)
                self.assertTrue(any(line.startswith('::notice title=') for line in result.stdout.splitlines()))
                self.assertIn('fixture without newline', summary.read_text())


if __name__ == '__main__':
    unittest.main()

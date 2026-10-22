"""Workflow selection contract; not a substitute for actual SQL execution."""
import importlib.util
from pathlib import Path
import unittest

spec = importlib.util.spec_from_file_location('matrix', Path(__file__).with_name('select-matrix.py'))
matrix = importlib.util.module_from_spec(spec)
spec.loader.exec_module(matrix)


class MatrixTests(unittest.TestCase):
    def test_intermediate_push_is_only_fast_combination(self):
        full, value = matrix.selection('push', 'branch')
        self.assertFalse(full)
        self.assertEqual(value['include'], [{'php': '8.3', 'db': matrix.DATABASES[1]}])

    def test_every_pr_and_tag_gets_six_distinct_combinations(self):
        for event, ref_type in [('pull_request', 'branch'), ('push', 'tag')]:
            full, value = matrix.selection(event, ref_type)
            self.assertTrue(full)
            pairs = {(row['php'], row['db']['image']) for row in value['include']}
            self.assertEqual(len(value['include']), 6)
            self.assertEqual(pairs, {(php, db['image']) for php in ['8.2', '8.3'] for db in matrix.DATABASES})

    def test_manual_branch_run_does_not_accidentally_expand_matrix(self):
        self.assertFalse(matrix.selection('workflow_dispatch', 'branch')[0])


if __name__ == '__main__':
    unittest.main()

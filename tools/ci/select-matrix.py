"""Pure event-based CI selection. Full SQL coverage is mandatory for PRs/tags."""
import json
import os

DATABASES = [
    {'image': 'mysql:8.0', 'series': '8.0.', 'family': 'mysql'},
    {'image': 'mariadb:10.6', 'series': '10.6.', 'family': 'mariadb'},
    {'image': 'mariadb:11.4', 'series': '11.4.', 'family': 'mariadb'},
]


def selection(event, ref_type):
    full = event == 'pull_request' or ref_type == 'tag'
    rows = [{'php': php, 'db': db} for php in ['8.2', '8.3'] for db in DATABASES]
    if not full:
        rows = [row for row in rows if row['php'] == '8.3' and row['db']['image'] == 'mariadb:10.6']
    return full, {'include': rows}


if __name__ == '__main__':
    full, matrix = selection(os.environ['CI_EVENT'], os.environ['CI_REF_TYPE'])
    with open(os.environ['GITHUB_OUTPUT'], 'a') as output:
        output.write('full=' + str(full).lower() + '\n')
        output.write('matrix=' + json.dumps(matrix, separators=(',', ':')) + '\n')

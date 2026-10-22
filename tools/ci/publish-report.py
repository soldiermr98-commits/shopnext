"""Publish bounded, credential-redacted CI diagnostics, never application files."""
import html
import os
from pathlib import Path
import re
import sys

ROOT = Path(__file__).resolve().parents[2]


def redact(text, values=()):
    for value in sorted(set(values), key=len, reverse=True):
        if len(value) >= 8:
            text = text.replace(value, '[REDACTED]')
    text = re.sub(r'(?i)(authorization\s*[:=]\s*)(?:bearer\s+|basic\s+)?[^\s,\"\']+', r'\1[REDACTED]', text)
    text = re.sub(r'(?i)((?:APP_KEY|DB_PASSWORD|[A-Z_]*(?:SECRET|TOKEN|PASSWORD|CREDENTIAL)[A-Z_]*)\s*[:=]\s*)[^\s,\"\']+', r'\1[REDACTED]', text)
    return re.sub(r'(https?://)[^\s/@]+:[^\s/@]+@', r'\1[REDACTED]@', text)


def secrets():
    values = [v for k, v in os.environ.items() if re.search(r'KEY|SECRET|TOKEN|PASSWORD|CREDENTIAL', k)]
    env = ROOT / 'backend/.env'
    if env.is_file():
        for line in env.read_text().splitlines():
            key, sep, value = line.partition('=')
            if sep and re.search(r'KEY|SECRET|TOKEN|PASSWORD|CREDENTIAL', key):
                values.append(value.strip().strip('\"\''))
    return values


def publish(path, label):
    if not path.is_file():
        return
    text = redact(path.read_text(errors='replace'), secrets())
    directory = ROOT / '.ci-reports'
    directory.mkdir(exist_ok=True)
    name = re.sub(r'[^a-zA-Z0-9_.-]', '-', label)
    (directory / (name + '.log')).write_text(text)
    summary = os.environ.get('GITHUB_STEP_SUMMARY')
    if summary:
        with open(summary, 'a') as out:
            out.write('\n### ' + name + '\n<pre>' + html.escape(text[-18000:]) + '</pre>\n')
    # Always begin the annotation on its own line, even for JSON without newline.
    message = text[-6000:].replace('%', '%25').replace('\r', '%0D').replace('\n', '%0A')
    print('\n::notice title=' + name + '::' + message)


if __name__ == '__main__':
    for filename in sys.argv[1:]:
        publish(Path(filename), Path(filename).stem)

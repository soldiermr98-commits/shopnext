"""Transport only the public Composer lock through bounded check annotations."""
import base64
import hashlib
from pathlib import Path
import sys
import zlib

# GitHub retains at most 10 notices per step and 4096 message characters.
# Call in three separate steps with offsets 0, 9 and 18; never emit application env.
data = Path('backend/composer.lock').read_bytes()
packed = base64.b64encode(zlib.compress(data)).decode()
parts = [packed[start:start + 4000] for start in range(0, len(packed), 4000)]
if len(parts) > 27:
    raise SystemExit('Public lock exceeds bounded annotation transport capacity')
offset = int(sys.argv[1])
if offset not in [0, 9, 18]:
    raise SystemExit('Invalid public lock offset')
if offset == 0:
    print('::notice title=lock-sha256::' + hashlib.sha256(data).hexdigest())
for index in range(offset, min(offset + 9, len(parts))):
    print(f'::notice title=lock-part-{index:03d}::' + parts[index])

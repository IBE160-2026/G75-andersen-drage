"""Print the Proxy's OpenAPI document as JSON (input for `npm run gen:api`)."""

import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.main import app  # noqa: E402

json.dump(app.openapi(), sys.stdout, indent=2, sort_keys=True)
sys.stdout.write("\n")

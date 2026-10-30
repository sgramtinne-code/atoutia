#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."

release_check_dir=$(mktemp -d)
trap 'rm -rf "$release_check_dir"' EXIT

gradle=(./gradlew --no-daemon --max-workers=2)

check_config() {
  python3 - "$1" "$2" <<'PY'
import json
import re
import sys
from pathlib import Path

source = Path("app/build/generated/source/buildConfig/release/tech/devoo/atoutia/BuildConfig.java").read_text()
def string_field(name):
    match = re.search(r'\b' + name + r'\s*=\s*("(?:[^"\\]|\\.)*")\s*;', source)
    assert match, name
    return json.loads(match.group(1))

assert string_field("ATOUTIA_API_BASE_URL") == sys.argv[1]
assert string_field("ATOUTIA_GOOGLE_CLIENT_ID") == sys.argv[2]
assert re.search(r'\bATOUTIA_TEST_AUTOPLAY_PLAYER_0\s*=\s*false\s*;', source)
print("Release BuildConfig: expected endpoint/client ID, autoplay disabled.")
PY
}

# Explicitly unconfigured online mode keeps the existing solo release available.
"${gradle[@]}" :app:generateReleaseBuildConfig \
  -PATOUTIA_RELEASE_API_BASE_URL= -PATOUTIA_GOOGLE_CLIENT_ID= \
  -PATOUTIA_TEST_AUTOPLAY_PLAYER_0=true
check_config "" ""

# Environment fallback; the optional trailing slash is normalized.
ATOUTIA_RELEASE_API_BASE_URL=https://environment.atoutia.test/ \
  "${gradle[@]}" :app:generateReleaseBuildConfig -PATOUTIA_GOOGLE_CLIENT_ID=
check_config https://environment.atoutia.test ""

for invalid in \
  'not-a-url' 'http://beta.atoutia.test' \
  'https://user:fixture@beta.atoutia.test' 'https://beta.atoutia.test/api' \
  'https://beta.atoutia.test/?token=fixture' 'https://beta.atoutia.test/#fragment' \
  'https://beta.atoutia.test:65536' ' https://beta.atoutia.test' '   '; do
  if "${gradle[@]}" :app:generateReleaseBuildConfig \
    "-PATOUTIA_RELEASE_API_BASE_URL=$invalid" >"$release_check_dir/rejected.log" 2>&1; then
    echo "Invalid release endpoint unexpectedly accepted."
    exit 1
  fi
  python3 - "$release_check_dir/rejected.log" <<'PY'
import sys
from pathlib import Path
assert "ATOUTIA_RELEASE_API_BASE_URL must be an HTTPS origin" in Path(sys.argv[1]).read_text()
PY
done

# A Gradle property takes precedence over the environment, and release ignores debug autoplay.
ATOUTIA_RELEASE_API_BASE_URL=https://environment.atoutia.test \
  "${gradle[@]}" :app:assembleRelease \
    -PATOUTIA_RELEASE_API_BASE_URL=https://beta.atoutia.test/ \
    -PATOUTIA_GOOGLE_CLIENT_ID=release-check.apps.googleusercontent.com \
    -PATOUTIA_TEST_AUTOPLAY_PLAYER_0=true
check_config https://beta.atoutia.test release-check.apps.googleusercontent.com

python3 - <<'PY'
from pathlib import Path
import xml.etree.ElementTree as ET

apk = Path("app/build/outputs/apk/release/app-release-unsigned.apk")
assert apk.is_file() and apk.stat().st_size > 0
manifests = list(Path("app/build/intermediates/merged_manifests/release").rglob("AndroidManifest.xml"))
assert len(manifests) == 1, manifests
application = ET.parse(manifests[0]).getroot().find("application")
android = "{http://schemas.android.com/apk/res/android}"
assert application.get(android + "usesCleartextTraffic") == "false"
assert application.get(android + "debuggable") != "true"
assert application.get(android + "allowBackup") == "false"
assert any(activity.get(android + "screenOrientation") == "sensorLandscape"
           for activity in application.findall("activity"))
print("Unsigned release APK compiled; cleartext/debug disabled, backup and landscape policies retained.")
PY

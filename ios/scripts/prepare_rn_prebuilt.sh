#!/bin/sh
# Swaps React Native's prebuilt frameworks (React core, its dependencies and
# Hermes) to the Debug or Release build *before* Xcode starts the build.
#
# Run as the scheme's build pre-action. React Native does the same swap in its
# own "[CP-User] Replace ... for the right configuration" build phases, but
# Xcode copies those xcframeworks (rsync) in parallel with that phase. On the
# first build after switching Debug <-> Release, the phase deletes and
# re-extracts React.xcframework while rsync is reading it, and the build fails
# with ~1,200 "rsync ... No such file or directory" errors. Swapping here first
# leaves the build phases nothing to do.
#
# Uses React Native's own scripts and versions, and is a no-op when the
# configuration has not changed. Never fails the build: if anything goes wrong
# the build phases still do the swap exactly as before.

LOG="${SRCROOT:-.}/build/prepare_rn_prebuilt.log"
mkdir -p "$(dirname "$LOG")"
exec >"$LOG" 2>&1

PODS_ROOT="${PODS_ROOT:-${SRCROOT}/Pods}"
RN_PATH="${SRCROOT}/../node_modules/react-native"

# Same Debug/Release test React Native's build phases use.
CONFIG="Release"
if echo "${GCC_PREPROCESSOR_DEFINITIONS:-}" | grep -q "DEBUG=1"; then
  CONFIG="Debug"
fi
echo "Configuration: ${CONFIGURATION:-?} -> ${CONFIG}"

# NODE_BINARY, as the build phases find it.
. "$RN_PATH/scripts/xcode/with-environment.sh"

RN_VERSION=$("$NODE_BINARY" -p "require('$RN_PATH/package.json').version") || exit 0
HERMES_VERSION=$(sed -n 's/^  - hermes-engine (\(.*\)):$/\1/p' "${SRCROOT}/Podfile.lock" | head -1)

# The scripts resolve their marker files relative to the Pods folder.
cd "$PODS_ROOT" || exit 0

"$NODE_BINARY" "$RN_PATH/scripts/replace-rncore-version.js" -c "$CONFIG" -r "$RN_VERSION" -p "$PODS_ROOT"
"$NODE_BINARY" "$RN_PATH/third-party-podspecs/replace_dependencies_version.js" -c "$CONFIG" -r "$RN_VERSION" -p "$PODS_ROOT"
if [ -n "$HERMES_VERSION" ]; then
  "$NODE_BINARY" "$RN_PATH/sdks/hermes-engine/utils/replace_hermes_version.js" -c "$CONFIG" -r "$HERMES_VERSION" -p "$PODS_ROOT"
fi

exit 0

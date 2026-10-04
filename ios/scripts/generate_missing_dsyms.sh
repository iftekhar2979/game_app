#!/bin/bash
set -e

# Only generate dSYMs during Release builds or when forced
if [ "${CONFIGURATION}" != "Release" ] && [ -z "${FORCE_DSYM_GEN}" ]; then
  echo "Skipping dSYM generation for non-Release configuration (${CONFIGURATION:-Debug})"
  exit 0
fi

DSYM_DIR="${DWARF_DSYM_FOLDER_PATH}"
if [ -z "${DSYM_DIR}" ]; then
  echo "DWARF_DSYM_FOLDER_PATH is not set, skipping."
  exit 0
fi

echo "Checking / generating missing framework dSYMs in ${DSYM_DIR}..."
mkdir -p "${DSYM_DIR}"

FRAMEWORKS_DIR="${TARGET_BUILD_DIR}/${FRAMEWORKS_FOLDER_PATH}"

FRAMEWORKS=("React" "ReactNativeDependencies" "hermesvm")

for fw in "${FRAMEWORKS[@]}"; do
  FW_BIN="${FRAMEWORKS_DIR}/${fw}.framework/${fw}"
  DSYM_OUT="${DSYM_DIR}/${fw}.framework.dSYM"

  # Fallback to Pods directory if not found in TARGET_BUILD_DIR
  if [ ! -f "${FW_BIN}" ]; then
    if [ "${fw}" = "React" ]; then
      FW_BIN="${PODS_ROOT}/React-Core-prebuilt/React.xcframework/ios-arm64/React.framework/React"
    elif [ "${fw}" = "ReactNativeDependencies" ]; then
      FW_BIN="${PODS_ROOT}/ReactNativeDependencies/framework/packages/react-native/ReactNativeDependencies.xcframework/ios-arm64/ReactNativeDependencies.framework/ReactNativeDependencies"
    elif [ "${fw}" = "hermesvm" ]; then
      FW_BIN="${PODS_ROOT}/hermes-engine/destroot/Library/Frameworks/universal/hermesvm.xcframework/ios-arm64/hermesvm.framework/hermesvm"
    fi
  fi

  if [ -f "${FW_BIN}" ]; then
    if [ ! -d "${DSYM_OUT}" ]; then
      echo "Generating dSYM for ${fw} from ${FW_BIN} -> ${DSYM_OUT}..."
      dsymutil "${FW_BIN}" -o "${DSYM_OUT}" || echo "Warning: dsymutil failed for ${fw}"
    else
      echo "dSYM for ${fw} already exists in ${DSYM_OUT}"
    fi
  else
    echo "Notice: Framework binary not found for ${fw}, skipping."
  fi
done

echo "dSYM generation check completed."

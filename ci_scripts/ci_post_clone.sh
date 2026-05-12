#!/bin/sh
set -e

# Xcode Cloud workflow is configured with path "ios/App/App.xcodeproj" (repo root),
# but the actual iOS project lives under apps/web/ios/. Create a symlink so
# Xcode Cloud can resolve the project path without changing the workflow config.
ln -sfn "${CI_PRIMARY_REPOSITORY_PATH}/apps/web/ios" "${CI_PRIMARY_REPOSITORY_PATH}/ios"

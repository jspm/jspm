#!/usr/bin/env bash
# Spits out the behaviour of npm in various version resolution scenarios.
set -e

function get_version() {
  package_name=$1
  echo $(jq -r ".packages.\"node_modules/$package_name\".version" package-lock.json)
}

function get_range() {
  package_name=$1
  echo $(jq -r ".dependencies.\"${package_name}\"" package.json)
}

function test_command() {
  cmd=$1
  tests=(
    "primary-in-range"
    "primary-out-range"
    "secondary-in-range"
    "secondary-out-range"
    "primary-not-latest-secondary-in-range"
    "primary-not-latest-secondary-out-range"
  )

  for test in "${tests[@]}"
  do
    cp "${test}/package.json" package.json.bkp
    cp "${test}/package-lock.json" package-lock.json.bkp
    cp "${test}/importmap.json" importmap.json.bkp

    cd "${test}"
    primary="wayfarer"
    primary_range=$(get_range "${primary}")
    primary_preversion=$(get_version "${primary}")
    secondary="xtend"
    secondary_range="^4.0.1"
    secondary_preversion=$(get_version "${secondary}")

    echo "Running \"npm ${@}\" in ${test}:"
    npm "${@}" 2>&1 1>/dev/null

    primary_postversion=$(get_version "${primary}")
    secondary_postversion=$(get_version "${secondary}")
    echo "   range (pr): ${primary_range}"
    echo "  before (pr): ${primary}@${primary_preversion}"
    echo "   after (pr): ${primary}@${primary_postversion}"
    echo "   range (sn): ${secondary_range}"
    echo "  before (sn): ${secondary}@${secondary_preversion}"
    echo "   after (sn): ${secondary}@${secondary_postversion}"
    cd - 2>&1 1>/dev/null
  
    rm -r "${test}/"
    mkdir "${test}"
    mv package.json.bkp "${test}/package.json"
    mv package-lock.json.bkp "${test}/package-lock.json"
    mv importmap.json.bkp "${test}/importmap.json"
  done
  echo
}

cd $(dirname "$0")
test_command install wayfarer
test_command install
test_command update wayfarer
test_command update

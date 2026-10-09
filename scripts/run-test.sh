#!/bin/bash

# select_project.sh 파일을 불러와서 프로젝트 선택
source $(dirname "$0")/select-project.sh

# NestJS 12 는 ESM 전용으로 배포된다. CJS 인 이 앱의 jest 가 그것을 require(esm) 으로
# 부르려면 Node 24.9+ 와 --experimental-vm-modules 가 필요하다
# (https://jestjs.io/docs/ecmascript-modules#require-of-esm). 실험 경고는 워커마다 찍혀 끈다.
export NODE_OPTIONS="${NODE_OPTIONS:+$NODE_OPTIONS }--experimental-vm-modules --no-warnings=ExperimentalWarning"

# 명령어에 따라 선택된 프로젝트에서 테스트 실행
COMMAND=$1

if [[ -z "$COMMAND" ]]; then
  echo "테스트 명령어를 입력해주세요 (test, watch, cov, e2e, integration, debug)."
  exit 1
fi

# 선택된 프로젝트에 맞는 테스트 명령어 실행
case "$COMMAND" in
  test)
    if [[ ! -f "apps/$SELECTED_PROJECT/jest.config.js" ]]; then
      echo "jest.config.js not found for $SELECTED_PROJECT, skipping tests"
      exit 0
    fi
    echo "jest --config apps/$SELECTED_PROJECT/jest.config.js"
    jest --config "apps/$SELECTED_PROJECT/jest.config.js"
    ;;
  watch)
    echo "NODE_ENV=test_automation jest --watch --config apps/$SELECTED_PROJECT/jest.config.js"
    NODE_ENV=test_automation jest --watch --config "apps/$SELECTED_PROJECT/jest.config.js"
    ;;
  cov)
    echo "NODE_ENV=test_automation jest --coverage --config apps/$SELECTED_PROJECT/jest.config.js"
    NODE_ENV=test_automation jest --coverage --config "apps/$SELECTED_PROJECT/jest.config.js"
    ;;
  e2e)
    echo "NODE_ENV=test_automation jest --config apps/$SELECTED_PROJECT/test/jest-e2e.json"
    NODE_ENV=test_automation jest --config "apps/$SELECTED_PROJECT/test/jest-e2e.json"
    ;;
  integration)
    echo "NODE_ENV=test_automation jest --config apps/$SELECTED_PROJECT/test/jest-integration.json"
    NODE_ENV=test_automation jest --config "apps/$SELECTED_PROJECT/test/jest-integration.json"
    ;;
  debug)
    echo "NODE_ENV=test_automation node --inspect-brk -r tsconfig-paths/register -r ts-node/register node_modules/.bin/jest --runInBand --config apps/$SELECTED_PROJECT/jest.config.js"
    NODE_ENV=test_automation node --inspect-brk -r tsconfig-paths/register -r ts-node/register node_modules/.bin/jest --runInBand --config "apps/$SELECTED_PROJECT/jest.config.js"
    ;;
  *)
    echo "알 수 없는 명령어입니다: $COMMAND"
    exit 1
    ;;
esac
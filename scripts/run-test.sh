#!/bin/bash

# select_project.sh 파일을 불러와서 프로젝트 선택
source $(dirname "$0")/select-project.sh

# 명령어에 따라 선택된 프로젝트에서 테스트 실행
COMMAND=$1

if [[ -z "$COMMAND" ]]; then
  echo "테스트 명령어를 입력해주세요 (test, watch, cov, e2e, integration, debug)."
  exit 1
fi

# 선택된 프로젝트에 맞는 테스트 명령어 실행
case "$COMMAND" in
  test)
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
    echo "NODE_ENV=test_automation jest --config ./test/jest-e2e.json --rootDir apps/$SELECTED_PROJECT"
    NODE_ENV=test_automation jest --config "/test/jest-e2e.json" --rootDir "apps/$SELECTED_PROJECT"
    ;;
  integration)
    echo "NODE_ENV=test_automation jest --config apps/$SELECTED_PROJECT/test/jest-integration.json"
    NODE_ENV=test_automation jest --watch --config "apps/$SELECTED_PROJECT/test/jest-integration.json"   
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
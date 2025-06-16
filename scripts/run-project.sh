# scripts/run-project.sh
#!/bin/bash

# select_project.sh 파일을 불러와서 프로젝트 선택
source $(dirname "$0")/select-project.sh

# 명령어에 따라 선택된 프로젝트 실행
COMMAND=$1

if [[ -z "$COMMAND" ]]; then
  echo "명령어를 입력해주세요 (start, dev, debug, build)."
  exit 1
fi

# 선택된 프로젝트를 사용하여 명령어 실행
case "$COMMAND" in
  start)
    echo "nest start $SELECTED_PROJECT"
    nest start $SELECTED_PROJECT
    ;;
  dev)
    echo "nest start $SELECTED_PROJECT --watch"
    nest start $SELECTED_PROJECT --watch
    ;;
  debug)
    echo "nest start $SELECTED_PROJECT --debug --watch"
    nest start $SELECTED_PROJECT --debug --watch
    ;;
  build)
    echo "nest build $SELECTED_PROJECT"
    nest build $SELECTED_PROJECT
    ;;
  *)
    echo "알 수 없는 명령어입니다: $COMMAND"
    exit 1
    ;;
esac
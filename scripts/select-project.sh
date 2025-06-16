# scripts/select-project.sh
#!/bin/bash

# apps 폴더 안에 있는 프로젝트 목록을 불러오기
PROJECTS_PATH="$(dirname "$0")/../apps"  # 스크립트 위치 기준으로 apps 경로 설정
PROJECTS=$(ls -d $PROJECTS_PATH/*/ | xargs -n 1 basename)

# 사용자에게 프로젝트 선택 요청
echo "프로젝트 번호를 선택해주세요:"
select project in $PROJECTS; do
  if [[ -n "$project" ]]; then
    echo "선택된 프로젝트: $project"
    
    # 선택된 프로젝트 이름을 반환
    export SELECTED_PROJECT=$project  # 선택된 프로젝트를 환경 변수로 설정
    break
  else
    echo "유효한 선택이 아닙니다. 다시 선택해주세요."
  fi
done
# B4-1 Portfolio

모바일 우선으로 만든 학습용 개인 포트폴리오입니다. 별도 빌드 과정이나 외부 런타임 라이브러리 없이 HTML, CSS, JavaScript만 사용합니다.

현재 이름, 소개, 프로젝트, 연락처 문구는 실제 사용자 정보가 제공되기 전까지 명확한 임시 문구로 표시됩니다. GitHub 사용자 ID도 기본값을 두지 않으며, 설정 전에는 안내 상태를 보여 줍니다.

## 로컬 실행

```sh
make serve
```

브라우저에서 `http://localhost:4173`을 엽니다. 기본 점검은 `make check`로 실행합니다.

## 파일 구성

- `index.html`: 페이지 구조와 콘텐츠
- `css/style.css`: 반응형 레이아웃과 테마
- `js/main.js`: 메뉴, 스크롤, 테마, 양식, GitHub 저장소 표시
- `images/`: 제품 이미지 자산

GitHub Pages에 배포할 때 필요한 제품 파일은 `index.html`, `css/`, `js/`, `images/`입니다. `README.md`, `Makefile`, `.gitignore`는 개발과 저장소 사용을 위해 함께 관리하지만 배포 결과에는 필요하지 않습니다. 배포와 원격 Git 작업은 이 로컬 구현 범위에 포함되지 않습니다.

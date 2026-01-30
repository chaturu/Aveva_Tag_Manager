# Aveva Tag Manager Web App

이 프로젝트는 기존 Aveva Tag Manager의 기능을 웹 인터페이스로 옮겨온 버전입니다.
최신 웹 기술을 사용하여 브라우저에서 편리하게 태그 관리 기능을 사용할 수 있습니다.

- **Backend**: Python **FastAPI** (기존 파싱 로직 재사용)
- **Frontend**: React **Vite** + Tailwind CSS

## 사전 요구사항 (Prerequisites)

- Python 3.9 이상
- Node.js & npm (v18 이상)

## 설치 및 실행 방법 (Setup & Run)

### 1. 백엔드 (Backend) 실행

터미널을 열고 프로젝트 루트 폴더(`d:\05_python\aveva_tag_manager_web`)에서 다음 명령어를 실행하세요.

```powershell
# 필요한 파이썬 라이브러리 설치
pip install -r web_app/backend/requirements.txt

# 백엔드 서버 시작 (http://127.0.0.1:8000 에서 실행됨)
uvicorn web_app.backend.main:app --reload
```

### 2. 프론트엔드 (Frontend) 실행

**새로운 터미널 창**을 열고, 프론트엔드 폴더로 이동하여 실행하세요.

```powershell
cd web_app/frontend

# 패키지 설치 (최초 1회만 필요, 이미 설치되어 있을 수 있음)
npm install

# 프론트엔드 개발 서버 시작
npm run dev
```

### 3. 사용 방법 (Usage)

프론트엔드 터미널에 표시된 주소를 브라우저에 입력하여 접속하세요 (보통 **http://localhost:5173**).

1.  **File Upload**: Aveva Dump 파일(`.csv`)을 업로드합니다.
2.  **기능 탭**:
    -   **Extract Templates**: 원하는 템플릿들을 선택하여 `$Area`와 함께 추출합니다.
    -   **Extract Areas**: 특정 Area를 선택하여 해당 Area에 속한 모든 데이터를 추출합니다.
    -   **Extensions & PLC**: XML 확장 데이터를 분석하고, PLC 매트릭스(Tag x Attribute) 및 주소 맵(Address Map)을 추출/다운로드합니다.

## 배포 참고사항 (Vercel + Github)

이 구조는 Vercel과 같은 현대적인 웹 호스팅 서비스 배포에 적합하게 구성되었습니다.
-   **Frontend**: 정적 사이트(SPA)로 빌드하여 배포 가능.
-   **Backend**: Python 런타임을 지원하는 서버리스 환경이나 클라우드 서버에 배포 가능.

지금은 로컬 컴퓨터에서 위 1, 2번 단계를 따라 실행하시면 됩니다.

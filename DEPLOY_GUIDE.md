# Vercel Deployment Guide

이 문서는 Vercel과 GitHub을 연동하여 웹 애플리케이션을 배포하는 방법을 설명합니다.

## 1. 사전 준비 (Local Setup)

이미 완료된 사항들입니다:
- [x] **Backend**: 파일 저장소가 임시 폴더(`/tmp`)를 사용하도록 변경되었습니다.
- [x] **Config**: `vercel.json`이 생성되어 API와 Frontend 빌드를 연결합니다.
- [x] **Dependencies**: `requirements.txt`가 루트 경로에 준비되었습니다.

## 2. GitHub에 코드 푸시 (Push to GitHub)

현재 작업 중인 코드를 GitHub 저장소(Repository)에 올려야 합니다.

1.  GitHub에 로그인하고 **New Repository**를 생성합니다.
2.  이 프로젝트 폴더에서 git을 초기화하고 푸시합니다.

```bash
git init
git add .
git commit -m "Initial commit for Vercel deployment"
git branch -M main
git remote add origin https://github.com/chaturu/Aveva_Tag_Manager
git push -u origin main
```

## 3. Vercel에서 프로젝트 가져오기 (Import Project)

1.  [Vercel Dashboard](https://vercel.com/dashboard)에 접속하여 로그인합니다.
2.  **Add New... > Project**를 클릭합니다.
3.  **Import Git Repository** 목록에서 방금 푸시한 GitHub 저장소의 **Import** 버튼을 누릅니다.

## 4. 배포 설정 (Configure Project)

Import 화면에서 아래 설정을 확인합니다.

-   **Framework Preset**: `Vite` (프론트엔드가 Vite임을 자동으로 인식해야 합니다. 인식 못 하면 직접 선택)
-   **Root Directory**: `web_app/frontend` **(중요)**
    -   프론트엔드 코드가 `web_app/frontend`에 있으므로 `Edit` 버튼을 눌러 이 경로를 선택해주세요.
    -   하지만 `vercel.json` 설정이 최상위에 있으므로, **Root Directory를 변경하지 않고 기본값(./)으로 두는 것이 더 좋을 수 있습니다.**
    -   *권장 방법*: **Root Directory를 변경하지 마세요.** `vercel.json`이 빌드 설정을 담당합니다.

-   **Environment Variables**: 필요한 경우 설정 (현재 프로젝트는 특별한 환경변수가 필요 없습니다).

## 5. Deploy

**Deploy** 버튼을 누르면 배포가 시작됩니다.
-   Vercel이 Python 백엔드와 React 프론트엔드를 동시에 빌드합니다.
-   완료되면 제공되는 도메인(예: `your-project.vercel.app`)으로 접속할 수 있습니다.

## 6. 문제 해결 (Troubleshooting)

-   **Backend 404 Error**: `/api/...` 요청이 실패한다면 `vercel.json`의 `rewriteRoutes` 설정을 확인해야 합니다.
-   **Build Fail**: 로그를 확인하여 `requirements.txt` 패키지 설치 중 오류가 없는지 확인하세요.

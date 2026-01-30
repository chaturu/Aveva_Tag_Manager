---
name: aveva_csv_rules
description: AVEVA 태그 매니저 프로젝트에서 CSV 및 AVEVA 덤프 파일을 다룰 때 준수해야 할 규칙과 모범 사례입니다.
---

# AVEVA CSV 처리 규칙 (Aveva CSV Handling Rules)

이 프로젝트에서 CSV 파일(특히 AVEVA DB Dump 파일)을 읽거나 쓸 때, 데이터 무결성을 유지하고 호환성을 보장하기 위해 아래 규칙들을 반드시 준수해야 합니다.

## 1. 인코딩 (Encoding)
- **기본 인코딩**: AVEVA 덤프 파일은 대개 **UTF-16** (`utf-16` 또는 `utf-16-le`) 인코딩을 사용합니다.
- **규칙**:
    - 파일을 읽을 때: 기본적으로 `encoding='utf-16'`을 시도해야 합니다. 실패 시 `utf-8` 등을 고려할 수 있지만, AVEVA 원본 파일은 UTF-16일 확률이 매우 높습니다.
    - 파일을 쓸 때: 원본 형식을 유지하기 위해 `encoding='utf-16'`을 사용해야 합니다.

## 2. 파일 열기 및 쓰기 (File I/O)
- **Newline 처리**: Python의 `csv` 모듈을 사용할 때는 반드시 파일을 열 때 `newline=''` 옵션을 사용해야 합니다.
  ```python
  # 올바른 예시
  with open(filepath, 'w', encoding='utf-16', newline='') as f:
      writer = csv.writer(f)
  ```
  이를 지키지 않으면 윈도우 환경에서 줄바꿈이 두 번(`\r\r\n`) 발생하거나 포맷이 깨질 수 있습니다.

## 3. 파싱 라이브러리 사용 (Parsing Library)
- **단순 split 지양**: 쉼표(`,`)로 데이터를 나눌 때 문자열의 `.split(',')` 메서드를 사용하지 마세요. 데이터 값 안에 쉼표가 포함된 경우(예: 설명 필드) 오동작합니다.
- **필수 라이브러리**: 반드시 Python 내장 **`csv` 모듈** 또는 **`pandas`**를 사용해야 합니다.
  - `csv` 모듈: 스트리밍 처리가 필요하거나 가볍게 처리할 때.
  - `pandas`: 데이터 분석이나 대량의 데이터를 메모리에 올려서 처리할 때.

## 4. AVEVA 덤프 파일 구조 특이사항 처리
AVEVA 덤프 파일은 표준 CSV와 다른 몇 가지 특징이 있습니다.
- **템플릿 섹션**: 파일은 `:TEMPLATE=$Area`와 같이 템플릿 정의로 섹션이 나뉩니다.
- **헤더의 콜론(`:`)**: 헤더 라인의 첫 번째 컬럼(보통 `Tagname`)은 주로 `:Tagname`과 같이 콜론으로 시작합니다.
  - **규칙**: 헤더를 파싱할 때 첫 번째 컬럼의 앞쪽 콜론을 제거(`lstrip(':')`)하여 표준화해야 합니다.
- **메타데이터 보존**: 파일 상단의 주석이나 `:TEMPLATE` 라인 등은 데이터를 수정해서 다시 저장할 때도 **반드시 그대로 유지**되어야 합니다.

## 5. 코드 작성 예시

### 읽기 (Reading)
```python
import csv

def read_aveva_csv(filepath):
    with open(filepath, 'r', encoding='utf-16') as f:
        # csv.reader 사용 권장
        reader = csv.reader(f)
        for row in reader:
            # 로직 처리
            pass
```

### 쓰기 (Writing)
```python
import csv

def write_aveva_csv(filepath, data):
    with open(filepath, 'w', encoding='utf-16', newline='') as f:
        writer = csv.writer(f)
        writer.writerows(data)
```

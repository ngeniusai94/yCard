# CardInsight MVP — 제품 요구사항 정의서 (PRD) & UI/UX 디자인 가이드

| 항목 | 내용 |
|---|---|
| 제품명 (가칭) | **CardInsight** — 카드 혜택 정보 관리 |
| 문서 버전 | v1.2 (MVP, 챗봇 제외, 온디바이스 OCR + 텍스트 AI 질의) |
| 작성일 | 2026-08-22 (v1.2 개정 2026-08-31) |
| 대상 플랫폼 | 1차: 모바일 웹 (HTML/JS + Tailwind, Vercel) → 2차: Cordova (iOS/Android) |
| 제품 성격 | **등록된 카드의 혜택·실적 정보를 모아 보여주는 유틸리티 앱** |

관련 시안: [designs/index.html](./designs/index.html)

---

## 0. 제품 한 줄 정의

실물 카드를 촬영/업로드하면, **기기 안에서 OCR로 카드사·카드명만 읽어내고**, 그 텍스트만 AI에게 물어 혜택 정보를 받아와 **내 카드 목록에서 확인·관리**하는 서비스.

대화형 질의응답은 없다. AI는 **텍스트(카드사+카드명) → 혜택 JSON** 변환에만 쓰인다.

### 0.1 이미지를 AI에 보내지 않는 이유

이미지를 Vision 모델에 직접 보내면 이미지 토큰 소모가 커서 무료 플랜으로 운영할 수 없다.  
그래서 **이미지 판독은 기기(브라우저 OCR)에서 무료로 처리**하고, AI에는 짧은 텍스트만 보낸다.

| 구분 | 서버로 전송 | 비용 |
|---|---|---|
| 카드 이미지 | **전송하지 않음** (기기 안에서만 처리) | 0 |
| 카드사·카드명 텍스트 | 전송 | 텍스트 토큰 소량 |

---

## 1. 배경과 목표

### 1.1 문제

- 카드마다 할인/적립, 전월실적, 한도가 달라 비교가 번거로움
- 앱·홈페이지를 일일이 열지 않고, 사진만으로 혜택을 정리하고 싶음

### 1.2 MVP 목표

1. 카메라/갤러리로 카드 이미지를 등록한다.
2. 기기 안 OCR로 **카드사·카드명**을 읽어내고, 사용자가 확인·수정한다.
3. 그 텍스트만 AI에 보내 혜택 **구조화 JSON**을 받아온다.
4. 사용자가 결과를 확인한 뒤 **내 카드**에 저장한다.
5. 대시보드에서 카드별 혜택 요약을 보고, 상세에서 전체 정보를 본다.
6. 웹에서 핵심 플로우를 검증한 뒤 Cordova로 패키징한다.

### 1.3 비목표 (MVP 제외)

- AI 챗봇, 자연어 질의응답, 대화 히스토리
- “오늘 어디 카드를 쓸까” 추천 대화
- 카드사 로그인/스크래핑, 실시간 결제 연동
- 카드 발급 제휴, 광고 피드
- 회원가입 필수화 (1차는 로컬 저장)
- 카드번호 전체·CVC·유효기간 수집 (금지)

---

## 2. 사용자와 핵심 시나리오

### 2.1 페르소나

| 페르소나 | 니즈 |
|---|---|
| 혜택 정리형 (주 타깃) | 카드 2~5장의 혜택·실적을 한 화면에 모아 보고 싶음 |
| 신규 등록형 | 새 카드/안내문을 찍어 정보를 자동으로 채우고 싶음 |

### 2.2 Happy Path

```
앱 실행
  → 내 카드 (빈 상태: Empty State)
  → [카드 등록] 또는 하단 카메라 버튼
  → 촬영 / 갤러리 선택
  → 미리보기 표시 + 기기 안 OCR (카드사·카드명만 추출)
  → 추출된 카드사·카드명 확인/수정
  → 텍스트만 AI에 전송 → 혜택 JSON 수신 (로딩)
  → 혜택 확인
  → 내 카드에 저장
  → 대시보드 리치 카드 표시
  → 카드 탭 → 상세 정보 열람
```

### 2.3 심사 대응 (Apple Guideline 4.2)

메인이 **카드 목록/상세/수정/삭제**인 일반 유틸리티 앱이다.  
AI는 등록을 돕는 부가 수단이며, 오프라인에서도 저장된 카드 정보를 볼 수 있다.

스토어 스크린샷 1번은 반드시 **카드가 채워진 대시보드**로 둔다.

---

## 3. 릴리스 전략 (Web → Cordova)

UI는 동일하게 두고, **이미지 입력·권한만 어댑터로 교체**한다.

```
┌─────────────────────────────────────────┐
│  UI (HTML + Tailwind + Vanilla JS)      │
├─────────────────────────────────────────┤
│  domain/  cardStore                     │
├─────────────────────────────────────────┤
│  adapter/                               │
│   web:     <input type=file>, fetch     │
│   cordova: Camera, Diagnostic           │
└─────────────────────────────────────────┘
```

| Phase | 산출물 | 검증 포인트 |
|---|---|---|
| **P0 웹 MVP** | HTML/JS, Vercel | 업로드, AI 분석, 목록/상세/수정/삭제, 에러 UX |
| **P1 Cordova** | 카메라 플러그인 | 권한, 촬영/앨범, Safe Area, 백버튼 |
| **P2 스토어** | iOS/Android 패키징 | 4.2, 프라이버시, 오프라인 목록 |

| 기능 | 웹 (Vercel) | Cordova |
|---|---|---|
| 이미지 선택 | `<input type="file" accept="image/*">` | `navigator.camera.getPicture` |
| 권한 | 브라우저 안내 | `cordova-plugin-diagnostic` + 설정 이동 |
| 저장 | `localStorage` / IndexedDB | 동일 (WebView) |
| 네트워크 | `fetch` + AbortController | 동일 |

---

## 4. 핵심 기능 정의

### 4.1 내 카드 대시보드 (유일 메인 화면)

**목적:** 등록된 카드의 혜택·실적 요약을 한눈에 제공한다.

#### 화면 구성

1. **헤더**
   - 타이틀: `내 카드`
   - 우측: 카드 등록(`+`), 설정(톱니)
2. **요약 스트립** (1장 이상)
   - 등록 카드 수
   - 예: `등록 3장 · 주유·카페·쇼핑 혜택`
3. **리치 카드 리스트** (세로 스택)
4. **Empty State** (0장)
   - `첫 카드를 등록하고 혜택을 정리해 보세요`
   - Primary: `카드 촬영하기` / Secondary: `앨범에서 선택`

#### 리치 카드 필드

| 필드 | 설명 | 표시 |
|---|---|---|
| `cardName` | 카드명 | 18–20px Bold |
| `cardCompany` | 카드사 | 서브텍스트 |
| `cardType` | CREDIT / CHECK | 배지 |
| `performance` | 전월실적 | 실적 배지 |
| `topBenefits[]` | 상위 3개 혜택 | 컬러 태그 |
| `updatedAt` | 등록/수정일 | 상대시간 |

#### 카드 상세

- 기본 정보, 혜택 전체, 전월실적/한도/유의사항
- 액션: `수정` `다시 분석` `삭제`
- 삭제는 확인 다이얼로그 필수
- `다시 분석`: 새 이미지를 올려 해당 카드를 갱신

#### 수용 기준 (AC)

- [ ] 0장이면 Empty State + 등록 CTA가 보인다.
- [ ] 저장 직후 목록 최상단에 새 카드가 나타난다.
- [ ] 새로고침 후에도 목록이 유지된다.
- [ ] 상세에서 삭제하면 목록에서 즉시 제거된다.
- [ ] 오프라인에서도 목록/상세를 볼 수 있다.

---

### 4.2 카메라 / 갤러리

**목적:** 실물 카드 또는 혜택 캡처본을 입력한다.

#### 진입점 (동작 동일)

1. 헤더 `+`
2. Empty State CTA
3. 하단 **카메라 버튼**

탭 시 액션시트: `사진 촬영` / `앨범에서 선택` / `취소`

#### 웹

```js
<input type="file" accept="image/*" capture="environment" />  // 촬영
<input type="file" accept="image/*" />                       // 앨범
```

허용: `image/jpeg`, `image/png`, `image/webp`, `image/heic`(지원 시)  
그 외: `이미지 파일만 선택할 수 있어요`

#### Cordova (P1)

| 항목 | 값 |
|---|---|
| Plugin | `cordova-plugin-camera` |
| Quality | `70` |
| Encoding | JPEG |
| CorrectOrientation | `true` |
| AllowEdit | `false` |
| CameraDirection | BACK |

권한: `cordova-plugin-diagnostic`  
설정 이동: `switchToSettings()`

#### 촬영 가이드 카피

- `카드 앞면 또는 혜택 안내가 보이게 찍어 주세요`
- `글자가 흐리면 인식이 어려워요`
- `카드번호 전체가 보이지 않게 가려도 됩니다`

---

### 4.3 이미지 처리 (미리보기 전용) + 온디바이스 OCR

이미지는 **서버로 전송하지 않는다.** 화면 표시용 축소본과 OCR용 렌더링을 따로 만든다.

```
원본 File/URI
  ├─ 미리보기용: EXIF 보정 → 리사이즈(긴 변 768px) → JPEG 0.72
  │             → 목표 ≤ 400KB, 상한 800KB, 초과 시 0.6 → 0.5 재압축
  │             → 구현: utils/imageOptimizer.js
  │             → 출력: { previewDataUrl, byteSize, mimeType, width, height }
  │
  └─ OCR용: 원본에서 다시 렌더 (긴 변 1400px)
            → 그레이스케일 + 대비 1.35 보정
            → 0° / 90° / 270° 회전본 순차 인식 (세로 인쇄 대응)
            → 구현: utils/cardOcr.js (Tesseract.js, 언어 kor+eng)
```

| 항목 | 값 |
|---|---|
| OCR 엔진 | Tesseract.js v6 (CDN 동적 import, 브라우저 WASM) |
| 페이지 분할 모드 | 11 (Sparse Text — 카드 디자인은 문단이 아니라 흩어진 문구) |
| 회전 시도 | 0° → 90° → 270°, 신뢰도 0.7 이상이면 조기 종료 |
| 원본 보관 | 하지 않음 |
| 서버 전송 | **하지 않음** |

#### OCR 텍스트 파싱 (`utils/cardTextParser.js`)

| 단계 | 처리 |
|---|---|
| 민감 줄 제거 | 카드번호 그룹, `MM/YY`, `VALID THRU`, `CVC/CVV` 패턴이 있는 줄 제외 |
| 카드사 판정 | `constants/cardCompanies.js` 별칭 딕셔너리와 매칭. 정확 일치 실패 시 편집거리 기반 유사매칭 (세로 인쇄는 글자가 끊겨 오인식이 잦음) |
| 카드명 판정 | 남은 줄 중 한글·영문 글자 수로 점수화해 최상위 후보 선택 |
| 신뢰도 | 카드사·카드명 모두 찾으면 0.75+, 하나만 찾으면 0.3~0.55 |

카드번호 전체·CVC·유효기간은 **파싱 단계에서 버리며, 저장·전송·로그에 남기지 않는다.**

---

### 4.4 혜택 조회 API (텍스트 기반, Structured JSON)

**역할:** 카드사·카드명 텍스트를 혜택 JSON으로 변환한다. 이미지도, 대화 API도 없다.

#### 요청

```
POST /api/analyze-card
Content-Type: application/json

{
  "cardCompany": "BNK부산은행",
  "cardName": "오늘은e",
  "locale": "ko-KR"
}
```

- API 키는 Vercel Serverless에만 보관
- 모델: 텍스트 전용 경량 모델 (1차 실패 시 1회 폴백)
- Timeout **40초**
- 네트워크/5xx만 **1회** 재시도, 4xx는 재시도 없음
- 프롬프트 필수 지시
  - 입력값은 OCR 결과라 **오타·오인식이 있을 수 있으니 비슷한 실제 카드로 보정**해서 판단하고, 응답에는 보정된 정확한 이름을 담을 것
  - 혜택은 카테고리별로 **최소 3개, 최대 8개**까지 채울 것 (실제 혜택이 적은 카드는 그만큼만)
  - URL은 채우지 말 것 — 링크는 서버가 딕셔너리로 채운다

#### 응답 스키마

```json
{
  "ok": true,
  "confidence": 0.86,
  "card": {
    "cardName": "신한 Deep Oil",
    "cardCompany": "신한카드",
    "cardType": "CREDIT",
    "binHint": null,
    "performance": {
      "previousMonthSpend": 300000,
      "note": "전월실적 30만원 이상"
    },
    "benefits": [
      {
        "category": "주유",
        "title": "주유 리터당 60원 할인",
        "rateOrAmount": "60원/L",
        "condition": "전월실적 30만원",
        "limit": "월 최대 2만원",
        "type": "DISCOUNT"
      }
    ],
    "cautions": ["일부 주유소 제외"],
    "rawSummary": "주유 할인 중심 신용카드"
  },
  "warnings": []
}
```

응답의 링크 필드는 **AI가 아니라 서버가** `constants/cardCompanies.js` 딕셔너리로 채운다 (AI URL 환각 방지).

| 필드 | 값 |
|---|---|
| `officialDetailUrl` | 카드사 대표 홈페이지 |
| `cardSearchUrl` | 카드사+카드명 검색 결과 페이지 (그 카드의 실제 정보) |

**저장 금지:** 카드번호 전체, CVC, 유효기간, 주민번호, 서명  
`confidence < 0.45` 이거나 `cardName` 공백 → 식별 불가

#### 확인/수정 화면 (AI 호출 전 필수)

OCR 결과를 사용자가 고친 뒤 AI에 보낸다. **AI 호출 1회를 아끼는 지점이기도 하다.**

- 카드사, 카드명 (OCR 추출값 기본 입력, 편집 가능)
- Primary: `혜택 보기` → 텍스트만 전송
- Secondary: `다시 촬영 / 선택`

OCR 실패 시에도 입력창은 그대로 열려 있어, 사용자가 **직접 입력**해서 진행할 수 있다.

---

## 5. 예외 처리 · 에러 핸들링

토스트 4초, 중요 오류는 모달. 복구 CTA를 항상 넣는다.

### 5.1 권한 거부

| 단계 | UX |
|---|---|
| 거부 | `사진으로 카드를 등록하려면 권한이 필요해요` + `설정으로 이동` / `닫기` |
| 웹 | `주소창 자물쇠 → 카메라 허용` 안내 |
| Cordova | `switchToSettings()` |
| 재시도 | 네이티브 팝업 반복 금지, 설정 모달만 |

### 5.2 식별 불가

**OCR 단계** — 카드사·카드명 둘 다 못 읽음

- 모달을 띄우지 않는다. 확인 화면의 안내 문구만 바꾸고 입력창을 그대로 열어 둔다.
- 문구: `카드사·카드명을 읽지 못했어요. 직접 입력해 주세요.`
- OCR 자체가 실패(엔진 로드 실패 등)하면: `글자를 읽지 못했어요. 직접 입력해 주세요.`

**AI 단계** — `ok=false` / `confidence < 0.45` / `cardName` 없음

- 제목: `카드를 찾지 못했어요`
- 본문: `카드사와 카드명을 다시 확인하고 입력해 주세요.`

### 5.3 네트워크 · Timeout · 5xx

| 케이스 | 메시지 | 동작 |
|---|---|---|
| 오프라인 | `인터넷 연결을 확인해 주세요` | 목록/상세는 열람, 혜택 조회만 비활성 |
| Timeout (40s) | `분석이 지연되고 있어요` | 입력값 유지 + `다시 시도` |
| 5xx | `잠시 후 다시 시도해 주세요` | 1회 자동 재시도 후 수동 |
| 429 | `요청이 많아요` | 재시도 버튼 8초 딜레이 |
| 4xx | `사진을 다시 올려 주세요` | 이미지 재선택 |
| 사용자가 취소 | 토스트 없이 닫기 | — |

로딩: 스피너 + `혜택을 찾고 있어요` + `취소`  
OCR 진행 중에는 전체 화면 딤을 쓰지 않고, 확인 화면 안에서 `글자를 읽고 있어요…`로 표시한다.

### 5.4 기타

| 케이스 | 처리 |
|---|---|
| 저장 공간 부족 | `기기에 공간이 부족해요` |
| 카드 30장 초과 | `최대 30장까지 등록할 수 있어요` |
| 같은 카드명 | 저장 허용, 목록에서 구분 표시 |
| 서버 키 오류 | 키 언급 없이 일반 장애 메시지 |

---

## 6. 정보 구조 (IA)

하단 탭/챗 화면은 없다. 단일 스택 + 등록 액션이다.

```
#/                  내 카드 대시보드
#/cards/:id         카드 상세
#/cards/:id/edit    카드 수정
#/analyze/preview   미리보기 + 분석 진행
#/analyze/confirm   결과 확인/수정
#/analyze/manual    직접 입력
#/settings          설정
```

하단: **카메라 등록 버튼만** (탭 전환 없음)

---

## 7. UI/UX 디자인 가이드

### 7.1 컨셉

토스 스타일: 여백, 큰 타이포, 명확한 CTA.  
WebView 기준 터치 44px, Safe Area, 스크롤은 본문만.

챗봇 말풍선·입력창·유저/AI 버블은 **사용하지 않는다.**

### 7.2 컬러 (tweakcn Omegon)

공식 테마: [Omegon](https://tweakcn.com/themes/cmnkz43lg000004k3b236fakp)  
토큰 파일: `designs/omegon-theme.css`  
메인 시안은 **Light only**. Dark는 사용하지 않는다.  
토스와 겹치지 않도록 **primary=민트, secondary=인디고** 로 역할을 바꿨다.

| 토큰 | Light (oklch) | 용도 |
|---|---|---|
| `--background` | `0.9838 0.0035 247.86` | 앱 배경 |
| `--card` | `1 0 0` | 카드, 헤더 |
| `--foreground` | `0.2064 0.0388 265.55` | 본문 |
| `--muted-foreground` | `0.5547 0.0407 257.44` | 보조 텍스트 |
| `--primary` | `0.6727 0.1333 166.27` | CTA · 메인 (민트) |
| `--secondary` | `0.5449 0.2154 262.74` | 배지 · 보조 (인디고) |
| `--border` | `0.9290 0.0126 255.53` | 구분선 |
| `--radius` | `0.5rem` | 버튼·카드 코너 |
| `--font-sans` | Inter | 본문 폰트 |

### 7.3 타이포 · 간격

| 용도 | 크기 / 굵기 |
|---|---|
| 화면 타이틀 | 20px / 700 |
| 카드명 | 18–20px / 700 |
| 본문 | 15–16px / 500 |
| 태그/배지 | 12px / 600 |

- 패딩 `px-5`, 카드 간격 `gap-3`
- 리치카드 `rounded-2xl`, 버튼 `rounded-xl`, 칩 `rounded-full`
- 섀도우 `0 4px 16px rgba(25,31,40,0.06)`

### 7.4 레이아웃

```
┌──────────────────────────────────┐
│ Safe Area + Header 56px          │
│  내 카드                    [+][⚙]│
├──────────────────────────────────┤
│                                  │
│  요약 스트립                      │
│  RichCard                        │
│  RichCard                        │
│  ...                             │
│                                  │
├──────────────────────────────────┤
│  [ 카메라로 카드 등록 ]  52~56px  │
│  Safe Area inset-bottom          │
└──────────────────────────────────┘
```

하단은 탭바가 아니라 **단일 Primary 액션 바**다.  
상세/설정에서는 하단 등록 바를 숨기고 헤더 뒤로가기를 쓴다.

### 7.5 컴포넌트

#### Header

- 높이 56px, 흰 배경
- 대시보드: 뒤로가기 없음
- 상세/설정/분석: 뒤로가기 표시
- 아이콘 터치 44×44

#### RichCard

```
[신한카드 · 신용          실적 30만]
딥오일
[주유 할인] [커피 10%] [+2]

업데이트 방금
```

탭 → 상세. 스와이프 삭제는 하지 않는다.

#### BenefitTag / PerformanceBadge

- `DISCOUNT` 블루, `POINT`/`CASHBACK` 퍼플
- 카드당 태그 최대 3개, 나머지 `+N`
- 실적 없으면 `실적 없음` 슬레이트 배지

#### PrimaryButton

- 높이 52px, 풀폭, `rounded-xl`, `#3182F6`, 흰 글자 16/700
- disabled `#B3D4FF`

#### ConfirmForm (분석 결과)

- 라벨 + 인풋 스택
- 혜택은 행 추가/삭제
- 하단 고정 `내 카드에 저장`

### 7.6 상태 UI

| 상태 | UI |
|---|---|
| OCR 중 | 확인 화면 안 인라인 문구 `글자를 읽고 있어요…` (딤 없음) |
| 혜택 조회 중 | 딤 + `혜택을 찾고 있어요` + `취소` |
| 빈 목록 | Empty + 촬영/앨범 CTA |
| 오프라인 | 상단 배너 `오프라인 · 저장된 카드만 볼 수 있어요` |

---

## 8. 프론트엔드 파일 구조

```
yCard/
├── PRD.md
├── designs/                   # 정적 시안 (기능 없음)
│   ├── index.html
│   ├── EmptyDashboard.html
│   ├── CardListDashboard.html
│   ├── AnalyzeConfirm.html
│   └── CardDetail.html
├── index.html                 # 이후 구현
├── css/app.css
├── js/
│   ├── main.js
│   ├── router.js
│   ├── api/analyzeCard.js         # 텍스트(카드사+카드명) 전송
│   ├── adapters/imageInput.js
│   ├── adapters/permissions.js
│   ├── constants/cardCompanies.js # 카드사 별칭·홈페이지·검색링크 (서버와 공유)
│   ├── store/cardStore.js
│   ├── utils/cardOcr.js           # 브라우저 OCR (Tesseract.js, 회전·전처리)
│   ├── utils/cardTextParser.js    # OCR 원문 → 카드사·카드명
│   ├── utils/imageOptimizer.js    # 미리보기 축소 전용
│   ├── utils/format.js
│   ├── utils/errorMap.js
│   └── components/
│       ├── Header.js
│       ├── BottomActionBar.js
│       ├── RichCard.js
│       ├── BenefitTag.js
│       ├── PerformanceBadge.js
│       ├── EmptyState.js
│       ├── ActionSheet.js
│       ├── ErrorModal.js
│       └── Toast.js
├── views/
│   ├── DashboardView.js
│   ├── CardDetailView.js
│   ├── CardEditView.js
│   ├── AnalyzePreviewView.js
│   ├── AnalyzeConfirmView.js
│   ├── ManualInputView.js
│   └── SettingsView.js
└── api/analyze-card.js            # 텍스트 → 혜택 JSON (이미지 수신 없음)
```

챗봇 관련 파일은 만들지 않는다.  
`api/analyze-card.js`는 `js/constants/cardCompanies.js`를 import해 카드사 링크를 채운다 (클라이언트·서버 공유 모듈).

### 8.1 cardStore 모델

```js
{
  id: "uuid",
  cardName: "",
  cardCompany: "",
  cardType: "CREDIT" | "CHECK" | "UNKNOWN",
  performance: { previousMonthSpend: 0, note: "" },
  benefits: [],
  cautions: [],
  confidence: 0,
  source: "OCR_AI" | "MANUAL",
  createdAt: 0,
  updatedAt: 0
}
```

카드 이미지·썸네일은 저장하지 않는다 (분석 후 폐기).  
현재 구현은 `cardName`·`cardCompany`만 저장한다. 혜택 캐싱은 미구현 (11. 오픈 이슈 참고).

---

## 9. 설정 · 프라이버시 · 심사

### 설정

- 카메라/사진 권한 안내
- `모든 카드 삭제` (2단계 확인)
- 앱 버전, 문의
- **이미지는 서버로 전송되지 않으며, 기기 안에서만 읽고 폐기됨** (심사·개인정보 설명에 활용)

### 수집 금지

카드번호 전체, CVC, 유효기간, 생년월일, 필수 위치 권한

### 스토어 체크

- [ ] 스크린샷 1번 = 대시보드
- [ ] 설명 첫 문장: 카드 혜택 정보 관리
- [ ] 카메라: `카드 및 혜택 안내 이미지를 등록하기 위해 카메라에 접근합니다.`
- [ ] 사진: `등록할 카드 혜택 이미지를 선택하기 위해 사진에 접근합니다.`
- [ ] 오프라인 목록 열람 가능
- [ ] 계정 없이 핵심 기능 동작

---

## 10. MVP 일정

| 주차 | 범위 |
|---|---|
| 1 | 셸, 대시보드, 더미 리치카드, Empty State, Vercel |
| 2 | 이미지 선택/미리보기, 온디바이스 OCR, `/api/analyze-card`(텍스트), 확인/저장 |
| 3 | 상세/수정/삭제, 혜택 로컬 캐싱, 에러·권한 UX |
| 4 | 실사진 테스트, Cordova 어댑터 |

---

## 11. 오픈 이슈

1. **혜택 로컬 캐싱 (우선순위 높음)** — 현재는 `기억` 시 카드사·카드명만 저장해서, 같은 카드를 다시 보면 AI를 또 호출한다. 혜택까지 저장하면 재조회 AI 호출이 0회가 되어 무료 플랜 절약에 가장 효과가 크다.
2. **카드 상세 화면 미구현** — 대시보드에서 저장된 카드를 눌러도 상세로 진입하지 않는다 (`#/cards/:id`).
3. OCR 진행 중 `혜택 보기` 버튼 비활성화, 사용자 입력 보호(OCR 결과가 사용자가 타이핑한 값을 덮어쓰지 않게), 사진 재선택 시 이전 OCR 결과 취소 처리.
4. OCR 최초 실행 시 언어 데이터(kor+eng) 다운로드 지연 — 진행 안내 문구 필요 여부.
5. 회전 3회 시도 시 인식 시간 (최악 20초대) 단축 방안.
6. 카드 상한 30장 유지 여부.
7. HEIC(iPhone) 디코딩 실패 시 대체 경로 실기기 검증.

---

## 12. 확정 시안

스택: **HTML/JS + Tailwind** (shadcn 컴포넌트는 쓰지 않음)

| 항목 | 내용 |
|---|---|
| 레이아웃 | 토스형 메인 (헤더 / 리치카드 / 하단 CTA) |
| 테마 | [tweakcn Omegon](https://tweakcn.com/themes/cmnkz43lg000004k3b236fakp) Light, primary=민트 |
| 메인 시안 | `designs/ThemeOmegonLight.html` |
| 토큰 | `designs/omegon-theme.css` |
| 미리보기 | `designs/index.html` |

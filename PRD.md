# CardInsight MVP — 제품 요구사항 정의서 (PRD) & UI/UX 디자인 가이드

| 항목 | 내용 |
|---|---|
| 제품명 (가칭) | **CardInsight** — 카드 혜택 정보 관리 |
| 문서 버전 | v1.1 (MVP, 챗봇 제외) |
| 작성일 | 2026-08-22 |
| 대상 플랫폼 | 1차: 모바일 웹 (HTML/JS + Tailwind, Vercel) → 2차: Cordova (iOS/Android) |
| 제품 성격 | **등록된 카드의 혜택·실적 정보를 모아 보여주는 유틸리티 앱** |

관련 시안: [designs/index.html](./designs/index.html)

---

## 0. 제품 한 줄 정의

실물 카드나 혜택 안내 이미지를 촬영/업로드하면, AI Vision이 카드명·주요 혜택·전월실적을 추출하고, **내 카드 목록에서 정보를 확인·수정·관리**하는 서비스.

대화형 질의응답은 없다. AI는 **이미지 → 구조화 데이터 추출**에만 쓰인다.

---

## 1. 배경과 목표

### 1.1 문제

- 카드마다 할인/적립, 전월실적, 한도가 달라 비교가 번거로움
- 앱·홈페이지를 일일이 열지 않고, 사진만으로 혜택을 정리하고 싶음

### 1.2 MVP 목표

1. 카메라/갤러리로 카드(또는 혜택 안내) 이미지를 등록한다.
2. AI Vision이 **구조화된 JSON**으로 카드 정보를 추출한다.
3. 사용자가 결과를 확인·수정한 뒤 **내 카드**에 저장한다.
4. 대시보드에서 카드별 혜택 요약을 보고, 상세에서 전체 정보를 본다.
5. 웹에서 핵심 플로우를 검증한 뒤 Cordova로 패키징한다.

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
  → 이미지 리사이즈 + Base64
  → AI Vision 분석 (로딩)
  → 추출 결과 확인/수정
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

### 4.3 이미지 용량 최적화 + Base64

```
원본 File/URI
  → EXIF orientation 보정
  → 리사이즈 (긴 변 max 1280px)
  → JPEG quality 0.72
  → 목표 ≤ 800KB, 상한 1.5MB
  → 초과 시 quality 0.6 → 0.5 재압축
  → Base64 생성
  → 목록용 썸네일 (긴 변 360px) 별도 저장
```

| 항목 | 값 |
|---|---|
| 긴 변 | 1280px |
| 포맷 | JPEG |
| 원본 보관 | 하지 않음 |
| 구현 | `utils/imageOptimizer.js` |

출력: `{ previewDataUrl, uploadBase64, byteSize }`

---

### 4.4 AI Vision API (Structured JSON)

**역할:** 이미지를 카드 정보 JSON으로 변환한다. 대화 API는 없다.

#### 요청

```
POST /api/analyze-card
Content-Type: application/json

{
  "imageBase64": "<jpeg base64, prefix 없이>",
  "mimeType": "image/jpeg",
  "locale": "ko-KR"
}
```

- API 키는 Vercel Serverless에만 보관
- Timeout **25초**
- 네트워크/5xx만 **1회** 재시도, 4xx는 재시도 없음

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

**저장 금지:** 카드번호 전체, CVC, 유효기간, 주민번호, 서명  
`confidence < 0.45` 이거나 `cardName` 공백 → 식별 불가

#### 확인/수정 화면 (저장 전 필수)

사용자가 AI 결과를 고친 뒤 저장한다.

- 카드명, 카드사, 타입, 전월실적, 혜택 목록
- Primary: `내 카드에 저장`
- Secondary: `다시 촬영`
- 저장 시 `id`, `createdAt`, `source: "VISION"` 부여

식별 실패 시 **직접 입력**(카드명+카드사+혜택 1줄)을 허용한다.

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

조건: `ok=false` / `confidence < 0.45` / `cardName` 없음

- 제목: `카드를 인식하지 못했어요`
- 본문: `초점을 맞추고, 혜택 글자가 보이게 다시 찍어 주세요.`
- CTA: `다시 촬영` / `앨범에서 선택` / `직접 입력`

### 5.3 네트워크 · Timeout · 5xx

| 케이스 | 메시지 | 동작 |
|---|---|---|
| 오프라인 | `인터넷 연결을 확인해 주세요` | 목록/상세는 열람, 분석만 비활성 |
| Timeout (25s) | `분석이 지연되고 있어요` | 이미지 유지 + `다시 시도` |
| 5xx | `잠시 후 다시 시도해 주세요` | 1회 자동 재시도 후 수동 |
| 429 | `요청이 많아요` | 재시도 버튼 8초 딜레이 |
| 4xx | `사진을 다시 올려 주세요` | 이미지 재선택 |
| 사용자가 취소 | 토스트 없이 닫기 | — |

로딩: 스피너 + `혜택을 읽고 있어요` + `취소`

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
| 분석 중 | 딤 + 스켈레톤 + `혜택을 읽고 있어요` |
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
│   ├── api/analyzeCard.js
│   ├── adapters/imageInput.js
│   ├── adapters/permissions.js
│   ├── store/cardStore.js
│   ├── utils/imageOptimizer.js
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
└── api/analyze-card.js
```

챗봇 관련 파일은 만들지 않는다.

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
  thumbnailDataUrl: "",
  confidence: 0,
  source: "VISION" | "MANUAL",
  createdAt: 0,
  updatedAt: 0
}
```

---

## 9. 설정 · 프라이버시 · 심사

### 설정

- 카메라/사진 권한 안내
- `모든 카드 삭제` (2단계 확인)
- 앱 버전, 문의
- 이미지는 분석 후 서버에 상시 저장하지 않음

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
| 2 | 이미지 선택/최적화, `/api/analyze-card`, 확인/저장 |
| 3 | 상세/수정/삭제, 직접 입력, 에러·권한 UX |
| 4 | 실사진 테스트, Cordova 어댑터 |

---

## 11. 오픈 이슈

1. Vision 모델 공급자 (서버리스에서만 호출)
2. 카드 상한 30장 유지 여부
3. 분석 이미지 서버 일시 보관 여부 (권장: 처리 후 폐기)

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

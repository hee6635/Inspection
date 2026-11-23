# 설비점검 메모 (Inspection)

안드로이드 앱. 화면은 WebView(`app/src/main/assets`), 다른 앱 위 말풍선만 네이티브(`FloatService.kt`).
규칙 노트: hee6635/sin `.claude/skills/app-playbook/SKILL.md` (먼저 읽기).

## 일하는 방식
- 한국어 · 쉬운 말 · 짧게. 결과 먼저.
- 질문 ≠ 작업 지시. "만들어 · 올려 · 응"일 때만 올린다. 그 전엔 묻는다.
- 시안 먼저(모션은 mp4). 시안은 `design/`.
- 문서 · 시안만 바뀌면 APK 빌드 안 돎(paths-ignore).

## 구조
- 데이터: 4단계 트리 (큰 탭 > 소분류 > 점검항목 > 문제). `js/tree.js`
- 백업: 한 줄에 이름 하나, 단계마다 공백 2칸 들여쓰기.
- 저장: SharedPreferences (`Android.save/load`).

## 시험
- `node tests/tree.test.js` (CI에서도 돎)
- `NODE_PATH=$(npm root -g) node tests/ui.test.js [스크린샷 폴더]` — 폰 크기 · 실제 터치로 톡/길게/끌기/복원 확인

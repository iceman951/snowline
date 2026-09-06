# คู่มือพัฒนา Snowline (สำหรับคนที่เพิ่งเข้าโปรเจกต์)

เอกสารนี้เขียนให้คนที่ยังไม่เคยแตะโค้ดนี้มาก่อน อ่านจบแล้วควรจะ:
รันโปรเจกต์ขึ้นได้ เข้าใจว่าตัวเลขแต่ละตัวบนหน้าจอมาจากไหน และแก้/เพิ่มงานได้โดยไม่พังของเดิม

คู่กันมีอีกสองไฟล์:
- `HANDOFF.md` — สถานะงานล่าสุด รายการ endpoint ทั้งหมด และสิ่งที่ยังค้าง อ่านหลังไฟล์นี้
- `snowline/README.md` — README ของ design bundle (**ข้ามส่วนที่แนะนำ tech stack ไปได้เลย stack ตัดสินแล้ว**)

---

## 0. อ่าน 2 นาที: โปรเจกต์นี้คืออะไร

Snowline คือแอปติดตามพอร์ตหุ้นปันผล เรากำลัง "สร้างของจริง" จากต้นแบบที่ออกแบบไว้แล้ว

มีสองโลกที่ต้องแยกให้ออก:

| โฟลเดอร์ | คืออะไร | แก้ได้ไหม |
|---|---|---|
| `snowline/` | ต้นแบบ (prototype) เป็น HTML/CSS/JS ล้วน ๆ | **ห้ามแก้** เป็น "ข้อสอบ" ที่เราต้องทำให้ตรง |
| `apps/`, `packages/` | แอปจริงที่เรากำลังสร้าง | นี่คือที่ทำงานของเรา |

`snowline/` คือ acceptance criteria — ถ้าของเราแสดงตัวเลขไม่ตรงกับที่ต้นแบบคำนวณได้ **ของเราผิด**

### กฎข้อเดียวที่สำคัญที่สุด

ไฟล์ `snowline/project/snowline-data.js` คือแหล่งความจริงของ "ตัวเลขทุกตัว" ในแอป

แนวคิดของมันคือ: เก็บแค่ **ข้อเท็จจริงดิบ** (positions ที่ถือ, ค่าคงที่, ประวัติปันผล) แล้ว
**คำนวณสด** ทุกอย่างที่เหลือ — ยอดรวมหมวด, % allocation, drift, หุ้นที่ขึ้น/ลงวันนี้,
ตารางเงินปันผลล่วงหน้า, การพยากรณ์เป้าหมาย, ค่าความเสี่ยง, backtest

> **ห้ามคิดสูตรเอง และห้าม hardcode ตัวเลขลงหน้าจอ**
> ถ้าข้อความบรรยายในต้นแบบขัดกับสิ่งที่โค้ดคำนวณได้ → **โค้ดถูก**

จำประโยคนี้ไว้: *"Port, don't invent."* — ย้ายมา อย่าคิดเอง

---

## 1. ติดตั้งและรัน

ต้องมี [Bun](https://bun.sh) (ไม่ใช้ npm/node ในการรัน)

```bash
bun install          # ติดตั้ง dependency ทั้ง workspace
bun run seed         # สร้าง/เติมข้อมูลลง apps/api/snowline.sqlite จากข้อเท็จจริงในต้นแบบ
bun run dev:api      # API   → http://localhost:3001
bun run dev:web      # เว็บ  → http://localhost:5173
```

เปิดสองเทอร์มินัล อันหนึ่งรัน api อีกอันรัน web (หรือ `bun run dev` รันพร้อมกัน)

ถ้าเว็บขึ้นแต่ตัวเลขหาย → เกือบทุกครั้งคือลืมรัน `dev:api` หรือลืม `bun run seed`

### คำสั่งเทสต์

```bash
bun test packages/core   # 83 tests — เทียบผลลัพธ์กับต้นแบบทีละตัวเลข
bun test apps/api        # 15 tests — เทสต์ endpoint
bun run check            # svelte-check — ต้องเป็น 0 errors 0 warnings เสมอ
bun run test:e2e         # Playwright 27 tests — เปิด dev server ให้เอง
```

`test:e2e` ต้องมี Chromium: ตั้ง `SNOWLINE_BROWSER_PATH` ชี้ไปที่ browser ก็ได้
ไม่งั้นมันจะหา Brave บนเครื่อง แล้วค่อย fallback ไป browser ของ Playwright

**ก่อน commit ทุกครั้ง** อย่างน้อยต้องผ่าน `bun test packages/core` และ `bun run check`

---

## 2. โครงสร้าง: ตัวเลขเดินทางยังไง

```
snowline/project/snowline-data.js      ← ต้นแบบ (อ่านอย่างเดียว)
        │  scripts/extract-reference.ts รันไฟล์นี้แล้ว dump ออกมาเป็น
        ▼
seed-data.json  +  reference.json      ← ไฟล์ generate ห้ามแก้มือ
        │                    └────────────► packages/core/test/parity.test.ts
        ▼
   SQLite (apps/api/snowline.sqlite)   ← เก็บแค่ข้อเท็จจริงดิบ
        ▼
   packages/core   ← Engine: คำนวณทุกอย่างจากข้อเท็จจริง
        ▼
   apps/api        ← Elysia: ห่อ Engine เป็น HTTP endpoint
        ▼
   apps/web        ← SvelteKit: +page.server.ts ดึงข้อมูล → ส่งเป็น props ให้ component
```

### 2.1 `packages/core` — สมองของระบบ

TypeScript ล้วน ไม่มี Svelte ไม่มี HTTP เทสต์ง่ายที่สุด แก้ที่นี่ก่อนเสมอถ้าเป็นเรื่อง "ตัวเลข"

| ไฟล์ | ทำอะไร |
|---|---|
| `types.ts` | ชนิดข้อมูลทั้งหมด (Position, Totals, Category, …) |
| `derive.ts` | คลาส `Engine` — totals, categories, holdings, goal, cash |
| `ledger.ts` | รายการซื้อขาย, lot, corporate action, price series แบบ seeded |
| `history.ts` | ประวัติรายเดือน, benchmark, cash flow |
| `research.ts` | fund look-through, ความเสี่ยง, market universe, backtest, technicals |
| `rebalance.ts` | อัลกอริทึมจัดสมดุลพอร์ต |
| `category-edits.ts` | การแก้หมวดหมู่ (สร้าง/เปลี่ยนชื่อ/ตั้งเป้า/ย้าย/ลบ) |
| `format.ts` | `fmt` — ฟอร์แมตเงิน %, ใช้ตัวนี้เท่านั้น อย่าเขียน `toFixed` เอง |

ใช้งาน: `new Engine(dataset)` แล้วเรียกเมธอด เช่น `engine.totals()`, `engine.categories()`

### 2.2 `apps/api` — Elysia บน Bun + `bun:sqlite`

`src/index.ts` คือ route ทั้งหมด (ไฟล์เดียว) รูปแบบเหมือนกันหมด:

```ts
const engine = () => new Engine(loadDataset());   // สร้าง engine ใหม่ทุก request

.get('/api/portfolio', () => {
  const e = engine();
  return { constants: e.constants, totals: e.totals() };
})
```

**DB เก็บแค่ข้อเท็จจริง** ดูได้ที่ `src/db/schema.sql` — `positions`, `constants`,
`dividend_history`, `category_targets`, `corporate_actions`, `research_catalog`
บวกอีกสามอย่างที่ผู้ใช้แก้ได้: `category_overrides`, `goal_config`, `research_preferences`

ไม่มีการเก็บ "ยอดรวม" หรือ "%" ลง DB — เพราะถ้าเก็บ มันจะเพี้ยนไม่ตรงกับข้อมูลดิบในภายหลัง

### 2.3 `apps/web` — SvelteKit 2 / Svelte 5 (runes)

หน้าจอทั้งหมดมี 19 หน้า route map อยู่ที่ `src/lib/nav.ts`

**กฎการโหลดข้อมูล:** โหลดใน `+page.server.ts` เท่านั้น ผ่าน `$lib/api` แล้วส่งเป็น props
**component ห้ามเรียก `fetch` เอง**

หน้าจอมีสองแบบ ต้องแยกให้ออก:

**แบบ A — หน้าที่เขียนตรง ๆ** (Dashboard, Holdings, Categories, Transactions,
Corporate actions, Dividend calendar, My goal, Analytics Common)
`+page.server.ts` เรียก endpoint เฉพาะทาง เช่น `/api/dashboard` แล้ว `+page.svelte` render

**แบบ B — "research screens" 11 หน้า** (Cash, Rebalancing, Diversification,
Analytics Dividends/Growth/Metrics/Report, Screener, Find the Dip, Payout calendar, Portfolio Lab)
หน้าพวกนี้ใช้ **presenter pattern** เพราะพอร์ตมาจาก `.dc.html` ที่มี logic เยอะมาก:

```
+page.server.ts     ดึง /api/research/snapshot (ข้อมูลดิบก้อนเดียวจบ)
   ↓
ResearchPage.svelte  สร้าง screen-engine + จัดการ auto-save preferences
   ↓
lib/presenters/X.js  คลาสที่มี state + renderVals() → คำนวณ "view model"
   ↓
lib/screens/X.svelte อ่าน view.xxx แล้ว render ออกมาเป็น HTML
```

`src/lib/screen-engine.ts` คือ **ทางเดียว** ที่ presenter จะเข้าถึงข้อมูล — มันรวม
core `Engine` + research engine + `rebalance` + `fmt` ไว้เป็น interface เดียว
presenter เป็น JS ธรรมดา (ไม่มี Svelte) จึงเทสต์ได้ง่าย

โค้ดตัวอย่างของ screen แบบ B:
```svelte
const model = $derived(new Model(engine));
const view: any = $derived.by(() => { model.revision; return model.renderVals(); });
```
`model.revision` ถูกอ้างเพื่อให้ Svelte รู้ว่าต้องคำนวณใหม่เมื่อ `setState()` ถูกเรียก

---

## 3. สูตรทำงาน (recipes)

### 3.1 อยากแก้ตัวเลขที่แสดงผิด

1. เปิด `snowline/project/snowline-data.js` หาฟังก์ชันที่คำนวณตัวเลขนั้น — **นี่คือคำตอบที่ถูก**
2. หาโค้ดที่พอร์ตมาใน `packages/core/src/` แก้ให้ตรง
3. `bun test packages/core` ต้องเขียว
4. ถ้าเทสต์ไม่ได้จับความต่างนี้ → เพิ่มเทสต์ (ดู 3.3)

### 3.2 อยากเพิ่ม endpoint ใหม่

```ts
// apps/api/src/index.ts
.get('/api/holdings/:ticker/something', ({ params }) => {
  const e = engine();
  return e.somethingFor(params.ticker);
})
```
แล้วเพิ่ม method + type ใน `apps/web/src/lib/api.ts` และเพิ่มเทสต์ใน `apps/api/test/integration.test.ts`
ห้ามให้หน้าเว็บ fetch ตรงไปที่ `localhost:3001` เอง — ผ่าน `$lib/api` เสมอ

### 3.3 อยากพอร์ตฟังก์ชันใหม่จากต้นแบบ

นี่คือ workflow ที่ทำให้พอร์ตเชื่อถือได้ ทำครบทุกขั้น:

1. เขียนฟังก์ชันใน `packages/core/src/` — **ก๊อป comment ที่อธิบายเหตุผลมาด้วย** ไม่ใช่ก๊อปแค่เลขคณิต
2. เปิด `scripts/extract-reference.ts` เพิ่มการ dump ผลลัพธ์ของฟังก์ชันนั้นจากต้นแบบ
3. `bun run scripts/extract-reference.ts` → จะ regenerate `reference.json` และ `seed-data.json`
4. เพิ่ม assertion ใน `packages/core/test/parity.test.ts` เทียบพอร์ตกับ reference
5. `bun test packages/core`

> `seed-data.json` และ `reference.json` เป็นไฟล์ **generate** — ห้ามแก้ด้วยมือเด็ดขาด
> ถ้าเทสต์ไม่ผ่านแล้วไปแก้ reference ให้ตรงกับโค้ดเรา = โกงตัวเอง เทสต์จะไร้ความหมายทันที

### 3.4 อยากเพิ่มหน้าจอใหม่

1. เพิ่ม route ใน `src/lib/nav.ts`
2. สร้าง `src/routes/<path>/+page.server.ts` + `+page.svelte`
3. ถ้าเป็นหน้าที่มี logic เยอะ ใช้ pattern แบบ B: presenter + screen + `ResearchPage`
4. เพิ่มเทสต์ใน `apps/web/tests/` — ทุกหน้าต้องผ่านสัญญา 5 ข้อ:
   ตอบ 200 / render `h1` ถูก / hydrate โดยไม่มี page error / สลับ theme ได้ / ที่ 390px ต้องไม่ scroll แนวนอน

---

## 4. กฎที่ต้องทำตาม (ห้ามข้าม)

1. **Port, don't invent.** ตัวเลขทุกตัวมาจาก `packages/core` ถ้าต้นแบบ hardcode ไว้ (เช่น quotes bar,
   ข้อความ "why is it moving?") ให้ hardcode ตามแล้วใส่ comment ว่ายังต้องหาแหล่งข้อมูลจริง
2. **Design token คือกฎหมาย** ใช้ CSS variable ใน `src/app.css` (ยกมาจากต้นแบบตรง ๆ)
   **ห้ามเพิ่มสีใหม่ ห้ามเพิ่ม spacing scale ใหม่ ห้าม "ปรับให้สวยขึ้น"**
3. **โหลดข้อมูลฝั่ง server** ใน `+page.server.ts` เท่านั้น
4. **ใช้ Svelte 5 runes** — `$props()`, `$state()`, `$derived()`, `$derived.by()`, `$effect()`
   (ไม่ใช่ `export let` หรือ `$:` แบบ Svelte 4)
5. **Comment อธิบาย "ทำไม" ไม่ใช่ "อะไร"** comment ในต้นแบบเขียนดีมาก ย้ายเหตุผลมาด้วย
6. `bun test packages/core` ต้องเขียวตลอด

---

## 5. หลุมพรางที่คนใหม่มักตก

| อาการ | สาเหตุจริง |
|---|---|
| หน้าเว็บว่าง/ตัวเลขเป็น `undefined` | ลืมรัน `dev:api` หรือลืม `bun run seed` |
| แก้ core แล้วเว็บไม่เปลี่ยน | `apps/api` โหลด engine ใหม่ทุก request แต่ dev server ต้อง reload — เช็คว่า `dev:api` รันด้วย `--watch` (มีอยู่แล้ว) |
| parity test แดงหลังแก้โค้ด | ปกติแปลว่า **โค้ดเราผิด** ไม่ใช่ reference ผิด กลับไปอ่าน `snowline-data.js` |
| แก้ `reference.json` ให้เทสต์ผ่าน | ผิดวิธี — ให้ regenerate ผ่าน script เท่านั้น |
| ใส่สีใหม่แล้วดูดี แต่ review ไม่ผ่าน | กฎข้อ 2 ใช้ token เท่านั้น |
| ที่มือถือหน้าเลื่อนซ้ายขวาได้ | เคยเจอมาแล้ว 4 เคส — ตารางกว้างต้องมี scroll wrapper, `sr-only` ต้อง clip in-flow, legend ต้อง wrap |
| จะเพิ่ม `fetch` ใน component | อย่า — ย้ายไป `+page.server.ts` |

---

## 6. งานที่ยังไม่ได้ทำ (ถ้าไม่รู้จะทำอะไรต่อ)

### ต้องตัดสินใจเชิง product ก่อนถึงจะโค้ดได้
สามอย่างนี้ **ต้องเคลียร์ก่อน** เพราะเปลี่ยนทีหลังจะทำให้ตัวเลขที่คำนวณไว้ผิดหมด:

1. **Cost basis: FIFO หรือ average cost?** — กระทบ realised P&L, การแสดง lot, การปรับ basis ตอนมี corporate action
2. **Dividend recognition: ex-date หรือ pay-date?** — กระทบว่าปันผลจะไปตกเดือนไหนในปฏิทิน
3. **แหล่งข้อมูลราคาจริง (quotes feed)** — quotes bar กับข้อความ "why is it moving?" ยัง hardcode อยู่

สามข้อนี้ block โมดัล add/edit ของ Transactions / Corporate actions / Holdings note
(ตอนนี้ตั้งใจไม่ทำ เพราะในต้นแบบโมดัลพวกนี้แก้แค่ local state ไม่ได้คำนวณอะไรใหม่ —
ถ้าทำจริงต้องรู้ก่อนว่า "เขียนลงที่ไหน" ซึ่งเป็นการเปลี่ยน data model ไม่ใช่แค่หน้าจอ)

### งานที่ทำได้เลยไม่ต้องรอใคร
- **เทสต์ presenter โดยตรง** — ตอนนี้ presenter 11 ตัวมีแค่ Playwright คลุม ไม่มี unit test ของตัวเอง
  presenter เป็น JS ธรรมดา รับ engine เข้าไป → เทสต์ง่ายมาก นี่คืองานที่เหมาะกับคนเพิ่งเข้าโปรเจกต์ที่สุด
- **สแกน accessibility ของ input** — หน้า My goal มี input ที่มีแค่ `<span>` ข้าง ๆ ยังไม่มี `aria-label`
- **ยังไม่เคย build production เลย** — `vite build` ยังไม่เคยรันสำเร็จให้ยืนยัน

ดูรายละเอียดเต็มใน `HANDOFF.md` §4 และ §6

---

## 7. เช็กลิสต์ก่อนส่งงาน

```bash
bun test packages/core     # ✅ ต้องเขียว
bun test apps/api          # ✅ ถ้าแตะ API
bun run check              # ✅ 0 errors 0 warnings
bun run test:e2e           # ✅ ถ้าแตะหน้าจอ
```

แล้วถามตัวเองสามข้อ:
- ตัวเลขทุกตัวที่ฉันแสดง มาจาก `packages/core` จริงไหม? (ไม่ได้ hardcode)
- ถ้าฉันพอร์ตฟังก์ชันใหม่ ได้เพิ่ม parity test แล้วหรือยัง?
- ที่หน้าจอ 390px หน้ายังไม่ scroll แนวนอนใช่ไหม?

ถ้าเปลี่ยนอะไรที่กระทบสถานะโปรเจกต์ (เช่นทำงานใน §6 เสร็จ) **อัปเดต `HANDOFF.md` ด้วย**
เอกสารนั้นคือสัญญาสำหรับคนถัดไป

---

## 8. อภิธานศัพท์

| คำ | ความหมายในโปรเจกต์นี้ |
|---|---|
| **bundle / prototype** | โฟลเดอร์ `snowline/` — ต้นแบบที่เป็นข้อสอบ |
| **derive** | คำนวณสดจากข้อเท็จจริงดิบ ตรงข้ามกับ "เก็บลง DB" |
| **parity test** | เทสต์ที่เทียบผลลัพธ์ของพอร์ตกับต้นแบบทีละตัวเลข |
| **presenter** | คลาส JS ที่แปลง engine → view model ให้ Svelte render |
| **screen-engine** | ตัวรวม engine ทั้งหมด เป็นอินพุตเดียวของ presenter |
| **drift** | ส่วนต่างระหว่าง allocation ปัจจุบันกับ target |
| **look-through** | มองทะลุกองทุน ETF ไปดูว่าจริง ๆ ถือหุ้นอะไรอยู่ |
| **lot** | ก้อนหุ้นที่ซื้อครั้งหนึ่ง ๆ ใช้คำนวณต้นทุน |

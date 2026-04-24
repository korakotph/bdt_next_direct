# คู่มือการติดตั้งและเปิดใช้งานบนเครื่อง Local

โปรเจกต์นี้ประกอบด้วย 3 ส่วนหลัก:
- **PostgreSQL** — ฐานข้อมูล
- **Directus** — CMS / API backend
- **Next.js** — Frontend

---

## สิ่งที่ต้องติดตั้งก่อน

| เครื่องมือ | เวอร์ชันที่แนะนำ | ดาวน์โหลด |
|---|---|---|
| Docker Desktop | 24+ | https://www.docker.com/products/docker-desktop |
| Docker Compose | 2.x (มาพร้อม Docker Desktop) | — |

---

## วิธีติดตั้ง

### 1. ดาวน์โหลดโปรเจกต์

เลือกวิธีใดวิธีหนึ่ง:

**วิธีที่ 1 — Download ZIP (ไม่ต้องติดตั้ง Git)**

1. เปิด https://github.com/korakotph/bdt_next_direct
2. คลิก **Code → Download ZIP**
3. แตกไฟล์ ZIP
4. เปลี่ยนชื่อโฟลเดอร์เป็นชื่อที่ต้องการ

**วิธีที่ 2 — Git Clone (ต้องติดตั้ง [Git](https://git-scm.com) ก่อน)**

```bash
git clone https://github.com/korakotph/bdt_next_direct.git ชื่อโฟลเดอร์
cd ชื่อโฟลเดอร์
```

> **ชื่อโฟลเดอร์สำคัญ** — `install.bat` จะใช้ชื่อโฟลเดอร์เป็น prefix ของ container
> เช่น โฟลเดอร์ชื่อ `mysite` → container จะเป็น `mysite_db`, `mysite_directus`, `mysite_nextjs`

---

## วิธีติดตั้งแบบ One-Click

> ต้องการแค่ **Docker Desktop** เท่านั้น — ไม่ต้องติดตั้ง Python หรือ Node.js

### 2. Double-click ไฟล์ติดตั้ง

| OS | ติดตั้ง | Export ข้อมูล |
|---|---|---|
| **Windows** | `install.bat` | `export_data.bat` |
| **Mac** | `install.command` | `export_data.command` |

> **Mac:** ครั้งแรกอาจต้อง Right-click → Open เพื่ออนุญาต Gatekeeper

โปรแกรมจะทำทุกอย่างอัตโนมัติ:
1. ตั้งชื่อ container ตามชื่อโฟลเดอร์
2. หา port ที่ว่าง (เริ่มจาก 5433 / 8056 / 3012)
3. อัปเดต `docker-compose.yaml` และ backup เป็น `.bak`
4. `docker compose up -d --build`
5. Import `dump.sql` เข้า PostgreSQL
6. Restart Directus เพื่อโหลด schema ใหม่
7. แสดง URL และ login ที่ใช้งานได้เลย

### Export ข้อมูล

Double-click `export_data.bat` (Windows) หรือ `export_data.command` (Mac) โปรแกรมจะ export:
- `dump.sql` — database ทั้งหมด
- `uploads/` — ไฟล์จาก Directus

บีบอัดลงไฟล์ `export_YYYYMMDD_HHMMSS.zip` โดยอัตโนมัติ

---

## วิธีรัน — เลือกหนึ่งวิธี

---

### วิธีที่ 1: Docker Compose (แนะนำ)

รันทั้ง 3 service พร้อมกันด้วยคำสั่งเดียว

```bash
docker compose up -d
```

รอให้ container ทั้งหมด start เสร็จ (ประมาณ 30–60 วินาที) แล้วเปิด:

| Service | URL |
|---|---|
| Next.js (Frontend) | http://localhost:3012 |
| Directus (Admin) | http://localhost:8056 |
| PostgreSQL | localhost:5433 |

**Directus Admin เริ่มต้น:**
- Email: `admin@example.com`
- Password: `admin123`

---

### วิธีที่ 2: รัน Next.js แยกสำหรับ Development

วิธีนี้ใช้เมื่อต้องการแก้โค้ด Next.js และเห็น Hot Reload ทันที

#### 2.1 รัน Directus + PostgreSQL ด้วย Docker

```bash
docker compose up postgres directus -d
```

#### 2.2 ติดตั้ง dependencies และรัน Next.js

```bash
cd next-app
npm install
```

สร้างไฟล์ `.env.local` ใน `next-app/`:

```env
NEXT_PUBLIC_DIRECTUS_URL=http://localhost:8056
DIRECTUS_INTERNAL_URL=http://localhost:8056
NEXT_PUBLIC_BASE_PATH=
```

จากนั้นรัน dev server:

```bash
npm run dev
```

เปิดเบราว์เซอร์ที่ http://localhost:3012

---

## นำเข้าข้อมูลเริ่มต้น (Database Seed)

ไฟล์ `dump.sql` อยู่ในโฟลเดอร์หลักของโปรเจกต์แล้ว ให้นำเข้าหลัง container รันแล้ว:

#### ขั้นตอน

**1. ตรวจสอบว่า container รันอยู่**
```bash
docker compose ps
```

**2. Import dump.sql**
```bash
docker exec -i bdt_directus_db psql -U directus -d directus < dump.sql
```

**3. Restart container เพื่อให้ Directus โหลด schema ใหม่**
```bash
docker compose restart directus
```

---

## หยุดการทำงาน

```bash
# หยุดชั่วคราว (ข้อมูลยังอยู่)
docker compose stop

# หยุดและลบ container (ข้อมูลยังอยู่ใน volume)
docker compose down

# หยุดและลบทุกอย่างรวมถึงข้อมูล (ระวัง!)
docker compose down -v
```

---

## ดู Log

```bash
# ดู log ทุก service
docker compose logs -f

# ดูเฉพาะ Next.js
docker compose logs -f nextjs

# ดูเฉพาะ Directus
docker compose logs -f directus
```

---

## ปัญหาที่พบบ่อย

**Port ชนกัน**
> ถ้า port `3012`, `8056`, หรือ `5433` ถูกใช้งานแล้ว ให้แก้ไข port mapping ใน `docker-compose.yaml`

**Directus ยังไม่พร้อม**
> Directus ต้องการเวลา initialize ฐานข้อมูลครั้งแรก รอสัก 30–60 วินาที แล้วลอง refresh

**Next.js build fail บน Docker**
> ตรวจสอบว่า `NEXT_PUBLIC_DIRECTUS_URL` ใน `docker-compose.yaml` ถูกต้อง เพราะค่านี้จะถูก bake เข้า bundle ตอน build

**เปิด http://localhost:3012 ไม่ได้หลัง `docker compose up`**
> ต้อง rebuild image ใหม่เมื่อมีการเปลี่ยนแปลงโค้ดหรือ config:
> ```bash
> docker compose down
> docker compose up -d --build
> ```

**Tailwind CSS class บางอันไม่แสดงผล**
> Tailwind v4 สแกน class จาก source file แบบ static ดังนั้น class ที่สร้างแบบ dynamic (เช่น จาก CMS field) อาจหายไป
> แก้ไขโดยเพิ่ม class ลงในไฟล์ `next-app/src/lib/tailwind-safelist.js` เป็น string ตรงๆ แล้ว rebuild:
> ```bash
> docker compose up -d --build
> ```

---

## โครงสร้างโปรเจกต์

```
bdt_next_direct/
├── docker-compose.yaml   # config รัน service ทั้งหมด
├── dump.sql              # ข้อมูลตั้งต้นของฐานข้อมูล
├── directus/
│   └── uploads/          # ไฟล์ที่อัปโหลดผ่าน Directus
└── next-app/
    ├── Dockerfile
    ├── src/
    │   ├── app/          # Next.js App Router pages
    │   ├── components/   # React components
    │   ├── lib/          # utility / API clients
    │   │   └── tailwind-safelist.js  # safelist สำหรับ Tailwind class ที่มาจาก CMS
    │   └── styles/
    └── package.json
```

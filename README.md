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
| Node.js | 20+ | https://nodejs.org |
| Git | ล่าสุด | https://git-scm.com |

---

## วิธีติดตั้ง

### 1. Clone โปรเจกต์

```bash
git clone <repository-url>
cd next_direct
```

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

หากมีไฟล์ `dump.sql` ให้นำเข้าหลัง container รันแล้ว:

```bash
docker exec -i directus_db_ita psql -U directus -d directus < dump.sql
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

---

## โครงสร้างโปรเจกต์

```
next_direct/
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
    │   └── styles/
    └── package.json
```

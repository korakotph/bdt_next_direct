# คู่มือการติดตั้งและเปิดใช้งานบนเครื่อง Local

โปรเจกต์นี้ประกอบด้วย 3 ส่วนหลัก:
- **PostgreSQL** — ฐานข้อมูล
- **Directus** — CMS / API backend
- **Next.js** — Frontend

---

## สิ่งที่ต้องติดตั้งก่อน

ต้องการ **Docker (หรือ nerdctl) + Compose** เท่านั้น — ไม่ต้องติดตั้ง Python หรือ Node.js

### ตัวเลือก Docker (เลือกแค่อันเดียว)

| ตัวเลือก | แนะนำสำหรับ | ดาวน์โหลด |
|---|---|---|
| **Docker Desktop** | ทั่วไป | https://www.docker.com/products/docker-desktop |
| **Rancher Desktop** | เครื่องที่ install Docker Desktop ไม่ได้ (เช่น corporate policy) | https://rancherdesktop.io |
| **Podman Desktop** | ต้องการ open-source / ไม่ต้องการ license | https://podman-desktop.io |

> **Rancher Desktop** รองรับ Windows 10/11 ทุก edition รวมถึง Home และไม่ต้อง license — installer รองรับทั้ง 2 mode:
> - **dockerd (moby)** — ใช้คำสั่ง `docker` / `docker compose` (แนะนำ)
> - **containerd** — ใช้คำสั่ง `nerdctl` / `nerdctl compose` (รองรับเช่นกัน)
>
> installer จะ detect runtime ที่ใช้งานอยู่ให้อัตโนมัติ ไม่ต้องตั้งค่าเพิ่มเติม

Docker/nerdctl Compose จะมาพร้อมกับทุกตัวเลือกข้างต้น

---

## การเตรียมเครื่อง Mac

### ติดตั้ง Git

Mac ต้องการ **Xcode Command Line Tools** ก่อนถึงจะใช้ `git` ได้:

```bash
xcode-select --install
```

จะมี popup ขึ้นมา — กด **Install** แล้วรอจนเสร็จ (ประมาณ 5–15 นาที) จากนั้นตรวจสอบด้วย:

```bash
git --version
```

> ถ้าอัปเดต macOS แล้ว Git หาย ให้รัน `xcode-select --install` อีกครั้ง

### ติดตั้ง Docker Desktop สำหรับ Mac

1. ดาวน์โหลด **Docker Desktop for Mac** ที่ https://www.docker.com/products/docker-desktop
2. เลือก chip ให้ถูกต้อง: **Apple Silicon (M1/M2/M3/M4)** หรือ **Intel**
3. ลากไฟล์ `.dmg` ไปไว้ใน Applications แล้วเปิด Docker Desktop
4. รอให้ Docker icon ใน Menu Bar แสดงสถานะ **Running**

### รัน installer

Double-click ไฟล์ **`install.command`** ในโฟลเดอร์โปรเจกต์

> **ครั้งแรก:** macOS อาจบล็อกไฟล์ — ให้ **Right-click → Open** แทน แล้วกด Open ในกล่อง dialog

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
2. **ขอ Admin email และ password** — กรอกหรือกด Enter เพื่อใช้ค่า default (`admin@example.com` / `admin123`)
3. หา port ที่ว่างอัตโนมัติ (เริ่มจาก 5433 / 8056 / 3012 ถ้าว่าง)
4. อัปเดต `docker-compose.yaml` และ backup เป็น `.bak`
5. Build และ Start containers
6. Import `dump.sql` เข้า PostgreSQL
7. อัปเดต admin credentials ใน Directus
8. **แสดง URL จริงและ login ที่ใช้งานได้เลยตอนจบ**

> **URL และ port จะแสดงตอนจบการติดตั้ง** เพราะอาจเปลี่ยนถ้า port เริ่มต้นถูกใช้งานอยู่แล้ว

### Export ข้อมูล

Double-click `export_data.bat` (Windows) หรือ `export_data.command` (Mac) โปรแกรมจะ export:
- `dump.sql` — database ทั้งหมด
- `directus/uploads/` — ไฟล์จาก Directus (แตก zip ทับโฟลเดอร์โปรเจกต์ได้เลย)

บีบอัดลงไฟล์ `export_YYYYMMDD_HHMMSS.zip` โดยอัตโนมัติ

---

## วิธีรัน — เลือกหนึ่งวิธี

---

### วิธีที่ 1: Docker Compose (แนะนำ)

รันทั้ง 3 service พร้อมกันด้วยคำสั่งเดียว

```bash
docker compose up -d
```

รอให้ container ทั้งหมด start เสร็จ (ประมาณ 30–60 วินาที) แล้วเปิด URL ตาม port ที่กำหนดใน `docker-compose.yaml`:

| Service | Port เริ่มต้น (อาจเปลี่ยนถ้าผ่าน installer) |
|---|---|
| Next.js (Frontend) | http://localhost:**3012** |
| Directus (Admin) | http://localhost:**8056** |
| PostgreSQL | localhost:**5433** |

> ถ้าติดตั้งผ่าน `install.bat` / `install.command` — ดู URL และ port จริงได้จากหน้าต่างสรุปตอนจบการติดตั้ง หรือดูค่าใน `docker-compose.yaml`

**Directus login:**
- Email: ตามที่กรอกตอนติดตั้ง (default: `admin@example.com`)
- Password: ตามที่กรอกตอนติดตั้ง (default: `admin123`)

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

**Docker Desktop ขึ้น error: "For security reason C:\ProgramData\DockerDesktop must be owned by an elevated account"**
> โฟลเดอร์ `C:\ProgramData\DockerDesktop` มี owner ผิด ต้องแก้ก่อน Docker จะรันได้
>
> **วิธีที่ 1 — ให้ install.bat แก้อัตโนมัติ:**
> Right-click `install.bat` → **Run as administrator** — โปรแกรมจะตรวจพบและเสนอแก้ไขให้เลย
>
> **วิธีที่ 2 — แก้เอง:**
> เปิด **Command Prompt แบบ Run as administrator** แล้วรัน:
> ```
> takeown /f "C:\ProgramData\DockerDesktop" /r /d y
> icacls "C:\ProgramData\DockerDesktop" /grant Administrators:F /t
> ```
> จากนั้น restart Docker Desktop แล้วรัน `install.bat` อีกครั้ง

**ติดตั้ง Docker Desktop ไม่ได้ (เช่น corporate policy / Windows edition)**
> ใช้ **Rancher Desktop** แทน — ดาวน์โหลดที่ https://rancherdesktop.io
> หลังติดตั้งให้ไปที่ Preferences → Container Engine → เลือก **dockerd (moby)** แล้ว Apply
> จากนั้นรัน `install.bat` ได้ปกติ

**install.bat ปิดหน้าต่างก่อนอ่าน error ทัน**
> ดูรายละเอียด error ทั้งหมดได้ที่ไฟล์ `install_log.txt` ในโฟลเดอร์โปรเจกต์
> หรือรัน install.bat ใหม่ — หน้าต่างจะค้างอยู่ให้อ่าน error ได้

**install.bat error เรื่อง network / connection**
> `docker compose up` อาจ timeout ขณะ pull image จาก Docker Hub
> โปรแกรมจะลองใหม่อัตโนมัติ 3 ครั้ง ถ้ายังไม่ได้ให้ตรวจสอบ internet แล้วรัน install.bat อีกครั้ง

**Port ชนกัน**
> `install.bat` จะหา port ที่ว่างให้อัตโนมัติ ไม่ต้องแก้ไขเอง

**Directus ยังไม่พร้อม**
> Directus ต้องการเวลา initialize ฐานข้อมูลครั้งแรก รอสัก 30–60 วินาที แล้วลอง refresh

**Next.js build fail บน Docker — `TypeError: fetch failed` / `ECONNREFUSED`**
> Next.js พยายาม prerender หน้าเว็บตอน build แต่ Directus ยังไม่รัน ทำให้ fetch ไม่ได้
> ปัญหานี้ถูกแก้แล้วด้วย `export const dynamic = 'force-dynamic'` ใน layout — ถ้ายังเจอให้ตรวจสอบว่า code ล่าสุดจาก repository แล้ว

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

## การตั้งค่าเว็บไซต์ผ่าน Directus (Site Settings)

ไปที่ Directus Admin → **Site Settings** เพื่อกำหนดค่าต่างๆ ของเว็บ:

| ฟิลด์ | คำอธิบาย |
|---|---|
| `logo` | รูป logo ที่แสดงใน Navbar — **ใช้เป็น favicon ของเว็บด้วยโดยอัตโนมัติ** |
| `site_name` | ชื่อเว็บไซต์ |
| `navbar_color` / `text_color` | สีของ Navbar |
| `header_theme` | รูปแบบ Navbar: `1` = แถวเดียว (โลโก้ซ้าย เมนูขวา), `2` = สองแถว (แถว 1 โลโก้, แถว 2 เมนู) |
| `footer_color` / `footer_text_color` | สีของ Footer |
| `footer_theme` | รูปแบบ Footer: `1` = กึ่งกลาง (footer_name อย่างเดียว), `2` = footer_name ซ้าย / footer_content ขวา |
| `first_page` | slug ของหน้าแรก |
| `landing` | เปิด/ปิด popup ข่าว |

> **Favicon อัตโนมัติ:** เมื่อตั้งค่า `logo` ใน Site Settings, Next.js จะใช้รูปนั้นเป็น favicon (`<link rel="icon">`) โดยอัตโนมัติ หากยังไม่ได้ตั้งค่า logo จะใช้ไฟล์ `favicon.ico` เริ่มต้น

---

## โครงสร้างโปรเจกต์

```
bdt_next_direct/
├── docker-compose.yaml   # config รัน service ทั้งหมด
├── dump.sql              # ข้อมูลตั้งต้นของฐานข้อมูล
├── install.bat           # Windows one-click installer
├── install.command       # Mac one-click installer
├── export_data.bat       # Windows export database + uploads
├── export_data.command   # Mac export database + uploads
├── update_dump.bat       # Windows อัปเดต dump.sql
├── update_dump.command   # Mac อัปเดต dump.sql
├── scripts/              # scripts หลัก (install.ps1, install.sh, ...)
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

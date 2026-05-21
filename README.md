# คู่มือการติดตั้งและเปิดใช้งานบนเครื่อง Local

โปรเจกต์นี้ประกอบด้วย 2 compose stack:

**Project stack** (แต่ละโปรเจค มี 4 services):
- **PostgreSQL** — ฐานข้อมูล
- **Directus** — CMS / API backend
- **Next.js** — Frontend
- **Adminer** — Web UI ดูฐานข้อมูล (port 8057)

**Manager stack** (deploy แยก 1 ชุดต่อ server):
- **Manager** — Web UI สำหรับจัดการ container ทุกโปรเจคบน server (port 8090 default, เปลี่ยนได้ด้วย `MANAGER_PORT`)

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
> เช่น โฟลเดอร์ชื่อ `mysite` → container จะเป็น `mysite_db`, `mysite_directus`, `mysite_nextjs`, `mysite_manager`

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
2. หา port ที่ว่างอัตโนมัติ (เริ่มจาก 5433 / 8056 / 3012 ถ้าว่าง)
3. อัปเดต `docker-compose.yaml` และ backup เป็น `.bak`
4. Build และ Start containers
5. Import `dump.sql` เข้า PostgreSQL แล้วลบ users เดิมออก
6. **แสดง URL สำหรับตั้งค่า Admin ตอนจบ — ไปสร้าง account ที่ `/admin/setup`**

> **URL และ port จะแสดงตอนจบการติดตั้ง** เพราะอาจเปลี่ยนถ้า port เริ่มต้นถูกใช้งานอยู่แล้ว

### Export ข้อมูล

Double-click `export_data.bat` (Windows) หรือ `export_data.command` (Mac) โปรแกรมจะ export:
- `dump.sql` — database ทั้งหมด (ยกเว้นข้อมูล users — สร้าง admin ใหม่ตอน install)
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
| Manager UI | http://localhost:**8090** |

> ถ้าติดตั้งผ่าน `install.bat` / `install.command` — ดู URL และ port จริงได้จากหน้าต่างสรุปตอนจบการติดตั้ง หรือดูค่าใน `docker-compose.yaml`

**Directus login:**
- ครั้งแรกให้ไปตั้งค่าที่ `http://localhost:8056/admin/setup` เพื่อสร้าง Admin account

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

**Login Directus ชนกันเมื่อรันหลาย project บน server/เครื่องเดียวกัน**
> แต่ละ project จะมีชื่อ session cookie ของตัวเองโดยอัตโนมัติ (`{prefix}_session_token` / `{prefix}_refresh_token`)
> ซึ่งถูกกำหนดใน `docker-compose.yaml` และ `install.bat` จะ patch ให้ตรงกับชื่อโฟลเดอร์โดยอัตโนมัติ

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

## ใช้งานบน Server (Manager Web UI)

Manager เป็น standalone container แยกออกจาก project stack — deploy ครั้งเดียวบน server แล้วจัดการได้ทุกโปรเจค

### Deploy Manager (ทำครั้งเดียวต่อ server)

**`HOST_PROJECTS_ROOT` เป็น required** — path บน host ที่เก็บ project ทุกโปรเจค (parent folder)

```bash
HOST_PROJECTS_ROOT=/var/www \
  BASE_PATH=/manager \
  docker compose -f manager/docker-compose.yaml up -d --build

# เปิดเบราว์เซอร์ไปที่
http://<server-ip>/manager
```

Manager จะ mount `/var/www` ไว้ที่ `/var/www` ในตัวมันเองด้วย — ทำให้ `docker compose build/up` ทำงานได้ถูกต้องจากใน container

| Env var | Default | คำอธิบาย |
|---|---|---|
| `HOST_PROJECTS_ROOT` | *(required)* | path บน host ที่เก็บทุกโปรเจค |
| `BASE_PATH` | (ว่าง) | sub-path ที่ Manager อยู่ เช่น `/manager` |
| `PUBLIC_HOST` | (ว่าง) | override URL สาธารณะของ server เช่น `https://example.com` — ถ้าไม่ตั้งค่า Manager จะ auto-detect จาก HTTP request headers แทน |
| `MANAGER_PORT` | `8090` | port ที่ expose Manager ออก host |
| `CADDY_CONTAINER` | `caddy` | ชื่อ container ของ Caddy |
| `CADDY_NETWORK` | `caddy_web` | Docker network ที่ share กับ Caddy |

> Manager auto-detect server URL จาก `X-Forwarded-Host` / `Host` header ทุกครั้งที่สร้าง project หรือ import ZIP เพื่อตั้ง Directus `PUBLIC_URL` และ `NEXT_PUBLIC_DIRECTUS_URL` ให้ถูกต้องโดยอัตโนมัติ (`http://<server>/{prefix}-admin`)

### ใช้กับ Reverse Proxy (เช่น Caddy) ที่ sub-path

```bash
HOST_PROJECTS_ROOT=/var/www BASE_PATH=/manager \
  docker compose -f manager/docker-compose.yaml up -d --build
```

`manager/docker-compose.yaml` join `caddy_web` network อัตโนมัติแล้ว — ถ้า Caddy ใช้ชื่อ network อื่น แก้ที่ท้ายไฟล์:

```yaml
networks:
  caddy_web:        # ← เปลี่ยนให้ตรงกับ network ของ Caddy
    external: true
```

**Caddyfile:**
```
:80 {
    handle /manager* {
        uri strip_prefix /manager
        reverse_proxy bdt_manager:9090
    }

    # Manager จะเพิ่ม BDT-MANAGED block ลงตรงนี้อัตโนมัติ
    handle {
        reverse_proxy app:3000
    }
}
```

### จัดการ Reverse Proxy ผ่าน Manager UI

Manager จะ **auto-enable reverse proxy อัตโนมัติ** ทุกครั้งที่ Setup หรือสร้างโปรเจคใหม่ — ไม่ต้องกด Enable เอง

สรุปผลหลัง setup จะแสดง:
```
Frontend       : http://<server-ip>/{prefix}/
Directus Admin : http://<server-ip>/{prefix}-admin/admin/
Adminer        : http://<server-ip>/{prefix}-db/
```

นอกจากนี้ยังกด Enable/Disable ได้เองในหน้า Selected Project

Manager ใช้ชื่อ container โดยตรงและ **auto-connect** ทั้ง 3 containers (`_nextjs`, `_directus`, `_adminer`) เข้า Caddy network อัตโนมัติ

**Config ที่ถูก inject ลง Caddyfile (ตัวอย่าง project `cms`):**
```
    # BDT-MANAGED-START
    @cms_admin_ref {
        path /admin*
        header Referer */cms-admin*
    }
    handle @cms_admin_ref {
        reverse_proxy cms_directus:8055
    }
    handle /cms-admin* {
        uri strip_prefix /cms-admin
        reverse_proxy cms_directus:8055
    }
    handle /cms-db* {
        uri strip_prefix /cms-db
        reverse_proxy cms_adminer:8080
    }
    handle /cms* {
        reverse_proxy cms_nextjs:3000
    }
    # BDT-MANAGED-END
```

`@cms_admin_ref` คือ named matcher สำหรับ asset paths (`/admin/assets/...`) ที่ Directus admin SPA request โดยตรง — ใช้ `Referer` header เพื่อแยกแต่ละ instance ออกจากกัน รองรับ multi-instance

**ไม่ต้องตั้งค่าพิเศษเพิ่มเติม** — Manager เขียน routes ลง Caddyfile ของ Caddy container โดยตรงผ่าน `docker exec` แล้ว reload อัตโนมัติ เมื่อ Manager restart ก็จะ sync routes กลับคืนให้เองในกรณีที่ Caddy ถูก restart ไปก่อน

> env vars ที่ปรับได้: `CADDY_CONTAINER` (default: `caddy`), `CADDY_NETWORK` (default: `caddy_web`)

### Adminer (DB GUI ใน Project Stack)

แต่ละโปรเจคมี Adminer container สำหรับดูฐานข้อมูลโดยตรง:

```
http://<server-ip>:{adminer_port}
```

- Server: `postgres`
- Username: `directus`
- Password: `directus`
- Database: `directus`

### Sub-path Routing (basePath)

`next.config.mjs` อ่าน basePath จาก environment variable อัตโนมัติ:

```js
const nextConfig = {
  output: 'standalone',
  basePath: process.env.NEXT_PUBLIC_BASE_PATH || '',
  assetPrefix: process.env.NEXT_PUBLIC_BASE_PATH || '',
  images: { unoptimized: true },
}
```

เมื่อสร้าง instance ผ่าน Manager, ค่าต่อไปนี้จะถูกตั้งเป็น Docker build ARG โดยอัตโนมัติ — ไม่ต้องแก้ไขไฟล์เอง:

| Build ARG | ค่า |
|---|---|
| `NEXT_PUBLIC_BASE_PATH` | `/{prefix}` |
| `NEXT_PUBLIC_DIRECTUS_URL` | `http://<server>/{prefix}-admin` |

> `NEXT_PUBLIC_DIRECTUS_URL` ถูก bake เข้า JS bundle ตอน build เพื่อให้ browser เรียก Directus API ผ่าน reverse proxy ถูก URL — ถ้า domain เปลี่ยนหลัง deploy แล้ว ให้กดปุ่ม **Fix URL** ใน Manager เพื่อ patch compose file และ rebuild อัตโนมัติ

สำหรับ template หลัก (รันตรงโดยไม่ผ่าน Manager) ให้ตั้งค่าใน `docker-compose.yaml`:
```yaml
args:
  NEXT_PUBLIC_BASE_PATH: ""   # หรือ "/myproject" ถ้าต้องการ sub-path
```

### ฟีเจอร์ใน Manager UI

| ฟีเจอร์ | รายละเอียด |
|---|---|
| **All Projects** | ดูรายการ BDT stack ทั้งหมดบน server พร้อมสถานะ — คลิกเพื่อเลือก (auto-refresh ทุก 15 วิ) |
| **+ New Project** | สร้าง instance ใหม่จาก template — ใช้ source code ร่วมกัน, กำหนดชื่อ/port อัตโนมัติ, build และ start ทั้งหมด |
| **Selected Project Status** | สถานะ container (postgres/directus/nextjs/adminer) ของโปรเจคที่เลือก |
| **Setup** | Build Next.js, เริ่ม containers, import `dump.sql`, reset admin — ไม่ต้องใช้ terminal |
| **Export Data** | Export database + uploads เป็น `.zip` พร้อม download ผ่านเบราว์เซอร์ |
| **Import ZIP** | อัพโหลดไฟล์ `.zip` (format เดียวกับ Export) เพื่อนำเข้า database และ uploads ทับข้อมูลเดิม — auto-replace `localhost` URL ในฐานข้อมูล และ rebuild Next.js หลัง import |
| **Fix URL** | อัพเดต `PUBLIC_URL` (Directus) + `NEXT_PUBLIC_DIRECTUS_URL` (Next.js) ให้ใช้ URL ปัจจุบัน แล้ว rebuild Next.js — ใช้เมื่อ domain เปลี่ยนโดยไม่ต้อง import ใหม่ |
| **Past Exports** | รายการไฟล์ export ของโปรเจคที่เลือก พร้อม download link |
| **Database Browser** | ดูข้อมูลในฐานข้อมูลแบบ table — เลือกดูได้ทุกโปรเจค, row count, pagination, ค้นหาข้อมูล |
| **ลบโปรเจค** | หยุด containers, ลบ volumes, ลบ reverse proxy config, reload Caddy — ลบไฟล์ทั้งหมดในโฟลเดอร์โปรเจคด้วย (default เปิด, ยกเลิกได้ในหน้ายืนยัน) |

> **Instance model:** แต่ละ instance ที่สร้างผ่าน Manager มีเฉพาะ `directus/uploads/` และ `docker-compose.yaml` ของตัวเอง — ไม่ copy source code แต่ชี้ Next.js build context ไปยัง `template/next-app` โดยตรง ทำให้ทุก instance ใช้ source code ชุดเดียวกันแต่มี database และ basePath (`/{prefix}`) เป็นของตัวเอง
>
> ไฟล์ export จะถูกเก็บไว้ในโฟลเดอร์ `_exports/` ภายในแต่ละ instance

### ข้อกำหนดของ Manager

Manager ต้องการสิทธิ์เข้าถึง Docker socket (`/var/run/docker.sock`) และ mount parent directory (`..:/projects_root`) ซึ่งกำหนดไว้ใน `manager/docker-compose.yaml` แล้ว

---

## Deploy Site ผ่าน Directus Admin

โปรเจกต์มีหน้า **Deploy** ใน Directus admin สำหรับ pull code และ restart Next.js โดยไม่ต้องเปิด terminal

### วิธีใช้

**1. รัน deploy-server บน host machine** (ต้องรันทิ้งไว้ตลอด):

```bash
node scripts/deploy-server.js
```

> server จะรันที่ `http://127.0.0.1:9901` และแสดงสถานะ "Deploy server running..." — ปล่อยให้ค้างอยู่ได้ปกติ
> เปลี่ยน port ได้ด้วย `DEPLOY_PORT=xxxx node scripts/deploy-server.js`

**2. Restart Directus** เพื่อโหลด extension:

```bash
docker compose restart directus
```

**3. เข้า Directus Admin** → จะมีเมนู **Deploy** (ไอคอน 🚀) ที่ sidebar ด้านซ้าย

### ปุ่มในหน้า Deploy

| ปุ่ม | การทำงาน |
|---|---|
| ⬇️ Git Pull | ดึง code เวอร์ชันล่าสุดจาก repository |
| 🐳 Docker Compose | Build และ restart เฉพาะ Next.js container |
| 🚀 Deploy | รวมทั้งสองขั้นตอนในครั้งเดียว |

> ตั้งค่า URL ของ deploy-server ได้ในหน้า Deploy (บันทึกใน localStorage ของ browser)

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
├── manager/              # Manager Web UI (standalone, deploy แยก)
│   ├── docker-compose.yaml  # deploy manager: docker compose -f manager/docker-compose.yaml up -d
│   ├── Dockerfile
│   ├── app.py            # Flask server
│   ├── requirements.txt
│   └── templates/
│       └── index.html    # Dashboard UI
├── _exports/             # ไฟล์ export จาก Manager (สร้างอัตโนมัติ)
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

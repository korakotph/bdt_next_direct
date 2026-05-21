FROM node:20-alpine

WORKDIR /app

# รับ build-time env vars สำหรับ NEXT_PUBLIC_* (ต้องส่งมาตอน docker build)
ARG NEXT_PUBLIC_DIRECTUS_URL
ARG NEXT_PUBLIC_BASE_PATH
ENV NEXT_PUBLIC_DIRECTUS_URL=$NEXT_PUBLIC_DIRECTUS_URL
ENV NEXT_PUBLIC_BASE_PATH=$NEXT_PUBLIC_BASE_PATH

# copy package.json ก่อน เพื่อใช้ cache
COPY package*.json ./

# install dependencies
RUN npm install

# copy source code
COPY . .

# build Next.js (NEXT_PUBLIC_* จะถูก bake เข้า bundle ตรงนี้)
RUN npm run build

# standalone ต้องการ static + public files อยู่ใน standalone dir
RUN cp -r .next/static .next/standalone/.next/static && \
    cp -r public .next/standalone/public 2>/dev/null || true

EXPOSE 3000

CMD ["node", ".next/standalone/server.js"]
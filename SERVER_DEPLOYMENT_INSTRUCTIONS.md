# 🚀 Server Architecture & Deployment Context Guidelines for AI Agents

هذا المستند مخصص لأي مساعد ذكاء اصطناعي (AI Agent) يتعامل مع السيرفر أو إدارة المشروعات وتنفيذ النشر (Deployment)، وقواعد بيانات PostgreSQL، وNginx، وPM2.

---

## 1. ⚙️ هيكل وحالة السيرفر (Server Stack Overview)

* **النظام (OS):** Ubuntu / Linux Server
* **موقع المشروعات على السيرفر:** `/var/www/` (مثال: `/var/www/project-name/`)
* **محتويات المشروع:**
  * `dist/` أو `dist/public/`: مخرجات الفرونت إند (Vite / React SPA).
  * `api-server/dist/`: مخرجات الباك إند (Node.js Express / TS).
  * `lib/db/`: قاعدة البيانات واستعلامات Drizzle ORM Schema.
  * `.env`: يحتوي على متغيّرات البيئة مثل `DATABASE_URL` و`PORT` وتوكينات الأمان.
* **إدارة العملية (Process Manager):** `PM2`
* **الويب سيرفر (Web Server / Reverse Proxy):** `Nginx` مع دعم `SSL` (Let's Encrypt / Certbot).

* **متغيّرات الاتصال بالسيرفر (Environment Variables):**
  يتم تخزين بيانات الاتصال كـ Environment Variables على جهاز التطوير، أو قراءتها من ملف `.env` الخاص بالنشر:
  - `DEPLOY_HOST`: عنوان الـ IP أو الـ Domain الخاص بالسيرفر.
  - `DEPLOY_USER`: اسم المستخدم للـ SSH (عادة `root` أو `ubuntu`).
  - `DEPLOY_PASSWORD`: كلمة المرور الخاصة بالمستخدم للـ SSH.

---

## 2. 📋 تعليمات إدارة الخدمات والعمليات (Services Management)

### أ) إدارة Nginx:
عند تعديل ملفات Nginx Config في `/etc/nginx/sites-available/`:
1. اختبار صحة الإعدادات:
   ```bash
   sudo nginx -t
   ```
2. إعادة تحميل Nginx بدون قطع الخدمة (Reload):
   ```bash
   sudo systemctl reload nginx
   ```
3. إعادة تشغيل الخدمة بالكامل:
   ```bash
   sudo systemctl restart nginx
   ```

### ب) إدارة تطبيقات Node عبر PM2:
1. عرض حالة جميع العمليات:
   ```bash
   pm2 status
   ```
2. تشغيل / إعادة تشغيل تطبيق محدد:
   ```bash
   pm2 restart <app-name>
   ```
3. قراءة السجلات والأخطاء المباشرة (Logs):
   ```bash
   pm2 logs <app-name> --lines 100
   ```
4. حفظ قائمة الخدمات لتعمل تلقائياً عند إعادة تشغيل السيرفر:
   ```bash
   pm2 save
   ```

---

## 3. 🗄️ قاعدة البيانات والتعديلات (Drizzle ORM & PostgreSQL)

عند إضافة أو تعديل أعمدة/جداول في schema الخاص بـ Drizzle ORM:
1. قراءة `DATABASE_URL` من ملف البيئة `.env`:
   ```bash
   export DATABASE_URL=$(grep DATABASE_URL /var/www/project-name/.env | cut -d '=' -f2-)
   ```
2. تطبيق التعديلات فوراً على قاعدة البيانات من داخل مجلد `lib/db`:
   ```bash
   cd /var/www/project-name/lib/db
   npx drizzle-kit push --config ./drizzle.config.ts
   ```

---

## 4. 🌐 إعدادات Nginx القياسية للـ React / Vite + Node.js API

عند إنشاء أو ضبط Nginx لأي مشروع جديد (`/etc/nginx/sites-available/domain.conf`):

```nginx
server {
    listen 80;
    server_name example.com www.example.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    server_name example.com www.example.com;

    ssl_certificate /etc/letsencrypt/live/example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/example.com/privkey.pem;

    root /var/www/project-name/dist;
    index index.html;

    # الضغط والأداء (Gzip)
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml image/svg+xml;

    # عدم كاش الـ index.html لضمان التحديثات المباشرة
    location = /index.html {
        add_header Cache-Control "no-cache, no-store, must-revalidate";
    }

    # كاش للملفات المبتكرة (Static Assets with Hashes)
    location ~* \.(?:js|css|woff2|png|jpg|jpeg|gif|ico|svg|webp)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # SPA Router Fallback
    location / {
        try_files $uri $uri/ /index.html;
    }

    # API Proxy إلى Node.js (PM2 Backend)
    location /api/ {
        proxy_pass http://127.0.0.1:5000/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        client_max_body_size 1G;
        proxy_request_buffering off;
        proxy_buffering off;
    }

    # Server-Sent Events (SSE) / Live Stream Proxy (إذا وُجد)
    location /api/notifications/stream {
        proxy_pass http://127.0.0.1:5000/api/notifications/stream;
        proxy_http_version 1.1;
        proxy_set_header Connection "";
        proxy_buffering off;
        proxy_cache off;
        proxy_read_timeout 3600s;
    }
}
```

---

## 5. 🚢 خطوات وسكربت النشر الأوتوماتيكي (Automated SFTP / SSH Deploy Script Pattern)

أي سكربت نشر يُنفذ من جهاز التطوير المحلي (Local) إلى السيرفر (Remote) عبر Python `paramiko` ينبغي أن يتبع الخطوات التالية بالترتيب:

1. **رفع ملفات الواجهة الأمامية (Build Dist):**
   رفع محتويات المجلد المحلي `dist/` إلى `/var/www/project-name/dist/`.
2. **رفع ملفات الباك إند (Backend Dist):**
   رفع محتويات `api-server/dist/` إلى `/var/www/project-name/api-server/dist/`.
3. **رفع قواعد البيانات والتغييرات (Database Schema):**
   رفع محتويات `lib/db/src/schema/` إلى `/var/www/project-name/lib/db/src/schema/`.
4. **تحديث قاعدة البيانات (Remote Migration Push):**
   تشغيل الأمر بعيداً عبر SSH:
   ```bash
   export DATABASE_URL=$(grep DATABASE_URL /var/www/project-name/.env | cut -d '=' -f2-) && cd /var/www/project-name/lib/db && npx drizzle-kit push --config ./drizzle.config.ts
   ```
5. **إعادة تشغيل وتنشيط الخدمات:**
   ```bash
   sudo systemctl reload nginx
   pm2 restart <backend-process-name>
   ```

---

## 6. ⚠️ قواعد وإرشادات للـ AI (Rules & Best Practices for AI Agents)

1. **عدم التعديل المباشر على الإنتاج دون بناء محلي:** احرص دائماً على عمل `npm run build` للفرونت إند والباك إند محلياً أولاً والـ Type-Check والتأكد من خلو المشروع من أي أخطاء `TypeScript` قبل الرفع إلى السيرفر.
2. **الحفاظ على الأمان (Security):** عدم كتابة أو طباعة كلمة السر الخاصة بالسيرفر أو متغيّرات البيئة الحساسة `DATABASE_URL` مباشرة في الأكواد أو الـ Log outputs.
3. **عدم مسح مجلد الرفع (`/uploads/`):** تأكد دائماً عند تنظيف المجلدات أو عمل Sync ألا يتم مسح مجلد رفع ملفات المستخدمين أو الصور على السيرفر.
4. **التحقق بعد النشر (Post-Deployment Verification):** بعد تنفيذ النشر، قم بفحص حالة `pm2 status` والتأكد أن الباك إند يعمل على البورت المناسب وبدون كراش `online`.

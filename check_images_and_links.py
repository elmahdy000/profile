import paramiko
import json
import sys

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('72.62.27.196', username='root', password='e#LWhcSAa6B&R8s')

def q(sql):
    stdin, stdout, stderr = c.exec_command('su - postgres -c "psql -d profile -t -A"')
    stdin.write(sql)
    stdin.close()
    return stdout.read().decode('utf-8', errors='replace')

# 1. فحص جميع روابط الصور في الاختبارات وبنك الأسئلة
print("--- فحص الصور في الاختبارات وبنك الأسئلة ---")
out_img = q("""
SELECT id, title, q->>'prompt', q->>'imageUrl'
FROM quizzes,
jsonb_array_elements(questions) as q
WHERE q->>'imageUrl' IS NOT NULL AND q->>'imageUrl' != '';
""")

lines = [l for l in out_img.strip().split("\n") if l.strip()]
print(f"عدد الأسئلة التي تحتوي على صور في الاختبارات: {len(lines)}")
image_urls = set()
for l in lines:
    parts = l.split("|")
    if len(parts) >= 4:
        qid, title, prompt, url = parts[0], parts[1], parts[2], parts[3]
        image_urls.add(url)
        print(f"  اختبار {qid}: {url}")

# التحقق من وجود ملفات الصور على السيرفر
for url in image_urls:
    if url.startswith('/'):
        # تحقق من وجود الملف محلياً على السيرفر
        stdin, stdout, stderr = c.exec_command(f'ls -la /root/profile/public{url} 2>/dev/null || ls -la /var/www/html{url} 2>/dev/null || find / -name "{url.split("/")[-1]}" 2>/dev/null')
        found = stdout.read().decode('utf-8').strip()
        if not found:
            print(f"  ❌ صورة غير موجودة على السيرفر: {url}")
        else:
            print(f"  ✅ صورة موجودة: {url} -> {found.split()[-1] if found else ''}")
    elif url.startswith('http'):
        print(f"  🌐 رابط خارجي: {url}")

# 2. فحص هل هناك اختبارات منشورة مرتبطة بدروس أو كورسات محذوفة أو غير موجودة
print("\n--- فحص ارتباطات الاختبارات بالكورسات والفيديوهات ---")
out_fk = q("""
SELECT 
    q.id,
    q.title,
    q.course_id,
    q.video_id,
    c.title as course_title,
    v.title as video_title
FROM quizzes q
LEFT JOIN courses c ON q.course_id = c.id
LEFT JOIN videos v ON q.video_id = v.id
WHERE q.is_published = true;
""")

orphan_quizzes = []
for l in out_fk.strip().split("\n"):
    if not l.strip(): continue
    parts = l.split("|")
    qid, title, cid, vid, c_title, v_title = parts[0], parts[1], parts[2], parts[3], parts[4], parts[5]
    if cid and not c_title:
        orphan_quizzes.append(f"اختبار {qid} ({title}) مرتبط بكورس غير موجود ID: {cid}")
    if vid and not v_title:
        orphan_quizzes.append(f"اختبار {qid} ({title}) مرتبط بفيديو/درس غير موجود ID: {vid}")

if orphan_quizzes:
    print(f"وجدنا {len(orphan_quizzes)} اختبار مرتبط ببيانات محذوفة:")
    for oq in orphan_quizzes:
        print("  ", oq)
else:
    print("✅ جميع الاختبارات المنشورة مرتبطة بكورسات وفيديوهات صحيحة وقائمة.")


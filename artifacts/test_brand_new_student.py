import sys
import json
import urllib.request

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')

url = "https://drelmahdy.com/api/student/register"
test_phone = "01077778899"
payload = {
    "name": "طالب جديد بالسنتر",
    "phone": test_phone,
    "parentPhone": "01011112233",
    "schoolName": "مدرسة الزقازيق الثانوية العسكرية",
    "grade": "تانية بكالوريا",
    "languageTrack": "عربي",
    "centerName": "سنتر رافال أكاديمي (Rafal Academy)",
    "appointmentSlot": "حسب جدول المجموعات بالسنتر (الساعة 3:00 عصراً)",
    "governorate": "الشرقية",
    "city": "الزقازيق",
    "learningMode": "offline"
}

data = json.dumps(payload).encode('utf-8')
req = urllib.request.Request(url, data=data, headers={'Content-Type': 'application/json', 'User-Agent': 'Mozilla/5.0'})

with urllib.request.urlopen(req) as response:
    print("Status Code:", response.status)
    print("Response JSON:\n", response.read().decode('utf-8'))

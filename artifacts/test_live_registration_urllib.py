import sys
import json
import urllib.request
import urllib.error

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')

url = "https://drelmahdy.com/api/student/register"
test_phone = "01055551234"
payload = {
    "name": "طالب تجريبي لحجز السنتر",
    "phone": test_phone,
    "parentPhone": "01099998888",
    "schoolName": "مدرسة المتفوقين الثانوية",
    "grade": "تانية بكالوريا",
    "languageTrack": "لغات (إنجليزي)",
    "centerName": "سنتر إديوفيرس (EduVerse)",
    "appointmentSlot": "سبت - اتنين - أربع (الساعة 3:30 عصراً)",
    "governorate": "الشرقية",
    "city": "الزقازيق",
    "learningMode": "offline"
}

data = json.dumps(payload).encode('utf-8')
req = urllib.request.Request(url, data=data, headers={'Content-Type': 'application/json', 'User-Agent': 'Mozilla/5.0'})

try:
    with urllib.request.urlopen(req) as response:
        print("Status Code:", response.status)
        resp_body = response.read().decode('utf-8')
        print("Response JSON:\n", resp_body)
except urllib.error.HTTPError as e:
    print("HTTPError:", e.code)
    print("Body:", e.read().decode('utf-8'))
except Exception as e:
    print("Error:", e)

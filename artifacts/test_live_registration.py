import sys
import requests

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

res = requests.post(url, json=payload)
print("Status Code:", res.status_code)
print("Response JSON:", res.json())

import sys
import urllib.request
import json
import ssl
import time

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

url_reg = "https://drelmahdy.com/api/student/register"
url_login = "https://drelmahdy.com/api/student/login"

phone_suffix = str(int(time.time()) % 1000000).zfill(6)
payload = {
    "name": "طالب تواصل وتجربة",
    "phone": "01098" + phone_suffix,
    "governorate": "الشرقية",
    "city": "الزقازيق",
    "educationSystem": "baccalaureate",
    "educationGrade": "first_secondary",
    "schoolType": "languages",
    "academicTrack": "general",
    "learningMode": "online"
}

print("--- Step 1: Registering ---")
print("Payload:", json.dumps(payload, ensure_ascii=False))

req_reg = urllib.request.Request(
    url_reg,
    data=json.dumps(payload).encode('utf-8'),
    headers={'Content-Type': 'application/json', 'User-Agent': 'Mozilla/5.0'},
    method='POST'
)

code = None
try:
    with urllib.request.urlopen(req_reg, context=ctx) as response:
        body = json.loads(response.read().decode('utf-8'))
        print("Registration Response:", json.dumps(body, ensure_ascii=False))
        code = body.get("accessCode")
except Exception as e:
    print("Registration Error:", e)

if code:
    print(f"\n--- Step 2: Logging in with code '{code}' ---")
    login_payload = {"accessCode": code, "deviceId": "dev_test_123456"}
    req_login = urllib.request.Request(
        url_login,
        data=json.dumps(login_payload).encode('utf-8'),
        headers={'Content-Type': 'application/json', 'User-Agent': 'Mozilla/5.0'},
        method='POST'
    )
    try:
        with urllib.request.urlopen(req_login, context=ctx) as login_res:
            cookie = login_res.headers.get('Set-Cookie')
            login_body = json.loads(login_res.read().decode('utf-8'))
            print("Login Response Status:", login_res.getcode())
            print("Login Response Cookie:", cookie)
            print("Login Response Student Name:", login_body.get("student", {}).get("name"))
            print("Login Response Payment Status:", login_body.get("student", {}).get("paymentStatus"))
    except Exception as e:
        print("Login Error:", e)

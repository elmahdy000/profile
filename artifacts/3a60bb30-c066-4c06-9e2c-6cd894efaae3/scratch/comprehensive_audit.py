import json
import psycopg2
from psycopg2.extras import RealDictCursor
import urllib.request
import ssl

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

DB_URI = "postgresql://postgres:MahmoudProfile2026Secure!@72.62.27.196:5432/profile"

def run_audit():
    print("=== STARTING COMPREHENSIVE AUDIT ===")
    conn = psycopg2.connect(DB_URI)
    cur = conn.cursor(cursor_factory=RealDictCursor)

    # 1. Total student count
    cur.execute("SELECT count(*) as total FROM students;")
    total_students = cur.fetchone()['total']
    print(f"[1] Total students in DB: {total_students}")
    assert total_students == 523, f"Expected 523 students, got {total_students}!"

    # 2. Centers breakdown
    cur.execute("""
        SELECT COALESCE(center_name, 'ONLINE / NULL') as center, count(*) as cnt
        FROM students
        GROUP BY center_name
        ORDER BY cnt DESC;
    """)
    center_rows = cur.fetchall()
    print("\n[2] Students Center Breakdown:")
    for r in center_rows:
        print(f"  - {r['center']}: {r['cnt']} students")

    # 3. Slots breakdown for offline students
    cur.execute("""
        SELECT center_name, COALESCE(appointment_slot, 'NO_SLOT') as slot, count(*) as cnt
        FROM students
        WHERE center_name IS NOT NULL AND TRIM(center_name) != '' AND LOWER(center_name) != 'null'
        GROUP BY center_name, appointment_slot
        ORDER BY center_name, slot;
    """)
    slot_rows = cur.fetchall()
    print("\n[3] Students Slots Breakdown (Offline Centers):")
    for r in slot_rows:
        print(f"  - [{r['center_name']}] | Slot: {r['slot']} -> {r['cnt']} students")

    # 4. Check for invalid or anomalous center names
    cur.execute("""
        SELECT count(*) as cnt FROM students
        WHERE center_name IS NOT NULL
          AND center_name NOT IN (
              'سنتر إديوفيرس أكاديمي (EduVerse) - لغات',
              'سنتر فيوتشر (Future) - عام',
              'سنتر المجد (El-Magd) - لغات',
              'رافال أكاديمي (Rafal Academy) - عام',
              'سنتر زاج (Zag) - عام'
          );
    """)
    invalid_centers = cur.fetchone()['cnt']
    print(f"\n[4] Invalid / anomalous offline centers: {invalid_centers} (Expected: 0)")
    assert invalid_centers == 0, f"Found {invalid_centers} invalid center names!"

    # 5. Verify Settings Table offline_centers
    cur.execute("SELECT value FROM settings WHERE key = 'offline_centers';")
    row = cur.fetchone()
    if row:
        val = row['value']
        if isinstance(val, str):
            val = json.loads(val)
        print(f"\n[5] Settings Table 'offline_centers' has {len(val)} centers:")
        for c in val:
            print(f"  - {c.get('name')} (Type: {c.get('type')}, Slots: {len(c.get('slots', []))})")
            for s in c.get('slots', []):
                print(f"      Slot: {s.get('day')} - {s.get('time')} ({s.get('type')})")
    else:
        print("\n[5] WARNING: No 'offline_centers' key found in settings table!")

    # 6. Notifications table check
    cur.execute("SELECT count(*) as total_notifs FROM notifications;")
    total_notifs = cur.fetchone()['total_notifs']
    print(f"\n[6] Total notifications in DB: {total_notifs}")

    cur.execute("""
        SELECT type, count(*) as cnt
        FROM notifications
        GROUP BY type
        ORDER BY cnt DESC;
    """)
    notif_types = cur.fetchall()
    print("  Notification types breakdown:")
    for nt in notif_types:
        print(f"    - {nt['type']}: {nt['cnt']}")

    # 7. Attendance Records check
    cur.execute("SELECT count(*) as total_att FROM attendance_records;")
    total_att = cur.fetchone()['total_att']
    print(f"\n[7] Total attendance records: {total_att}")

    # 8. Test live HTTP endpoint
    print("\n[8] Testing Live HTTP API:")
    try:
        req = urllib.request.Request("https://drelmahdy.com/api/settings", headers={"User-Agent": "AuditScript/1.0"})
        with urllib.request.urlopen(req, context=ctx, timeout=10) as resp:
            data = json.loads(resp.read().decode('utf-8'))
            print("  - GET https://drelmahdy.com/api/settings -> SUCCESS 200 OK")
            off_centers = data.get('offlineCenters', [])
            print(f"    Live API returns {len(off_centers)} offline centers.")
    except Exception as e:
        print(f"  - GET https://drelmahdy.com/api/settings FAILED: {e}")

    cur.close()
    conn.close()
    print("\n=== AUDIT COMPLETED SUCCESSFULLY ===")

if __name__ == '__main__':
    run_audit()

import sys
import time
import urllib.request
import urllib.error
import concurrent.futures

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')

DOMAIN_URL = "https://drelmahdy.com/"
API_VIDEOS_URL = "https://drelmahdy.com/api/videos"

def simulate_student(student_id):
    try:
        # 1. Access Main Platform Page
        t0 = time.time()
        req1 = urllib.request.Request(DOMAIN_URL, headers={"User-Agent": f"StudentBot/{student_id}"})
        with urllib.request.urlopen(req1, timeout=12) as response1:
            code1 = response1.getcode()
        t_page = time.time() - t0

        # 2. Access API (expect 401 Unauthorized since student is unauthenticated)
        t0 = time.time()
        req2 = urllib.request.Request(API_VIDEOS_URL, headers={"User-Agent": f"StudentBot/{student_id}"})
        try:
            with urllib.request.urlopen(req2, timeout=12) as response2:
                code2 = response2.getcode()
        except urllib.error.HTTPError as e:
            code2 = e.code
        t_api = time.time() - t0

        return {
            "success": code1 == 200 and (code2 == 200 or code2 == 401),
            "t_page": t_page,
            "t_api": t_api,
            "code2": code2
        }
    except Exception as e:
        return {"success": False, "error": str(e)}

def run_stress_test(total_students=5000, max_workers=100):
    print(f"🚀 Launching Production Stress Test for {total_students} Concurrent Students...")
    print(f"🌐 Target Production HTTPS Domain: https://drelmahdy.com/")
    start_time = time.time()

    results = []
    with concurrent.futures.ThreadPoolExecutor(max_workers=max_workers) as executor:
        futures = [executor.submit(simulate_student, i) for i in range(total_students)]
        for i, future in enumerate(concurrent.futures.as_completed(futures)):
            res = future.result()
            results.append(res)
            if (i + 1) % 1000 == 0 or (i + 1) == total_students:
                print(f"   [+] Processed {i + 1}/{total_students} student requests...")

    total_duration = time.time() - start_time
    successful = [r for r in results if r.get("success")]
    failed = [r for r in results if not r.get("success")]
    
    avg_page_lat = (sum(r["t_page"] for r in successful) / len(successful)) if successful else 0
    avg_api_lat = (sum(r["t_api"] for r in successful) / len(successful)) if successful else 0

    print("\n" + "=" * 65)
    print("📊 5,000 STUDENTS CONCURRENT STRESS TEST REPORT")
    print("=" * 65)
    print(f"Total Student Sessions    : {len(results):,}")
    print(f"Successful (200 OK / 401) : {len(successful):,} ({(len(successful)/total_students)*100:.2f}%)")
    print(f"Failed / Dropped          : {len(failed):,}")
    print(f"Total Duration            : {total_duration:.2f} seconds")
    print(f"Throughput (Requests/sec) : {(len(results)*2)/total_duration:.2f} req/sec")
    print(f"Average Page Load Time    : {avg_page_lat*1000:.2f} ms")
    print(f"Average API Latency       : {avg_api_lat*1000:.2f} ms")
    print("=" * 65)

if __name__ == "__main__":
    run_stress_test(5000, 100)

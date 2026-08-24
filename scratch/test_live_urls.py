import urllib.request
import re

url = "https://drelmahdy.com/"
req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
try:
    with urllib.request.urlopen(req) as resp:
        html = resp.read().decode('utf-8')
        print(f"ROOT HTTP Status: {resp.status}")
        
        # Find script and css src tags
        js_files = re.findall(r'src=["\'](/assets/[^"\']+)["\']', html)
        css_files = re.findall(r'href=["\'](/assets/[^"\']+)["\']', html)
        
        print(f"Found JS assets: {js_files}")
        print(f"Found CSS assets: {css_files}")
        
        for asset in js_files + css_files:
            asset_url = f"https://drelmahdy.com{asset}"
            try:
                a_req = urllib.request.Request(asset_url, headers={'User-Agent': 'Mozilla/5.0'})
                with urllib.request.urlopen(a_req) as a_resp:
                    print(f"Asset {asset}: HTTP {a_resp.status} OK ({len(a_resp.read())} bytes)")
            except Exception as e:
                print(f"Asset {asset} ERROR: {e}")

except Exception as e:
    print(f"ROOT ERROR: {e}")

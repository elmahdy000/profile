import os
import sys
import paramiko

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')

hostname = os.environ.get("DEPLOY_HOST")
username = os.environ.get("DEPLOY_USER")
password = os.environ.get("DEPLOY_PASSWORD")
if not all((hostname, username, password)):
    raise RuntimeError("DEPLOY_HOST, DEPLOY_USER and DEPLOY_PASSWORD are required")

def run_cmd(client, cmd):
    print(f"\n>>> {cmd}")
    stdin, stdout, stderr = client.exec_command(cmd)
    out = stdout.read().decode('utf-8', errors='ignore')
    err = stderr.read().decode('utf-8', errors='ignore')
    if out:
        print(out.strip())
    if err:
        print(f"[ERR] {err.strip()}")

def main():
    client = paramiko.SSHClient()
    client.load_system_host_keys()
    client.set_missing_host_key_policy(paramiko.RejectPolicy())
    try:
        client.connect(hostname, username=username, password=password, timeout=15)
        print("Connected!")
        
        # Prepare SQL Statements
        # Note: We use dollar quoting ($$) or escape single quotes to avoid SQL parsing issues.
        sql = """
-- Ensure site_name
INSERT INTO site_settings (key, value, type) VALUES ('site_name', 'د. محمود المهدي | بوابتك لاحتراف البرمجة', 'text')
ON CONFLICT (key) DO UPDATE SET value = 'د. محمود المهدي | بوابتك لاحتراف البرمجة';

-- Ensure site_seo_desc
INSERT INTO site_settings (key, value, type) VALUES ('site_seo_desc', 'د. محمود المهدي — طريقك لاحتراف البرمجة وعلوم الحاسب وأونلاين. تأسيس عملي من الصفر للجامعات والمدارس والثانوية العامة.', 'text')
ON CONFLICT (key) DO UPDATE SET value = 'د. محمود المهدي — طريقك لاحتراف البرمجة وعلوم الحاسب وأونلاين. تأسيس عملي من الصفر للجامعات والمدارس والثانوية العامة.';

-- Ensure site_tagline
INSERT INTO site_settings (key, value, type) VALUES ('site_tagline', 'بوابتك لاحتراف البرمجة وأونلاين بمصر', 'text')
ON CONFLICT (key) DO UPDATE SET value = 'بوابتك لاحتراف البرمجة وأونلاين بمصر';

-- Update hero settings
INSERT INTO site_settings (key, value, type) VALUES ('hero_title', 'بوابتك لاحتراف البرمجة', 'text')
ON CONFLICT (key) DO UPDATE SET value = 'بوابتك لاحتراف البرمجة';

INSERT INTO site_settings (key, value, type) VALUES ('hero_subtitle', 'مع د. محمود المهدي', 'text')
ON CONFLICT (key) DO UPDATE SET value = 'مع د. محمود المهدي';

INSERT INTO site_settings (key, value, type) VALUES ('hero_desc', 'تأسيس عملي من الصفر ومقدمة فى البرمجة لطلاب الجامعة، وشرح منهج برمجة ثانوية عامة وبكالوريا برمجة أونلاين لجميع المحافظات.', 'text')
ON CONFLICT (key) DO UPDATE SET value = 'تأسيس عملي من الصفر ومقدمة فى البرمجة لطلاب الجامعة، وشرح منهج برمجة ثانوية عامة وبكالوريا برمجة أونلاين لجميع المحافظات.';

-- Update about settings
INSERT INTO site_settings (key, value, type) VALUES ('about_title', 'د. محمود المهدي — بوابتك لاحتراف البرمجة', 'text')
ON CONFLICT (key) DO UPDATE SET value = 'د. محمود المهدي — بوابتك لاحتراف البرمجة';

INSERT INTO site_settings (key, value, type) VALUES ('about_desc', 'د. محمود المهدي، ماجستير نظم معلومات ومدرب برمجة. طريقك لاحتراف البرمجة وعلوم الحاسب وأونلاين. تأسيس عملي من الصفر للجامعات والمدارس والثانوية العامة.', 'text')
ON CONFLICT (key) DO UPDATE SET value = 'د. محمود المهدي، ماجستير نظم معلومات ومدرب برمجة. طريقك لاحتراف البرمجة وعلوم الحاسب وأونلاين. تأسيس عملي من الصفر للجامعات والمدارس والثانوية العامة.';

-- Ensure social_youtube
INSERT INTO site_settings (key, value, type) VALUES ('social_youtube', 'https://www.youtube.com/@learntocode9453', 'text')
ON CONFLICT (key) DO UPDATE SET value = 'https://www.youtube.com/@learntocode9453';
"""
        
        # Write SQL block to a file on the server and run it via psql
        sftp = client.open_sftp()
        with sftp.file('/tmp/update_seo.sql', 'wb') as f:
            f.write(sql.encode('utf-8'))
        sftp.close()
        
        print("SQL script written to server /tmp/update_seo.sql")
        
        # Run SQL script on PostgreSQL DB
        run_cmd(client, "sudo -u postgres psql -d profile -f /tmp/update_seo.sql")
        
        # Verify the database values
        run_cmd(client, "sudo -u postgres psql -d profile -c \"SELECT key, SUBSTRING(value from 1 for 60) as value FROM site_settings WHERE key IN ('site_name', 'site_seo_desc', 'site_tagline', 'hero_title', 'hero_subtitle', 'hero_desc', 'about_title', 'about_desc') ORDER BY key;\"")
        
        # Clean up
        run_cmd(client, "rm -f /tmp/update_seo.sql")

    except Exception as e:
        print(f"Error: {e}")
    finally:
        client.close()

if __name__ == '__main__':
    main()

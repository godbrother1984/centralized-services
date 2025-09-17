# การตั้งค่า Local Hosts สำหรับ Development

## สำหรับ Windows

เปิดไฟล์ `C:\Windows\System32\drivers\etc\hosts` ด้วยสิทธิ์ Administrator และเพิ่ม:

```
127.0.0.1    auth.localhost
127.0.0.1    traefik.localhost
127.0.0.1    db.localhost
```

## สำหรับ macOS/Linux

เปิดไฟล์ `/etc/hosts` ด้วย sudo และเพิ่ม:

```bash
sudo nano /etc/hosts
```

เพิ่มบรรทัดเหล่านี้:
```
127.0.0.1    auth.localhost
127.0.0.1    traefik.localhost
127.0.0.1    db.localhost
```

## การทดสอบ

หลังจากตั้งค่าแล้ว สามารถเข้าถึงได้ที่:

- **Traefik Dashboard**: http://traefik.localhost:8080
- **Keycloak**: http://auth.localhost
- **PostgreSQL**: `psql -h db.localhost -p 5432 -U postgres`

## หมายเหตุ

สำหรับ production ควรใช้ domain จริงและตั้งค่า DNS records ที่ชื้อไปยัง server IP
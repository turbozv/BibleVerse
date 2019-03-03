# BibleVerse
This project is the server side of CBSF app

## Apache proxy setting
```
<VirtualHost *:80>
    ServerAdmin <your@email.com>
    DocumentRoot <your_html_path>
    ServerName api.mycbsf.org
    ErrorLog logs/bsfapi-error_log
    CustomLog logs/bsfapi-access_log common
    ProxyRequests off
    ProxyPreserveHost On
    ProxyErrorOverride Off
    <Proxy *>
            Order deny,allow
            Allow from all
    </Proxy>
    <Location />
            ProxyPass http://localhost:3000/
            ProxyPassReverse http://localhost:3000/
    </Location>
</VirtualHost>
```

## NodeJS parse original IP address
```
function getIp(req) {
  let ip = req.headers['x-forwarded-for'];
  if (!ip) {
    ip = req.ip.replace('::ffff:', '');
  }
  return ip;
}
```
